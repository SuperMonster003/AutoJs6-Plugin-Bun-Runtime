import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MODES, FLOW_KIND, FLOW_CLASS, FLOW_TEST, fixtureFacts, originalFixtureFacts, environmentFor,
    verifyWorkloadPreserved, validateFlowRecord, validateFlowInstrumentation } from "./flow-common.mjs";
import { validateFlowRun, summarizeFlowRuns } from "./archive-flow.mjs";
import { buildInputs, PACKAGE } from "../../api28/binder/binder-common.mjs";

// Host controls execute the actual observed asset with a deterministic profiler.
// They are never archived as native samples or device outcomes.
const source = readFileSync(new URL("assets/jsc-pressure-flow.mjs", import.meta.url), "utf8").replaceAll("\r\n", "\n");
const prior = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-14-m5-thirteen-patch-jsc-pressure.json", import.meta.url), "utf8"));
const priorTrace = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-14-m5-jsc-trace-diagnostics.json", import.meta.url), "utf8"));
const frame = (name, category) => ({ sourceID: 10, name, category, location: `#Ab12Cd:${category}:bc#17`, line: 42, column: 1, flags: 0 });
const trace = (timestamp, category = "DFG", target = true) => ({ timestamp,
    frames: [...(target ? [frame("jscPressureHotLoop", category)] : []), frame("invoke", category)] });
async function observed(batches, pages = 4096, compiles = 1) {
    const auxv = Buffer.alloc(32); auxv.writeBigUInt64LE(6n); auxv.writeBigUInt64LE(BigInt(pages), 8);
    const stdout = []; let clock = 0, calls = 0, thrown = null;
    const args = { assert, Buffer, process: { platform: "android", arch: "x64", env: environmentFor("dfg"),
        cwd: () => `/data/user/0/${PACKAGE}.jsc16k/cache/bun-executions/host-control` },
        Bun: { version: "1.4.0", revision: "e8b1296169a8e6f20c81e926dba6448afb25cd11" },
        readFileSync: path => path === "/proc/self/auxv" ? auxv : "KernelPageSize: 4 kB\n",
        profile: (callback, interval) => { assert.equal(interval, 1000); callback(); return { stackTraces: { traces: batches[calls++] ?? [] } }; },
        noFTL: fn => assert.equal(fn.name, "jscPressureHotLoop"), optimizeNextInvocation: () => {},
        numberOfDFGCompiles: () => compiles, performance: { now: () => clock += 100 },
        console: { log: line => stdout.push(line) } };
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const run = new AsyncFunction(...Object.keys(args), source.replace(/^import .*;\n/gm, ""));
    try { await run(...Object.values(args)); } catch (error) { thrown = error; }
    const record = { mode: "dfg", environment: environmentFor("dfg"), sourceSha256: fixtureFacts().sha256,
        workspaceRemoved: true, stdout: stdout.join("\n") + "\n", stderr: thrown?.stack ?? "",
        terminal: { succeeded: !thrown, exitCode: thrown ? 1 : 0, errorCode: thrown ? "NON_ZERO_EXIT" : null }, compatibilityAcceptance: false };
    return { record, calls, thrown };
}
function other(mode, pages) {
    const p = structuredClone(prior.reports.find(r => r.expected.pages === pages).rounds[0].pressure.find(r => r.evidence.mode === mode));
    return { mode, environment: environmentFor(mode), sourceSha256: originalFixtureFacts().sha256, workspaceRemoved: true,
        stdout: p.stdout, stderr: "", terminal: { succeeded: true, exitCode: 0, errorCode: null }, compatibilityAcceptance: false };
}
function instrument(records) {
    const status = code => `INSTRUMENTATION_STATUS: class=${FLOW_CLASS}\nINSTRUMENTATION_STATUS: current=1\nINSTRUMENTATION_STATUS: numtests=1\nINSTRUMENTATION_STATUS: test=${FLOW_TEST}\nINSTRUMENTATION_STATUS_CODE: ${code}\n`;
    return status(1) + records.map(r => `INSTRUMENTATION_STATUS: stream=JSC_FLOW=${JSON.stringify(r)}\nINSTRUMENTATION_STATUS_CODE: 0\n`).join("")
        + status(0) + "INSTRUMENTATION_RESULT: stream=\nOK (1 test)\nINSTRUMENTATION_CODE: -1\n";
}
async function run(pages) {
    const r = structuredClone(priorTrace.reports.find(r => r.expected.pages === pages));
    r.kind = FLOW_KIND; r.build.inputs = buildInputs();
    const { record } = await observed([[trace(1), trace(2)], [], [], []], pages);
    r.rounds = r.rounds.map(round => {
        const records = MODES.map(mode => mode === "dfg" ? record : other(mode, pages));
        return { ...round, trace: undefined, stdout: instrument(records), passedTests: [FLOW_TEST],
            flow: records.map(o => validateFlowRecord(o, o.mode, pages)) };
    });
    return r;
}
function rewrite(record, mutate) {
    const r = structuredClone(record), lines = r.stdout.trim().split("\n");
    const d = JSON.parse(lines.at(-1).slice("JSC_FLOW_RESULT=".length)); mutate(d);
    lines[lines.length - 1] = "JSC_FLOW_RESULT=" + JSON.stringify(d); r.stdout = lines.join("\n") + "\n";
    return r;
}

