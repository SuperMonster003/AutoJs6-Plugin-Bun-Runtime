import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MODES, PRESSURE_CLASS, PRESSURE_TEST, REFERENCE, fixtureFacts, validateObservation, validatePressureInstrumentation } from "./pressure-common.mjs";
import { PACKAGE, buildInputs, validateInstrumentation } from "../../api28/binder/binder-common.mjs";
import { KIND } from "./pressure-common.mjs";
import { summarizePressureRuns, validatePressureRun } from "./archive-pressure.mjs";
import { loadRebasedJscCandidate } from "../rebased-common.mjs";
import { loadTwelvePatchJscCandidate, TWELVE_PATCH_BASELINE } from "../twelve-patch-common.mjs";

export function observation(mode, pages = 16384) {
    const targets = { "jit-off": "LLInt", baseline: "Baseline", dfg: "DFG", ftl: "FTL" };
    let evidence;
    if (targets[mode]) {
        const target = targets[mode], samples = { LLInt: 0, Baseline: 0, DFG: 0, FTL: 0 };
        samples[target] = 100;
        evidence = { target, samples, compiles: ["jit-off", "baseline"].includes(mode) ? 1000000 : 1,
            witnesses: [1, 2, 3].map(timestamp => ({ timestamp, frame: { name: "jscPressureHotLoop", category: target, location: "jsc-pressure.mjs:15" } })),
            profiles: 1, calls: 1000, iterationsPerCall: 16384, reference: REFERENCE.slice() };
    } else if (mode === "gc") evidence = { rounds: 24, fullCollections: 25, edenCollections: 24, objectsAllocated: 98304,
        bufferBytesAllocated: 50331648, objectsChecked: 192512, peakHeap: 8000000, finalHeap: 2000000 };
    else if (mode === "wasm") evidence = { modules: 32, calls: 2097152, memoryPages: 64, grows: 63, growthLimitRejected: true };
    else evidence = { waves: 4, concurrency: 4, exited: 16, workers: REFERENCE.map((value, seed) => ({ seed,
        checksum: Number((BigInt(value) * 512n) & 0xffffffffn), compiles: 1, transferredBytes: 1048576, exitCode: 0 })) };
    const proof = { schemaVersion: 1, mode, platform: "android", arch: "x64", version: "1.4.0", pages,
        pageSizeSource: "/proc/self/auxv AT_PAGESZ", kernelMappingPages: 4096, userPageSizeEmulated: pages === 16384,
        evidence, elapsedMillis: 500, workspace: `/data/user/0/${PACKAGE}.jsc16k/cache/bun-executions/test-123`, passed: true };
    return { sourceSha256: fixtureFacts().sha256, workspaceRemoved: true,
        stdout: "JSC_PRESSURE_RESULT=" + JSON.stringify(proof) + "\n", evidence: proof };
}
const sync = r => { r.stdout = "JSC_PRESSURE_RESULT=" + JSON.stringify(r.evidence) + "\n"; return r; };
export const raw = (observations = MODES.map(mode => observation(mode))) => {
    const status = code => `INSTRUMENTATION_STATUS: class=${PRESSURE_CLASS}\nINSTRUMENTATION_STATUS: current=1\nINSTRUMENTATION_STATUS: numtests=1\nINSTRUMENTATION_STATUS: test=${PRESSURE_TEST}\nINSTRUMENTATION_STATUS_CODE: ${code}\n`;
    return status(1) + observations.map(r => "INSTRUMENTATION_STATUS: stream=JSC_PRESSURE=" + JSON.stringify(r) + "\nINSTRUMENTATION_STATUS_CODE: 0\n").join("") +
        status(0) + "INSTRUMENTATION_RESULT: stream=\nOK (1 test)\nINSTRUMENTATION_CODE: -1\n";
};

test("bounded pressure inventory is separate from the unchanged eight-test production suite", () => {
    const source = readFileSync(new URL("java/JscPressureInstrumentedTest.kt", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/@Test\s+fun (\w+)/g)].map(m => m[1]), [PRESSURE_TEST]);
    assert(fixtureFacts().bytes <= 16384);
    for (const pages of [4096, 16384]) assert.equal(validatePressureInstrumentation(raw(MODES.map(m => observation(m, pages))), pages).length, 7);
    assert.throws(() => validateInstrumentation(raw()));
});

test("a tier needs distinct sampled witnesses, independent arithmetic and real compile semantics", () => {
    for (const mode of MODES.slice(0, 4)) {
        for (const mutate of [
            e => { e.target = "unknown"; }, e => { e.samples[e.target] = 0; }, e => { e.witnesses.pop(); },
            e => { e.witnesses[1].timestamp = e.witnesses[0].timestamp; }, e => { e.witnesses[0].frame.name = "differentLoop"; },
            e => { e.witnesses[0].frame.category = "unknown"; }, e => { e.reference[0]++; },
            e => { e.compiles = ["jit-off", "baseline"].includes(mode) ? 1 : 1000000; },
            e => { e.profiles = 5; }, e => { e.calls = 0; }, e => { e.iterationsPerCall = 1; },
        ]) {
            const r = observation(mode); mutate(r.evidence.evidence);
            assert.throws(() => validateObservation(sync(r), mode, 16384));
        }
    }
    for (const mode of ["jit-off", "baseline", "dfg"]) {
        const r = observation(mode); r.evidence.evidence.samples.FTL = 1;
        assert.throws(() => validateObservation(sync(r), mode, 16384));
    }
});

