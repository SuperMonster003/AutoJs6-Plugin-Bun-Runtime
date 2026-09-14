// Fixed offline runtime API fixture. Test data stays inside this owned execution.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import dns from "node:dns/promises";
import dgram from "node:dgram";
const mode = "dns";
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
  const lookup = await dns.lookup("localhost", { family: 4, all: true });
  assert(lookup.length > 0 && lookup.length <= 8);
  lookup.forEach(value => assert.deepEqual(value, { address: "127.0.0.1", family: 4 }));
  const socket = dgram.createSocket("udp4"), resolver = new dns.Resolver({ timeout: 1000, tries: 1 });
  const requests = []; let serverError;
  socket.on("error", error => { serverError = error; resolver.cancel(); });
  socket.on("message", (packet, remote) => {
    try {
      assert.equal(remote.address, "127.0.0.1");
      assert(packet.length >= 17 && packet.length <= 512); assert(requests.length < 3);
      assert.equal(packet.readUInt16BE(2) & 0xf800, 0);
      assert.equal(packet.readUInt16BE(4), 1); assert.equal(packet.readUInt16BE(6), 0);
      assert.equal(packet.readUInt16BE(8), 0); assert.equal(packet.readUInt16BE(10), 0);
      let offset = 12; const labels = [];
      while (packet[offset]) {
        const length = packet[offset++]; assert(length <= 63 && offset + length < packet.length);
        labels.push(packet.subarray(offset, offset + length).toString("ascii")); offset += length;
      }
      offset++; const type = packet.readUInt16BE(offset); assert.equal(packet.readUInt16BE(offset + 2), 1);
      offset += 4; assert.equal(offset, packet.length);
      const name = labels.join(".");
      assert(["address.bun-runtime.invalid", "text.bun-runtime.invalid", "missing.bun-runtime.invalid"].includes(name));
      assert.equal(type, name.startsWith("text.") ? 16 : 1);
      requests.push({ name, type, peer: remote.address, queryBytes: packet.length });
      const missing = name.startsWith("missing."), question = packet.subarray(12);
      const header = Buffer.alloc(12); header.writeUInt16BE(packet.readUInt16BE(0));
      header.writeUInt16BE(missing ? 0x8183 : 0x8180, 2); header.writeUInt16BE(1, 4); header.writeUInt16BE(missing ? 0 : 1, 6);
      const answer = Buffer.alloc(12); answer.writeUInt16BE(0xc00c); answer.writeUInt16BE(type, 2); answer.writeUInt16BE(1, 4);
      const text = Buffer.from("bun-runtime-offline"), data = type === 1 ? Buffer.from([127, 0, 0, 42]) : Buffer.concat([Buffer.from([text.length]), text]);
      answer.writeUInt16BE(data.length, 10);
      socket.send(Buffer.concat([header, question, ...(missing ? [] : [answer, data])]), remote.port, remote.address,
        error => { if (error) { serverError = error; resolver.cancel(); } });
    } catch (error) { serverError = error; resolver.cancel(); }
  });
  let socketClosed = false;
  try {
    await new Promise((resolve, reject) => { socket.once("error", reject); socket.bind(0, "127.0.0.1", resolve); });
    const address = socket.address(); assert.equal(address.address, "127.0.0.1");
    resolver.setServers([`127.0.0.1:${address.port}`]);
    const servers = resolver.getServers(); assert.deepEqual(servers, [`127.0.0.1:${address.port}`]);
    const ipv4 = await resolver.resolve4("address.bun-runtime.invalid");
    const txt = await resolver.resolveTxt("text.bun-runtime.invalid");
    let missingCode;
    try { await resolver.resolve4("missing.bun-runtime.invalid"); } catch (error) { missingCode = error.code; }
    assert.equal(serverError, undefined); assert.deepEqual(ipv4, ["127.0.0.42"]);
    assert.deepEqual(txt, [["bun-runtime-offline"]]); assert.equal(missingCode, "ENOTFOUND");
    assert.equal(requests.length, 3);
    result.evidence = { lookup, servers, ipv4, txt, missingCode, requests, socketClosed: false };
  } finally {
    resolver.cancel(); await new Promise(resolve => socket.close(() => { socketClosed = true; resolve(); }));
  }
  assert(socketClosed); result.evidence.socketClosed = true;
} finally { clearTimeout(watchdog); }
result.elapsedMillis = Math.ceil(performance.now() - started);
assert(result.elapsedMillis > 0 && result.elapsedMillis < 8000);
const output = "RUNTIME_API_RESULT=" + JSON.stringify(result);
assert(Buffer.byteLength(output + "\n") <= 8192);
console.log(output);
