import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import tls from "node:tls";
import https from "node:https";
import http from "node:http";
import net from "node:net";
import dgram from "node:dgram";
import { MODES, NETWORK_CLASS, NETWORK_TEST, fixtureFacts, verifyCertificates, validateNetworkEvidence,
    validateNetworkRecord, validateNetworkInstrumentation } from "./network-common.mjs";
import { PACKAGE, buildInputs } from "../binder/binder-common.mjs";
import { NETWORK_KIND } from "./network-common.mjs";
import { validateNetworkRun, summarizeNetworkRuns } from "./archive-network.mjs";
import { supervisorArtifacts } from "../../../supervisor/supervisor-common.mjs";

const expected = { abi: "x86_64", api: 33, pages: 4096 }, observations = new Map();
const source = mode => readFileSync(new URL(`assets/runtime-network-${mode}.mjs`, import.meta.url), "utf8");
// Real host TLS/HTTPS and IPv6 sockets; only Android identity and /proc inputs
// are substituted. These tests are harness checks, never Android/Bun evidence.
async function execute(mode, overrides = {}) {
    const owned = await fs.mkdtemp(join(tmpdir(), "bun-network-test-")), output = [];
    const auxv = Buffer.alloc(32); auxv.writeBigUInt64LE(6n); auxv.writeBigUInt64LE(4096n, 8);
    const inputs = { assert, readFileSync: path => {
        if (path === "/proc/self/auxv") return auxv;
        if (path === "/proc/self/smaps") return "KernelPageSize:        4 kB\n";
        throw new Error("Unexpected read: " + path);
    }, createHash, tls, https, http, net, dgram, Buffer, performance, setTimeout, clearTimeout, fetch,
    process: { platform: "android", arch: "x64", getuid: () => 10042, pid: 1234, cwd: () => owned, exit: code => { throw new Error("Fixture exit " + code); } },
    Bun: { version: "1.4.0", revision: "e8b1296169a8e6f20c81e926dba6448afb25cd11" },
    console: { log: line => output.push(line), error: line => { throw new Error(line); } }, ...overrides };
    try {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        await new AsyncFunction(...Object.keys(inputs), source(mode).replace(/^import .+ from .+;\r?\n/gm, ""))(...Object.values(inputs));
        assert.equal(output.length, 1); assert.deepEqual(await fs.readdir(owned), []);
        const proof = JSON.parse(output[0].slice("RUNTIME_NETWORK_RESULT=".length));
        assert.equal(proof.workspace, owned); validateNetworkEvidence(proof.evidence, mode); return proof;
    } finally { await fs.rm(owned, { recursive: true }); }
}
function record(mode) {
    const proof = structuredClone(observations.get(mode));
    proof.workspace = `/data/user/0/${PACKAGE}/cache/bun-executions/synthetic-test`;
    return { mode, environment: {}, sourceSha256: fixtureFacts(mode).sha256, workspaceRemoved: true,
        stdout: "RUNTIME_NETWORK_RESULT=" + JSON.stringify(proof) + "\n", stderr: "",
        terminal: { succeeded: true, exitCode: 0, errorCode: null }, compatibilityAcceptance: false };
}
function instrumentation(records = MODES.map(record)) {
    const junit = code => `INSTRUMENTATION_STATUS: class=${NETWORK_CLASS}\nINSTRUMENTATION_STATUS: test=${NETWORK_TEST}\nINSTRUMENTATION_STATUS: numtests=1\nINSTRUMENTATION_STATUS: current=1\nINSTRUMENTATION_STATUS_CODE: ${code}\n`;
    return junit(1) + records.map(r => `INSTRUMENTATION_STATUS: stream=RUNTIME_NETWORK=${JSON.stringify(r)}\nINSTRUMENTATION_STATUS_CODE: 0\n`).join("")
        + junit(0) + "OK (1 test)\nINSTRUMENTATION_CODE: -1\n";
}
test("public fixture certificates bind key, issuer, hostname and exact embedded bytes", verifyCertificates);
for (const mode of MODES) test(`actual host ${mode} fixture and semantic proof`, { timeout: 15000 }, async () => {
    observations.set(mode, await execute(mode)); validateNetworkRecord(record(mode), mode, expected, 10042);
});
test("disabling certificate verification cannot pass the actual rejection fixture", { timeout: 15000 }, async () => {
    await assert.rejects(execute("tls-rejection", { tls: { ...tls, connect: options => tls.connect({ ...options, rejectUnauthorized: false }) } }), /true !== false/);
});
test("semantic controls reject wrong identity/protocol/data and incomplete closures", () => {
    const controls = {
        "tls-transport": [e => e.sessions[0].authorized = false, e => e.sessions[1].protocol = "TLSv1.2",
            e => e.accepted[0].servername = "wrong", e => e.sessions[0].peerCertificateSha256 = "0".repeat(64), e => e.closeErrors[0] = true],
        "tls-rejection": [e => e.records[0].secure = true, e => e.records[1].errorCode = "ECONNRESET", e => e.records[2].authorized = false,
            e => e.records[0].closed = false, e => e.serverReceivedBytes++],
        https: [e => e.peer.authorizationError = "ignored", e => e.body.payloadBytes--, e => e.body.ended = false, e => e.serverClosed = false],
        ipv6: [e => e.tcp.serverPeer.address = "127.0.0.1", e => e.udp.requests = 0, e => e.udp.serverClosed = false,
            e => e.http.requests[0].family = "IPv4", e => e.http.liveServerSockets = 1],
    };
    for (const mode of MODES) for (const alter of controls[mode]) {
        const e = structuredClone(observations.get(mode).evidence); alter(e); assert.throws(() => validateNetworkEvidence(e, mode));
    }
});
test("record bindings reject changed source, UID, environment, budget and output", () => {
    for (const alter of [r => r.sourceSha256 = "0".repeat(64), r => r.environment.NODE_TLS_REJECT_UNAUTHORIZED = "0",
        r => r.workspaceRemoved = false, r => r.stdout += "extra\n", r => r.stderr = "ignored", r => r.terminal.succeeded = false]) {
        const r = record("https"); alter(r); assert.throws(() => validateNetworkRecord(r, "https", expected, 10042));
    }
    for (const alter of [p => p.uid++, p => p.arch = "arm64", p => p.revision = "old", p => p.pages = 16384,
        p => p.kernelMappingPages = 16384, p => p.elapsedMillis = 8000, p => p.workspace += "/../escape"]) {
        const r = record("https"), p = JSON.parse(r.stdout.slice("RUNTIME_NETWORK_RESULT=".length)); alter(p);
        r.stdout = "RUNTIME_NETWORK_RESULT=" + JSON.stringify(p) + "\n"; assert.throws(() => validateNetworkRecord(r, "https", expected, 10042));
    }
});
test("four ordered records require one successful JUnit and cannot hide a failed mode", () => {
    const raw = instrumentation(); assert.equal(validateNetworkInstrumentation(raw, expected, 10042).length, 4);
    for (const bad of [instrumentation(MODES.slice(1).map(record)), instrumentation(MODES.toReversed().map(record)),
        instrumentation([...MODES.map(record), record("https")]), raw.replace("INSTRUMENTATION_STATUS_CODE: 1", "INSTRUMENTATION_STATUS_CODE: -2"),
        raw + "INSTRUMENTATION_CODE: -1\n", raw.replace("RUNTIME_NETWORK=", "RUNTIME_NETWORK_FAILURE="),
        raw.replace("OK (1 test)", "FAILURES!!!")]) assert.throws(() => validateNetworkInstrumentation(bad, expected, 10042));
});

