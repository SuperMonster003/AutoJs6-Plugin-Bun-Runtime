import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { facts, PACKAGE } from "../binder/binder-common.mjs";

export const API_KIND = "experimental-runtime-api-binder";
export const API_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.RuntimeApiInstrumentedTest";
export const API_TEST = "fixedOfflineApiBoundaries";
export const MODES = Object.freeze(["files", "dns", "tcp", "http-fetch"]);
export const fixtureFacts = mode => { assert(MODES.includes(mode)); return facts(new URL(`assets/runtime-api-${mode}.mjs`, import.meta.url)); };
const keys = (value, expected) => assert.deepEqual(Object.keys(value).sort(), expected.slice().sort());
const integer = (n, lo, hi) => assert(Number.isSafeInteger(n) && n >= lo && n <= hi, `Integer outside [${lo}, ${hi}]: ${n}`);
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

export function validateApiEvidence(e, mode) {
    assert(MODES.includes(mode));
    if (mode === "files") {
        keys(e, ["payloadBytes", "sourceSha256", "renamedSha256", "partialSha256", "partialOffset", "partialBytes",
            "exclusiveCreateCode", "exclusiveCopyCode", "oldPathCode", "watchEvents", "watcherClosed", "watchedSha256", "directoryRemoved"]);
        const payload = Buffer.from("Bun Runtime π 汉 😀\n".repeat(128));
        assert.equal(e.payloadBytes, payload.length);
        for (const key of ["sourceSha256", "renamedSha256", "watchedSha256"]) assert.equal(e[key], digest(payload));
        assert.equal(e.partialSha256, digest(payload.subarray(7, 44)));
        assert.equal(e.partialOffset, 7); assert.equal(e.partialBytes, 37);
        assert.equal(e.exclusiveCreateCode, "EEXIST"); assert.equal(e.exclusiveCopyCode, "EEXIST"); assert.equal(e.oldPathCode, "ENOENT");
        integer(e.watchEvents.length, 1, 64);
        for (const event of e.watchEvents) {
            keys(event, ["type", "filename"]); assert(["change", "rename"].includes(event.type)); assert.equal(event.filename, "watched-汉.txt");
        }
        assert.equal(e.watcherClosed, true); assert.equal(e.directoryRemoved, true);
    } else if (mode === "dns") {
        keys(e, ["lookup", "servers", "ipv4", "txt", "missingCode", "requests", "socketClosed"]);
        integer(e.lookup.length, 1, 8); e.lookup.forEach(v => assert.deepEqual(v, { address: "127.0.0.1", family: 4 }));
        assert.equal(e.servers.length, 1); assert.match(e.servers[0], /^127\.0\.0\.1:[1-9][0-9]{0,4}$/);
        integer(Number(e.servers[0].split(":")[1]), 1, 65535);
        assert.deepEqual(e.ipv4, ["127.0.0.42"]); assert.deepEqual(e.txt, [["bun-runtime-offline"]]);
        assert.equal(e.missingCode, "ENOTFOUND"); assert.equal(e.socketClosed, true);
        assert.deepEqual(e.requests, ["address", "text", "missing"].map(label => {
            const name = `${label}.bun-runtime.invalid`;
            return { name, type: label === "text" ? 16 : 1, peer: "127.0.0.1", queryBytes: 12 + name.length + 2 + 4 };
        }));
    } else if (mode === "tcp") {
        keys(e, ["connections", "peers", "serverClosed", "serverCloseErrors", "liveServerSockets"]);
        const payload = Buffer.from(Array.from({ length: 32768 }, (_, i) => i * 31 % 251));
        assert.deepEqual(e.connections, [0, 1].map(index => ({ index, sentBytes: 32768, receivedBytes: 32768,
            sentSha256: digest(payload), receivedSha256: digest(Buffer.from(payload).reverse()), peer: "127.0.0.1", ended: true, hadError: false })));
        assert.deepEqual(e.peers, [0, 1].map(() => ({ address: "127.0.0.1", family: "IPv4" })));
        assert.deepEqual(e.serverCloseErrors, [false, false]); assert.equal(e.serverClosed, true); assert.equal(e.liveServerSockets, 0);
    } else {
        keys(e, ["requests", "status", "redirected", "finalPath", "payloadBytes", "payloadSha256", "reads", "abortName",
            "signalAborted", "abortServerResponseClosed", "serverClosed", "liveServerSockets"]);
        const payload = Buffer.from("Bun HTTP π 汉 😀\n".repeat(128));
        assert.deepEqual(e.requests, ["/redirect", "/stream", "/abort"].map(path => ({ method: "GET", path })));
        assert.equal(e.status, 200); assert.equal(e.redirected, true); assert.equal(e.finalPath, "/stream");
        assert.equal(e.payloadBytes, payload.length); assert.equal(e.payloadSha256, digest(payload)); integer(e.reads, 1, 512);
        assert.equal(e.abortName, "AbortError");
        for (const key of ["signalAborted", "abortServerResponseClosed", "serverClosed"]) assert.equal(e[key], true);
        assert.equal(e.liveServerSockets, 0);
    }
    return e;
}

