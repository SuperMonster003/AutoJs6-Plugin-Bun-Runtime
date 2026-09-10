// The builder prepends SYSCALL_MODE. Fixed test-only, calling-thread filters;
// no TSYNC, system policy changes, shell commands, or production API changes.
import { dlopen, ptr, read } from "bun:ffi";
import { copyFileSync, writeFileSync, readFileSync, statSync, existsSync, unlinkSync,
  readdirSync, readlinkSync } from "node:fs";
import { release } from "node:os";

const mode = SYSCALL_MODE, arm = process.arch === "arm64";
const proof = { schemaVersion: 1, mode, arch: process.arch, kernel: release(), passed: false };
const check = (value, message) => { if (!value) throw Error(message); };
const digest = value => new Bun.CryptoHasher("sha256").update(value).digest("hex");
const libc = dlopen("libc.so", {
  syscall: { args: ["i64", "i64", "i64", "i64", "i64", "i64", "i64"], returns: "i64" },
  prctl: { args: ["i32", "u64", "u64", "u64", "u64"], returns: "i32" },
  __errno: { args: [], returns: "ptr" },
});
const c = libc.symbols, errnoPointer = c.__errno(), MAGIC = 0x41554a36;
// Invalid, non-mutating arguments: no clone child, open FD, chmod, or blocking wait.
const calls = [
  ["pidfd_open", 434, [0, 0]], ["clone3", 435, [0, 0]],
  ["epoll_pwait2", 441, [-1, 0, 0, 0, 0, 8]],
  ["copy_file_range", arm ? 285 : 326, [-1, 0, -1, 0, 0, 0]],
  ["openat2", 437, [-1, 0, 0, 0]], ["fchmodat2", 452, [-1, 0, 0, 0]],
];
const result = value => ({ result: Number(value), errno: Number(value) === -1 ? read.i32(errnoPointer) : 0 });
const raw = call => result(c.syscall(BigInt(call[1]), ...Array.from({ length: 6 }, (_, i) => BigInt(call[2][i] ?? 0))));
const marker = () => result(c.prctl(MAGIC, 0n, 0n, 0n, 0n));
const isError = (call, errno) => call.result === -1 && call.errno === errno;
function install(numbers, action, beforeErrno, afterErrno) {
  const instructions = [
    [0x20, 0, 0, 4], [0x15, 1, 0, arm ? 0xc00000b7 : 0xc000003e], [0x06, 0, 0, 0x80000000],
    [0x20, 0, 0, 0],
    ...numbers.flatMap(nr => [[0x15, 0, 1, nr], [0x06, 0, 0, action]]),
    [0x15, 0, 3, arm ? 167 : 157], [0x20, 0, 0, 16], [0x15, 0, 1, MAGIC],
    [0x06, 0, 0, action], [0x06, 0, 0, 0x7fff0000],
  ];
  const filter = Buffer.alloc(instructions.length * 8), program = Buffer.alloc(16);
  instructions.forEach(([code, jt, jf, k], i) => {
    filter.writeUInt16LE(code, i * 8); filter[i * 8 + 2] = jt; filter[i * 8 + 3] = jf;
    filter.writeUInt32LE(k, i * 8 + 4);
  });
  program.writeUInt16LE(instructions.length); program.writeBigUInt64LE(BigInt(ptr(filter)), 8);
  const before = marker(); check(isError(before, beforeErrno), "pre-filter marker");
  check(c.prctl(38, 1n, 0n, 0n, 0n) === 0, "NO_NEW_PRIVS");
  check(c.prctl(22, 2n, BigInt(ptr(program)), 0n, 0n) === 0, "install calling-thread filter");
  const after = marker(); check(isError(after, afterErrno), "post-filter marker");
  return { installed: true, before, after, filterSha256: digest(filter) };
}
const files = [];
function own(name, data, options) {
  check(!existsSync(name), "fixture path already exists"); files.push(name);
  if (data !== undefined) writeFileSync(name, data, { ...options, flag: "wx" });
  return name;
}
function remove(name) { if (existsSync(name)) unlinkSync(name); }
function noFileDescriptors(names) {
  const targets = names.map(name => process.cwd() + "/" + name);
  for (const fd of readdirSync("/proc/self/fd")) {
    let target;
    try { target = readlinkSync("/proc/self/fd/" + fd); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    check(!targets.some(name => target === name || target === name + " (deleted)"), "fixture file descriptor leaked");
  }
}
try {
  check(["arm64", "x64"].includes(process.arch), "native 64-bit ABI");
  if (mode === "raw-controls") {
    proof.calls = calls.map(call => ({ name: call[0], nr: call[1], before: raw(call) }));
    for (const call of proof.calls) check(call.before.result === -1 &&
      [1, 2, 9, 14, 22, 38, 95].includes(call.before.errno), "invalid-argument native control");
    proof.trapPolicy = install(calls.map(call => call[1]), 0x00030000, 22, 38);
    proof.calls.forEach((entry, i) => {
      entry.after = raw(calls[i]); check(isError(entry.after, 38), entry.name + " TRAP did not become ENOSYS");
    });
  } else {
    check(["copy-range", "pidfd"].includes(mode), "fixed syscall mode");
    const target = calls.find(call => call[0] === (mode === "copy-range" ? "copy_file_range" : "pidfd_open"));
    proof.target = target[0]; proof.nr = target[1]; proof.native = raw(target);
    proof.errorPolicy = install([target[1]], 0x00050005, 22, 5);
    proof.injected = raw(target);
    check(proof.injected.result === -1 && [5, 38].includes(proof.injected.errno), "EIO or higher-precedence TRAP required");
    const kernel = proof.kernel.match(/^(\d+)\.(\d+)\./); check(kernel, "kernel version");
    const kernelGated = mode === "copy-range" && (+kernel[1] < 4 || (+kernel[1] === 4 && +kernel[2] < 5));
    proof.path = proof.injected.errno === 38 ? "policy-gated" : kernelGated ? "kernel-gated" : "exercised";
    let operate;
    if (mode === "copy-range") {
      // Exact upstream test flag: prevent FICLONE from bypassing copy_file_range.
      process.env.BUN_CONFIG_DISABLE_ioctl_ficlonerange = "1";
      delete process.env.BUN_CONFIG_DISABLE_COPY_FILE_RANGE;
      const data = Buffer.from("syscall-copy-\u4e2d\u6587-\ud83d\ude80\n".repeat(4096));
      const source = own("syscall-source.dat", data, { mode: 0o600 });
      proof.contentSha256 = digest(data); proof.contentBytes = data.length;
      operate = async index => {
        const destination = own("syscall-copy-" + index + ".dat");
        try {
          copyFileSync(source, destination);
          const bytes = readFileSync(destination), permissions = statSync(destination).mode & 0o777;
          check(bytes.equals(data) && permissions === 0o600, "copied bytes/mode");
          return { contentSha256: digest(bytes), bytes: bytes.length, mode: permissions };
        } finally { remove(destination); noFileDescriptors([source, destination]); }
      };
    } else {
      const child = own("syscall-child.js", "console.log('pidfd-child-ok');process.exit(17);\n");
      operate = async () => {
        const processChild = Bun.spawn([process.execPath, "run", "--no-install", child],
          { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(processChild.stdout).text(), new Response(processChild.stderr).text(), processChild.exited,
        ]);
        const childGone = !existsSync("/proc/" + processChild.pid);
        check(stdout === "pidfd-child-ok\n" && stderr === "" && exitCode === 17 && childGone, "async wait/output/reap");
        return { exitCode, stdout, stderr, childGone };
      };
    }
    try { await operate("control"); proof.errorControl = "not-observable"; }
    catch (error) { check(error.code === "EIO", "unexpected control error: " + error.code); proof.errorControl = "EIO"; }
    check(proof.errorControl === (proof.path === "exercised" ? "EIO" : "not-observable"), "call-path control mismatch");
    // TRAP has higher precedence than ERRNO, including our earlier EIO filter.
    proof.trapPolicy = install([target[1]], 0x00030000, 5, 38);
    proof.trapped = raw(target); check(isError(proof.trapped, 38), "target TRAP must become ENOSYS");
    proof.operations = [await operate("first"), await operate("cached")];
    if (mode === "copy-range") {
      proof.sourceUnchanged = digest(readFileSync("syscall-source.dat")) === proof.contentSha256;
      check(proof.sourceUnchanged, "copy changed source"); proof.fileDescriptorsClosed = true;
    }
  }
  proof.passed = true;
} catch (error) { proof.error = String(error.message ?? error).slice(0, 256); }
finally {
  try { for (const file of files) remove(file); proof.filesRemoved = files.every(file => !existsSync(file)); }
  catch (error) { proof.passed = false; proof.error = "fixture cleanup: " + String(error.message).slice(0, 160); }
}
const output = "SYSCALL_PROBE_RESULT=" + JSON.stringify(proof);
if (output.length > 2048) throw Error("syscall evidence exceeds fixed bound");
console.log(output);
if (!proof.passed) process.exitCode = 1;
