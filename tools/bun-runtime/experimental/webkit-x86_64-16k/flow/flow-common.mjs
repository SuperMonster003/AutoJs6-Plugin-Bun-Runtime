import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { facts, PACKAGE } from "../../api28/binder/binder-common.mjs";
import { MODES, fixtureFacts as originalFixtureFacts, validateObservation } from "../pressure/pressure-common.mjs";
import { TRACE_CLASSES, inspectRawTrace } from "../trace/trace-common.mjs";

export { MODES, originalFixtureFacts };
export const FLOW_KIND = "experimental-jsc-pressure-flow-diagnostic";
export const FLOW_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.JscFlowInstrumentedTest";
export const FLOW_TEST = "originalPressureFlowDiagnostics";
export const fixtureFacts = () => facts(new URL("assets/jsc-pressure-flow.mjs", import.meta.url));
export const environmentFor = mode => ({ AUTOJS6_JSC_PRESSURE_MODE: mode,
    ...(mode === "jit-off" ? { BUN_JSC_useJIT: "false" } : {}),
    ...(mode === "baseline" ? { BUN_JSC_useDFGJIT: "false", BUN_JSC_useFTLJIT: "false" } : {}) });
const tiers = ["LLInt", "Baseline", "DFG", "FTL"];
const totalKeys = ["targetFtlFrames", "linkedTargetFtlFrames", "linkedToInvokeFtlFrames", "invokeFtlFrames"];
const sum = values => values.reduce((a, b) => a + b, 0);
const integer = (n, lo, hi) => assert(Number.isSafeInteger(n) && n >= lo && n <= hi, `Integer outside [${lo}, ${hi}]: ${n}`);
const keys = (v, expected) => assert.deepEqual(Object.keys(v).sort(), expected.slice().sort());
const read = path => readFileSync(new URL(path, import.meta.url), "utf8").replaceAll("\r\n", "\n");
export function stripFlowObservation(source) {
    const pattern = /^\/\/ FLOW-OBSERVATION-BEGIN\n[\s\S]*?^\/\/ FLOW-OBSERVATION-END\n/gm;
    assert.equal(source.match(pattern)?.length, 7);
    return source.replace(pattern, "");
}
export function verifyWorkloadPreserved(source = read("assets/jsc-pressure-flow.mjs")) {
    assert(Buffer.byteLength(source) <= 16384);
    assert.equal(stripFlowObservation(source), read("../pressure/assets/jsc-pressure.mjs"));
    const helper = read("../trace/assets/jsc-trace.mjs").split("// TRACE-OBSERVATION-BEGIN\n")[1].split("// TRACE-OBSERVATION-END\n")[0];
    assert(source.includes(helper), "Retain the existing first-trace selection and byte accounting");
}

