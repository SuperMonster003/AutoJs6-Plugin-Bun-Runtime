import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { SAMPLING_KIND, SAMPLING_CLASS, SAMPLING_TEST, fixtureFacts, validateSamplingRecord, validateSamplingInstrumentation } from "./sampling-common.mjs";
import { validateSamplingRun, summarizeSamplingRuns } from "./archive-sampling.mjs";
import { REFERENCE, validatePressureInstrumentation } from "../pressure/pressure-common.mjs";
import { PACKAGE, buildInputs } from "../../api28/binder/binder-common.mjs";
import { THIRTEEN_PATCH_HEAD } from "../thirteen-patch-common.mjs";

const pkg = PACKAGE + ".jsc16k";
const tiers = n => ({ LLInt: 0, Baseline: 0, DFG: n, FTL: 0 });
const sync = r => { r.stdout = "JSC_SAMPLING_RESULT=" + JSON.stringify(r.evidence) + "\n"; return r; };
function observation(low = false, pages = 16384) {
    const captures = (low ? [1, 1, 0, 0] : [3]).map((n, i) => ({ index: i + 1,
        before: { compiles: 3, retries: 1 }, after: { compiles: 3, retries: 1 }, calls: 100,
        callbackMillis: 300, profileMillis: 305, stopReason: "deadline", traces: n + 2,
        distinctTraceTimestamps: n + 2, firstTimestamp: 1000 * (i + 1), lastTimestamp: 1000 * (i + 1) + n + 1,
        frames: n + 2, tierFrames: { ...tiers(n), other: 2 }, targetFrames: tiers(n), unknownTargetFrames: 0,
        targetTraces: n, topTargetTraces: n, distinctDfgTraceTimestamps: n,
        histogram: [...(n ? [{ name: "jscPressureHotLoop", category: "DFG", frames: n }] : []),
            { name: "other", category: "Native", frames: 2 }], overflowFrames: 0 }));
    const witnesses = captures.flatMap(c => Array.from({ length: c.targetFrames.DFG }, (_, i) => ({ profile: c.index,
        timestamp: c.firstTimestamp + i, frameIndex: 0, frame: { name: "jscPressureHotLoop", category: "DFG", location: "fixture.mjs:30" } }))).slice(0, 3);
    return sync({ sourceSha256: fixtureFacts().sha256, workspaceRemoved: true, exitCode: low ? 1 : 0, succeeded: !low,
        evidence: { schemaVersion: 1, mode: "dfg", platform: "android", arch: "x64", version: "1.4.0", revision: THIRTEEN_PATCH_HEAD,
            pages, kernelMappingPages: 4096, pageSizeSource: "/proc/self/auxv AT_PAGESZ", userPageSizeEmulated: pages === 16384,
            workspace: `/data/user/0/${pkg}/cache/bun-executions/test-123`, reference: REFERENCE, iterationsPerCall: 16384,
            warmupCalls: 128, intervalMicroseconds: 1000, captureBudgetMillis: 300, captureCallCap: 100000, captureCap: 4,
            calls: 128 + captures.length * 100, samples: tiers(low ? 2 : 3), captures, witnesses,
            finalState: { compiles: 3, retries: 1 }, elapsedMillis: 1300, originalGatePassed: !low, compatibilityAcceptance: false } });
}
function raw(r) {
    const status = code => `INSTRUMENTATION_STATUS: class=${SAMPLING_CLASS}\nINSTRUMENTATION_STATUS: current=1\nINSTRUMENTATION_STATUS: numtests=1\nINSTRUMENTATION_STATUS: test=${SAMPLING_TEST}\nINSTRUMENTATION_STATUS_CODE: ${code}\n`;
    return status(1) + "INSTRUMENTATION_STATUS: stream=JSC_SAMPLING=" + JSON.stringify(r) + "\nINSTRUMENTATION_STATUS_CODE: 0\n" +
        status(0) + "INSTRUMENTATION_RESULT: stream=\nOK (1 test)\nINSTRUMENTATION_CODE: -1\n";
}
function run(pages = 16384) {
    // Synthetic validator fixture; no historical file is modified or relabeled.
    const r = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-14-m5-thirteen-patch-jsc-pressure.json", import.meta.url), "utf8")).reports[0];
    r.kind = SAMPLING_KIND; r.compatibilityAcceptance = false;
    r.expected.pages = pages; r.device.pages = String(pages); r.build.inputs = buildInputs();
    r.packageUids = { [pkg]: r.uid, [pkg + ".test"]: r.uid + 1 };
    r.finalPackageUidProcesses = { [pkg]: 0, [pkg + ".test"]: 0 }; r.finalPackageListing = "";
    r.rounds = [1, 2].map(round => { const o = observation(round === 2, pages); return {
        round, status: 0, stderr: "", stdout: raw(o), remainingUidProcesses: 0, sampling: [o], passedTests: [SAMPLING_TEST],
        memory: { before: "MemAvailable: 123456 kB", after: "MemAvailable: 123457 kB" } }; });
    return r;
}
const rawRounds = r => r.rounds.map(round => round.stdout + round.stderr);

test("low samples retain exit 1 without becoming pressure acceptance", () => {
    for (const pages of [4096, 16384]) for (const low of [false, true]) {
        const r = observation(low, pages); validateSamplingRecord(r, pages);
        assert.equal(validateSamplingInstrumentation(raw(r), pages).length, 1);
        assert.throws(() => validatePressureInstrumentation(raw(r), pages));
    }
    for (const mutate of [r => { r.exitCode = 0; }, r => { r.succeeded = true; },
        r => { r.evidence.originalGatePassed = true; }, r => { r.evidence.compatibilityAcceptance = true; }]) {
        const r = observation(true); mutate(r); assert.throws(() => validateSamplingRecord(sync(r), 16384));
    }
});

