// Fixed pending-signal follow-up. The historical blocked-async fixture remains
// byte-identical; do not warm pidfd or unblock until all three children are reaped.
import { dlopen, ptr, read } from "bun:ffi";
import { openSync, closeSync, fstatSync, statSync, writeFileSync, existsSync } from "node:fs";
const mode = PENDING_SIGNAL_MODE, trapped = mode === "trap";
const check = (ok, message) => { if (!ok) throw Error(message); };
check(["native", "trap"].includes(mode), "fixed mode");
check(process.platform === "android" && ["arm64", "x64"].includes(process.arch), "native Android ABI");
check(process.getuid() >= 10000, "application UID");
const c = dlopen("libc.so", {
  fcntl: { args: ["i32", "i32", "i32"], returns: "i32" },
  prctl: { args: ["i32", "u64", "u64", "u64", "u64"], returns: "i32" },
  syscall: { args: ["i64", "i64", "i64", "i64", "i64", "i64", "i64"], returns: "i64" },
  __errno: { args: [], returns: "ptr" },
  sigprocmask: { args: ["i32", "ptr", "ptr"], returns: "i32" },
  sigpending: { args: ["ptr"], returns: "i32" },
  gettid: { args: [], returns: "i32" },
}).symbols;
const errno = c.__errno(), flags = fd => c.fcntl(fd, 1, 0), bit = 1n << 30n;
const call = result => ({ result: Number(result), errno: Number(result) === -1 ? read.i32(errno) : 0 });
const rawClose = fd => call(c.syscall(436n, BigInt(fd), BigInt(fd), 4n, 0n, 0n, 0n));
const marker = () => call(c.prctl(0x41554a36, 0n, 0n, 0n, 0n));
const hex = value => value.toString(16).padStart(16, "0");
function mask() {
  const value = new BigUint64Array(16);
  check(c.sigprocmask(0, null, ptr(value)) === 0, "read calling-thread mask");
  return value;
}
function pending() {
  const value = new BigUint64Array(16);
  check(c.sigpending(ptr(value)) === 0, "read calling-thread pending signals");
  return value[0];
}
let delivered = 0;
const deliveryTids = [], listener = () => { delivered++; deliveryTids.push(c.gettid()); };
const observation = () => [c.gettid(), hex(mask()[0])];
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
const saved = mask(), tid = c.gettid(), blocked = hex(saved[0] | bit);
check((saved[0] & bit) === 0n && tid === process.pid, "unblocked main-thread precondition");
const stillBlocked = () => {
  const result = observation();
  check(result[0] === tid && result[1] === blocked, "same calling thread remains exactly blocked");
  const state = [Number((pending() & bit) >> 30n), delivered];
  proof.pending.checks.push(state);
  check(state[0] === 1 && state[1] === 0, "pending SIGSYS remains queued without early JS delivery");
  return result;
};
async function childObservation(kind, args) {
  stillBlocked();
  const child = Bun.spawn(["/system/bin/toybox", ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  let bytes = 0, timedOut = false, overflow = false;
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, 1500);
  const drain = async stream => {
    const chunks = [];
    for await (const chunk of stream) {
      bytes += chunk.length;
      if (bytes > 8192) { overflow = true; child.kill("SIGKILL"); } else chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString();
  };
  try {
    const immediate = stillBlocked();
    const [out, err, exitCode] = await Promise.all([drain(child.stdout), drain(child.stderr), child.exited]);
    const after = stillBlocked();
    check(!timedOut && !overflow, "bounded async child");
    check(child.signalCode === null && child.exitCode === exitCode, "observed normal exit");
    check(!existsSync("/proc/" + child.pid), "owned child reaped before observation");
    const result = { kind, pid: child.pid, exitCode, immediate, after, gone: true };
    if (kind === "positive") {
      check(exitCode === 0 && err === "" && /^(?:pipe|socket):\[\d+\]$/.test(out.trim()), "non-Bun stdout FD positive control");
      result.stdoutTarget = out.trim();
    } else if (kind === "sentinel") {
      check(exitCode === 1 && out === "", "non-Bun child cannot inherit sentinel");
      result.sentinelAbsent = true;
    } else {
      check(exitCode === 0 && err === "", "child status observation");
      const field = name => { const m = out.match(new RegExp("^" + name + ":[ \\t]+([^\\n]+)$", "m")); check(m, "child status field " + name); return m[1].trim(); };
      check(Number(field("Pid")) === child.pid && Number(field("PPid")) === process.pid, "child identity and parentage");
      const uids = field("Uid").split(/\s+/).map(Number);
      check(uids.length === 4 && uids.every(uid => uid === process.getuid()), "child retains application UID");
      result.childMask = field("SigBlk"); result.ppid = Number(field("PPid")); result.uid = uids[0];
      result.childPending = [field("SigPnd"), field("ShdPnd")];
      check(result.childPending.every(value => (BigInt("0x" + value) & bit) === 0n), "child does not inherit pending SIGSYS");
      check(result.childMask === blocked, "exec preserves exact blocked mask");
      check(field("Seccomp") === "2", "child remains filtered");
    }
    return result;
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null) child.kill("SIGKILL");
    await child.exited;
  }
}
let fd = -1;
const proof = { schemaVersion: 1, mode, arch: process.arch, uid: process.getuid(), pid: process.pid,
  before: [tid, hex(saved[0])], blocked, rows: [], passed: false };
try {
  writeFileSync("async-sentinel.txt", "async-signal-fd-sentinel");
  const original = openSync("async-sentinel.txt", "r");
  try { fd = c.fcntl(original, 0, 256); } finally { closeSync(original); }
  check(fd >= 256 && fd < 512 && flags(fd) === 0, "bounded non-CLOEXEC sentinel");
  proof.fd = fd; proof.nativeCloseRange = rawClose(fd);
  check(proof.nativeCloseRange.result === 0 || (proof.nativeCloseRange.result === -1 && [22,38].includes(proof.nativeCloseRange.errno)), "native close_range control");
  check(flags(fd) === (proof.nativeCloseRange.result === 0 ? 1 : 0), "native control preserves open FD");
  check(c.fcntl(fd,2,0) === 0 && flags(fd) === 0, "clear control CLOEXEC");
  if (trapped) {
    proof.policy = installTrap(); proof.trap = rawClose(fd);
    check(proof.trap.result === -1 && proof.trap.errno === 38 && flags(fd) === 0, "raw TRAP control before blocking");
  }
  const beforePending = pending();
  check((beforePending & bit) === 0n && process.listenerCount("SIGSYS") === 0, "clean signal/listener precondition");
  proof.pending = { before: hex(beforePending), checks: [] };
  process.on("SIGSYS", listener);
  check(c.sigprocmask(0, ptr(new BigUint64Array([bit])), null) === 0, "block only SIGSYS");
  try {
    // tgkill targets this exact thread; process.kill could choose another unblocked thread.
    proof.pending.queueResult = call(c.syscall(process.arch === "arm64" ? 131n : 234n,
      BigInt(process.pid), BigInt(tid), 31n, 0n, 0n, 0n));
    check(proof.pending.queueResult.result === 0, "queue one ordinary thread-directed SIGSYS");
    proof.pending.queued = hex(pending());
    check(proof.pending.queued === hex(beforePending | bit), "exact queued signal state");
    stillBlocked();
    proof.rows.push(await childObservation("positive", ["readlink", "/proc/self/fd/1"]));
    proof.rows.push(await childObservation("sentinel", ["readlink", "/proc/self/fd/" + fd]));
    proof.rows.push(await childObservation("status", ["cat", "/proc/self/status"]));
  } finally { check(c.sigprocmask(2, ptr(saved), null) === 0, "restore original mask"); }
  proof.restored = observation();
  check(proof.restored[0] === tid && proof.restored[1] === hex(saved[0]), "same-thread exact mask restoration");
  await Bun.sleep(100);
  proof.pending.after = hex(pending());
  proof.pending.deliveryTids = deliveryTids;
  check(proof.pending.after === proof.pending.before && delivered === 1 && deliveryTids[0] === tid,
    "pending signal delivered exactly once on original JS thread after restoration");
  process.removeListener("SIGSYS", listener);
  proof.pending.listenerCount = process.listenerCount("SIGSYS");
  check(proof.pending.listenerCount === 0, "last SIGSYS listener removed");
  proof.pending.afterRemoval = marker();
  check(proof.pending.afterRemoval.result === -1 && proof.pending.afterRemoval.errno === (trapped ? 38 : 22),
    "listener removal preserves native or TRAP marker behavior");
  if (trapped) {
    // Never call a deliberately trapped raw syscall while SIGSYS is blocked.
    proof.postMarker = marker(); check(proof.postMarker.result === -1 && proof.postMarker.errno === 38, "post-restore TRAP control");
  }
  const opened = fstatSync(fd), named = statSync("async-sentinel.txt");
  proof.sentinelIdentity = opened.ino === named.ino && opened.dev === named.dev;
  proof.parentFlags = flags(fd);
  check(proof.sentinelIdentity && proof.parentFlags === 0, "parent retains exact non-CLOEXEC sentinel");
  proof.passed = true;
} catch (error) { proof.error = String(error.message).slice(0, 160); process.exitCode = 1; }
finally { process.removeListener("SIGSYS", listener); if (fd >= 0) closeSync(fd); }
const line = "PENDING_SIGNAL_RESULT=" + JSON.stringify(proof);
check(Buffer.byteLength(line) <= 2048, "bounded semantic record");
console.log(line);
