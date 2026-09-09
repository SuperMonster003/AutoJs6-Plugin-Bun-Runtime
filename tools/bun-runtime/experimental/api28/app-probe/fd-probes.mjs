// The APK builder prepends FD_MODE. This is a fixed test fixture, not a public API.
// Filters affect this Bun calling thread and inherited children only. They never
// weaken Android's existing filter, modify the system, or reach the supervisor.
import { dlopen, ptr, read } from "bun:ffi";
import { openSync, closeSync, readlinkSync, writeFileSync } from "node:fs";

const mode = FD_MODE;
const libc = dlopen("libc.so", {
  fcntl: { args: ["i32", "i32", "i32"], returns: "i32" },
  prctl: { args: ["i32", "u64", "u64", "u64", "u64"], returns: "i32" },
  syscall: { args: ["i64", "i64", "i64", "i64", "i64", "i64", "i64"], returns: "i64" },
  __errno: { args: [], returns: "ptr" },
  sigprocmask: { args: ["i32", "ptr", "ptr"], returns: "i32" },
  execve: { args: ["ptr", "ptr", "ptr"], returns: "i32" },
});
const c = libc.symbols, errnoPointer = c.__errno();
const F_GETFD = 1, F_SETFD = 2, FD_CLOEXEC = 1, CLOEXEC = 4;
const MAGIC = 0x41554a36, SIGSYS_BIT = 1n << 30n;
const proof = { schemaVersion: 1, mode, passed: false, arch: process.arch };
const check = (value, message) => { if (!value) throw Error(message); };
const flags = fd => c.fcntl(fd, F_GETFD, 0);
const rawClose = fd => {
  const result = Number(c.syscall(436n, BigInt(fd), BigInt(fd), BigInt(CLOEXEC), 0n, 0n, 0n));
  return { result, errno: result === -1 ? read.i32(errnoPointer) : 0 };
};
const marker = () => {
  const result = c.prctl(MAGIC, 0n, 0n, 0n, 0n);
  return { result, errno: result === -1 ? read.i32(errnoPointer) : 0 };
};
const mask = () => {
  const value = new BigUint64Array(16);
  check(c.sigprocmask(0, null, ptr(value)) === 0, "query signal mask");
  return value;
};
function installTrap() {
  const arch = process.arch === "arm64" ? 0xc00000b7 : 0xc000003e;
  check(["arm64", "x64"].includes(process.arch), "64-bit native ABI");
  const prctlNr = process.arch === "arm64" ? 167 : 157;
  // struct seccomp_data: nr@0, arch@4, args[0]@16. Trap close_range and
  // one otherwise-invalid prctl option; that marker proves TRAP was installed
  // even on old kernels where close_range already returns ENOSYS.
  const instructions = [
    [0x20, 0, 0, 4], [0x15, 1, 0, arch], [0x06, 0, 0, 0x80000000],
    [0x20, 0, 0, 0], [0x15, 4, 0, 436], [0x15, 0, 4, prctlNr],
    [0x20, 0, 0, 16], [0x15, 1, 0, MAGIC], [0x06, 0, 0, 0x7fff0000],
    [0x06, 0, 0, 0x00030000], [0x06, 0, 0, 0x7fff0000],
  ];
  const filter = Buffer.alloc(instructions.length * 8);
  instructions.forEach(([code, jt, jf, k], i) => {
    filter.writeUInt16LE(code, i * 8); filter[i * 8 + 2] = jt; filter[i * 8 + 3] = jf;
    filter.writeUInt32LE(k, i * 8 + 4);
  });
  const program = Buffer.alloc(16);
  program.writeUInt16LE(instructions.length, 0); program.writeBigUInt64LE(BigInt(ptr(filter)), 8);
  const before = marker();
  check(before.result === -1 && before.errno === 22, "marker must be EINVAL before filter");
  check(c.prctl(38, 1n, 0n, 0n, 0n) === 0, "set NO_NEW_PRIVS");
  check(c.prctl(22, 2n, BigInt(ptr(program)), 0n, 0n) === 0, "install local SECCOMP_RET_TRAP");
  const after = marker();
  check(after.result === -1 && after.errno === 38, "TRAP marker must become ENOSYS");
  return { installed: true, before, after, filterSha256: new Bun.CryptoHasher("sha256").update(filter).digest("hex") };
}
function trapProof(fd) {
  const mark = marker(), call = rawClose(fd);
  check(mark.result === -1 && mark.errno === 38, "inherited TRAP marker");
  check(call.result === -1 && call.errno === 38, "close_range trap must return ENOSYS");
  return { marker: mark, closeRange: call };
}
function vector(strings) {
  const buffers = strings.map(s => Buffer.from(s + "\0"));
  const pointers = new BigUint64Array(buffers.length + 1);
  buffers.forEach((buffer, i) => { pointers[i] = BigInt(ptr(buffer)); });
  return { buffers, pointers };
}
function reexec(fd) {
  const argv = vector([process.execPath, "run", "--no-install", process.argv[1]]);
  const env = vector(Object.entries({ ...process.env, PROBE_FD_REEXEC: "1", PROBE_FD: String(fd),
    PROBE_FD_PID: String(process.pid), PROBE_FD_PREEXEC: JSON.stringify(proof) }).map(([k, v]) => k + "=" + v));
  c.execve(ptr(argv.buffers[0]), ptr(argv.pointers), ptr(env.pointers));
  throw Error("same-PID execve failed: " + read.i32(errnoPointer));
}

