// Fixed offline runtime API fixture. Test data stays inside this owned execution.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { watch } from "node:fs";
import { join } from "node:path";
const mode = "files";
assert.equal(process.platform, "android");
assert(["arm64", "x64"].includes(process.arch));
assert.equal(Bun.version, "1.4.0");
const auxv = readFileSync("/proc/self/auxv"), pageEntries = [];
assert(auxv.length <= 8192 && auxv.length % 16 === 0);
for (let offset = 0; offset < auxv.length; offset += 16) {
  const type = auxv.readBigUInt64LE(offset);
  if (!type) break;
  if (type === 6n) pageEntries.push(Number(auxv.readBigUInt64LE(offset + 8)));
}
assert.deepEqual(pageEntries, [4096]);
const mappings = [...new Set([...readFileSync("/proc/self/smaps", "utf8").matchAll(/^KernelPageSize:\s+(\d+) kB$/gm)].map(m => Number(m[1]) * 1024))];
assert.deepEqual(mappings, [4096]);
const workspace = process.cwd(), started = performance.now();
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const result = { schemaVersion: 1, mode, platform: process.platform, arch: process.arch,
  version: Bun.version, revision: Bun.revision, uid: process.getuid(), pid: process.pid,
  pages: pageEntries[0], pageSizeSource: "/proc/self/auxv AT_PAGESZ", kernelMappingPages: mappings[0], workspace };
const watchdog = setTimeout(() => { console.error("RUNTIME_API_DEADLINE=" + mode); process.exit(73); }, 8000);
try {
  const directory = join(workspace, "api-files"), original = join(directory, "源-😀.txt");
  const copied = join(directory, "copy.bin"), renamed = join(directory, "renamed-π.bin");
  const watched = join(directory, "watched-汉.txt");
  const payload = Buffer.from("Bun Runtime π 汉 😀\n".repeat(128));
  await fs.mkdir(directory); // Exclusive ownership before any cleanup is allowed.
  let watcher, watcherClosed = false;
  try {
    await fs.writeFile(original, payload, { flag: "wx" });
    let exclusiveCreateCode;
    try { await fs.writeFile(original, "must-not-replace", { flag: "wx" }); }
    catch (error) { exclusiveCreateCode = error.code; }
    assert.equal(exclusiveCreateCode, "EEXIST");
    assert.deepEqual(await fs.readFile(original), payload);
    await fs.copyFile(original, copied, fs.constants.COPYFILE_EXCL);
    let exclusiveCopyCode;
    try { await fs.copyFile(original, copied, fs.constants.COPYFILE_EXCL); }
    catch (error) { exclusiveCopyCode = error.code; }
    assert.equal(exclusiveCopyCode, "EEXIST");
    await fs.rename(copied, renamed);
    let oldPathCode;
    try { await fs.stat(copied); } catch (error) { oldPathCode = error.code; }
    assert.equal(oldPathCode, "ENOENT");
    const readback = await fs.readFile(renamed);
    assert.deepEqual(readback, payload);
    const handle = await fs.open(renamed, "r");
    let partial;
    try {
      const buffer = Buffer.alloc(37), read = await handle.read(buffer, 0, buffer.length, 7);
      assert.equal(read.bytesRead, 37); partial = buffer;
      assert.deepEqual(partial, payload.subarray(7, 44));
    } finally { await handle.close(); }
    const events = [];
    let notify, rejectWatch, watchError;
    const observed = new Promise((resolve, reject) => { notify = resolve; rejectWatch = reject; });
    watcher = watch(directory, (type, filename) => {
      try {
        assert(events.length < 64); assert(["rename", "change"].includes(type));
        assert.equal(String(filename), "watched-汉.txt");
        events.push({ type, filename: String(filename) }); notify();
      } catch (error) { watchError = error; rejectWatch(error); }
    });
    watcher.on("error", error => { watchError = error; rejectWatch(error); });
    const closed = new Promise(resolve => watcher.once("close", () => { watcherClosed = true; resolve(); }));
    await fs.writeFile(watched, payload);
    await observed;
    assert.deepEqual(await fs.readFile(watched), payload);
    watcher.close(); await closed; watcher = null;
    assert.equal(watchError, undefined);
    result.evidence = { payloadBytes: payload.length, sourceSha256: sha256(await fs.readFile(original)),
      renamedSha256: sha256(readback), partialSha256: sha256(partial), partialOffset: 7, partialBytes: 37,
      exclusiveCreateCode, exclusiveCopyCode, oldPathCode, watchEvents: events, watcherClosed,
      watchedSha256: sha256(await fs.readFile(watched)), directoryRemoved: false };
  } finally {
    watcher?.close();
    await fs.rm(directory, { recursive: true });
  }
  await assert.rejects(fs.stat(directory), { code: "ENOENT" });
  result.evidence.directoryRemoved = true;
} finally { clearTimeout(watchdog); }
result.elapsedMillis = Math.ceil(performance.now() - started);
assert(result.elapsedMillis > 0 && result.elapsedMillis < 8000);
const output = "RUNTIME_API_RESULT=" + JSON.stringify(result);
assert(Buffer.byteLength(output + "\n") <= 8192);
console.log(output);
