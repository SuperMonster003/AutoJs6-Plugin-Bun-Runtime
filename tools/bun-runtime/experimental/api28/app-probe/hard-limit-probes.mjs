// Fixed, offline application-child fixture. Only this disposable Bun process
// lowers its hard limit; neither Android, the supervisor nor other apps change.
import { dlopen, ptr, read } from "bun:ffi";
import { openSync, closeSync, fstatSync, statSync, readFileSync, writeFileSync } from "node:fs";
const mode = HARD_LIMIT_MODE, trap = mode.endsWith("-trap"), startup = mode.startsWith("startup-");
const check = (ok, message) => { if (!ok) throw Error(message); };
check(["startup-native", "startup-trap", "spawn-native", "spawn-trap"].includes(mode), "fixed mode");
check(process.platform === "android" && ["arm64", "x64"].includes(process.arch), "native Android ABI");
check(process.getuid() >= 10000, "ordinary application UID");
const c = dlopen("libc.so", {
  fcntl: { args: ["i32", "i32", "i32"], returns: "i32" },
  prctl: { args: ["i32", "u64", "u64", "u64", "u64"], returns: "i32" },
  syscall: { args: ["i64", "i64", "i64", "i64", "i64", "i64", "i64"], returns: "i64" },
  __errno: { args: [], returns: "ptr" },
  getrlimit: { args: ["i32", "ptr"], returns: "i32" },
  setrlimit: { args: ["i32", "ptr"], returns: "i32" },
  sysconf: { args: ["i32"], returns: "i64" },
  execve: { args: ["ptr", "ptr", "ptr"], returns: "i32" },
}).symbols;
const errno = c.__errno(), flags = fd => c.fcntl(fd, 1, 0);
const call = result => ({ result: Number(result), errno: Number(result) === -1 ? read.i32(errno) : 0 });
const rawClose = fd => call(c.syscall(436n, BigInt(fd), BigInt(fd), 4n, 0n, 0n, 0n));
const marker = () => call(c.prctl(0x41554a36, 0n, 0n, 0n, 0n));
function nofile() {
  const pair = new BigUint64Array(2);
  check(c.getrlimit(7, ptr(pair)) === 0, "getrlimit");
  const values = [...pair].map(Number);
  check(values.every(n => Number.isSafeInteger(n) && n >= 0 && n <= 0x7fffffff), "finite limits");
  return { soft: values[0], hard: values[1], openMax: Number(c.sysconf(0x000b)) };
}
function procLimits(text) {
  check(text.length <= 16384, "bounded proc limits");
  const match = text.match(/^Max open files[ \t]+(\d+)[ \t]+(\d+)[ \t]+files[ \t]*$/m);
  check(match, "observable Max open files");
  return [Number(match[1]), Number(match[2])];
}
function installTrap() {
  const instructions = [
    [0x20,0,0,4], [0x15,1,0,process.arch === "arm64" ? 0xc00000b7 : 0xc000003e], [0x06,0,0,0x80000000],
    [0x20,0,0,0], [0x15,4,0,436], [0x15,0,4,process.arch === "arm64" ? 167 : 157],
    [0x20,0,0,16], [0x15,1,0,0x41554a36], [0x06,0,0,0x7fff0000],
    [0x06,0,0,0x00030000], [0x06,0,0,0x7fff0000],
  ];
  const filter = Buffer.alloc(instructions.length * 8), program = Buffer.alloc(16);
  instructions.forEach(([code,jt,jf,k],i) => {
    filter.writeUInt16LE(code,i*8); filter[i*8+2]=jt; filter[i*8+3]=jf; filter.writeUInt32LE(k,i*8+4);
  });
  program.writeUInt16LE(instructions.length); program.writeBigUInt64LE(BigInt(ptr(filter)),8);
  const before = marker(); check(before.result === -1 && before.errno === 22, "native marker");
  check(c.prctl(38,1n,0n,0n,0n) === 0 && c.prctl(22,2n,BigInt(ptr(program)),0n,0n) === 0, "thread-local TRAP policy");
  const after = marker(); check(after.result === -1 && after.errno === 38, "TRAP marker");
  return { before, after, sha256: new Bun.CryptoHasher("sha256").update(filter).digest("hex") };
}
function vector(strings) {
  const buffers = strings.map(s => Buffer.from(s + "\0")), pointers = new BigUint64Array(buffers.length + 1);
  buffers.forEach((b,i) => { pointers[i] = BigInt(ptr(b)); }); return { buffers, pointers };
}
function reexec(proof) {
  const argv = vector([process.execPath, "run", "--no-install", process.argv[1]]);
  const env = vector(Object.entries({ ...process.env, PROBE_HARD_REEXEC: JSON.stringify(proof) }).map(([k,v]) => k + "=" + v));
  c.execve(ptr(argv.buffers[0]),ptr(argv.pointers),ptr(env.pointers));
  throw Error("same-PID exec failed: " + read.i32(errno));
}
async function childObservation(args, asynchronous) {
  const options = { stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 1500, maxBuffer: 16384 };
  if (!asynchronous) {
    const child = Bun.spawnSync(args, options);
    check(!child.exitedDueToTimeout && !child.exitedDueToMaxBuffer, "bounded sync child");
    return { exitCode: child.exitCode, out: child.stdout.toString(), err: child.stderr.toString() };
  }
  const child = Bun.spawn(args, { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  let bytes = 0, timedOut = false, overflow = false;
  const drain = async stream => {
    const chunks = [];
    for await (const chunk of stream) {
      bytes += chunk.length;
      if (bytes > 16384) { overflow = true; child.kill("SIGKILL"); } else chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString();
  };
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, 1500);
  try {
    const [out, err, exitCode] = await Promise.all([drain(child.stdout), drain(child.stderr), child.exited]);
    check(!timedOut && !overflow, "bounded asynchronous child");
    return { out, err, exitCode };
  } finally { clearTimeout(timer); if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
}
let fd = -1, proof = { schemaVersion: 1, mode, arch: process.arch, uid: process.getuid(), pid: process.pid, passed: false };
try {
  if (process.env.PROBE_HARD_REEXEC) {
    check(startup, "reexec only for startup");
    const retained = JSON.parse(process.env.PROBE_HARD_REEXEC);
    check(retained.pid === process.pid && retained.uid === process.getuid() && retained.mode === mode, "same supervised PID and UID");
    proof = retained; fd = proof.fd;
    check(fd >= 256 && fd < 512 && flags(fd) === 1, "startup preserves and marks the above-hard-limit FD");
    proof.startup = { samePid: true, inheritedOpen: true, cloexec: true };
  } else {
    proof.before = nofile();
    check(proof.before.soft >= 512 && proof.before.hard >= proof.before.soft && proof.before.openMax === proof.before.soft, "original nofile precondition");
    proof.supervisorBefore = procLimits(readFileSync("/proc/" + process.ppid + "/limits", "utf8"));
    check(proof.supervisorBefore[0] >= 512 && proof.supervisorBefore[1] >= proof.supervisorBefore[0], "unmodified supervisor limit");
    writeFileSync("hard-sentinel.txt", "hard-limit-fd-sentinel");
    const original = openSync("hard-sentinel.txt", "r");
    try { fd = c.fcntl(original, 0, 256); } finally { closeSync(original); }
    check(fd >= 256 && fd < 512 && flags(fd) === 0, "bounded non-CLOEXEC sentinel");
    proof.fd = fd; proof.nativeCloseRange = rawClose(fd);
    check(proof.nativeCloseRange.result === 0 || (proof.nativeCloseRange.result === -1 && [22,38].includes(proof.nativeCloseRange.errno)), "native raw close_range control");
    check(flags(fd) === (proof.nativeCloseRange.result === 0 ? 1 : 0), "native marking does not close the FD");
    check(c.fcntl(fd,2,0) === 0 && flags(fd) === 0, "clear CLOEXEC before experiment");
    if (trap) proof.policy = installTrap();
    check(c.setrlimit(7,ptr(new BigUint64Array([128n,128n]))) === 0, "lower only this Bun process's soft AND hard limits");
    proof.during = nofile();
    check(proof.during.soft === 128 && proof.during.hard === 128 && proof.during.openMax === 128 && flags(fd) === 0, "sentinel survives above lowered hard limit");
    proof.raiseAttempt = call(c.setrlimit(7,ptr(new BigUint64Array([BigInt(proof.before.soft),BigInt(proof.before.hard)]))));
    check(proof.raiseAttempt.result === -1 && proof.raiseAttempt.errno === 1, "unprivileged hard limit cannot be restored");
    if (startup) reexec(proof);
  }
  check(JSON.stringify(nofile()) === JSON.stringify({soft:128,hard:128,openMax:128}), "hard limit persists across exec/spawn work");
  const opened = fstatSync(fd), named = statSync("hard-sentinel.txt");
  proof.sentinelIdentity = opened.ino === named.ino && opened.dev === named.dev;
  check(proof.sentinelIdentity, "exact sentinel inode/device identity, independent of Android path aliases");
  if (trap) {
    proof.trap = { marker: marker(), closeRange: rawClose(fd) };
    check(Object.values(proof.trap).every(r => r.result === -1 && r.errno === 38), "inherited raw TRAP-to-ENOSYS controls");
    check(flags(fd) === (startup ? 1 : 0), "TRAP preserves expected parent descriptor flags");
  }
  if (!startup) {
    for (const [name, asynchronous] of [["sync",false],["async",true]]) {
      const positive = await childObservation(["/system/bin/toybox","readlink","/proc/self/fd/1"],asynchronous);
      check(positive.exitCode === 0 && positive.err === "" && /^(?:(?:pipe|socket):\[\d+\]|\/memfd:spawn_stdio_stdout \(deleted\))$/.test(positive.out.trim()), "non-Bun child FD positive control");
      const sentinel = await childObservation(["/system/bin/toybox","readlink","/proc/self/fd/"+fd],asynchronous);
      const limits = await childObservation(["/system/bin/toybox","cat","/proc/self/limits"],asynchronous);
      check(limits.exitCode === 0 && limits.err === "", "child limit observation");
      proof[name] = { positive: true, sentinelAbsent: sentinel.exitCode === 1 && sentinel.out === "", exitCode: sentinel.exitCode,
        limits: procLimits(limits.out) };
      check(sentinel.err.length < 1024 && proof[name].sentinelAbsent && JSON.stringify(proof[name].limits) === "[128,128]", "non-Bun child must not inherit above-hard-limit sentinel");
    }
  }
  proof.after = nofile(); proof.parentFlags = flags(fd);
  check(proof.parentFlags === (startup ? 1 : 0), "child cleanup preserves parent FD");
  proof.supervisorAfter = procLimits(readFileSync("/proc/" + process.ppid + "/limits", "utf8"));
  check(JSON.stringify(proof.supervisorAfter) === JSON.stringify(proof.supervisorBefore), "supervisor limits unchanged");
  proof.passed = true;
} catch (error) { proof.error = String(error).slice(0,256); process.exitCode = 1; }
finally { if (fd >= 0 && flags(fd) >= 0) closeSync(fd); }
console.log("HARD_LIMIT_RESULT=" + JSON.stringify(proof));