export function validateFlowTraceEvidence(evidence, captures) {
    keys(evidence, ["schemaVersion", "perClassCap", "witnessByteCap", "totalWitnessByteCap", "storedWitnessBytes", "captures"]);
    assert.equal(evidence.schemaVersion, 1); assert.equal(evidence.perClassCap, 1);
    assert.equal(evidence.witnessByteCap, 4096); assert.equal(evidence.totalWitnessByteCap, 24576);
    assert.equal(evidence.captures.length, captures.length);
    let stored = 0;
    const witnesses = [];
    for (const [i, capture] of evidence.captures.entries()) {
        const original = captures[i];
        keys(capture, ["index", "traces", "totals", "buckets"]);
        assert.equal(capture.index, i + 1); integer(capture.traces, 0, 10000);
        assert(original.frames <= capture.traces * 256);
        integer(original.targetTraces, 0, capture.traces);
        assert(original.targetTraces <= sum(Object.values(original.targetFrames)));
        if (!original.targetTraces) assert.equal(sum(Object.values(original.targetFrames)), 0);
        if (capture.traces) {
            assert(Number.isFinite(original.firstTimestamp) && original.firstTimestamp > 0);
            assert(Number.isFinite(original.lastTimestamp) && original.lastTimestamp >= original.firstTimestamp);
        } else { assert.equal(original.firstTimestamp, null); assert.equal(original.lastTimestamp, null); }
        keys(capture.totals, totalKeys); keys(capture.buckets, TRACE_CLASSES);
        const totals = capture.totals;
        Object.values(totals).forEach(n => integer(n, 0, original.frames));
        assert.equal(totals.targetFtlFrames, original.targetFrames.FTL);
        assert.equal(totals.invokeFtlFrames, original.callerFrames.FTL);
        assert(totals.linkedToInvokeFtlFrames <= totals.linkedTargetFtlFrames && totals.linkedTargetFtlFrames <= totals.targetFtlFrames);
        const buckets = Object.entries(capture.buckets);
        for (const [, b] of buckets) {
            keys(b, ["count", "firstTraceIndex", "firstWitnessBytes", "status", "witness"]);
            integer(b.count, 0, capture.traces);
            if (!b.count) assert.deepEqual(b, { count: 0, firstTraceIndex: null, firstWitnessBytes: null, status: "absent", witness: null });
            else { integer(b.firstTraceIndex, 0, capture.traces - b.count); integer(b.firstWitnessBytes, 1, 16 * 1024 * 1024); }
        }
        assert.equal(sum(buckets.map(([, b]) => b.count)), capture.traces);
        const present = buckets.filter(([, b]) => b.count).sort((a, b) => a[1].firstTraceIndex - b[1].firstTraceIndex);
        assert.equal(new Set(present.map(([, b]) => b.firstTraceIndex)).size, present.length);
        if (present.length) assert.equal(present[0][1].firstTraceIndex, 0);
        const n = kind => capture.buckets[kind].count;
        assert(n("target-ftl-linked") + n("target-ftl-unlinked") <= totals.targetFtlFrames);
        assert(n("target-ftl-linked") <= totals.linkedTargetFtlFrames);
        assert(n("target-ftl-unlinked") <= totals.targetFtlFrames - totals.linkedTargetFtlFrames);
        if (totals.targetFtlFrames) assert(n("target-ftl-linked") + n("target-ftl-unlinked") > 0);
        assert(n("invoke-ftl-other-target") + n("invoke-ftl-target-absent") <= totals.invokeFtlFrames);
        assert(n("dfg-pair") <= Math.min(original.targetFrames.DFG, original.callerFrames.DFG));
        assert(n("invoke-ftl-target-absent") <= capture.traces - original.targetTraces);
        const retainedTotals = Object.fromEntries(totalKeys.map(k => [k, 0]));
        const target = Object.fromEntries([...tiers, "other"].map(k => [k, 0])), caller = { ...target };
        let frames = 0, targetTraces = 0;
        for (const [kind, b] of present) {
            const status = b.firstWitnessBytes > 4096 ? "oversize" : stored + b.firstWitnessBytes > 24576 ? "budget" : "stored";
            assert.equal(b.status, status, "Keep the first candidate and deterministic omission status");
            if (status !== "stored") { assert.equal(b.witness, null); continue; }
            keys(b.witness, ["traceIndex", "rawTrace"]); assert.equal(b.witness.traceIndex, b.firstTraceIndex);
            assert.equal(Buffer.byteLength(JSON.stringify(b.witness)), b.firstWitnessBytes);
            const observed = inspectRawTrace(b.witness.rawTrace);
            assert.equal(observed.kind, kind);
            assert(observed.trace.timestamp >= original.firstTimestamp && observed.trace.timestamp <= original.lastTimestamp);
            frames += observed.trace.frames.length;
            if (observed.trace.frames.some(f => f.name === "jscPressureHotLoop")) targetTraces++;
            for (const f of observed.trace.frames) {
                const category = tiers.includes(f.category) ? f.category : "other";
                if (f.name === "jscPressureHotLoop") target[category]++;
                if (f.name === "invoke") caller[category]++;
            }
            for (const k of totalKeys) retainedTotals[k] += observed.totals[k];
            witnesses.push({ capture: i + 1, kind, traceIndex: b.firstTraceIndex, ...observed });
            stored += b.firstWitnessBytes;
        }
        assert(frames <= original.frames && targetTraces <= original.targetTraces);
        for (const k of [...tiers, "other"]) assert(target[k] <= original.targetFrames[k] && caller[k] <= original.callerFrames[k]);
        for (const k of totalKeys) assert(retainedTotals[k] <= totals[k]);
    }
    assert.equal(evidence.storedWitnessBytes, stored);
    return witnesses;
}

