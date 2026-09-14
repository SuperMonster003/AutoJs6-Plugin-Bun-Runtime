// Fixed offline network fixture. Public test credentials have no external authority.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import http from "node:http";
import net from "node:net";
import dgram from "node:dgram";
const mode = "ipv6";
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
const watchdog = setTimeout(() => { console.error("RUNTIME_NETWORK_DEADLINE=" + mode); process.exit(73); }, 8000);
try {
  const payload = Buffer.from("IPv6 ::1 π 汉 😀\n".repeat(16)), reply = Buffer.from(payload).reverse();
  let fault, tcpPeer, tcpServerPeer, tcpClosed = false;
  const tcpSockets = new Set(), tcpClosures = [];
  const tcp = net.createServer(socket => {
    tcpSockets.add(socket); tcpServerPeer = { address: socket.remoteAddress, family: socket.remoteFamily };
    tcpClosures.push(new Promise(resolve => socket.once("close", () => { tcpSockets.delete(socket); resolve(); })));
    socket.on("error", error => { fault = error; }); const chunks = []; let bytes = 0;
    socket.on("data", chunk => {
      try {
        bytes += chunk.length; assert(bytes <= payload.length); chunks.push(chunk);
        if (bytes === payload.length) { assert.deepEqual(Buffer.concat(chunks), payload); socket.end(reply); }
      } catch (error) { fault = error; socket.destroy(); }
    });
  });
  let tcpResult;
  try {
    await new Promise((resolve, reject) => { tcp.once("error", reject); tcp.listen({ host: "::1", port: 0, ipv6Only: true }, resolve); });
    tcpResult = await new Promise((resolve, reject) => {
      const client = net.createConnection({ host: "::1", port: tcp.address().port, family: 6 }), chunks = []; let bytes = 0, ended = false;
      client.on("error", reject); client.on("connect", () => { tcpPeer = { address: client.remoteAddress, family: client.remoteFamily }; client.write(payload); });
      client.on("data", chunk => { bytes += chunk.length; if (bytes > reply.length) { client.destroy(); reject(new Error("IPv6 TCP bound")); } else chunks.push(chunk); });
      client.on("end", () => { ended = true; });
      client.on("close", hadError => { try { assert.equal(hadError, false); assert(ended); assert.deepEqual(Buffer.concat(chunks), reply); resolve({ bytes, sha256: sha256(Buffer.concat(chunks)), ended, closed: true }); } catch (error) { reject(error); } });
    });
    await Promise.all(tcpClosures); assert.equal(tcpSockets.size, 0); assert.equal(fault, undefined);
  } finally {
    for (const socket of tcpSockets) socket.destroy();
    await new Promise((resolve, reject) => tcp.close(error => { if (error) reject(error); else { tcpClosed = true; resolve(); } }));
  }
  const udpServer = dgram.createSocket("udp6"), udpClient = dgram.createSocket("udp6");
  let udpServerPeer, udpClientPeer, udpServerClosed = false, udpClientClosed = false, udpResult, udpRequests = 0;
  const bind = socket => new Promise((resolve, reject) => { socket.once("error", reject); socket.bind(0, "::1", resolve); });
  try {
    await bind(udpServer); await bind(udpClient);
    udpResult = await new Promise((resolve, reject) => {
      udpServer.on("error", reject); udpClient.on("error", reject);
      udpServer.on("message", (data, remote) => {
        try {
          assert.equal(++udpRequests, 1); assert.deepEqual(data, payload); assert.equal(remote.address, "::1"); assert.equal(remote.family, "IPv6"); assert.equal(remote.port, udpClient.address().port);
          udpServerPeer = { address: remote.address, family: remote.family };
          udpServer.send(reply, remote.port, "::1", error => { if (error) reject(error); });
        } catch (error) { reject(error); }
      });
      udpClient.once("message", (data, remote) => {
        try {
          assert.deepEqual(data, reply); assert.equal(remote.address, "::1"); assert.equal(remote.family, "IPv6"); assert.equal(remote.port, udpServer.address().port);
          udpClientPeer = { address: remote.address, family: remote.family }; resolve({ bytes: data.length, sha256: sha256(data) });
        } catch (error) { reject(error); }
      });
      udpClient.send(payload, udpServer.address().port, "::1", error => { if (error) reject(error); });
    });
  } finally {
    await new Promise(resolve => udpClient.close(() => { udpClientClosed = true; resolve(); }));
    await new Promise(resolve => udpServer.close(() => { udpServerClosed = true; resolve(); }));
  }
  const requests = [], httpSockets = new Set(), httpClosures = []; let httpClosed = false, httpResult;
  const server = http.createServer((request, response) => {
    try {
      assert.equal(requests.length, 0); assert.equal(request.method, "GET"); assert.equal(request.url, "/ipv6");
      requests.push({ method: request.method, path: request.url, peer: request.socket.remoteAddress, family: request.socket.remoteFamily });
      response.writeHead(200, { Connection: "close", "Content-Type": "text/plain; charset=utf-8" }); response.end(payload);
    } catch (error) { fault = error; response.destroy(); }
  });
  server.on("connection", socket => { httpSockets.add(socket); httpClosures.push(new Promise(resolve => socket.once("close", () => { httpSockets.delete(socket); resolve(); }))); });
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen({ host: "::1", port: 0, ipv6Only: true }, resolve); });
    const url = `http://[::1]:${server.address().port}/ipv6`, response = await fetch(url);
    assert.equal(response.status, 200); assert.equal(response.url, url);
    const bytes = Buffer.from(await response.arrayBuffer()); assert.deepEqual(bytes, payload); assert.equal(fault, undefined);
    httpResult = { status: response.status, bytes: bytes.length, sha256: sha256(bytes) };
  } finally {
    for (const socket of httpSockets) socket.destroy();
    await new Promise((resolve, reject) => server.close(error => { if (error) reject(error); else { httpClosed = true; resolve(); } }));
    await Promise.all(httpClosures);
  }
  for (const peer of [tcpPeer, tcpServerPeer, udpClientPeer, udpServerPeer]) assert.deepEqual(peer, { address: "::1", family: "IPv6" });
  result.evidence = { tcp: { ...tcpResult, clientPeer: tcpPeer, serverPeer: tcpServerPeer, serverClosed: tcpClosed },
    udp: { ...udpResult, clientPeer: udpClientPeer, serverPeer: udpServerPeer, requests: udpRequests, clientClosed: udpClientClosed, serverClosed: udpServerClosed },
    http: { ...httpResult, requests, serverClosed: httpClosed, liveServerSockets: httpSockets.size } };
} finally { clearTimeout(watchdog); }
result.elapsedMillis = Math.ceil(performance.now() - started);
assert(result.elapsedMillis > 0 && result.elapsedMillis < 8000);
const output = "RUNTIME_NETWORK_RESULT=" + JSON.stringify(result);
assert(Buffer.byteLength(output + "\n") <= 8192);
console.log(output);