test("actual original callback stops at three samples and records full profile duration outside it", async () => {
    verifyWorkloadPreserved();
    const { record, calls, thrown } = await observed([[trace(1), trace(2), trace(3)], []]);
    assert.equal(thrown, null); assert.equal(calls, 1);
    const r = validateFlowRecord(record, "dfg", 4096);
    assert.equal(r.gate, "passed"); assert.equal(r.diagnostic.final.calls, 130);
    assert.equal(r.diagnostic.captures[0].profileMillis, 500);
    assert.equal(r.diagnostic.traceEvidence.captures[0].buckets["dfg-pair"].count, 3);
});
test("actual four-profile low-sample assertion is rethrown with exit one and complete diagnostic output", async () => {
    const { record, calls, thrown } = await observed([[trace(1), trace(2)], [], [], []]);
    assert.equal(calls, 4); assert(thrown instanceof assert.AssertionError);
    assert.match(thrown.message, /^Missing DFG samples:/);
    const r = validateFlowRecord(record, "dfg", 4096);
    assert.equal(r.gate, "missing-dfg-samples"); assert.equal(r.terminal.exitCode, 1);
    assert.deepEqual(r.diagnostic.captures.map(c => c.targetFrames.DFG), [2, 0, 0, 0]);
    for (const mutate of [x => { x.terminal.exitCode = 0; }, x => { x.terminal.errorCode = null; },
        x => { x.stderr = ""; }, x => { x.environment.BUN_JSC_useFTLJIT = "false"; }, x => { x.sourceSha256 = originalFixtureFacts().sha256; },
        x => { x.compatibilityAcceptance = true; }]) {
        const changed = structuredClone(record); mutate(changed); assert.throws(() => validateFlowRecord(changed, "dfg", 4096));
    }
});
test("original compiler and target FTL assertions remain distinct from missing samples", async () => {
    for (const [batches, compiles, gate] of [
        [[[trace(1), trace(2), trace(3), trace(4, "FTL")]], 1, "unexpected-target-ftl"],
        [[[trace(1), trace(2), trace(3)]], 0, "invalid-compile-count"]]) {
        const { record, thrown } = await observed(batches, 16384, compiles);
        assert(thrown instanceof assert.AssertionError);
        assert.equal(validateFlowRecord(record, "dfg", 16384).gate, gate);
    }
});
test("capture counters, early stop, original witness bytes, raw classes and omission claims cannot drift", async () => {
    const { record } = await observed([[trace(1), trace(2)], [trace(3, "FTL", false)], [], []]);
    validateFlowRecord(record, "dfg", 4096);
    for (const mutate of [d => { d.captures[0].samplesAfter.DFG++; }, d => { d.captures[0].calls++; },
        d => { d.captures[0].profileMillis = 299; }, d => { d.captures.pop(); },
        d => { d.captures[1].targetTraces = 1; }, d => { d.final.witnesses[0].frame.location = "rawPC"; },
        d => { d.traceEvidence.storedWitnessBytes++; }, d => { d.traceEvidence.captures[0].buckets["dfg-pair"].status = "budget"; },
        d => { d.traceEvidence.captures[1].buckets["invoke-ftl-target-absent"].firstWitnessBytes++; },
        d => { d.failure.actual = true; }, d => { d.failure.message = "Timeout"; }, d => { d.fixtureReturned = true; }])
        assert.throws(() => validateFlowRecord(rewrite(record, mutate), "dfg", 4096));
    const { record: pass } = await observed([[trace(1), trace(2), trace(3)]]);
    const continued = rewrite(pass, d => { d.captures.push(structuredClone(d.captures[0])); d.captures[1].index = 2; });
    assert.throws(() => validateFlowRecord(continued, "dfg", 4096));
});
test("observed workload removes to byte-identical original code and gates without changing the callback", () => {
    for (const [from, to] of [["i < 128", "i < 129"], ["profiles < 4", "profiles < 5"], ["+ 300", "+ 301"],
        ["samples[target] >= 3", "samples[target] >= 2"], ["noFTL(jscPressureHotLoop)", "noFTL(invoke)"],
        ["i < 16384", "i < 16385"], ["}, 1000)", "}, 999)"], ["TRACE-OBSERVATION", "DRIFT"]]) {
        const changed = source.replace(from, to);
        if (changed !== source) assert.throws(() => verifyWorkloadPreserved(changed));
    }
    assert.throws(() => verifyWorkloadPreserved(source.replace("FLOW-OBSERVATION-BEGIN", "UNBOUND")));
});
test("fixed seven-mode records and archive bind both package UIDs, raw outputs and identical APKs", async () => {
    const pair = await Promise.all([run(4096), run(16384)]);
    for (const r of pair) {
        validateFlowRun(r, r.rounds.map(x => x.stdout + x.stderr));
        assert.equal(validateFlowInstrumentation(r.rounds[0].stdout, r.expected.pages).length, 7);
        const reversed = [...r.rounds[0].flow].reverse();
        assert.throws(() => validateFlowInstrumentation(instrument(reversed), r.expected.pages));
        for (const mutate of [x => { x.build.inputs[0].sha256 = "a".repeat(64); },
            x => { x.installedTestApkSha256 = "b".repeat(64); }, x => { x.rounds[0].flow[2].gate = "passed"; },
            x => { x.finalProcessListing += `\n${Object.values(x.packageUids)[1]} 123 leak`; },
            x => { x.rounds.pop(); }, x => { x.finalPackageListing = "package:leak"; }]) {
            const changed = structuredClone(r); mutate(changed);
            assert.throws(() => validateFlowRun(changed, changed.rounds.map(x => x.stdout + x.stderr)));
        }
    }
    const summary = summarizeFlowRuns(pair);
    assert.equal(summary.collectedModes, 28); assert.equal(summary.dfgProfiles, 16);
    assert.equal(summary.retainedExitOneDiagnostics, 4); assert.equal(summary.missingDfgSampleDiagnostics, 4);
    assert.equal(summary.compatibilityPassesAdded, 0); assert.equal(summary.historicalFailureRootCauseEstablished, false);
    pair[1].apk.sha256 = "c".repeat(64); assert.throws(() => summarizeFlowRuns(pair));
});
