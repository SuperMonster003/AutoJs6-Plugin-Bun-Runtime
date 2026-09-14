// Fixed offline runtime API fixture. Test data stays inside this owned execution.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import net from "node:net";
const mode = "tcp";
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
  const payload = Buffer.alloc(32768);
  for (let i = 0; i < payload.length; i++) payload[i] = i * 31 % 251;
  const reply = Buffer.from(payload).reverse(), peers = [], connections = [], live = new Set(), closures = [], serverCloseErrors = [];
  let serverError;
  const server = net.createServer({ allowHalfOpen: true }, socket => {
    live.add(socket); peers.push({ address: socket.remoteAddress, family: socket.remoteFamily });
    closures.push(new Promise(resolve => socket.on("close", hadError => { live.delete(socket); serverCloseErrors.push(hadError); resolve(); })));
    socket.on("error", error => { serverError = error; });
    let bytes = 0; const chunks = [];
    socket.on("data", chunk => {
      bytes += chunk.length;
      if (bytes > payload.length) { serverError = new Error("TCP input exceeded bound"); socket.destroy(); }
      else chunks.push(chunk);
    });
    socket.on("end", () => {
      try { assert.deepEqual(Buffer.concat(chunks), payload); socket.end(reply); }
      catch (error) { serverError = error; socket.destroy(); }
    });
  });
  server.on("error", error => { serverError = error; });
  let serverClosed = false;
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address(); assert.equal(address.address, "127.0.0.1");
    for (let index = 0; index < 2; index++) {
      const record = await new Promise((resolve, reject) => {
        const client = net.createConnection({ host: "127.0.0.1", port: address.port });
        const chunks = []; let bytes = 0, ended = false, peer;
        client.on("error", reject);
        client.on("connect", () => {
          peer = client.remoteAddress;
          client.setNoDelay(true);
          for (let part = 0; part < 4; part++) client.write(payload.subarray(part * 8192, (part + 1) * 8192));
          client.end();
        });
        client.on("data", chunk => {
          bytes += chunk.length;
          if (bytes > reply.length) { reject(new Error("TCP reply exceeded bound")); client.destroy(); }
          else chunks.push(chunk);
        });
        client.on("end", () => { ended = true; });
        client.on("close", hadError => {
          try {
            assert.equal(hadError, false); assert(ended); assert.deepEqual(Buffer.concat(chunks), reply);
            resolve({ index, sentBytes: payload.length, receivedBytes: bytes, sentSha256: sha256(payload),
              receivedSha256: sha256(Buffer.concat(chunks)), peer, ended, hadError });
          } catch (error) { reject(error); }
        });
      });
      connections.push(record);
    }
    await Promise.all(closures); assert.equal(live.size, 0); assert.deepEqual(serverCloseErrors, [false, false]);
    assert.equal(serverError, undefined); assert.equal(peers.length, 2);
    peers.forEach(peer => assert.deepEqual(peer, { address: "127.0.0.1", family: "IPv4" }));
  } finally {
    for (const socket of live) socket.destroy();
    await new Promise((resolve, reject) => server.close(error => { if (error) reject(error); else { serverClosed = true; resolve(); } }));
  }
  assert.equal(live.size, 0);
  result.evidence = { connections, peers, serverClosed, serverCloseErrors, liveServerSockets: live.size };
} finally { clearTimeout(watchdog); }
result.elapsedMillis = Math.ceil(performance.now() - started);
assert(result.elapsedMillis > 0 && result.elapsedMillis < 8000);
const output = "RUNTIME_API_RESULT=" + JSON.stringify(result);
assert(Buffer.byteLength(output + "\n") <= 8192);
console.log(output);
