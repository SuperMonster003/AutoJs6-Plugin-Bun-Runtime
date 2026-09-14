import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, watch } from "node:fs";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import dns from "node:dns/promises";
import dgram from "node:dgram";
import net from "node:net";
import http from "node:http";
import { MODES, API_CLASS, API_TEST, fixtureFacts, validateApiEvidence, validateApiRecord, validateApiInstrumentation } from "./api-common.mjs";
import { PACKAGE } from "../binder/binder-common.mjs";
import { buildInputs } from "../binder/binder-common.mjs";
import { API_KIND } from "./api-common.mjs";
import { validateApiRun, summarizeApiRuns } from "./archive-api.mjs";
import { supervisorArtifacts } from "../../../supervisor/supervisor-common.mjs";

const expected = { abi: "x86_64", api: 33, pages: 4096 };
const source = mode => readFileSync(new URL(`assets/runtime-api-${mode}.mjs`, import.meta.url), "utf8");
const observations = new Map();
// These are actual host filesystem/socket/Resolver/fetch operations. Only the
// Android identity and /proc inputs are substituted; this is harness validation,
// never evidence of Bun, an Android application UID, or device compatibility.
async function execute(mode, overrides = {}) {
    const owned = await fs.mkdtemp(join(tmpdir(), "bun-runtime-api-test-"));
    const auxv = Buffer.alloc(32); auxv.writeBigUInt64LE(6n); auxv.writeBigUInt64LE(4096n, 8);
    const output = [];
    const inputs = { assert, readFileSync: path => {
        if (path === "/proc/self/auxv") return auxv;
        if (path === "/proc/self/smaps") return "KernelPageSize:        4 kB\n";
        throw new Error("Unexpected synchronous read: " + path);
    }, createHash, fs, watch, join, dns, dgram, net, http, Buffer, performance, setTimeout, clearTimeout,
    fetch, AbortController, URL,
    process: { platform: "android", arch: "x64", getuid: () => 10042, pid: 1234, cwd: () => owned,
        exit: code => { throw new Error("Unexpected fixture deadline/exit: " + code); } },
    Bun: { version: "1.4.0", revision: "e8b1296169a8e6f20c81e926dba6448afb25cd11" },
    console: { log: line => output.push(line), error: line => { throw new Error(line); } }, ...overrides };
    try {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        await new AsyncFunction(...Object.keys(inputs), source(mode).replace(/^import .+ from .+;\r?\n/gm, ""))(...Object.values(inputs));
        assert.equal(output.length, 1); assert.deepEqual(await fs.readdir(owned), []);
        const proof = JSON.parse(output[0].slice("RUNTIME_API_RESULT=".length));
        assert.equal(proof.workspace, owned); validateApiEvidence(proof.evidence, mode);
        return proof;
    } finally { await fs.rm(owned, { recursive: true }); }
}
function record(mode) {
    // Synthetic Android wrapper for parser negative controls around host facts.
    const proof = structuredClone(observations.get(mode));
    proof.workspace = `/data/user/0/${PACKAGE}/cache/bun-executions/synthetic-test`;
    return { mode, environment: {}, sourceSha256: fixtureFacts(mode).sha256, workspaceRemoved: true,
        stdout: "RUNTIME_API_RESULT=" + JSON.stringify(proof) + "\n", stderr: "",
        terminal: { succeeded: true, exitCode: 0, errorCode: null }, compatibilityAcceptance: false };
}
function instrumentation(records = MODES.map(record)) {
    const junit = code => `INSTRUMENTATION_STATUS: class=${API_CLASS}\nINSTRUMENTATION_STATUS: test=${API_TEST}\nINSTRUMENTATION_STATUS: numtests=1\nINSTRUMENTATION_STATUS: current=1\nINSTRUMENTATION_STATUS_CODE: ${code}\n`;
    return junit(1) + records.map(r => `INSTRUMENTATION_STATUS: stream=RUNTIME_API=${JSON.stringify(r)}\nINSTRUMENTATION_STATUS_CODE: 0\n`).join("")
        + junit(0) + "OK (1 test)\nINSTRUMENTATION_CODE: -1\n";
}
for (const mode of MODES) test(`actual host ${mode} fixture and semantic proof`, { timeout: 15000 }, async () => {
    observations.set(mode, await execute(mode));
    validateApiRecord(record(mode), mode, expected, 10042);
});

