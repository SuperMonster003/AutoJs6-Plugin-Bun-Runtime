// Fixed offline network fixture. Public test credentials have no external authority.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import tls from "node:tls";
const mode = "tls-transport";
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
  const payload = Buffer.alloc(4096);
  for (let i = 0; i < payload.length; i++) payload[i] = i * 17 % 251;
  const reply = Buffer.from(payload).reverse(), sessions = [], accepted = [], live = new Set(), closures = [], closeErrors = [];
  let serverError;
  const server = tls.createServer({ key: credentials.publicTestKey, cert: credentials.cert,
    minVersion: "TLSv1.2", maxVersion: "TLSv1.3", ALPNProtocols: ["bun-runtime-offline/1"] }, socket => {
    live.add(socket); closures.push(new Promise(resolve => socket.once("close", error => { live.delete(socket); closeErrors.push(error); resolve(); })));
    socket.on("error", error => { serverError = error; });
    const record = { protocol: socket.getProtocol(), servername: socket.servername, alpn: socket.alpnProtocol, peer: socket.remoteAddress };
    accepted.push(record); let bytes = 0; const chunks = [];
    socket.on("data", chunk => {
      try {
        bytes += chunk.length; assert(bytes <= payload.length); chunks.push(chunk);
        if (bytes === payload.length) { assert.deepEqual(Buffer.concat(chunks), payload); record.receivedSha256 = sha256(Buffer.concat(chunks)); socket.end(reply); }
      } catch (error) { serverError = error; socket.destroy(); }
    });
  });
  server.on("error", error => { serverError = error; }); server.on("tlsClientError", error => { serverError = error; });
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    for (const version of ["TLSv1.2", "TLSv1.3"]) {
      const record = await new Promise((resolve, reject) => {
        const client = tls.connect({ host: "127.0.0.1", port: server.address().port, servername: credentials.host,
          ca: credentials.root, rejectUnauthorized: true, minVersion: version, maxVersion: version, ALPNProtocols: ["bun-runtime-offline/1"] });
        const chunks = []; let bytes = 0, ended = false, record, failure;
        client.on("error", error => { failure = error; });
        client.on("secureConnect", () => {
          try {
            record = { protocol: client.getProtocol(), authorized: client.authorized, authorizationError: client.authorizationError ?? null,
              peerCertificateSha256: client.getPeerCertificate().fingerprint256.replaceAll(":", "").toLowerCase(), alpn: client.alpnProtocol, peer: client.remoteAddress };
            assert.equal(record.protocol, version); assert.equal(record.authorized, true); assert.equal(record.authorizationError, null);
            assert.equal(record.peerCertificateSha256, credentials.certificateSha256); assert.equal(record.alpn, "bun-runtime-offline/1"); assert.equal(record.peer, "127.0.0.1");
            client.write(payload);
          } catch (error) { failure = error; client.destroy(); }
        });
        client.on("data", chunk => { bytes += chunk.length; if (bytes > reply.length) { failure = new Error("TLS reply exceeded bound"); client.destroy(); } else chunks.push(chunk); });
        client.on("end", () => { ended = true; });
        client.on("close", hadError => {
          try {
            if (failure) throw failure;
            assert(record); assert(ended); assert.equal(hadError, false); assert.deepEqual(Buffer.concat(chunks), reply);
            resolve({ ...record, sentBytes: payload.length, receivedBytes: bytes, receivedSha256: sha256(Buffer.concat(chunks)), ended, closed: true, hadError });
          } catch (error) { reject(error); }
        });
      });
      sessions.push(record);
    }
    await Promise.all(closures); assert.equal(serverError, undefined); assert.equal(live.size, 0); assert.deepEqual(closeErrors, [false, false]);
    assert.deepEqual(accepted, ["TLSv1.2", "TLSv1.3"].map(protocol => ({ protocol, servername: credentials.host, alpn: "bun-runtime-offline/1", peer: "127.0.0.1", receivedSha256: sha256(payload) })));
  } finally {
    for (const socket of live) socket.destroy();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  result.evidence = { sessions, accepted, closeErrors, serverClosed: true, liveServerSockets: live.size };
} finally { clearTimeout(watchdog); }
result.elapsedMillis = Math.ceil(performance.now() - started);
assert(result.elapsedMillis > 0 && result.elapsedMillis < 8000);
const output = "RUNTIME_NETWORK_RESULT=" + JSON.stringify(result);
assert(Buffer.byteLength(output + "\n") <= 8192);
console.log(output);
