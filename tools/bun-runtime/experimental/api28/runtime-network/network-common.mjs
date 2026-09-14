import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, createPrivateKey, createPublicKey, X509Certificate } from "node:crypto";
import { facts, PACKAGE } from "../binder/binder-common.mjs";

export const NETWORK_KIND = "experimental-runtime-network-binder";
export const NETWORK_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.RuntimeNetworkInstrumentedTest";
export const NETWORK_TEST = "fixedTlsAndIpv6Boundaries";
export const MODES = Object.freeze(["tls-transport", "tls-rejection", "https", "ipv6"]);
export const fixtureFacts = mode => { assert(MODES.includes(mode)); return facts(new URL(`assets/runtime-network-${mode}.mjs`, import.meta.url)); };
const keys = (v, expected) => assert.deepEqual(Object.keys(v).sort(), expected.slice().sort());
const integer = (n, lo, hi) => assert(Number.isSafeInteger(n) && n >= lo && n <= hi, `Integer outside [${lo}, ${hi}]: ${n}`);
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
export const credentials = JSON.parse(readFileSync(new URL("certificates.json", import.meta.url), "utf8")).material;
export function verifyCertificates() {
    assert.equal(credentials.testOnly, true); assert.equal(credentials.host, "runtime.bun-runtime.invalid");
    const leaf = new X509Certificate(credentials.cert), root = new X509Certificate(credentials.root), unrelated = new X509Certificate(credentials.unrelatedRoot);
    assert(root.ca && unrelated.ca && !leaf.ca); assert(root.verify(root.publicKey) && unrelated.verify(unrelated.publicKey));
    assert(leaf.verify(root.publicKey)); assert(!leaf.verify(unrelated.publicKey));
    assert.equal(leaf.checkHost(credentials.host), credentials.host); assert.equal(leaf.checkHost("wrong.bun-runtime.invalid"), undefined);
    assert.equal(new Date(leaf.validFrom).toISOString(), "2000-01-01T00:00:00.000Z");
    assert.equal(new Date(leaf.validTo).toISOString(), "2100-01-01T00:00:00.000Z");
    assert.equal(digest(leaf.raw), credentials.certificateSha256);
    const key = createPrivateKey(credentials.publicTestKey);
    assert.equal(key.asymmetricKeyType, "ec"); assert.equal(key.asymmetricKeyDetails.namedCurve, "prime256v1");
    assert.deepEqual(createPublicKey(key).export({ type: "spki", format: "der" }), leaf.publicKey.export({ type: "spki", format: "der" }));
    for (const mode of MODES) {
        const source = readFileSync(new URL(`assets/runtime-network-${mode}.mjs`, import.meta.url), "utf8");
        integer(Buffer.byteLength(source), 1, 12288);
        if (mode !== "ipv6") assert(source.includes("const credentials = " + JSON.stringify(credentials) + ";"), "Embedded public fixture credentials drifted");
        else assert(!source.includes("PUBLIC-TEST-CERTIFICATES-BEGIN"));
    }
}
export function validateNetworkEvidence(e, mode) {
    assert(MODES.includes(mode)); const host = credentials.host, cert = credentials.certificateSha256;
    if (mode === "tls-transport") {
        keys(e, ["sessions", "accepted", "closeErrors", "serverClosed", "liveServerSockets"]);
        const payload = Buffer.from(Array.from({ length: 4096 }, (_, i) => i * 17 % 251));
        assert.deepEqual(e.sessions, ["TLSv1.2", "TLSv1.3"].map(protocol => ({ protocol, authorized: true, authorizationError: null,
            peerCertificateSha256: cert, alpn: "bun-runtime-offline/1", peer: "127.0.0.1", sentBytes: 4096, receivedBytes: 4096,
            receivedSha256: digest(Buffer.from(payload).reverse()), ended: true, closed: true, hadError: false })));
        assert.deepEqual(e.accepted, ["TLSv1.2", "TLSv1.3"].map(protocol => ({ protocol, servername: host, alpn: "bun-runtime-offline/1", peer: "127.0.0.1", receivedSha256: digest(payload) })));
        assert.deepEqual(e.closeErrors, [false, false]); assert.equal(e.serverClosed, true); assert.equal(e.liveServerSockets, 0);
    } else if (mode === "tls-rejection") {
        keys(e, ["records", "serverReceivedBytes", "serverClosed", "liveServerSockets"]); assert.equal(e.records.length, 3);
        const payload = Buffer.from("verified-after-rejection\n");
        for (const [i, r] of e.records.entries()) {
            const valid = i === 2, errorCode = valid ? null : i === 1 ? "ERR_TLS_CERT_ALTNAME_INVALID" : r.errorCode;
            if (!i) assert(["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(errorCode));
            assert.deepEqual(r, { control: ["wrong-ca", "wrong-host", "valid-recovery"][i], secure: valid, authorized: valid, errorCode,
                receivedBytes: valid ? payload.length : 0, receivedSha256: digest(valid ? payload : Buffer.alloc(0)), peerCertificateSha256: valid ? cert : null, closed: true });
        }
        assert.equal(e.serverReceivedBytes, payload.length); assert.equal(e.serverClosed, true); assert.equal(e.liveServerSockets, 0);
    } else if (mode === "https") {
        keys(e, ["requests", "peer", "body", "serverClosed", "liveServerSockets"]);
        const payload = Buffer.from("Bun HTTPS π 汉 😀\n".repeat(128));
        assert.deepEqual(e.requests, [{ method: "GET", path: "/verified", peer: "127.0.0.1", servername: host, protocol: "TLSv1.2", alpn: "http/1.1" }]);
        assert.deepEqual(e.peer, { authorized: true, authorizationError: null, protocol: "TLSv1.2", certificateSha256: cert, alpn: "http/1.1", address: "127.0.0.1" });
        integer(e.body.reads, 1, 512); assert.deepEqual(e.body, { status: 200, payloadBytes: payload.length, payloadSha256: digest(payload), reads: e.body.reads, socketClosed: true, ended: true });
        assert.equal(e.serverClosed, true); assert.equal(e.liveServerSockets, 0);
    } else {
        keys(e, ["tcp", "udp", "http"]);
        const payload = Buffer.from("IPv6 ::1 π 汉 😀\n".repeat(16)), reply = Buffer.from(payload).reverse(), peer = { address: "::1", family: "IPv6" };
        assert.deepEqual(e.tcp, { bytes: payload.length, sha256: digest(reply), ended: true, closed: true, clientPeer: peer, serverPeer: peer, serverClosed: true });
        assert.deepEqual(e.udp, { bytes: payload.length, sha256: digest(reply), clientPeer: peer, serverPeer: peer, requests: 1, clientClosed: true, serverClosed: true });
        assert.deepEqual(e.http, { status: 200, bytes: payload.length, sha256: digest(payload), requests: [{ method: "GET", path: "/ipv6", peer: "::1", family: "IPv6" }], serverClosed: true, liveServerSockets: 0 });
    }
    return e;
}
export function validateNetworkRecord(record, mode, expected, uid) {
    assert(MODES.includes(mode)); assert.equal(expected.pages, 4096); assert(["arm64-v8a", "x86_64"].includes(expected.abi));
    keys(record, ["mode", "environment", "sourceSha256", "workspaceRemoved", "stdout", "stderr", "terminal", "compatibilityAcceptance"]);
    assert.equal(record.mode, mode); assert.deepEqual(record.environment, {});
    assert.equal(record.sourceSha256, fixtureFacts(mode).sha256); assert.equal(record.workspaceRemoved, true); assert.equal(record.compatibilityAcceptance, false);
    assert.deepEqual(record.terminal, { succeeded: true, exitCode: 0, errorCode: null }); assert.equal(record.stderr, "");
    assert(typeof record.stdout === "string" && Buffer.byteLength(record.stdout) <= 8192); assert.match(record.stdout, /^RUNTIME_NETWORK_RESULT=[^\r\n]+\n$/);
    const proof = JSON.parse(record.stdout.slice("RUNTIME_NETWORK_RESULT=".length));
    keys(proof, ["schemaVersion", "mode", "platform", "arch", "version", "revision", "uid", "pid", "pages", "pageSizeSource", "kernelMappingPages", "workspace", "evidence", "elapsedMillis"]);
    assert.equal(proof.schemaVersion, 1); assert.equal(proof.mode, mode); assert.equal(proof.platform, "android");
    assert.equal(proof.arch, expected.abi === "arm64-v8a" ? "arm64" : "x64"); assert.equal(proof.version, "1.4.0");
    assert.equal(proof.revision, "e8b1296169a8e6f20c81e926dba6448afb25cd11");
    integer(proof.uid, 10000, 2147483647); assert(proof.uid % 100000 >= 10000); if (uid !== undefined) assert.equal(proof.uid, uid);
    integer(proof.pid, 1, 4194304); integer(proof.elapsedMillis, 1, 7999);
    assert.equal(proof.pages, 4096); assert.equal(proof.kernelMappingPages, 4096); assert.equal(proof.pageSizeSource, "/proc/self/auxv AT_PAGESZ");
    const prefix = ["/data/user/0/", "/data/data/"].map(base => `${base}${PACKAGE}/cache/bun-executions/`).find(p => proof.workspace.startsWith(p));
    assert(prefix && /^[A-Za-z0-9_-]{1,128}$/.test(proof.workspace.slice(prefix.length)));
    validateNetworkEvidence(proof.evidence, mode); return { ...record, evidence: proof };
}
export function validateNetworkInstrumentation(text, expected, uid) {
    verifyCertificates(); assert(typeof text === "string" && Buffer.byteLength(text) <= 2 * 1024 * 1024);
    const observations = []; let bundle = {}, started = false, passed = false;
    for (const line of text.split(/\r?\n/)) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        if (field) { assert(!Object.hasOwn(bundle, field[1])); bundle[field[1]] = field[2]; }
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (!field && !status && bundle.stream !== undefined) bundle.stream += "\n" + line;
        if (!status) continue;
        const code = Number(status[1]); assert([0, 1].includes(code), "Runtime network JUnit failure");
        if (bundle.class === undefined && bundle.test === undefined) {
            assert(started && !passed); assert.equal(code, 0); keys(bundle, ["stream"]);
            const stream = bundle.stream.trim(); assert.match(stream, /^RUNTIME_NETWORK=[^\r\n]+$/);
            observations.push(validateNetworkRecord(JSON.parse(stream.slice("RUNTIME_NETWORK=".length)), MODES[observations.length], expected, uid));
        } else {
            assert.equal(bundle.class, NETWORK_CLASS); assert.equal(bundle.test, NETWORK_TEST); assert.equal(Number(bundle.numtests), 1); assert.equal(Number(bundle.current), 1);
            if (code === 1) { assert(!started && !passed); started = true; } else { assert(started && !passed); assert.equal(observations.length, 4); passed = true; }
        }
        bundle = {};
    }
    assert(started && passed); assert.equal(observations.length, 4); assert.match(text, /OK \(1 test\)/);
    assert.deepEqual([...text.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\s*$/gm)].map(m => m[1]), ["-1"]);
    assert.doesNotMatch(text, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed|RUNTIME_NETWORK_FAILURE=/); return observations;
}