test("archive binds raw observations to source, native payload, installed APKs and both cleared UIDs", () => {
    const native = JSON.parse(readFileSync(new URL("../runtime-evidence.json", import.meta.url), "utf8"));
    const artifact = native.artifacts.find(a => a.abi === "x86_64"), helper = supervisorArtifacts.get("x86_64");
    const apk = { bytes: 123, sha256: "a".repeat(64) }, testApk = { bytes: 456, sha256: "b".repeat(64) }, raw = instrumentation();
    const r = { schemaVersion: 1, kind: NETWORK_KIND, passed: true, compatibilityAcceptance: false, distributionReady: false,
        package: PACKAGE, expected, device: { api: "33", abi: "x86_64", pages: "4096", bridge: "0", machine: "x86_64" },
        packageUids: { [PACKAGE]: 10042, [PACKAGE + ".test"]: 10043 }, uid: 10042, finalUidProcesses: 0, finalPackageListing: "",
        finalProcessListing: "UID PID NAME\n0 1 init\n", finalPackageUidProcesses: { [PACKAGE]: 0, [PACKAGE + ".test"]: 0 },
        cleanup: [{ package: PACKAGE + ".test", uninstalled: true }, { package: PACKAGE, uninstalled: true }],
        build: { inputs: buildInputs(), jscCandidate: null, source: native.source, runtime: native.identity,
            runtimes: native.artifacts.map(({ abi, bytes, sha256 }) => ({ abi, bytes, sha256 })) }, runtime: native.identity,
        payloads: [{ abi: artifact.abi, entry: "lib/x86_64/libbun_exec.so", bytes: artifact.bytes, sha256: artifact.sha256,
            supervisor: { entry: "lib/x86_64/libbun_supervisor.so", bytes: helper.binaryBytes, sha256: helper.binarySha256 } }],
        apk, testApk, installedApkSha256: apk.sha256, installedTestApkSha256: testApk.sha256,
        signatures: [0, 1].map(() => ({ signerCount: 1, verifiedSchemes: ["v2"], certificateSha256: "c".repeat(64) })),
        rounds: [1, 2].map(round => ({ round, status: 0, stderr: "", stdout: raw, remainingUidProcesses: 0,
            passedTests: [NETWORK_TEST], runtimeNetwork: validateNetworkInstrumentation(raw, expected, 10042),
            memory: { before: "MemAvailable: 123 kB", after: "MemAvailable: 124 kB" } })) };
    validateNetworkRun(r, [raw, raw]);
    for (const alter of [x => x.build.inputs.pop(), x => x.build.jscCandidate = {}, x => x.payloads[0].sha256 = "0".repeat(64),
        x => x.installedTestApkSha256 = apk.sha256, x => x.signatures[1].certificateSha256 = "d".repeat(64),
        x => x.finalProcessListing += "10043 321 surviving-test-process\n", x => x.packageUids[PACKAGE + ".test"] = 10042,
        x => x.rounds[0].runtimeNetwork[0].evidence.evidence.sessions[0].authorized = false, x => x.rounds[1].error = "failure",
        x => x.cleanup.pop(), x => x.rounds[0].memory = {}]) {
        const bad = structuredClone(r); alter(bad); assert.throws(() => validateNetworkRun(bad, [raw, raw]));
    }
    assert.throws(() => validateNetworkRun(r, [raw + "drift", raw]));
    const reports = [28, 31, 33, 35, 33].map((api, i) => ({ ...structuredClone(r), serial: `synthetic-${i}`,
        expected: { abi: i === 4 ? "x86_64" : "arm64-v8a", api, pages: 4096 } }));
    assert.equal(summarizeNetworkRuns(reports).fixedModesPassed, 40);
    for (const alter of [x => x[1].serial = x[0].serial, x => x[1].expected.api = 28,
        x => x[2].apk.sha256 = "e".repeat(64), x => x[4].testApk.sha256 = "f".repeat(64)]) {
        const bad = structuredClone(reports); alter(bad); assert.throws(() => summarizeNetworkRuns(bad));
    }
});