test("late invalid watcher event remains a failure after the first valid notification", { timeout: 15000 }, async () => {
    await assert.rejects(execute("files", { watch: (path, callback) => watch(path, (type, name) => {
        callback(type, name); callback(type, "unexpected-other-file");
    }) }), /unexpected-other-file/);
});
test("Resolver wrong TXT data fails the executing fixture", { timeout: 15000 }, async () => {
    class WrongTxt extends dns.Resolver {
        async resolveTxt(name) { await super.resolveTxt(name); return [["corrupted"]]; }
    }
    await assert.rejects(execute("dns", { dns: { ...dns, Resolver: WrongTxt } }), /corrupted/);
});
test("semantic controls reject corrupt data, missing events and false cleanup", () => {
    const controls = {
        files: [e => e.renamedSha256 = "0".repeat(64), e => e.partialOffset++, e => e.watchEvents = [],
            e => e.exclusiveCopyCode = "SUCCESS", e => e.watcherClosed = false, e => e.directoryRemoved = false],
        dns: [e => e.servers = ["8.8.8.8:53"], e => e.lookup[0].family = 6, e => e.requests.pop(),
            e => e.txt = [["wrong"]], e => e.missingCode = "ETIMEOUT", e => e.socketClosed = false],
        tcp: [e => e.connections[0].receivedSha256 = "0".repeat(64), e => e.connections[1].ended = false,
            e => e.connections[0].peer = "::1", e => e.serverCloseErrors[0] = true, e => e.liveServerSockets = 1],
        "http-fetch": [e => e.redirected = false, e => e.payloadBytes--, e => e.abortName = "TimeoutError",
            e => e.abortServerResponseClosed = false, e => e.requests.pop(), e => e.serverClosed = false],
    };
    for (const mode of MODES) for (const alter of controls[mode]) {
        const evidence = structuredClone(observations.get(mode).evidence); alter(evidence);
        assert.throws(() => validateApiEvidence(evidence, mode));
    }
});
test("source, budgets, identity, UID, terminal and workspace bindings cannot drift", () => {
    for (const alter of [r => r.sourceSha256 = "0".repeat(64), r => r.environment.X = "1", r => r.workspaceRemoved = false,
        r => r.terminal.exitCode = 1, r => r.stderr = "error", r => r.stdout += "extra\n", r => r.compatibilityAcceptance = true]) {
        const r = record("files"); alter(r); assert.throws(() => validateApiRecord(r, "files", expected, 10042));
    }
    for (const alter of [p => p.uid++, p => p.arch = "arm64", p => p.revision = "old", p => p.pages = 16384,
        p => p.kernelMappingPages = 16384, p => p.elapsedMillis = 8000, p => p.workspace += "/../escape"]) {
        const r = record("files"), p = JSON.parse(r.stdout.slice("RUNTIME_API_RESULT=".length)); alter(p);
        r.stdout = "RUNTIME_API_RESULT=" + JSON.stringify(p) + "\n";
        assert.throws(() => validateApiRecord(r, "files", expected, 10042));
    }
});
test("instrumentation requires four ordered modes between one JUnit start and success", () => {
    const raw = instrumentation(); assert.equal(validateApiInstrumentation(raw, expected, 10042).length, 4);
    for (const bad of [instrumentation(MODES.slice(1).map(record)), instrumentation(MODES.toReversed().map(record)),
        instrumentation([...MODES.map(record), record("files")]), raw.replace("INSTRUMENTATION_STATUS_CODE: 1", "INSTRUMENTATION_STATUS_CODE: -2"),
        raw + "INSTRUMENTATION_CODE: -1\n", raw.replace("RUNTIME_API=", "RUNTIME_API_FAILURE="),
        raw.replace("INSTRUMENTATION_STATUS: current=1", "INSTRUMENTATION_STATUS: current=1\nINSTRUMENTATION_STATUS: current=1"),
        raw.replace("OK (1 test)", "FAILURES!!!")]) assert.throws(() => validateApiInstrumentation(bad, expected, 10042));
});

test("archive binds raw observations to source, native payload, installed APKs and both cleared UIDs", () => {
    const native = JSON.parse(readFileSync(new URL("../runtime-evidence.json", import.meta.url), "utf8"));
    const artifact = native.artifacts.find(a => a.abi === "x86_64"), helper = supervisorArtifacts.get("x86_64");
    const apk = { bytes: 123, sha256: "a".repeat(64) }, testApk = { bytes: 456, sha256: "b".repeat(64) }, raw = instrumentation();
    const r = { schemaVersion: 1, kind: API_KIND, passed: true, compatibilityAcceptance: false, distributionReady: false,
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
            passedTests: [API_TEST], runtimeApi: validateApiInstrumentation(raw, expected, 10042),
            memory: { before: "MemAvailable: 123 kB", after: "MemAvailable: 124 kB" } })) };
    validateApiRun(r, [raw, raw]);
    for (const alter of [x => x.build.inputs.pop(), x => x.build.jscCandidate = {}, x => x.payloads[0].sha256 = "0".repeat(64),
        x => x.installedTestApkSha256 = apk.sha256, x => x.signatures[1].certificateSha256 = "d".repeat(64),
        x => x.finalProcessListing += "10043 321 surviving-test-process\n", x => x.packageUids[PACKAGE + ".test"] = 10042,
        x => x.rounds[0].runtimeApi[0].evidence.evidence.watcherClosed = false, x => x.rounds[1].error = "failure",
        x => x.cleanup.pop(), x => x.rounds[0].memory = {}]) {
        const bad = structuredClone(r); alter(bad); assert.throws(() => validateApiRun(bad, [raw, raw]));
    }
    assert.throws(() => validateApiRun(r, [raw + "drift", raw]));
    const reports = [28, 31, 33, 35, 33].map((api, i) => ({ ...structuredClone(r), serial: `synthetic-${i}`,
        expected: { abi: i === 4 ? "x86_64" : "arm64-v8a", api, pages: 4096 } }));
    assert.equal(summarizeApiRuns(reports).fixedModesPassed, 40);
    for (const alter of [x => x[1].serial = x[0].serial, x => x[1].expected.api = 28,
        x => x[2].apk.sha256 = "e".repeat(64), x => x[4].testApk.sha256 = "f".repeat(64)]) {
        const bad = structuredClone(reports); alter(bad); assert.throws(() => summarizeApiRuns(bad));
    }
});