function validateDiagnostic(d, record, pages) {
    keys(d, ["schemaVersion", "mode", "platform", "arch", "version", "pages", "pageSizeSource", "kernelMappingPages",
        "userPageSizeEmulated", "revision", "workspace", "compatibilityAcceptance", "fixtureReturned", "failure", "final", "captures", "traceEvidence", "elapsedMillis"]);
    assert.equal(d.schemaVersion, 1); assert.equal(d.mode, "dfg"); assert.equal(d.platform, "android");
    assert.equal(d.arch, "x64"); assert.equal(d.version, "1.4.0");
    assert.equal(d.revision, "e8b1296169a8e6f20c81e926dba6448afb25cd11");
    assert.equal(d.pages, pages); assert([4096, 16384].includes(pages));
    assert.equal(d.pageSizeSource, "/proc/self/auxv AT_PAGESZ"); assert.equal(d.kernelMappingPages, 4096);
    assert.equal(d.userPageSizeEmulated, pages === 16384); assert.equal(d.compatibilityAcceptance, false);
    assert.equal(d.fixtureReturned, record.terminal.succeeded); integer(d.elapsedMillis, 1, 19999);
    const prefix = ["/data/user/0/", "/data/data/"].map(base => `${base}${PACKAGE}.jsc16k/cache/bun-executions/`).find(p => d.workspace.startsWith(p));
    assert(prefix && /^[A-Za-z0-9_-]{1,128}$/.test(d.workspace.slice(prefix.length)));
    integer(d.captures.length, 1, 4);
    const cumulative = Object.fromEntries(tiers.map(k => [k, 0]));
    for (const [i, c] of d.captures.entries()) {
        keys(c, ["index", "calls", "profileMillis", "frames", "targetFrames", "callerFrames", "targetTraces", "firstTimestamp", "lastTimestamp", "samplesAfter"]);
        assert.equal(c.index, i + 1); assert(cumulative.DFG < 3, "Original loop must stop immediately after three DFG samples");
        integer(c.calls, 0, 100000); integer(c.frames, 0, 2560000);
        assert(Number.isFinite(c.profileMillis) && c.profileMillis >= 0 && c.profileMillis < 20000);
        if (c.calls < 100000) assert(c.profileMillis >= 300, "Original callback stops only at its call cap or deadline");
        for (const counts of [c.targetFrames, c.callerFrames]) {
            keys(counts, [...tiers, "other"]); Object.values(counts).forEach(n => integer(n, 0, c.frames));
        }
        assert(sum(Object.values(c.targetFrames)) + sum(Object.values(c.callerFrames)) <= c.frames);
        for (const tier of tiers) cumulative[tier] += c.targetFrames[tier];
        assert.deepEqual(c.samplesAfter, cumulative);
    }
    assert(sum(d.captures.map(c => c.profileMillis)) <= d.elapsedMillis);
    const f = d.final;
    keys(f, ["samples", "witnesses", "compiles", "profiles", "calls"]);
    assert.deepEqual(f.samples, cumulative); assert.equal(f.profiles, d.captures.length);
    if (f.profiles < 4) assert(f.samples.DFG >= 3);
    assert.equal(f.calls, 128 + sum(d.captures.map(c => c.calls))); integer(f.calls, 129, 400128);
    integer(f.compiles, 0, 1000000);
    assert.equal(f.witnesses.length, Math.min(3, f.samples.DFG));
    for (const w of f.witnesses) {
        keys(w, ["timestamp", "frame"]);
        const observed = inspectRawTrace(JSON.stringify({ timestamp: w.timestamp, frames: [w.frame] }));
        assert.equal(observed.trace.frames[0].name, "jscPressureHotLoop"); assert.equal(w.frame.category, "DFG");
        assert(d.captures.some(c => c.targetFrames.DFG && w.timestamp >= c.firstTimestamp && w.timestamp <= c.lastTimestamp));
    }
    const gate = f.samples.DFG < 3 ? "missing-dfg-samples" : f.compiles <= 0 || f.compiles >= 1000000 ? "invalid-compile-count" : f.samples.FTL !== 0 ? "unexpected-target-ftl" : "passed";
    assert.equal(d.fixtureReturned, gate === "passed");
    if (gate === "passed") assert.equal(d.failure, null);
    else {
        keys(d.failure, ["name", "code", "message", "actual", "expected", "operator"]);
        assert.equal(d.failure.name, "AssertionError"); assert.equal(d.failure.code, "ERR_ASSERTION");
        assert(typeof d.failure.message === "string" && Buffer.byteLength(d.failure.message) <= 4096);
        assert.equal(d.failure.operator, gate === "unexpected-target-ftl" ? "strictEqual" : "==");
        assert.equal(d.failure.actual, gate === "unexpected-target-ftl" ? f.samples.FTL : false);
        assert.equal(d.failure.expected, gate === "unexpected-target-ftl" ? 0 : true);
        if (gate === "missing-dfg-samples") assert.equal(d.failure.message, `Missing DFG samples: ${JSON.stringify(f.samples)}; compiles=${f.compiles}`);
        assert(record.stderr.length > 0, "Retain the rethrown native assertion output");
    }
    return { gate, witnesses: validateFlowTraceEvidence(d.traceEvidence, d.captures) };
}

