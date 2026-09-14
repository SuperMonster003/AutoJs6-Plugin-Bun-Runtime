import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { TRACE_KIND, TRACE_CLASS, TRACE_TEST, TRACE_CLASSES, MAP_MODES, modeOrder, environmentFor, fixtureFacts,
    verifyWorkloadPreserved, stripTraceObservation, parseTraceLog, parseCodeLocation, inspectRawTrace,
    validateTraceEvidence, validateTraceRecord, validateTraceInstrumentation } from "./trace-common.mjs";
import { validateTraceRun, summarizeTraceRuns } from "./archive-trace.mjs";
import { buildInputs } from "../../api28/binder/binder-common.mjs";
import { validatePcMapInstrumentation } from "../pcmap/pcmap-common.mjs";

// Constructed host controls from old data; these are never device observations.
const prior = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-14-m5-jsc-pcmap-diagnostics.json", import.meta.url), "utf8"));
const zeroTotals = () => ({ targetFtlFrames: 0, linkedTargetFtlFrames: 0, linkedToInvokeFtlFrames: 0, invokeFtlFrames: 0 });
const emptyBuckets = () => Object.fromEntries(TRACE_CLASSES.map(k => [k,
    { count: 0, firstTraceIndex: null, firstWitnessBytes: null, status: "absent", witness: null }]));
const frame = (name, category, hash = "Ab12Cd") => ({ sourceID: 1133, name, category,
    location: `#${hash}:${category}:bc#17`, line: 42, column: 3, flags: 0 });
function rawTrace(kind, timestamp = 1, phase = 1) {
    const target = frame("jscPressureHotLoop", kind.startsWith("target-ftl") ? "FTL" : "DFG");
    const caller = frame("invoke", kind === "dfg-pair" ? "DFG" : "FTL", "Ef34Gh");
    if (kind === "target-ftl-linked") target.inliner = { name: caller.name, location: caller.location, line: caller.line, column: caller.column, category: caller.category };
    const frames = kind.startsWith("target-ftl") || kind === "dfg-pair" || kind === "invoke-ftl-other-target" ? [target, caller]
        : kind === "invoke-ftl-target-absent" ? [caller] : [];
    frames.push(frame(`jscRestartPhase${phase}`, "LLInt", "A1yKbK"));
    return JSON.stringify({ timestamp, frames });
}
const log = mode => "Modified JSC options:\n   dumpOptions=1 (default: 0)\n"
    + "   printEachDFGFTLInlineCall=true (default: false)\n   collectExtraSamplingProfilerData=true (default: false)\n"
    + `   alwaysGeneratePCToCodeOriginMap=${mode === "map-on"} (default: false)\n`
    + "[InlineCall][FTL] Callee: jscPressureHotLoop#Ab12Cd -> Caller: invoke#Ef34Gh\n";
