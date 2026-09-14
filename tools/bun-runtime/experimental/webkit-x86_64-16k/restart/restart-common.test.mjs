import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { RESTART_KIND, RESTART_CLASS, RESTART_TEST, MODES, fixtureFacts, validateRestartRecord, validateRestartInstrumentation } from "./restart-common.mjs";
import { validateRestartRun, summarizeRestartRuns } from "./archive-restart.mjs";
import { REFERENCE, validatePressureInstrumentation } from "../pressure/pressure-common.mjs";
import { validateSamplingInstrumentation } from "../sampling/sampling-common.mjs";
import { PACKAGE, buildInputs } from "../../api28/binder/binder-common.mjs";
import { THIRTEEN_PATCH_HEAD } from "../thirteen-patch-common.mjs";

const pkg = PACKAGE + ".jsc16k";
const tiers = n => ({ LLInt: 0, Baseline: 0, DFG: n, FTL: 0 });
const sync = r => { r.stdout = "JSC_RESTART_RESULT=" + JSON.stringify(r.evidence) + "\n"; return r; };
function observation(mode = "target", pages = 16384) {
    const absent = mode === "target-absent";
    const captures = Array.from({ length: 4 }, (_, i) => ({ index: i + 1,
        before: { compiles: 3, retries: 1 }, after: { compiles: 3, retries: 1 }, calls: 100,
        callbackMillis: 300, profileMillis: 305, stopReason: "deadline", traces: 5,
        distinctTraceTimestamps: 5, firstTimestamp: 1000 * (i + 1), lastTimestamp: 1000 * (i + 1) + 4,
        frames: 10, tierFrames: { ...tiers(3), LLInt: 5, other: 2 },
        targetFrames: tiers(absent ? 0 : 3), controlFrames: tiers(absent ? 3 : 0),
        phaseFrames: Array.from({ length: 4 }, (_, phase) => i === phase ? 5 : 0),
        phaseWitness: { timestamp: 1000 * (i + 1), frameIndex: 1,
            frame: { name: `jscRestartPhase${i + 1}`, category: "LLInt", location: "fixture.mjs:30" } },
        unknownTargetFrames: 0, targetTraces: absent ? 0 : 3, topTargetTraces: absent ? 0 : 3,
        distinctDfgTraceTimestamps: absent ? 0 : 3,
        histogram: [{ name: absent ? "jscRestartControlLoop" : "jscPressureHotLoop", category: "DFG", frames: 3 },
            { name: `jscRestartPhase${i + 1}`, category: "LLInt", frames: 5 }, { name: "now", category: "Native", frames: 2 }], overflowFrames: 0 }));
    const witnesses = absent ? [] : [0, 1, 2].map(i => ({ profile: 1, timestamp: 1000 + i, frameIndex: 0,
        frame: { name: "jscPressureHotLoop", category: "DFG", location: "fixture.mjs:30" } }));
    return sync({ sourceSha256: fixtureFacts().sha256, workspaceRemoved: true, exitCode: absent ? 1 : 0, succeeded: !absent,
        evidence: { schemaVersion: 1, mode, platform: "android", arch: "x64", version: "1.4.0", revision: THIRTEEN_PATCH_HEAD,
            pages, kernelMappingPages: 4096, pageSizeSource: "/proc/self/auxv AT_PAGESZ", userPageSizeEmulated: pages === 16384,
            workspace: `/data/user/0/${pkg}/cache/bun-executions/test-123`, reference: REFERENCE, iterationsPerCall: 16384,
            warmupCalls: 128, intervalMicroseconds: 1000, captureBudgetMillis: 300, captureCallCap: 100000, captureCap: 4,
            calls: 528, sampledTargetCalls: absent ? 0 : 400, sampledControlCalls: absent ? 400 : 0,
            samples: tiers(absent ? 0 : 12), captures, witnesses, finalState: { compiles: 3, retries: 1 }, elapsedMillis: 1300,
            targetGatePassed: !absent, restartObserved: true, absentControlObserved: absent ? true : null, compatibilityAcceptance: false } });
}
function raw(observations = MODES.map(mode => observation(mode))) {
    const status = code => `INSTRUMENTATION_STATUS: class=${RESTART_CLASS}\nINSTRUMENTATION_STATUS: current=1\nINSTRUMENTATION_STATUS: numtests=1\nINSTRUMENTATION_STATUS: test=${RESTART_TEST}\nINSTRUMENTATION_STATUS_CODE: ${code}\n`;
    return status(1) + observations.map(r => "INSTRUMENTATION_STATUS: stream=JSC_RESTART=" + JSON.stringify(r) + "\nINSTRUMENTATION_STATUS_CODE: 0\n").join("") +
        status(0) + "INSTRUMENTATION_RESULT: stream=\nOK (1 test)\nINSTRUMENTATION_CODE: -1\n";
}
function run(pages = 16384) {
    // Synthetic test data only; never write over an archived device report.
    const r = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-14-m5-jsc-sampling-diagnostics.json", import.meta.url), "utf8")).reports[0];
    r.kind = RESTART_KIND; r.expected.pages = pages; r.device.pages = String(pages); r.build.inputs = buildInputs();
    r.finalProcessListing = "UID PID NAME\n0 1 init";
    r.rounds = [1, 2].map(round => { const restart = MODES.map(mode => observation(mode, pages)); return {
        round, status: 0, stderr: "", stdout: raw(restart), remainingUidProcesses: 0, restart, passedTests: [RESTART_TEST],
        memory: { before: "MemAvailable: 123456 kB", after: "MemAvailable: 123457 kB" } }; });
    return r;
}
const rawRounds = r => r.rounds.map(round => round.stdout + round.stderr);