test("GC, Wasm and workers reject incomplete work or unjoined workers", () => {
    for (const [mode, mutate] of [
        ["gc", e => { e.objectsChecked--; }], ["gc", e => { e.finalHeap = 0; }],
        ["gc", e => { e.peakHeap = 128 * 1024 * 1024; }], ["gc", e => { e.fullCollections = 24; }],
        ["wasm", e => { e.growthLimitRejected = false; }], ["wasm", e => { e.calls--; }],
        ["wasm", e => { e.grows--; }], ["workers", e => { e.workers.pop(); }],
        ["workers", e => { e.exited--; }], ["workers", e => { e.workers[0].exitCode = 1; }],
        ["workers", e => { e.workers[0].checksum++; }], ["workers", e => { e.workers[0].compiles = 0; }],
        ["workers", e => { e.workers[0].transferredBytes--; }],
    ]) {
        const r = observation(mode); mutate(r.evidence.evidence);
        assert.throws(() => validateObservation(sync(r), mode, 16384));
    }
});

test("native page size, fixture, bounded output and private workspace are mandatory", () => {
    const alias = observation("ftl");
    alias.evidence.workspace = alias.evidence.workspace.replace("/data/user/0/", "/data/data/");
    validateObservation(sync(alias), "ftl", 16384);
    for (const mutate of [
        r => { r.sourceSha256 = "a".repeat(64); }, r => { r.workspaceRemoved = false; },
        r => { r.evidence.pages = 4096; }, r => { r.evidence.arch = "arm64"; },
        r => { r.evidence.kernelMappingPages = 16384; }, r => { r.evidence.userPageSizeEmulated = false; },
        r => { r.evidence.platform = "linux"; }, r => { r.evidence.version = "1.4.1"; },
        r => { r.evidence.elapsedMillis = 20000; }, r => { r.evidence.passed = false; },
        r => { r.evidence.workspace += "/../unrelated"; },
        r => { r.evidence.workspace = r.evidence.workspace.replace("/data/user/0/", "/data/user/1/"); },
    ]) {
        const r = observation("ftl"); mutate(r);
        assert.throws(() => validateObservation(sync(r), "ftl", 16384));
    }
    const r = observation("ftl"); r.evidence.elapsedMillis++;
    assert.throws(() => validateObservation(r, "ftl", 16384));
    r.stdout = "x".repeat(65537);
    assert.throws(() => validateObservation(r, "ftl", 16384));
});

test("raw instrumentation rejects missing, repeated, reordered, ignored and crash outcomes", () => {
    const rows = MODES.map(mode => observation(mode));
    for (const text of [raw(rows.slice(1)), raw([...rows, rows[0]]), raw([rows[1], rows[0], ...rows.slice(2)]),
        raw().replace("INSTRUMENTATION_STATUS_CODE: 0", "INSTRUMENTATION_STATUS_CODE: -3"),
        raw().replace("OK (1 test)", "OK (2 tests)"), raw().replace("INSTRUMENTATION_CODE: -1", "INSTRUMENTATION_CODE: 0"),
        raw() + "INSTRUMENTATION_CODE: -1\n", raw() + "INSTRUMENTATION_FAILED: crash\n",
        raw().replace(PRESSURE_TEST, "unknownTest"), raw().replace("numtests=1", "numtests=8"),
        raw().replace("current=1", "current=1\nINSTRUMENTATION_STATUS: current=1"),
    ]) assert.throws(() => validatePressureInstrumentation(text, 16384));
});

function runFixture(pages = 16384) {
    // Synthetic validator fixture only; original historical receipt is read-only.
    const historical = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-12-m5-x86-16k-final-binder.json", import.meta.url), "utf8"));
    const r = historical.reports[0];
    r.kind = KIND;
    r.expected.pages = pages; r.device.pages = String(pages);
    r.build.inputs = buildInputs();
    r.rounds = [1, 2].map(round => {
        const pressure = MODES.map(mode => observation(mode, pages));
        return { round, status: 0, remainingUidProcesses: 0, passedTests: [PRESSURE_TEST], pressure,
            stdout: raw(pressure), stderr: "" };
    });
    return r;
}
const rawRounds = r => r.rounds.map(round => round.stdout + round.stderr);

