// Fixed offline runtime API fixture. Test data stays inside this owned execution.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import http from "node:http";
const mode = "http-fetch";
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
  const payload = Buffer.from("Bun HTTP π 汉 😀\n".repeat(128));
  const requests = [], sockets = new Set(), closures = []; let serverError, closeAbort;
  const abortClosed = new Promise(resolve => { closeAbort = resolve; });
  const server = http.createServer((request, response) => {
    try {
      assert(requests.length < 4); assert.equal(request.method, "GET");
      assert(["/redirect", "/stream", "/abort"].includes(request.url));
      requests.push({ method: request.method, path: request.url });
      response.setHeader("Connection", "close");
      if (request.url === "/redirect") { response.writeHead(302, { Location: "/stream" }); response.end(); }
      else if (request.url === "/stream") {
        response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "X-Bun-Fixture": "offline" });
        for (let offset = 0; offset < payload.length; offset += 17) response.write(payload.subarray(offset, offset + 17));
        response.end();
      } else {
        response.on("close", closeAbort); response.writeHead(200, { "Content-Type": "text/plain" }); response.write("ready\n");
      }
    } catch (error) { serverError = error; response.destroy(error); }
  });
  server.on("connection", socket => { sockets.add(socket); closures.push(new Promise(resolve => socket.on("close", () => { sockets.delete(socket); resolve(); }))); });
  server.on("error", error => { serverError = error; });
  const controller = new AbortController(); let abortBody, serverClosed = false;
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const port = server.address().port, base = `http://127.0.0.1:${port}`;
    const response = await fetch(base + "/redirect");
    assert.equal(response.status, 200); assert.equal(response.redirected, true); assert.equal(response.url, base + "/stream");
    assert.equal(response.headers.get("x-bun-fixture"), "offline");
    const reader = response.body.getReader(), chunks = []; let bytes = 0, reads = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        bytes += value.length; reads++; assert(bytes <= payload.length && reads <= 512); chunks.push(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    const body = Buffer.concat(chunks); assert.deepEqual(body, payload);
    const pending = await fetch(base + "/abort", { signal: controller.signal }); assert.equal(pending.status, 200);
    abortBody = pending.body.getReader(); const first = await abortBody.read();
    assert.equal(first.done, false); assert.equal(Buffer.from(first.value).toString(), "ready\n");
    const readAfterReady = abortBody.read(); controller.abort();
    let abortName;
    try { await readAfterReady; } catch (error) { abortName = error.name; }
    assert.equal(abortName, "AbortError"); await abortClosed;
    assert.equal(serverError, undefined);
    assert.deepEqual(requests, [{ method: "GET", path: "/redirect" }, { method: "GET", path: "/stream" }, { method: "GET", path: "/abort" }]);
    result.evidence = { requests, status: response.status, redirected: response.redirected,
      finalPath: new URL(response.url).pathname, payloadBytes: bytes, payloadSha256: sha256(body), reads,
      abortName, signalAborted: controller.signal.aborted, abortServerResponseClosed: true,
      serverClosed: false, liveServerSockets: -1 };
  } finally {
    controller.abort(); abortBody?.releaseLock();
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve, reject) => server.close(error => { if (error) reject(error); else { serverClosed = true; resolve(); } }));
    await Promise.all(closures);
  }
  assert.equal(sockets.size, 0);
  result.evidence.serverClosed = serverClosed; result.evidence.liveServerSockets = sockets.size;
} finally { clearTimeout(watchdog); }
result.elapsedMillis = Math.ceil(performance.now() - started);
assert(result.elapsedMillis > 0 && result.elapsedMillis < 8000);
const output = "RUNTIME_API_RESULT=" + JSON.stringify(result);
assert(Buffer.byteLength(output + "\n") <= 8192);
console.log(output);