export function validateFlowRecord(record, mode, pages, sourceSha256 = fixtureFacts().sha256, originalSha256 = originalFixtureFacts().sha256) {
    assert(MODES.includes(mode)); assert.equal(record.mode, mode); assert.deepEqual(record.environment, environmentFor(mode));
    assert.equal(record.compatibilityAcceptance, false); assert.equal(record.workspaceRemoved, true);
    assert.equal(record.sourceSha256, mode === "dfg" ? sourceSha256 : originalSha256);
    assert(typeof record.stdout === "string" && typeof record.stderr === "string");
    assert(Buffer.byteLength(record.stdout) + Buffer.byteLength(record.stderr) <= 65536);
    assert([true, false].includes(record.terminal.succeeded));
    assert.deepEqual(record.terminal, { succeeded: record.terminal.succeeded, exitCode: record.terminal.succeeded ? 0 : 1,
        errorCode: record.terminal.succeeded ? null : "NON_ZERO_EXIT" });
    const lines = record.stdout.trim().split(/\r?\n/);
    if (mode !== "dfg") {
        assert.equal(record.terminal.succeeded, true); assert.equal(lines.length, 1); assert.equal(record.stderr, "");
        assert(lines[0].startsWith("JSC_PRESSURE_RESULT="));
        const pressure = { sourceSha256: originalSha256, workspaceRemoved: true, stdout: record.stdout,
            evidence: JSON.parse(lines[0].slice("JSC_PRESSURE_RESULT=".length)) };
        validateObservation(pressure, mode, pages, originalSha256);
        return { ...record, pressure };
    }
    assert.equal(lines.length, record.terminal.succeeded ? 2 : 1);
    assert(lines.at(-1).startsWith("JSC_FLOW_RESULT="));
    const diagnostic = JSON.parse(lines.at(-1).slice("JSC_FLOW_RESULT=".length));
    const { gate, witnesses } = validateDiagnostic(diagnostic, record, pages);
    let pressure = null;
    if (record.terminal.succeeded) {
        assert.equal(record.stderr, ""); assert(lines[0].startsWith("JSC_PRESSURE_RESULT="));
        pressure = { sourceSha256, workspaceRemoved: true, stdout: lines[0] + "\n", evidence: JSON.parse(lines[0].slice("JSC_PRESSURE_RESULT=".length)) };
        validateObservation(pressure, mode, pages, sourceSha256);
        const { samples, witnesses: originalWitnesses, compiles, profiles, calls } = pressure.evidence.evidence;
        assert.deepEqual(diagnostic.final, { samples, witnesses: originalWitnesses, compiles, profiles, calls });
        assert.equal(pressure.evidence.workspace, diagnostic.workspace);
        assert(pressure.evidence.elapsedMillis <= diagnostic.elapsedMillis);
    }
    return { ...record, diagnostic, pressure, gate, witnesses };
}