test("four named phases and an actual zero-target outcome stay separate from previous suites", () => {
    for (const pages of [4096, 16384]) {
        const observations = MODES.map(mode => observation(mode, pages));
        observations.forEach((r, i) => validateRestartRecord(r, MODES[i], pages));
        assert.equal(validateRestartInstrumentation(raw(observations), pages).length, 2);
        assert.throws(() => validateSamplingInstrumentation(raw(observations), pages));
        assert.throws(() => validatePressureInstrumentation(raw(observations), pages));
    }
    for (const mutate of [r => { r.exitCode = 0; }, r => { r.succeeded = true; },
        r => { r.evidence.targetGatePassed = true; }, r => { r.evidence.compatibilityAcceptance = true; },
        r => { r.evidence.sampledTargetCalls = 1; }]) {
        const r = observation("target-absent"); mutate(r); assert.throws(() => validateRestartRecord(sync(r), "target-absent", 16384));
    }
});

test("stale phase data and overlapping timestamps can be retained only as failed restart observations", () => {
    const r = observation(), c = r.evidence.captures[1];
    c.phaseFrames = [5, 0, 0, 0]; c.phaseWitness = null; c.histogram[1].name = "jscRestartPhase1";
    r.evidence.restartObserved = false; validateRestartRecord(sync(r), "target", 16384);
    r.evidence.restartObserved = true; assert.throws(() => validateRestartRecord(sync(r), "target", 16384));
    const overlap = observation(); overlap.evidence.captures[1].firstTimestamp = 1000;
    overlap.evidence.restartObserved = false; validateRestartRecord(sync(overlap), "target", 16384);
    overlap.evidence.restartObserved = true; assert.throws(() => validateRestartRecord(sync(overlap), "target", 16384));
});

