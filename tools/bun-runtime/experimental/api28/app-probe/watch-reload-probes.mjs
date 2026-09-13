// Fixed two-reload experiment. Only this task's Bun child and private files are used.
import { dlopen, ptr, read } from "bun:ffi";
import { readFileSync, writeFileSync, openSync, closeSync, fstatSync, statSync,
  readlinkSync, existsSync } from "node:fs";
const mode = WATCH_RELOAD_MODE, trapped = mode === "trap";
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
const call = value => [Number(value), Number(value) === -1 ? read.i32(errno) : 0];
const marker = () => call(c.prctl(0x41554a36, 0n, 0n, 0n, 0n));
const rawClose = fd => call(c.syscall(436n, BigInt(fd), BigInt(fd), 4n, 0n, 0n, 0n));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function identity(fd) {
  if (flags(fd) < 0) return false;
  const a = fstatSync(fd), b = statSync("watch-sentinel.txt");
  return a.dev === b.dev && a.ino === b.ino;
}
function signalState() {
  const mask = new BigUint64Array(16), pending = new BigUint64Array(16);
  check(c.sigprocmask(0, null, ptr(mask)) === 0 && c.sigpending(ptr(pending)) === 0, "signal state");
  return [Number((mask[0] & bit) >> 30n), Number((pending[0] & bit) >> 30n)];
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
  check(same(marker(), [-1,22]), "native marker before inherited filter");
  check(c.prctl(38,1n,0n,0n,0n) === 0 && c.prctl(22,2n,BigInt(ptr(program)),0n,0n) === 0, "fixed inherited TRAP filter");
  check(same(marker(), [-1,38]), "TRAP marker after filter");
  return new Bun.CryptoHasher("sha256").update(filter).digest("hex");
}
async function watchedImage() {
  const generation = Number(readFileSync("watch-generation.txt", "utf8"));
  check([0,1,2].includes(generation) && c.gettid() === process.pid, "fixed generation/main thread");
  const row = { generation, pid: process.pid, uid: process.getuid(),
    inherited: [flags(256), identity(256), flags(257)], state: signalState(),
    stdio: [readlinkSync("/proc/self/fd/1"), readlinkSync("/proc/self/fd/2")] };
  // Preserve an observed leak as a failed assertion; only then close it to avoid
  // accumulating descriptors during the next fixed generation.
  for (const fd of [256,257]) if (flags(fd) >= 0) closeSync(fd);
  const original = openSync("watch-sentinel.txt", "r");
  try {
    check(c.fcntl(original, 0, 256) === 256 && c.fcntl(original, 0, 257) === 257, "two bounded sentinel FDs");
  } finally { closeSync(original); }
  check(identity(256) && identity(257) && flags(256) === 0 && flags(257) === 0, "sentinel identity/initial flags");
  let delivered = 0, deliveryTid = -1;
  const listener = () => { delivered++; deliveryTid = c.gettid(); };
  process.on("SIGSYS", listener);
  row.rawClose = rawClose(256); row.marker = marker();
  check(same(row.rawClose, [0,0]) || (row.rawClose[0] === -1 && [22,38].includes(row.rawClose[1])), "raw close_range control");
  check(identity(256) && flags(256) === (row.rawClose[0] === 0 ? 1 : 0), "raw CLOEXEC control retains sentinel");
  check(c.fcntl(256,2,0) === 0 && c.fcntl(257,2,1) === 0, "non-CLOEXEC and explicit CLOEXEC controls");
  row.prepared = [flags(256), flags(257)];
  await Bun.sleep(50);
  check(delivered === 0, "seccomp TRAP is not a user signal");
  check(same(call(c.syscall(process.arch === "arm64" ? 131n : 234n,
    BigInt(process.pid), BigInt(c.gettid()), 31n, 0n, 0n, 0n)), [0,0]), "owned ordinary SIGSYS");
  await Bun.sleep(100);
  row.delivery = [delivered, deliveryTid];
  process.removeListener("SIGSYS", listener);
  row.afterRemoval = marker();
  check(same(row.state, [0,0]) && delivered === 1 && deliveryTid === process.pid, "fresh per-image signal listener");
  console.log("WATCH_IMAGE_RESULT=" + JSON.stringify(row));
  setInterval(() => {}, 1000);
}
async function parent() {
  const proof = { schemaVersion: 1, mode, arch: process.arch, uid: process.getuid(),
    pid: process.pid, rows: [], passed: false };
  let child, timer, bytes = 0, timedOut = false, overflow = false, streamError;
  let stdoutTask, stderrTask, childDone = false, childOut = "", childErr = "";
  const stop = () => { if (child && !childDone) child.kill("SIGKILL"); };
  try {
    check(same(signalState(), [0,0]), "unblocked parent precondition");
    proof.beforeMarker = marker();
    check(same(proof.beforeMarker, [-1,22]), "native parent marker");
    if (trapped) proof.filterSha256 = installTrap();
    writeFileSync("watch-sentinel.txt", "fixed-watch-fd-sentinel");
    const source = readFileSync(import.meta.path, "utf8");
    const update = generation => {
      writeFileSync("watch-generation.txt", String(generation));
      writeFileSync("watch-entry.mjs", source + "\n// fixed generation " + generation + "\n");
    };
    update(0);
    child = Bun.spawn([process.execPath, "run", "--watch", "--no-install", "watch-entry.mjs"], {
      env: { ...process.env, WATCH_PROBE_CHILD: "1", NO_COLOR: "1" },
      stdin: "ignore", stdout: "pipe", stderr: "pipe",
    });
    proof.childPid = child.pid;
    child.exited.then(() => { childDone = true; });
    timer = setTimeout(() => { timedOut = true; stop(); }, 6000);
    const drain = async (stream, stdout) => {
      const decoder = new TextDecoder(); let buffered = "";
      try {
        for await (const chunk of stream) {
          bytes += chunk.length;
          if (bytes > 8192) { overflow = true; stop(); continue; }
          const text = decoder.decode(chunk, { stream: true });
          if (stdout) childOut += text; else childErr += text;
          if (!stdout) continue;
          buffered += text;
          let newline;
          while ((newline = buffered.indexOf("\n")) >= 0) {
            const line = buffered.slice(0,newline).trim(); buffered = buffered.slice(newline+1);
            if (!line.startsWith("WATCH_IMAGE_RESULT=")) continue;
            check(line.length <= 1024 && proof.rows.length < 3, "bounded exact image records");
            proof.rows.push(JSON.parse(line.slice("WATCH_IMAGE_RESULT=".length)));
          }
        }
      } catch (error) { streamError = String(error).slice(0,120); stop(); }
    };
    stdoutTask = drain(child.stdout, true); stderrTask = drain(child.stderr, false);
    for (let generation = 0; generation < 3; generation++) {
      while (proof.rows.length <= generation && !childDone && !timedOut && !overflow && !streamError) await Bun.sleep(10);
      check(proof.rows.length === generation + 1, "expected actual watch generation " + generation);
      check(proof.rows[generation].generation === generation, "ordered image generations");
      if (generation < 2) update(generation + 1);
    }
    proof.reloads = 2;
  } catch (error) { proof.error = String(error).slice(0,160); }
  finally {
    if (timer) clearTimeout(timer);
    if (child) {
      stop(); await child.exited; await Promise.all([stdoutTask, stderrTask]);
      proof.cleanup = { signal: child.signalCode, gone: !existsSync("/proc/" + child.pid),
        timedOut, overflow, bytes };
    }
    if (streamError) proof.streamError = streamError;
  }
  const markerValue = trapped ? [-1,38] : [-1,22];
  const semantic = proof.rows.length === 3 && proof.rows.every((row,i) =>
    row.generation === i && row.pid === proof.childPid && row.uid === proof.uid &&
    same(row.inherited, [-1,false,-1]) && same(row.state, [0,0]) && same(row.prepared, [0,1]) &&
    same(row.delivery, [1,proof.childPid]) && same(row.marker,markerValue) && same(row.afterRemoval,markerValue) &&
    same(row.stdio,proof.rows[0].stdio) && (!trapped || same(row.rawClose,[-1,38])));
  proof.passed = !proof.error && !proof.streamError && semantic && proof.reloads === 2 &&
    proof.cleanup?.signal === "SIGKILL" && proof.cleanup.gone && !timedOut && !overflow;
  if (!semantic && !proof.error) proof.error = "watch image FD/signal/stdio semantics failed";
  if (proof.rows.length === 0) proof.diagnostic = (childOut + childErr).slice(0,300);
  const line = "WATCH_RELOAD_RESULT=" + JSON.stringify(proof);
  check(Buffer.byteLength(line) <= 2048, "bounded watch evidence");
  console.log(line);
  process.exitCode = proof.passed ? 0 : 1;
}
if (process.env.WATCH_PROBE_CHILD === "1") await watchedImage(); else await parent();
