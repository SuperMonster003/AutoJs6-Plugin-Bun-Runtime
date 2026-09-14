// Fixed offline network fixture. Public test credentials have no external authority.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import https from "node:https";
const mode = "https";
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
// PUBLIC-TEST-CERTIFICATES-BEGIN
const credentials = {"testOnly":true,"host":"runtime.bun-runtime.invalid","root":"-----BEGIN CERTIFICATE-----\nMIIBpjCCAUugAwIBAgIBATAKBggqhkjOPQQDAjAnMSUwIwYDVQQDDBxCdW4gUnVu\ndGltZSBQVUJMSUMgVEVTVCBSb290MCAXDTAwMDEwMTAwMDAwMFoYDzIxMDAwMTAx\nMDAwMDAwWjAnMSUwIwYDVQQDDBxCdW4gUnVudGltZSBQVUJMSUMgVEVTVCBSb290\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEqBEB9dGhtU9RcNGYo9DEkpNDsxpB\nj4j9MF6lQbvIpi7gA6+JJDS8jzUUzKLFpplXhGFoKk9q3tjiC20QTSwQTKNmMGQw\nEgYDVR0TAQH/BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAYYwHQYDVR0OBBYEFDiW\nMuKm/UbzolTzHRWAKK9WH0PrMB8GA1UdIwQYMBaAFDiWMuKm/UbzolTzHRWAKK9W\nH0PrMAoGCCqGSM49BAMCA0kAMEYCIQDzKWgDjTMbIGrJFwfVe+1Bmdtn7Reu5iy9\n9Dg45Owi/AIhAKfAWloQLNM9sCjhxMb54+pJkC7eSaNkzOv/xszl3EON\n-----END CERTIFICATE-----\n","unrelatedRoot":"-----BEGIN CERTIFICATE-----\nMIIBujCCAV+gAwIBAgIBAjAKBggqhkjOPQQDAjAxMS8wLQYDVQQDDCZCdW4gUnVu\ndGltZSBQVUJMSUMgVEVTVCBVbnJlbGF0ZWQgUm9vdDAgFw0wMDAxMDEwMDAwMDBa\nGA8yMTAwMDEwMTAwMDAwMFowMTEvMC0GA1UEAwwmQnVuIFJ1bnRpbWUgUFVCTElD\nIFRFU1QgVW5yZWxhdGVkIFJvb3QwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAATG\nBhpHW0tfVl/4UJYOhh+T6MrZHTy90P8prkbiaTtT7nM8HbK9jGaqhrvEqu9+omd6\nb6xjfRa0AOsWdi2UYrNIo2YwZDASBgNVHRMBAf8ECDAGAQH/AgEAMA4GA1UdDwEB\n/wQEAwIBhjAdBgNVHQ4EFgQU3F+ykmUx1gZFlnlnLawbn1HPYnIwHwYDVR0jBBgw\nFoAU3F+ykmUx1gZFlnlnLawbn1HPYnIwCgYIKoZIzj0EAwIDSQAwRgIhAKZp5XZn\nJ1WQwW2MenTI6sou7o+k1JIAYk6cWQQlhx8cAiEAxJMRsQcVkfgi9/Sh6Rg9UaXc\nTQnMx6M7ApQeSGXz/Vs=\n-----END CERTIFICATE-----\n","cert":"-----BEGIN CERTIFICATE-----\nMIIB3TCCAYOgAwIBAgIBAzAKBggqhkjOPQQDAjAnMSUwIwYDVQQDDBxCdW4gUnVu\ndGltZSBQVUJMSUMgVEVTVCBSb290MCAXDTAwMDEwMTAwMDAwMFoYDzIxMDAwMTAx\nMDAwMDAwWjAmMSQwIgYDVQQDDBtydW50aW1lLmJ1bi1ydW50aW1lLmludmFsaWQw\nWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAASnLSpVAE6VSuzz17tDIgwv39IRaAdk\nTNHkctLaIB61+EEuwBsNwqSzISu036QvrGg6jyGdEet68lW/PdZZtBYGo4GeMIGb\nMAwGA1UdEwEB/wQCMAAwDgYDVR0PAQH/BAQDAgeAMB0GA1UdDgQWBBS8UH/8flMH\n/MOmpoQ19I3kVbD1GDAfBgNVHSMEGDAWgBQ4ljLipv1G86JU8x0VgCivVh9D6zAm\nBgNVHREEHzAdghtydW50aW1lLmJ1bi1ydW50aW1lLmludmFsaWQwEwYDVR0lBAww\nCgYIKwYBBQUHAwEwCgYIKoZIzj0EAwIDSAAwRQIhALigQb6O0n/2dfeq644P2FAq\nBil6mIRrh6vauTK/78gDAiBK5TTzIUsOyll8tcp8VoSgA0bWYVmZEKzJ3+lnkInX\nRw==\n-----END CERTIFICATE-----\n","publicTestKey":"-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgCXReWevw5whIogvu\n5D6hedG8cB7Z8cFu3NY4eoOctAuhRANCAASnLSpVAE6VSuzz17tDIgwv39IRaAdk\nTNHkctLaIB61+EEuwBsNwqSzISu036QvrGg6jyGdEet68lW/PdZZtBYG\n-----END PRIVATE KEY-----\n","certificateSha256":"7b034ddbc1312df570defa395e580eb9cccff357ecdc95cfdef807d4813808ae"};
// PUBLIC-TEST-CERTIFICATES-END
try {
  const payload = Buffer.from("Bun HTTPS π 汉 😀\n".repeat(128)), requests = [], live = new Set(), closures = [];
  let serverError, peer;
  const server = https.createServer({ key: credentials.publicTestKey, cert: credentials.cert,
    minVersion: "TLSv1.2", maxVersion: "TLSv1.2", ALPNProtocols: ["http/1.1"] }, (request, response) => {
    try {
      assert.equal(request.method, "GET"); assert.equal(request.url, "/verified"); assert.equal(requests.length, 0);
      requests.push({ method: request.method, path: request.url, peer: request.socket.remoteAddress,
        servername: request.socket.servername, protocol: request.socket.getProtocol(), alpn: request.socket.alpnProtocol });
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Connection": "close", "X-Bun-Fixture": "verified-tls" });
      for (let offset = 0; offset < payload.length; offset += 19) response.write(payload.subarray(offset, offset + 19));
      response.end();
    } catch (error) { serverError = error; response.destroy(); }
  });
  server.on("secureConnection", socket => { live.add(socket); closures.push(new Promise(resolve => socket.once("close", () => { live.delete(socket); resolve(); }))); socket.on("error", error => { serverError = error; }); });
  server.on("error", error => { serverError = error; }); server.on("tlsClientError", error => { serverError = error; });
  let body;
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    body = await new Promise((resolve, reject) => {
      let socketClosed = false, ended = false, responseFacts, failure;
      const ready = () => { if (socketClosed && ended) failure ? reject(failure) : resolve({ ...responseFacts, socketClosed, ended }); };
      const request = https.get({ hostname: "127.0.0.1", port: server.address().port, path: "/verified", servername: credentials.host,
        ca: credentials.root, rejectUnauthorized: true, minVersion: "TLSv1.2", maxVersion: "TLSv1.2", ALPNProtocols: ["http/1.1"], agent: false }, response => {
        const chunks = []; let bytes = 0, reads = 0;
        response.on("error", reject);
        response.on("data", chunk => {
          bytes += chunk.length; reads++;
          if (bytes > payload.length || reads > 512) { failure = new Error("HTTPS body exceeded bound"); response.destroy(); }
          else chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            assert.equal(response.statusCode, 200); assert.equal(response.headers["x-bun-fixture"], "verified-tls"); assert.deepEqual(Buffer.concat(chunks), payload);
            responseFacts = { status: response.statusCode, payloadBytes: bytes, payloadSha256: sha256(Buffer.concat(chunks)), reads };
          } catch (error) { failure = error; }
          ended = true; ready();
        });
      });
      request.on("error", reject);
      request.on("socket", socket => {
        socket.once("secureConnect", () => {
          try {
            peer = { authorized: socket.authorized, authorizationError: socket.authorizationError ?? null, protocol: socket.getProtocol(),
              certificateSha256: socket.getPeerCertificate().fingerprint256.replaceAll(":", "").toLowerCase(), alpn: socket.alpnProtocol, address: socket.remoteAddress };
            assert.equal(peer.authorized, true); assert.equal(peer.authorizationError, null); assert.equal(peer.certificateSha256, credentials.certificateSha256);
            assert.equal(peer.protocol, "TLSv1.2"); assert.equal(peer.alpn, "http/1.1"); assert.equal(peer.address, "127.0.0.1");
          } catch (error) { failure = error; request.destroy(error); }
        });
        socket.once("close", () => { socketClosed = true; ready(); });
      });
    });
    await Promise.all(closures); assert.equal(serverError, undefined); assert.equal(live.size, 0); assert(peer);
  } finally {
    for (const socket of live) socket.destroy();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  result.evidence = { requests, peer, body, serverClosed: true, liveServerSockets: live.size };
} finally { clearTimeout(watchdog); }
result.elapsedMillis = Math.ceil(performance.now() - started);
assert(result.elapsedMillis > 0 && result.elapsedMillis < 8000);
const output = "RUNTIME_NETWORK_RESULT=" + JSON.stringify(result);
assert(Buffer.byteLength(output + "\n") <= 8192);
console.log(output);