export function summarizeFlowObservations(observations) {
    assert.equal(observations.length, 28);
    for (const mode of MODES) assert.equal(observations.filter(r => r.mode === mode).length, 4);
    const dfg = observations.filter(r => r.mode === "dfg"), captures = dfg.flatMap(r => r.diagnostic.captures);
    return { collectedModes: 28, dfgDiagnostics: 4, dfgProfiles: captures.length,
        unchangedModeCompletions: 24, dfgOriginalAssertionsReturned: dfg.filter(r => r.gate === "passed").length,
        retainedExitOneDiagnostics: dfg.filter(r => r.terminal.exitCode === 1).length,
        missingDfgSampleDiagnostics: dfg.filter(r => r.gate === "missing-dfg-samples").length,
        zeroTargetCaptures: captures.filter(c => !sum(Object.values(c.targetFrames))).length,
        storedTraceWitnesses: sum(dfg.map(r => r.witnesses.length)),
        omittedTraceWitnesses: sum(dfg.flatMap(r => r.diagnostic.traceEvidence.captures).map(c => Object.values(c.buckets).filter(b => ["oversize", "budget"].includes(b.status)).length)),
        compatibilityPassesAdded: 0, historicalFailureRootCauseEstablished: false };
}

export function validateFlowInstrumentation(text, pages, sourceSha256 = fixtureFacts().sha256, originalSha256 = originalFixtureFacts().sha256) {
    assert(Buffer.byteLength(text) <= 2 * 1024 * 1024);
    const observations = [], started = [], passed = [];
    let bundle = {};
    for (const line of text.split(/\r?\n/)) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        if (field) { assert(!Object.hasOwn(bundle, field[1])); bundle[field[1]] = field[2]; }
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (!field && !status && bundle.stream !== undefined) bundle.stream += "\n" + line;
        if (!status) continue;
        const code = Number(status[1]); assert([0, 1].includes(code), "Failed pressure-flow diagnostic instrumentation");
        if (bundle.class === undefined && bundle.test === undefined) {
            assert.equal(code, 0); assert.deepEqual(Object.keys(bundle), ["stream"]);
            const stream = bundle.stream.trim(); assert(stream.startsWith("JSC_FLOW=") && !stream.includes("\n"));
            observations.push(validateFlowRecord(JSON.parse(stream.slice("JSC_FLOW=".length)), MODES[observations.length], pages, sourceSha256, originalSha256));
        } else {
            assert.equal(bundle.class, FLOW_CLASS); assert.equal(bundle.test, FLOW_TEST);
            assert.equal(Number(bundle.numtests), 1); assert.equal(Number(bundle.current), 1);
            (code === 0 ? passed : started).push(bundle.test);
        }
        bundle = {};
    }
    assert.deepEqual(started, [FLOW_TEST]); assert.deepEqual(passed, [FLOW_TEST]); assert.equal(observations.length, 7);
    assert.match(text, /OK \(1 test\)/);
    assert.deepEqual([...text.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\s*$/gm)].map(m => m[1]), ["-1"]);
    assert.doesNotMatch(text, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed/);
    return observations;
}