function observation(mode, pages = 4096) {
    const restart = structuredClone(prior.reports.find(r => r.expected.pages === pages).rounds[0].pcmap[0].restart);
    const p = restart.evidence;
    if (mode === "map-on") {
        const c = p.captures[3], target = c.targetFrames.DFG;
        const caller = c.histogram.find(h => h.name === "invoke" && h.category === "DFG").frames;
        c.targetFrames.DFG = 0; c.targetFrames.FTL = target;
        c.tierFrames.DFG -= target + caller; c.tierFrames.FTL += target + caller;
        for (const h of c.histogram) if (["invoke", "jscPressureHotLoop"].includes(h.name) && h.category === "DFG") h.category = "FTL";
        c.distinctDfgTraceTimestamps = 0; p.samples.DFG -= target; p.samples.FTL += target;
        p.targetGatePassed = false; restart.succeeded = false; restart.exitCode = 1;
    }
    const e = { schemaVersion: 1, perClassCap: 1, witnessByteCap: 4096, totalWitnessByteCap: 24576, storedWitnessBytes: 0, captures: [] };
    for (const [i, c] of p.captures.entries()) {
        const buckets = emptyBuckets(), totals = zeroTotals();
        if (c.targetFrames.FTL) {
            totals.targetFtlFrames = totals.linkedTargetFtlFrames = totals.linkedToInvokeFtlFrames = c.targetFrames.FTL;
            totals.invokeFtlFrames = c.histogram.find(h => h.name === "invoke" && h.category === "FTL").frames;
            buckets["target-ftl-linked"].count = totals.targetFtlFrames;
            buckets["invoke-ftl-target-absent"].count = totals.invokeFtlFrames - totals.targetFtlFrames;
        } else buckets["dfg-pair"].count = Math.min(c.targetFrames.DFG, c.histogram.find(h => h.name === "invoke" && h.category === "DFG")?.frames ?? 0);
        buckets.other.count = c.traces - Object.values(buckets).reduce((n, b) => n + b.count, 0);
        let traceIndex = 0;
        for (const [kind, b] of Object.entries(buckets)) if (b.count) {
            b.firstTraceIndex = traceIndex;
            b.witness = { traceIndex, rawTrace: rawTrace(kind, c.firstTimestamp, i + 1) };
            b.firstWitnessBytes = Buffer.byteLength(JSON.stringify(b.witness)); b.status = "stored";
            e.storedWitnessBytes += b.firstWitnessBytes; traceIndex += b.count;
        }
        e.captures.push({ index: i + 1, traces: c.traces, totals, buckets });
    }
    p.traceEvidence = e; restart.sourceSha256 = fixtureFacts().sha256;
    restart.stdout = "JSC_RESTART_RESULT=" + JSON.stringify(p) + "\n";
    return { mapMode: mode, environment: environmentFor(mode), compatibilityAcceptance: false,
        restart, stderr: log(mode), terminal: { succeeded: restart.succeeded, exitCode: restart.exitCode,
            errorCode: restart.succeeded ? null : "NON_ZERO_EXIT" } };
}
function instrumentation(records) {
    const status = code => `INSTRUMENTATION_STATUS: class=${TRACE_CLASS}\nINSTRUMENTATION_STATUS: current=1\nINSTRUMENTATION_STATUS: numtests=1\nINSTRUMENTATION_STATUS: test=${TRACE_TEST}\nINSTRUMENTATION_STATUS_CODE: ${code}\n`;
    return status(1) + records.map(r => "INSTRUMENTATION_STATUS: stream=JSC_TRACE=" + JSON.stringify(r) + "\nINSTRUMENTATION_STATUS_CODE: 0\n").join("")
        + status(0) + "INSTRUMENTATION_RESULT: stream=\nOK (1 test)\nINSTRUMENTATION_CODE: -1\n";
}
function run(pages) {
    const r = structuredClone(prior.reports.find(r => r.expected.pages === pages));
    r.kind = TRACE_KIND; r.build.inputs = buildInputs();
    r.rounds = r.rounds.map(round => {
        const records = modeOrder(round.round).map(mode => observation(mode, pages));
        return { ...round, pcmap: undefined, stdout: instrumentation(records), passedTests: [TRACE_TEST],
            trace: records.map(o => validateTraceRecord(o, o.mapMode, pages)) };
    });
    return r;
}