test("capture accounting rejects drift, truncation, premature stop and changed budgets", () => {
    for (const mutate of [
        p => { p.captures.pop(); }, p => { p.captures[1].index = 1; }, p => { p.calls++; }, p => { p.samples.DFG++; },
        p => { p.captures[0].frames++; }, p => { p.captures[0].tierFrames.DFG = 0; },
        p => { p.captures[0].histogram[0].frames++; }, p => { p.captures[0].histogram.push(p.captures[0].histogram[0]); },
        p => { p.captures[0].overflowFrames = 1; }, p => { p.captures[0].unknownTargetFrames = 999; },
        p => { p.captures[0].topTargetTraces = 999; }, p => { p.captures[0].distinctDfgTraceTimestamps = 999; },
        p => { p.captures[0].lastTimestamp = null; }, p => { p.captures[0].profileMillis = 1; },
        p => { p.captures[0].callbackMillis = 1; }, p => { p.captures[0].stopReason = "call-cap"; },
        p => { p.intervalMicroseconds = 10000; }, p => { p.captureCap = 5; }, p => { p.captureBudgetMillis = 1000; },
        p => { p.elapsedMillis = 20000; }, p => { p.finalState.compiles = 1000000; },
        p => { p.witnesses[0].frame.name = "anotherFunction"; }, p => { p.witnesses[0].timestamp = 1; },
        p => { p.reference = [...p.reference]; p.reference[0]++; }, p => { p.kernelMappingPages = 16384; },
        p => { p.revision = "7b9ac2668"; }, p => { p.workspace += "/nested"; },
    ]) { const r = observation(true); mutate(r.evidence); assert.throws(() => validateSamplingRecord(sync(r), 16384)); }
    const r = observation(); r.evidence.witnesses[1].timestamp = r.evidence.witnesses[0].timestamp;
    assert.throws(() => validateSamplingRecord(sync(r), 16384));
});

test("raw instrumentation cannot hide missing, duplicate, failed or mismatched observations", () => {
    const r = observation(), text = raw(r);
    for (const changed of [text.replace('"exitCode":0', '"exitCode":1'), text + text,
        text.replace("INSTRUMENTATION_STATUS_CODE: 0", "INSTRUMENTATION_STATUS_CODE: -2"),
        text.replace("OK (1 test)", "FAILURES!!!"), text.replace(SAMPLING_TEST, "anotherTest")]) {
        assert.throws(() => validateSamplingInstrumentation(changed, 16384));
    }
    r.evidence.samples.DFG++; assert.throws(() => validateSamplingRecord(r, 16384));
    const missing = observation(); missing.workspaceRemoved = false; assert.throws(() => validateSamplingRecord(missing, 16384));
});

test("archive binds current source, installed bytes, both UIDs and complete raw rounds", () => {
    const r = run(); validateSamplingRun(r, rawRounds(r));
    for (const mutate of [r => { r.compatibilityAcceptance = true; }, r => { r.passed = false; },
        r => { r.cleanup.pop(); }, r => { r.finalPackageUidProcesses[pkg + ".test"] = 1; },
        r => { delete r.packageUids[pkg + ".test"]; }, r => { r.finalPackageListing = pkg; },
        r => { r.installedTestApkSha256 = "a".repeat(64); }, r => { r.build.inputs[0].sha256 = "b".repeat(64); },
        r => { r.payloads[0].sha256 = "c".repeat(64); }, r => { r.signatures[0].certificateSha256 = "d".repeat(64); },
        r => { r.rounds[0].sampling[0].exitCode = 1; }, r => { r.rounds[0].error = "timeout"; },
        r => { r.rounds[0].memory = {}; }, r => { r.rounds.pop(); }, r => { r.distributionReady = true; }]) {
        const changed = run(); mutate(changed); assert.throws(() => validateSamplingRun(changed, rawRounds(changed)));
    }
    assert.throws(() => validateSamplingRun(r, [r.rounds[0].stdout + "drift", r.rounds[1].stdout]));
    const pair = [run(4096), run(16384)], summary = summarizeSamplingRuns(pair);
    assert.deepEqual(summary, { environments: 2, rounds: 4, collectedDiagnostics: 4, originalGateMatched: 2,
        originalGateNotMatched: 2, compatibilityPassesAdded: 0, rootCauseEstablished: false });
    assert.throws(() => summarizeSamplingRuns([pair[0], pair[0]]));
    pair[1].apk.sha256 = "e".repeat(64); assert.throws(() => summarizeSamplingRuns(pair));
});

test("diagnostic hot arithmetic retains the original function and the original fixture stays independent", () => {
    const original = readFileSync(new URL("../pressure/assets/jsc-pressure.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    const diagnostic = readFileSync(new URL("assets/jsc-sampling.mjs", import.meta.url), "utf8");
    const hot = s => s.match(/function jscPressureHotLoop\(seed\) \{[\s\S]*?\n\}/)[0];
    assert.equal(hot(diagnostic), hot(original));
    assert(fixtureFacts().bytes <= 16384);
    const source = readFileSync(new URL("java/JscSamplingInstrumentedTest.kt", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/@Test\s+fun (\w+)/g)].map(m => m[1]), [SAMPLING_TEST]);
});