test("capture totals, histogram attribution, witnesses and fixed bounds reject corruption", () => {
    for (const mutate of [p => { p.captures.pop(); }, p => { p.calls++; }, p => { p.samples.DFG++; },
        p => { p.captures[0].histogram[0].name = "anotherFunction"; p.captures[0].targetFrames.DFG = 2; p.samples.DFG--; },
        p => { p.captures[0].histogram[0].category = "FTL"; }, p => { p.captures[0].histogram[0].frames++; },
        p => { p.captures[0].phaseWitness.frame.name = "jscRestartPhase4"; },
        p => { p.captures[0].phaseWitness.timestamp = 1; }, p => { p.captures[0].phaseFrames[0]++; },
        p => { p.captures[0].phaseWitness = null; }, p => { p.captures[0].controlFrames.DFG = 1; },
        p => { p.captures[0].overflowFrames = 1; }, p => { p.captures[0].profileMillis = 1; },
        p => { p.captureCap = 5; }, p => { p.captureBudgetMillis = 1000; }, p => { p.intervalMicroseconds = 500; },
        p => { p.witnesses[1].timestamp = p.witnesses[0].timestamp; }, p => { p.kernelMappingPages = 16384; },
        p => { p.revision = "old"; }, p => { p.finalState.compiles = 1000000; }, p => { p.workspace += "/nested"; },
    ]) { const r = observation(); mutate(r.evidence); assert.throws(() => validateRestartRecord(sync(r), "target", 16384)); }
});

test("ordered raw controls cannot omit failure exits or substitute a partial test run", () => {
    const observations = MODES.map(mode => observation(mode)), text = raw(observations);
    for (const changed of [raw(observations.slice(0, 1)), raw(observations.slice().reverse()), text + text,
        text.replace('"exitCode":1', '"exitCode":0'), text.replace("OK (1 test)", "FAILURES!!!"),
        text.replace("INSTRUMENTATION_STATUS_CODE: 0", "INSTRUMENTATION_STATUS_CODE: -2")]) {
        assert.throws(() => validateRestartInstrumentation(changed, 16384));
    }
});

test("archive binds raw ps to both UIDs, exact APKs, source and all restarted rounds", () => {
    const r = run(); validateRestartRun(r, rawRounds(r));
    for (const mutate of [r => { r.finalProcessListing += `\n${r.packageUids[pkg + ".test"]} 123 test`; },
        r => { delete r.finalProcessListing; }, r => { r.finalPackageUidProcesses[pkg] = 1; },
        r => { r.cleanup.pop(); }, r => { r.installedApkSha256 = "a".repeat(64); },
        r => { r.build.inputs[0].sha256 = "b".repeat(64); }, r => { r.payloads[0].sha256 = "c".repeat(64); },
        r => { r.signatures[0].certificateSha256 = "d".repeat(64); }, r => { r.compatibilityAcceptance = true; },
        r => { r.rounds[0].error = "timeout"; }, r => { r.rounds[0].restart.pop(); }, r => { r.rounds.pop(); }]) {
        const changed = run(); mutate(changed); assert.throws(() => validateRestartRun(changed, rawRounds(changed)));
    }
    assert.throws(() => validateRestartRun(r, [r.rounds[0].stdout + "drift", r.rounds[1].stdout]));
    const pair = [run(4096), run(16384)];
    assert.deepEqual(summarizeRestartRuns(pair), { environments: 2, rounds: 4, collectedDiagnostics: 8, profiles: 32,
        restartSequencesObserved: 8, targetGateMatched: 4, targetAbsentControlsObserved: 4,
        retainedExitOneDiagnostics: 4, compatibilityPassesAdded: 0, rootCauseEstablished: false });
    assert.throws(() => summarizeRestartRuns([pair[0], pair[0]]));
    pair[1].testApk.sha256 = "f".repeat(64); assert.throws(() => summarizeRestartRuns(pair));
});

test("original hot function remains exact and the new fixture has bounded source size", () => {
    const original = readFileSync(new URL("../pressure/assets/jsc-pressure.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    const diagnostic = readFileSync(new URL("assets/jsc-restart.mjs", import.meta.url), "utf8");
    const hot = s => s.match(/function jscPressureHotLoop\(seed\) \{[\s\S]*?\n\}/)[0];
    assert.equal(hot(diagnostic), hot(original)); assert(fixtureFacts().bytes <= 16384);
    const source = readFileSync(new URL("java/JscRestartInstrumentedTest.kt", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/@Test\s+fun (\w+)/g)].map(m => m[1]), [RESTART_TEST]);
});