test("raw same-trace frames distinguish a linked FTL target, absence and unlinked frames", () => {
    for (const kind of TRACE_CLASSES) assert.equal(inspectRawTrace(rawTrace(kind)).kind, kind);
    const linked = inspectRawTrace(rawTrace("target-ftl-linked"));
    assert.equal(linked.links[0].machineFrameIndex, 1); assert.equal(linked.links[0].machine.codeBlockHash, "Ef34Gh");
    const raw = JSON.parse(rawTrace("target-ftl-linked"));
    raw.frames[0].inliner.location = "#Ab34Gh:FTL:bc#17";
    assert.equal(inspectRawTrace(JSON.stringify(raw)).kind, "target-ftl-unlinked");
    raw.frames[0].inliner.location = raw.frames[1].location;
    raw.frames.reverse(); assert.equal(inspectRawTrace(JSON.stringify(raw)).kind, "target-ftl-unlinked");
    assert.deepEqual(parseCodeLocation("#Ab12Cd:FTL:bc#17cp#2", "FTL"), { codeBlockHash: "Ab12Cd", tier: "FTL", bytecodeIndex: 17, checkpoint: 2 });
    for (const location of ["0x12345", "#Ab12Cd:DFG:bc#17", "#Ab12Cd:FTL:bc#17cp#4", "#Ab12Cd:FTL:bc#4294967295"])
        assert.throws(() => parseCodeLocation(location, "FTL"));
    for (const mutate of [r => { r.frames[0].inliner.category = "DFG"; }, r => { delete r.frames[0].sourceID; },
        r => { r.frames[0].inliner = null; }, r => { r.frames[0].location = "#Ab12Cd:DFG:bc#17"; }]) {
        const r = JSON.parse(rawTrace("target-ftl-linked")); mutate(r); assert.throws(() => inspectRawTrace(JSON.stringify(r)));
    }
});

test("four finalized JSC options are required, with extra data shared between arms", () => {
    for (const mode of MAP_MODES) assert.equal(parseTraceLog(log(mode), mode).options.collectExtraSamplingProfilerData.value, "true");
    const extra = "   collectExtraSamplingProfilerData=true (default: false)\n";
    for (const changed of [log("map-off"), log("map-on").replace(extra, ""), log("map-on") + extra,
        log("map-on").replace(extra, extra.replace("true", "false")), extra + log("map-on").replace(extra, ""),
        log("map-on").replace(extra, "") + extra]) assert.throws(() => parseTraceLog(changed, "map-on"));
});

test("original target gate and actual exit 1 survive trace and compiler-link validation", () => {
    for (const mode of MAP_MODES) {
        const r = validateTraceRecord(observation(mode), mode, 4096);
        assert.equal(r.restart.exitCode, mode === "map-on" ? 1 : 0);
        assert.equal(r.machineLinks.length, mode === "map-on" ? 1 : 0);
        assert(r.machineLinks.every(l => l.compilerDecisionMatched));
    }
    for (const mutate of [r => { r.restart.exitCode = 0; }, r => { r.terminal.errorCode = null; },
        r => { r.environment.BUN_JSC_collectExtraSamplingProfilerData = "false"; }, r => { r.compatibilityAcceptance = true; },
        r => { r.restart.sourceSha256 = prior.fixture.sha256; }, r => { r.restart.evidence.traceEvidence.captures[0].buckets.other.count++; }]) {
        const r = observation("map-on"); mutate(r); assert.throws(() => validateTraceRecord(r, "map-on", 4096));
    }
});

test("trace evidence rejects forged classes, counters, byte accounting, order and omissions", () => {
    const p = observation("map-on").restart.evidence;
    assert(validateTraceEvidence(p.traceEvidence, p).length > 4);
    for (const mutate of [e => { e.storedWitnessBytes++; }, e => { e.captures[3].totals.linkedTargetFtlFrames++; },
        e => { e.captures[0].buckets["dfg-pair"].status = "budget"; },
        e => { e.captures[0].buckets["dfg-pair"].witness.traceIndex++; },
        e => { e.captures[0].buckets["dfg-pair"].firstWitnessBytes++; },
        e => { e.captures[0].buckets["dfg-pair"].witness.rawTrace = rawTrace("invoke-ftl-target-absent"); },
        e => { e.captures[0].buckets["target-ftl-linked"].witness = {}; }, e => { e.captures.pop(); }]) {
        const e = structuredClone(p.traceEvidence); mutate(e); assert.throws(() => validateTraceEvidence(e, p));
    }
});