let fd = -1;
try {
  if (mode === "startup-trap" && process.env.PROBE_FD_REEXEC === "1") {
    Object.assign(proof, JSON.parse(process.env.PROBE_FD_PREEXEC));
    fd = Number(process.env.PROBE_FD);
    check(Number.isInteger(fd) && fd >= 256 && fd < 512, "bounded inherited sentinel FD");
    check(process.pid === Number(process.env.PROBE_FD_PID), "reexec preserves supervised PID");
    const initialFlags = flags(fd);
    proof.startup = { samePid: true, inheritedOpen: initialFlags >= 0, cloexec: initialFlags >= 0 && (initialFlags & FD_CLOEXEC) !== 0,
      sentinelIdentity: readlinkSync("/proc/self/fd/" + fd).endsWith("/sentinel.txt") };
    proof.trap = trapProof(fd);
    check(proof.startup.inheritedOpen && proof.startup.sentinelIdentity, "startup must retain the inherited FD until exec");
    check(proof.startup.cloexec, "startup did not apply FD_CLOEXEC after trapped close_range");
  } else {
    writeFileSync("sentinel.txt", "fd-isolation-sentinel");
    const original = openSync("sentinel.txt", "r");
    try { fd = c.fcntl(original, 0, 256); } finally { closeSync(original); }
    check(fd >= 256 && fd < 512 && flags(fd) === 0, "open non-CLOEXEC sentinel");
    proof.before = { fd, open: true, cloexec: false };
    proof.nativeCloseRange = rawClose(fd);
    check(proof.nativeCloseRange.result === 0 ||
      (proof.nativeCloseRange.result === -1 && [22, 38].includes(proof.nativeCloseRange.errno)), "native close_range result");
    proof.nativeStillOpen = flags(fd) >= 0;
    check(proof.nativeStillOpen, "CLOEXEC must not immediately close the sentinel");
    proof.nativeCloexec = (flags(fd) & FD_CLOEXEC) !== 0;
    check(proof.nativeCloexec === (proof.nativeCloseRange.result === 0), "raw CLOEXEC semantics");
    check(c.fcntl(fd, F_SETFD, 0) === 0 && flags(fd) === 0, "clear sentinel CLOEXEC for isolation test");
    if (mode !== "spawn-native") {
      proof.policy = installTrap(); proof.trap = trapProof(fd);
      check(flags(fd) === 0, "trapped close_range must not masquerade as success");
    }
    if (mode === "startup-trap") reexec(fd);
    if (mode === "sigsys-listener") {
      let delivered = 0; const listener = () => { delivered++; };
      process.on("SIGSYS", listener);
      const during = trapProof(fd);
      process.kill(process.pid, "SIGSYS"); await Bun.sleep(100);
      check(delivered === 1, "ordinary SIGSYS reaches JS exactly once");
      process.removeListener("SIGSYS", listener);
      const after = trapProof(fd);
      proof.listener = { during, after, delivered };
    } else {
      // readlink inspects exactly our high sentinel without a shell or a Bun
      // startup that could hide a pre-exec leak by setting CLOEXEC afterwards.
      const args = ["/system/bin/toybox", "readlink", "/proc/self/fd/" + fd];
      const control = Bun.spawnSync(["/system/bin/toybox", "readlink", "/proc/self/fd/1"], { stdout: "pipe", stderr: "pipe" });
      // Bun can back synchronous stdout with memfd and asynchronous streams
      // with a socketpair; neither is required to be a POSIX pipe.
      const target = control.stdout.toString().trim();
      proof.control = { exitCode: control.exitCode, stdoutTarget: target.slice(0, 128),
        stderrEmpty: control.stderr.length === 0 };
      check(proof.control.exitCode === 0 && proof.control.stderrEmpty &&
        /^(?:(?:pipe|socket):\[\d+\]|\/memfd:spawn_stdio_stdout \(deleted\))$/.test(target), "child readlink positive control");
      const saved = mask(), blocked = mode === "blocked-sigsys";
      if (blocked) {
        const set = new BigUint64Array(16); set[0] = SIGSYS_BIT;
        check(c.sigprocmask(0, ptr(set), null) === 0, "block SIGSYS on spawning thread");
        check((mask()[0] & SIGSYS_BIT) !== 0n, "SIGSYS is blocked");
      }
      try {
        const sync = Bun.spawnSync(args, { stdout: "pipe", stderr: "pipe" });
        proof.sync = { sentinelAbsent: sync.exitCode === 1 && sync.stdout.length === 0, exitCode: sync.exitCode };
        check(proof.sync.sentinelAbsent, "spawnSync leaked sentinel or failed unexpectedly");
        if (blocked) {
          const child = Bun.spawnSync(["/system/bin/toybox", "cat", "/proc/self/status"], { stdout: "pipe", stderr: "pipe" });
          const bits = child.stdout.toString().match(/^SigBlk:\s*([0-9a-f]+)$/m);
          proof.mask = { childBlocked: child.exitCode === 0 && !!bits && (BigInt("0x" + bits[1]) & SIGSYS_BIT) !== 0n,
            callerStillBlocked: (mask()[0] & SIGSYS_BIT) !== 0n };
          check(proof.mask.childBlocked && proof.mask.callerStillBlocked, "spawn must preserve the caller/child mask");
        }
      } finally { check(c.sigprocmask(2, ptr(saved), null) === 0, "restore original signal mask"); }
      proof.maskRestored = mask()[0] === saved[0];
      const child = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
      const [out, err, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      proof.async = { sentinelAbsent: exit === 1 && out === "", exitCode: exit };
      check(proof.async.sentinelAbsent && err.length < 1024, "spawn leaked sentinel or failed unexpectedly");
    }
    proof.after = { parentOpen: flags(fd) >= 0, parentCloexec: (flags(fd) & FD_CLOEXEC) !== 0,
      sentinelIdentity: readlinkSync("/proc/self/fd/" + fd).endsWith("/sentinel.txt") };
    check(proof.after.parentOpen && !proof.after.parentCloexec && proof.after.sentinelIdentity, "child cleanup altered parent FD");
  }
  proof.passed = true;
} catch (error) { proof.error = String(error).slice(0, 256); process.exitCode = 1; }
finally { if (fd >= 0 && flags(fd) >= 0) closeSync(fd); }
console.log("FD_PROBE_RESULT=" + JSON.stringify(proof));