export function validateApiRecord(record, mode, expected, uid) {
    assert(MODES.includes(mode)); assert.equal(expected.pages, 4096); assert(["arm64-v8a", "x86_64"].includes(expected.abi));
    keys(record, ["mode", "environment", "sourceSha256", "workspaceRemoved", "stdout", "stderr", "terminal", "compatibilityAcceptance"]);
    assert.equal(record.mode, mode); assert.deepEqual(record.environment, {});
    const source = fixtureFacts(mode); integer(source.bytes, 1, 12288); assert.equal(record.sourceSha256, source.sha256);
    assert.equal(record.workspaceRemoved, true); assert.equal(record.compatibilityAcceptance, false);
    assert.deepEqual(record.terminal, { succeeded: true, exitCode: 0, errorCode: null }); assert.equal(record.stderr, "");
    assert(typeof record.stdout === "string" && Buffer.byteLength(record.stdout) <= 8192);
    assert.match(record.stdout, /^RUNTIME_API_RESULT=[^\r\n]+\n$/);
    const proof = JSON.parse(record.stdout.slice("RUNTIME_API_RESULT=".length));
    keys(proof, ["schemaVersion", "mode", "platform", "arch", "version", "revision", "uid", "pid", "pages", "pageSizeSource",
        "kernelMappingPages", "workspace", "evidence", "elapsedMillis"]);
    assert.equal(proof.schemaVersion, 1); assert.equal(proof.mode, mode); assert.equal(proof.platform, "android");
    assert.equal(proof.arch, expected.abi === "arm64-v8a" ? "arm64" : "x64"); assert.equal(proof.version, "1.4.0");
    assert.equal(proof.revision, "e8b1296169a8e6f20c81e926dba6448afb25cd11");
    integer(proof.uid, 10000, 2147483647); assert(proof.uid % 100000 >= 10000); if (uid !== undefined) assert.equal(proof.uid, uid);
    integer(proof.pid, 1, 4194304); integer(proof.elapsedMillis, 1, 7999);
    assert.equal(proof.pages, 4096); assert.equal(proof.kernelMappingPages, 4096); assert.equal(proof.pageSizeSource, "/proc/self/auxv AT_PAGESZ");
    const prefix = ["/data/user/0/", "/data/data/"].map(base => `${base}${PACKAGE}/cache/bun-executions/`).find(p => proof.workspace.startsWith(p));
    assert(prefix && /^[A-Za-z0-9_-]{1,128}$/.test(proof.workspace.slice(prefix.length)));
    validateApiEvidence(proof.evidence, mode);
    return { ...record, evidence: proof };
}

export function validateApiInstrumentation(text, expected, uid) {
    assert(typeof text === "string" && Buffer.byteLength(text) <= 2 * 1024 * 1024);
    const observations = []; let bundle = {}, started = false, passed = false;
    for (const line of text.split(/\r?\n/)) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        if (field) { assert(!Object.hasOwn(bundle, field[1])); bundle[field[1]] = field[2]; }
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (!field && !status && bundle.stream !== undefined) bundle.stream += "\n" + line;
        if (!status) continue;
        const code = Number(status[1]); assert([0, 1].includes(code), "Runtime API JUnit failure");
        if (bundle.class === undefined && bundle.test === undefined) {
            assert(started && !passed); assert.equal(code, 0); keys(bundle, ["stream"]);
            const stream = bundle.stream.trim(); assert.match(stream, /^RUNTIME_API=[^\r\n]+$/);
            observations.push(validateApiRecord(JSON.parse(stream.slice("RUNTIME_API=".length)), MODES[observations.length], expected, uid));
        } else {
            assert.equal(bundle.class, API_CLASS); assert.equal(bundle.test, API_TEST);
            assert.equal(Number(bundle.numtests), 1); assert.equal(Number(bundle.current), 1);
            if (code === 1) { assert(!started && !passed); started = true; }
            else { assert(started && !passed); assert.equal(observations.length, 4); passed = true; }
        }
        bundle = {};
    }
    assert(started && passed); assert.equal(observations.length, 4);
    assert.match(text, /OK \(1 test\)/);
    assert.deepEqual([...text.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\s*$/gm)].map(m => m[1]), ["-1"]);
    assert.doesNotMatch(text, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed|RUNTIME_API_FAILURE=/);
    return observations;
}