test("actual added observer preserves the first oversize candidate and enforces its total byte cap", () => {
    const source = readFileSync(new URL("assets/jsc-trace.mjs", import.meta.url), "utf8");
    const helper = source.match(/\/\/ TRACE-OBSERVATION-BEGIN\n([\s\S]*?)\/\/ TRACE-OBSERVATION-END/)[1];
    const context = vm.createContext({ assert, Buffer });
    vm.runInContext(helper + "\nglobalThis.collect = captureTraceEvidence; globalThis.evidence = traceEvidence;", context);
    const big = JSON.parse(rawTrace("other")); big.frames[0].name = "x".repeat(5000);
    const small = JSON.parse(rawTrace("other", 2));
    const first = context.collect([big, small], 1).buckets.other;
    assert.equal(first.count, 2); assert.equal(first.firstTraceIndex, 0); assert.equal(first.status, "oversize"); assert.equal(first.witness, null);
    const padded = ["target-ftl-linked", "dfg-pair", "other"].map(kind => {
        const r = JSON.parse(rawTrace(kind)); r.frames[0].sourceURL = "x".repeat(2200); return r;
    });
    const results = Array.from({ length: 4 }, (_, i) => context.collect(padded, i + 1));
    assert(context.evidence.storedWitnessBytes <= 24576);
    assert(results.some(c => Object.values(c.buckets).some(b => b.status === "budget")));
});

test("fixed instrumentation and archives bind raw traces, both UIDs and one exact APK pair", () => {
    for (const pages of [4096, 16384]) {
        const r = run(pages); validateTraceRun(r, r.rounds.map(x => x.stdout + x.stderr));
        for (const round of r.rounds) {
            assert.equal(validateTraceInstrumentation(round.stdout, pages, round.round).length, 2);
            assert.throws(() => validatePcMapInstrumentation(round.stdout, pages, round.round));
            assert.throws(() => validateTraceInstrumentation(round.stdout, pages, round.round === 1 ? 2 : 1));
        }
    }
    for (const mutate of [r => { r.rounds.pop(); }, r => { r.build.inputs[0].sha256 = "a".repeat(64); },
        r => { r.installedTestApkSha256 = "b".repeat(64); }, r => { r.rounds[0].trace[1].machineLinks[0].machineFrameIndex = 0; },
        r => { r.finalProcessListing += `\n${Object.values(r.packageUids)[1]} 123 leak`; }, r => { r.finalPackageListing = "package:still-installed"; }]) {
        const r = run(4096); mutate(r); assert.throws(() => validateTraceRun(r, r.rounds.map(x => x.stdout + x.stderr)));
    }
    const pair = [run(4096), run(16384)], summary = summarizeTraceRuns(pair);
    assert.equal(summary.profiles, 32); assert.equal(summary.modes[1].retainedExitOneDiagnostics, 4);
    assert.equal(summary.compatibilityPassesAdded, 0); assert.equal(summary.rawMachinePcOrMapPointerCaptured, false);
    assert.throws(() => summarizeTraceRuns([pair[0], pair[0]]));
    pair[1].apk.sha256 = "a".repeat(64); assert.throws(() => summarizeTraceRuns(pair));
});

test("removing exactly three observation blocks recovers the entire previous workload", () => {
    verifyWorkloadPreserved();
    const source = readFileSync(new URL("assets/jsc-trace.mjs", import.meta.url), "utf8");
    const old = readFileSync(new URL("../restart/assets/jsc-restart.mjs", import.meta.url), "utf8");
    assert.equal(stripTraceObservation(source), old);
    assert.notEqual(stripTraceObservation(source.replace('noFTL(jscPressureHotLoop);', 'noFTL(invoke);')), old);
    assert.throws(() => stripTraceObservation(source.replace('TRACE-OBSERVATION-BEGIN', 'UNBOUND')));
});
