import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { facts } from "../../api28/binder/binder-common.mjs";
import { validateRestartRecord } from "../restart/restart-common.mjs";
import { MAP_MODES, modeOrder, environmentFor as pcMapEnvironment, parsePcMapLog } from "../pcmap/pcmap-common.mjs";

export { MAP_MODES, modeOrder };
export const TRACE_KIND = "experimental-jsc-trace-diagnostic";
export const TRACE_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.JscTraceInstrumentedTest";
export const TRACE_TEST = "fixedTraceInlinerControls";
export const TRACE_CLASSES = Object.freeze(["target-ftl-linked", "target-ftl-unlinked", "invoke-ftl-other-target",
    "invoke-ftl-target-absent", "dfg-pair", "other"]);
export const fixtureFacts = () => facts(new URL("assets/jsc-trace.mjs", import.meta.url));
export const environmentFor = mode => ({ ...pcMapEnvironment(mode), BUN_JSC_collectExtraSamplingProfilerData: "true" });
const tiers = ["LLInt", "Baseline", "DFG", "FTL"];
const totalKeys = ["targetFtlFrames", "linkedTargetFtlFrames", "linkedToInvokeFtlFrames", "invokeFtlFrames"];
const sum = values => values.reduce((a, b) => a + b, 0);
const integer = (n, lo, hi) => assert(Number.isSafeInteger(n) && n >= lo && n <= hi);
const keys = (value, expected) => assert.deepEqual(Object.keys(value).sort(), expected.slice().sort());
const zeroTotals = () => Object.fromEntries(totalKeys.map(k => [k, 0]));

export function stripTraceObservation(source) {
    const blocks = source.match(/^\/\/ TRACE-OBSERVATION-BEGIN\n[\s\S]*?^\/\/ TRACE-OBSERVATION-END\n/gm);
    assert.equal(blocks?.length, 3);
    return source.replace(/^\/\/ TRACE-OBSERVATION-BEGIN\n[\s\S]*?^\/\/ TRACE-OBSERVATION-END\n/gm, "");
}
export function verifyWorkloadPreserved() {
    const source = readFileSync(new URL("assets/jsc-trace.mjs", import.meta.url), "utf8").replaceAll("\r\n", "\n");
    assert(Buffer.byteLength(source) <= 16384);
    assert.equal(stripTraceObservation(source), readFileSync(new URL("../restart/assets/jsc-restart.mjs", import.meta.url), "utf8").replaceAll("\r\n", "\n"));
}
export function parseTraceLog(stderr, mode) {
    assert(typeof stderr === "string" && Buffer.byteLength(stderr) <= 65536);
    const lines = stderr.split(/\r?\n/);
    const extra = "   collectExtraSamplingProfilerData=true (default: false)";
    assert.equal(lines.filter(line => line === extra).length, 1, "Require actual finalized extra-data option");
    assert(lines.indexOf(extra) > lines.indexOf("Modified JSC options:"));
    assert(!lines.slice(0, lines.indexOf(extra)).some(line => line.startsWith("[InlineCall]")));
    const parsed = parsePcMapLog(lines.filter(line => line !== extra).join("\n"), mode);
    parsed.options.collectExtraSamplingProfilerData = { value: "true", default: "false" };
    return parsed;
}

