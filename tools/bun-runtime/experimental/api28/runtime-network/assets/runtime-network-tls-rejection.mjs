// Fixed offline network fixture. Public test credentials have no external authority.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import tls from "node:tls";
const mode = "tls-rejection";
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
  const records = [], sockets = new Set(), closures = [], payload = Buffer.from("verified-after-rejection\n");
  let serverError, receivedBytes = 0;
  const server = tls.createServer({ key: credentials.publicTestKey, cert: credentials.cert, minVersion: "TLSv1.2", maxVersion: "TLSv1.2" }, socket => {
    sockets.add(socket); closures.push(new Promise(resolve => socket.once("close", () => { sockets.delete(socket); resolve(); })));
    socket.on("error", () => {}); // Expected failed-client handshake/close; client facts decide each rejection.
    socket.on("data", chunk => { receivedBytes += chunk.length; if (receivedBytes > payload.length) { serverError = new Error("Unexpected TLS application data"); socket.destroy(); } else socket.write(chunk); });
  });
  server.on("error", error => { serverError = error; }); server.on("tlsClientError", () => {});
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    for (const control of ["wrong-ca", "wrong-host", "valid-recovery"]) {
      const record = await new Promise((resolve, reject) => {
        const client = tls.connect({ host: "127.0.0.1", port: server.address().port,
          servername: control === "wrong-host" ? "wrong.bun-runtime.invalid" : credentials.host,
          ca: control === "wrong-ca" ? credentials.unrelatedRoot : credentials.root,
          rejectUnauthorized: true, minVersion: "TLSv1.2", maxVersion: "TLSv1.2" });
        let secure = false, errorCode = null, bytes = 0, failure, authorized = false, peerCertificateSha256 = null;
        const chunks = [];
        client.on("secureConnect", () => {
          secure = true; authorized = client.authorized;
          if (control !== "valid-recovery") { client.destroy(); return; }
          try {
            peerCertificateSha256 = client.getPeerCertificate().fingerprint256.replaceAll(":", "").toLowerCase();
            assert.equal(authorized, true); assert.equal(peerCertificateSha256, credentials.certificateSha256); client.write(payload);
          } catch (error) { failure = error; client.destroy(); }
        });
        client.on("error", error => { errorCode = error.code ?? null; });
        client.on("data", chunk => {
          bytes += chunk.length;
          if (bytes > payload.length) { failure = new Error("TLS control output exceeded bound"); client.destroy(); }
          else { chunks.push(chunk); if (bytes === payload.length) client.end(); }
        });
        client.on("close", () => {
          try {
            if (failure) throw failure;
            if (control === "valid-recovery") { assert(secure && authorized); assert.equal(errorCode, null); assert.deepEqual(Buffer.concat(chunks), payload); }
            else {
              assert.equal(secure, false); assert.equal(authorized, false); assert.equal(bytes, 0);
              if (control === "wrong-ca") assert(["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(errorCode), String(errorCode));
              else assert.equal(errorCode, "ERR_TLS_CERT_ALTNAME_INVALID");
            }
            resolve({ control, secure, authorized, errorCode, receivedBytes: bytes, receivedSha256: sha256(Buffer.concat(chunks)), peerCertificateSha256, closed: true });
          } catch (error) { reject(error); }
        });
      }); records.push(record);
    }
    await Promise.all(closures); assert.equal(serverError, undefined); assert.equal(receivedBytes, payload.length); assert.equal(sockets.size, 0);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  result.evidence = { records, serverReceivedBytes: receivedBytes, serverClosed: true, liveServerSockets: sockets.size };
} finally { clearTimeout(watchdog); }
result.elapsedMillis = Math.ceil(performance.now() - started);
assert(result.elapsedMillis > 0 && result.elapsedMillis < 8000);
const output = "RUNTIME_NETWORK_RESULT=" + JSON.stringify(result);
assert(Buffer.byteLength(output + "\n") <= 8192);
console.log(output);