test("pressure archive requires matching bytes, signing, raw rounds and complete cleanup", () => {
    const r = runFixture();
    validatePressureRun(r, rawRounds(r));
    for (const mutate of [
        r => { r.kind = "experimental-plugin-binder"; }, r => { r.passed = false; },
        r => { r.distributionReady = true; }, r => { r.cleanupError = "late process"; },
        r => { r.cleanup.pop(); }, r => { r.finalUidProcesses = 1; },
        r => { r.installedTestApkSha256 = "a".repeat(64); }, r => { r.build.inputs[0].sha256 = "b".repeat(64); },
        r => { r.payloads[0].sha256 = "c".repeat(64); }, r => { r.signatures[0].verifiedSchemes = []; },
        r => { r.signatures[0].certificateSha256 = "d".repeat(64); }, r => { r.expected.api = 35; },
        r => { r.rounds[0].remainingUidProcesses = 1; }, r => { r.rounds[0].pressure.pop(); },
        r => { r.rounds[0].error = "timeout"; }, r => { r.rounds[0].stderr = "crash"; },
        r => { r.rounds[1].round = 1; }, r => { r.rounds.pop(); },
    ]) {
        const changed = runFixture(); mutate(changed);
        assert.throws(() => validatePressureRun(changed, rawRounds(changed)));
    }
    assert.throws(() => validatePressureRun(r, rawRounds(r).slice(0, 1)));
    assert.throws(() => validatePressureRun(r, [r.rounds[0].stdout + "drift", r.rounds[1].stdout]));
});

test("pressure summary requires both page sizes and the same APKs, without inflating Binder counts", () => {
    const records = [runFixture(4096), runFixture(16384)];
    const summary = summarizePressureRuns(records);
    assert.equal(summary.passedJUnitTests, 4);
    assert.equal(summary.passedPressureModes, 28);
    assert.equal(summary.workersExited, 64);
    assert.throws(() => summarizePressureRuns([records[0]]));
    assert.throws(() => summarizePressureRuns([records[0], records[0]]));
    records[1].testApk.sha256 = "e".repeat(64);
    assert.throws(() => summarizePressureRuns(records));
});

test("rebased pressure evidence binds the ten-patch source and cannot borrow historical bytes", () => {
    const r = runFixture(); // Synthetic record, never written over historical evidence.
    const candidate = loadRebasedJscCandidate();
    const baseline = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m2-blocked-pidfd-runtime-evidence.json", import.meta.url), "utf8"));
    r.runtime = { ...baseline.identity, variant: candidate.variant };
    r.build.runtime = r.runtime;
    r.build.source = baseline.source;
    r.build.jscCandidate = candidate;
    r.build.runtimes = baseline.artifacts.map(a => a.abi === "x86_64" ? candidate.artifact : a)
        .map(({ abi, bytes, sha256 }) => ({ abi, bytes, sha256 }));
    r.payloads[0].bytes = candidate.artifact.bytes;
    r.payloads[0].sha256 = candidate.artifact.sha256;
    validatePressureRun(r, rawRounds(r));
    for (const mutate of [
        x => { x.build.source = JSON.parse(readFileSync(new URL("../../api28/runtime-evidence.json", import.meta.url), "utf8")).source; },
        x => { x.build.source = runFixture().build.source; },
        x => { x.build.jscCandidate = runFixture().build.jscCandidate; },
        x => { x.payloads[0].sha256 = runFixture().payloads[0].sha256; },
        x => { x.build.jscCandidate.builds[1].driver.exitCode = null; },
    ]) {
        const changed = structuredClone(r); mutate(changed);
        assert.throws(() => validatePressureRun(changed, rawRounds(changed)));
    }
});

test("twelve-patch pressure records require the new candidate and exact baseline source", () => {
    const r = runFixture(); // Synthetic record, separate from actual device evidence.
    const candidate = loadTwelvePatchJscCandidate();
    const baseline = JSON.parse(readFileSync(TWELVE_PATCH_BASELINE, "utf8"));
    r.runtime = { ...baseline.identity, variant: candidate.variant };
    r.build.runtime = r.runtime;
    r.build.source = baseline.source;
    r.build.jscCandidate = candidate;
    r.build.runtimes = baseline.artifacts.map(a => a.abi === "x86_64" ? candidate.artifact : a)
        .map(({ abi, bytes, sha256 }) => ({ abi, bytes, sha256 }));
    r.payloads[0].bytes = candidate.artifact.bytes;
    r.payloads[0].sha256 = candidate.artifact.sha256;
    validatePressureRun(r, rawRounds(r));
    for (const mutate of [
        x => { x.build.jscCandidate = loadRebasedJscCandidate(); },
        x => { x.build.source = runFixture().build.source; },
        x => { x.payloads[0].sha256 = loadRebasedJscCandidate().artifact.sha256; },
        x => { x.build.jscCandidate.bunCommit = "f".repeat(40); },
        x => { x.build.jscCandidate.builds[1].driver.api28RecipesUnchanged = false; },
    ]) {
        const changed = structuredClone(r); mutate(changed);
        assert.throws(() => validatePressureRun(changed, rawRounds(changed)));
    }
});