// JSC's exported semantic location contains a CodeBlock hash and bytecode index,
// not a raw machine PC or a serialized CodeOrigin pointer.
export function parseCodeLocation(location, category) {
    assert(typeof location === "string" && Buffer.byteLength(location) <= 1024);
    const m = location.match(/^#([A-Za-z0-9]{6}):([A-Za-z]+):(<nil>|bc#([0-9]+)(?:cp#([1-3]))?)$/);
    assert(m && m[2] === category, "JSC location/tier mismatch");
    if (m[4] !== undefined) integer(Number(m[4]), 0, 0x3fffffff);
    return { codeBlockHash: m[1], tier: m[2], bytecodeIndex: m[4] === undefined ? null : Number(m[4]), checkpoint: Number(m[5] ?? 0) };
}
function validateFrame(frame) {
    const expected = ["sourceID", "name", "location", "line", "column", "category", "flags"];
    if (Object.hasOwn(frame, "sourceURL")) expected.push("sourceURL");
    if (Object.hasOwn(frame, "inliner")) expected.push("inliner");
    keys(frame, expected);
    for (const k of ["name", "location", "category", ...(Object.hasOwn(frame, "sourceURL") ? ["sourceURL"] : [])]) {
        assert(typeof frame[k] === "string" && Buffer.byteLength(frame[k]) <= 4096);
    }
    for (const k of ["sourceID", "line", "column"]) integer(frame[k], -1, Number.MAX_SAFE_INTEGER);
    integer(frame.flags, 0, 1);
    if (tiers.includes(frame.category)) parseCodeLocation(frame.location, frame.category);
    if (Object.hasOwn(frame, "inliner")) {
        const m = frame.inliner; keys(m, ["name", "location", "line", "column", "category"]);
        assert(typeof m.name === "string" && Buffer.byteLength(m.name) <= 4096);
        assert.equal(m.category, frame.category);
        assert(tiers.includes(m.category)); parseCodeLocation(m.location, m.category);
        for (const k of ["line", "column"]) integer(m[k], -1, Number.MAX_SAFE_INTEGER);
    }
}

export function inspectRawTrace(rawTrace) {
    assert(typeof rawTrace === "string" && Buffer.byteLength(rawTrace) <= 4096);
    const trace = JSON.parse(rawTrace); keys(trace, ["timestamp", "frames"]);
    assert(Number.isFinite(trace.timestamp) && trace.timestamp > 0);
    assert(Array.isArray(trace.frames)); integer(trace.frames.length, 0, 256);
    trace.frames.forEach(validateFrame);
    const targets = trace.frames.map((frame, index) => ({ frame, index })).filter(x => x.frame.name === "jscPressureHotLoop");
    const targetFtl = targets.filter(x => x.frame.category === "FTL");
    const invokes = trace.frames.filter(f => f.name === "invoke");
    const invokeFtl = invokes.filter(f => f.category === "FTL");
    const links = [];
    for (const { frame, index } of targetFtl) {
        const m = frame.inliner;
        if (!m) continue;
        const outer = trace.frames.findIndex((f, i) => i > index && f.name === m.name && f.location === m.location && f.category === m.category);
        if (outer >= 0) links.push({ frameIndex: index, machineFrameIndex: outer,
            target: { name: frame.name, ...parseCodeLocation(frame.location, frame.category) },
            machine: { name: m.name, ...parseCodeLocation(m.location, m.category) } });
    }
    const kind = targetFtl.length ? (links.length === targetFtl.length ? "target-ftl-linked" : "target-ftl-unlinked")
        : invokeFtl.length ? (targets.length ? "invoke-ftl-other-target" : "invoke-ftl-target-absent")
            : targets.some(x => x.frame.category === "DFG") && invokes.some(f => f.category === "DFG") ? "dfg-pair" : "other";
    return { trace, kind, links, totals: { targetFtlFrames: targetFtl.length, linkedTargetFtlFrames: links.length,
        linkedToInvokeFtlFrames: links.filter(l => l.machine.name === "invoke" && l.machine.tier === "FTL").length,
        invokeFtlFrames: invokeFtl.length } };
}

export function validateTraceEvidence(evidence, restart) {
    keys(evidence, ["schemaVersion", "perClassCap", "witnessByteCap", "totalWitnessByteCap", "storedWitnessBytes", "captures"]);
    assert.equal(evidence.schemaVersion, 1); assert.equal(evidence.perClassCap, 1);
    assert.equal(evidence.witnessByteCap, 4096); assert.equal(evidence.totalWitnessByteCap, 24576);
    assert.equal(evidence.captures.length, 4);
    let storedBytes = 0;
    const witnesses = [];
    for (const [i, capture] of evidence.captures.entries()) {
        const original = restart.captures[i];
        keys(capture, ["index", "traces", "totals", "buckets"]);
        assert.equal(capture.index, i + 1); assert.equal(capture.traces, original.traces);
        keys(capture.totals, totalKeys); keys(capture.buckets, TRACE_CLASSES);
        Object.values(capture.totals).forEach(n => integer(n, 0, original.frames));
        const totals = capture.totals;
        assert.equal(totals.targetFtlFrames, original.targetFrames.FTL);
        assert(totals.linkedToInvokeFtlFrames <= totals.linkedTargetFtlFrames && totals.linkedTargetFtlFrames <= totals.targetFtlFrames);
        const invoke = original.histogram.find(h => h.name === "invoke" && h.category === "FTL");
        if (invoke || !original.overflowFrames) assert.equal(totals.invokeFtlFrames, invoke?.frames ?? 0);
        assert(totals.targetFtlFrames + totals.invokeFtlFrames <= original.tierFrames.FTL);
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
        if (!totals.targetFtlFrames) assert.equal(n("target-ftl-linked") + n("target-ftl-unlinked"), 0);
        else assert(n("target-ftl-linked") + n("target-ftl-unlinked") > 0);
        assert(n("invoke-ftl-other-target") + n("invoke-ftl-target-absent") <= totals.invokeFtlFrames);
        assert(n("dfg-pair") <= original.targetFrames.DFG);
        assert(n("invoke-ftl-target-absent") <= capture.traces - original.targetTraces);
        const retainedTotals = zeroTotals();
        for (const [kind, b] of present) {
            const status = b.firstWitnessBytes > 4096 ? "oversize" : storedBytes + b.firstWitnessBytes > 24576 ? "budget" : "stored";
            assert.equal(b.status, status, "First candidate omission must follow the fixed byte limits");
            if (status !== "stored") { assert.equal(b.witness, null); continue; }
            keys(b.witness, ["traceIndex", "rawTrace"]);
            assert.equal(b.witness.traceIndex, b.firstTraceIndex);
            assert.equal(Buffer.byteLength(JSON.stringify(b.witness)), b.firstWitnessBytes);
            const observed = inspectRawTrace(b.witness.rawTrace);
            assert.equal(observed.kind, kind, "Class must follow raw same-trace frames and machine linkage");
            assert(observed.trace.timestamp >= original.firstTimestamp && observed.trace.timestamp <= original.lastTimestamp);
            assert(observed.trace.frames.length <= original.frames);
            for (const frame of observed.trace.frames) {
                const h = original.histogram.find(h => h.name === frame.name && h.category === frame.category);
                assert(h || original.overflowFrames > 0);
            }
            for (const k of totalKeys) retainedTotals[k] += observed.totals[k];
            witnesses.push({ capture: i + 1, kind, traceIndex: b.firstTraceIndex, ...observed });
            storedBytes += b.firstWitnessBytes;
        }
        for (const k of totalKeys) assert(retainedTotals[k] <= totals[k]);
    }
    assert.equal(evidence.storedWitnessBytes, storedBytes);
    return witnesses;
}

export function validateTraceRecord(record, mode, pages, sourceSha256 = fixtureFacts().sha256) {
    assert.equal(record.mapMode, mode); assert.deepEqual(record.environment, environmentFor(mode));
    assert.equal(record.compatibilityAcceptance, false);
    validateRestartRecord(record.restart, "target", pages, sourceSha256);
    assert(Buffer.byteLength(record.restart.stdout) + Buffer.byteLength(record.stderr) <= 65536);
    assert.deepEqual(record.terminal, { succeeded: record.restart.succeeded, exitCode: record.restart.exitCode,
        errorCode: record.restart.succeeded ? null : "NON_ZERO_EXIT" });
    const jsc = parseTraceLog(record.stderr, mode);
    const witnesses = validateTraceEvidence(record.restart.evidence.traceEvidence, record.restart.evidence);
    const machineLinks = witnesses.flatMap(w => w.links.map(link => ({ capture: w.capture, traceIndex: w.traceIndex,
        timestamp: w.trace.timestamp, ...link, compilerDecisionMatched: jsc.inlineDecisions.some(d => d.tier === "FTL"
            && d.callee.name === link.target.name && d.callee.hash === link.target.codeBlockHash
            && d.caller.name === link.machine.name && d.caller.hash === link.machine.codeBlockHash) })));
    return { ...record, jsc, machineLinks };
}

export function summarizeTraceObservations(observations) {
    assert.equal(observations.length, 8);
    return { collectedDiagnostics: 8, profiles: 32, finalizedOptionReports: 8,
        modes: MAP_MODES.map(mode => {
            const records = observations.filter(r => r.mapMode === mode); assert.equal(records.length, 4);
            const captures = records.flatMap(r => r.restart.evidence.traceEvidence.captures);
            const links = records.flatMap(r => r.machineLinks);
            return { mode, diagnostics: 4, profiles: captures.length,
                classes: Object.fromEntries(TRACE_CLASSES.map(kind => [kind, sum(captures.map(c => c.buckets[kind].count))])),
                totals: Object.fromEntries(totalKeys.map(k => [k, sum(captures.map(c => c.totals[k]))])),
                storedTraceWitnesses: sum(captures.map(c => Object.values(c.buckets).filter(b => b.status === "stored").length)),
                omittedTraceWitnesses: sum(captures.map(c => Object.values(c.buckets).filter(b => ["oversize", "budget"].includes(b.status)).length)),
                independentlyValidatedTargetFtlMachineLinks: links.length,
                compilerDecisionMatchedLinks: links.filter(l => l.compilerDecisionMatched).length,
                targetGateMatched: records.filter(r => r.restart.evidence.targetGatePassed).length,
                retainedExitOneDiagnostics: records.filter(r => r.restart.exitCode === 1).length };
        }), compatibilityPassesAdded: 0, rawMachinePcOrMapPointerCaptured: false, historicalFailureRootCauseEstablished: false };
}

export function validateTraceInstrumentation(text, pages, round, sourceSha256 = fixtureFacts().sha256) {
    assert(Buffer.byteLength(text) <= 2 * 1024 * 1024);
    const observations = [], started = [], passed = [], order = modeOrder(round);
    let bundle = {};
    for (const line of text.split(/\r?\n/)) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        if (field) { assert(!Object.hasOwn(bundle, field[1])); bundle[field[1]] = field[2]; }
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (!field && !status && bundle.stream !== undefined) bundle.stream += "\n" + line;
        if (!status) continue;
        const code = Number(status[1]); assert([0, 1].includes(code), "Failed Trace/inliner diagnostic instrumentation");
        if (bundle.class === undefined && bundle.test === undefined) {
            assert.equal(code, 0); assert.deepEqual(Object.keys(bundle), ["stream"]);
            const stream = bundle.stream.trim(); assert(stream.startsWith("JSC_TRACE=") && !stream.includes("\n"));
            observations.push(validateTraceRecord(JSON.parse(stream.slice("JSC_TRACE=".length)), order[observations.length], pages, sourceSha256));
        } else {
            assert.equal(bundle.class, TRACE_CLASS); assert.equal(bundle.test, TRACE_TEST);
            assert.equal(Number(bundle.numtests), 1); assert.equal(Number(bundle.current), 1);
            (code === 0 ? passed : started).push(bundle.test);
        }
        bundle = {};
    }
    assert.deepEqual(started, [TRACE_TEST]); assert.deepEqual(passed, [TRACE_TEST]);
    assert.equal(observations.length, 2); assert.match(text, /OK \(1 test\)/);
    assert.deepEqual([...text.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\s*$/gm)].map(m => m[1]), ["-1"]);
    assert.doesNotMatch(text, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed/);
    return observations;
}
