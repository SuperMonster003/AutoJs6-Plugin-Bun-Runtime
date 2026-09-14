import assert from "node:assert/strict";
import { PACKAGE, facts } from "../../api28/binder/binder-common.mjs";
import { REFERENCE } from "../pressure/pressure-common.mjs";
import { THIRTEEN_PATCH_HEAD } from "../thirteen-patch-common.mjs";

export const RESTART_KIND = "experimental-jsc-restart-diagnostic";
export const MODES = Object.freeze(["target", "target-absent"]);
export const RESTART_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.JscRestartInstrumentedTest";
export const RESTART_TEST = "fixedProfilerRestartControls";
export const fixtureFacts = () => facts(new URL("assets/jsc-restart.mjs", import.meta.url));
const tiers = ["LLInt", "Baseline", "DFG", "FTL"];
const integer = (x, lo, hi) => assert(Number.isSafeInteger(x) && x >= lo && x <= hi, `Integer outside [${lo}, ${hi}]: ${x}`);
const duration = x => assert(Number.isFinite(x) && x >= 0 && x < 20000);
const sum = values => values.reduce((a, b) => a + b, 0);
const counts = (object, keys) => {
    assert.deepEqual(Object.keys(object).sort(), keys.slice().sort());
    Object.values(object).forEach(x => integer(x, 0, 10240000));
};
const state = s => { integer(s.compiles, 0, 999999); integer(s.retries, 0, 1000000); };

export function validateRestartRecord(record, mode, pages, sourceSha256 = fixtureFacts().sha256) {
    assert.equal(record.sourceSha256, sourceSha256);
    assert.equal(record.workspaceRemoved, true);
    assert.equal(typeof record.stdout, "string");
    assert(Buffer.byteLength(record.stdout) <= 65536);
    const line = record.stdout.trim();
    assert(line.startsWith("JSC_RESTART_RESULT=") && !line.includes("\n"));
    const p = JSON.parse(line.slice("JSC_RESTART_RESULT=".length));
    assert.deepEqual(record.evidence, p, "Retained stdout and parsed diagnostic differ");
    assert.equal(p.schemaVersion, 1);
    assert(MODES.includes(mode)); assert.equal(p.mode, mode);
    assert.equal(p.platform, "android");
    assert.equal(p.arch, "x64");
    assert.equal(p.version, "1.4.0");
    assert.equal(p.revision, THIRTEEN_PATCH_HEAD);
    assert([4096, 16384].includes(pages));
    assert.equal(p.pages, pages);
    assert.equal(p.kernelMappingPages, 4096);
    assert.equal(p.pageSizeSource, "/proc/self/auxv AT_PAGESZ");
    assert.equal(p.userPageSizeEmulated, pages === 16384);
    assert.equal(p.compatibilityAcceptance, false);
    assert.equal(typeof p.workspace, "string");
    const prefix = ["/data/user/0/", "/data/data/"].map(base => `${base}${PACKAGE}.jsc16k/cache/bun-executions/`)
        .find(base => p.workspace.startsWith(base));
    assert(prefix && /^[A-Za-z0-9_-]{1,128}$/.test(p.workspace.slice(prefix.length)));
    assert.deepEqual(p.reference, REFERENCE);
    for (const [key, value] of Object.entries({ iterationsPerCall: 16384, warmupCalls: 128,
        intervalMicroseconds: 1000, captureBudgetMillis: 300, captureCallCap: 100000, captureCap: 4 })) assert.equal(p[key], value);
    integer(p.elapsedMillis, 1, 19999);
    integer(p.calls, 128, 400128);
    assert(Array.isArray(p.captures)); assert.equal(p.captures.length, 4);
    counts(p.samples, tiers); state(p.finalState);
    let calls = 128, totalMillis = 0;
    const total = Object.fromEntries(tiers.map(t => [t, 0]));
    for (const [i, c] of p.captures.entries()) {
        assert.equal(c.index, i + 1); state(c.before); state(c.after);
        integer(c.calls, 0, 100000); calls += c.calls;
        duration(c.callbackMillis); duration(c.profileMillis);
        assert(c.callbackMillis <= c.profileMillis); totalMillis += c.profileMillis;
        assert.equal(c.stopReason, c.calls === 100000 ? "call-cap" : "deadline");
        if (c.stopReason === "deadline") assert(c.callbackMillis >= 300);
        integer(c.traces, 0, 10000); integer(c.frames, 0, c.traces * 256);
        integer(c.distinctTraceTimestamps, c.traces ? 1 : 0, c.traces);
        if (c.traces === 0) { assert.equal(c.firstTimestamp, null); assert.equal(c.lastTimestamp, null); }
        else assert(Number.isFinite(c.firstTimestamp) && Number.isFinite(c.lastTimestamp) && c.firstTimestamp > 0 && c.lastTimestamp >= c.firstTimestamp);
        counts(c.tierFrames, [...tiers, "other"]); counts(c.targetFrames, tiers); counts(c.controlFrames, tiers);
        assert.equal(sum(Object.values(c.tierFrames)), c.frames);
        integer(c.unknownTargetFrames, 0, c.tierFrames.other);
        const targetCount = sum(Object.values(c.targetFrames)) + c.unknownTargetFrames;
        integer(c.targetTraces, targetCount ? 1 : 0, Math.min(c.traces, targetCount));
        integer(c.topTargetTraces, 0, c.targetTraces);
        integer(c.distinctDfgTraceTimestamps, c.targetFrames.DFG ? 1 : 0,
            Math.min(c.targetTraces, c.distinctTraceTimestamps, c.targetFrames.DFG));
        for (const t of tiers) { assert(c.targetFrames[t] + c.controlFrames[t] <= c.tierFrames[t]); total[t] += c.targetFrames[t]; }
        assert.equal(c.phaseFrames.length, 4); c.phaseFrames.forEach(n => integer(n, 0, c.traces));
        assert(sum(c.phaseFrames) <= c.frames);
        if (c.phaseFrames[i] === 0) assert.equal(c.phaseWitness, null);
        else {
            const w = c.phaseWitness; integer(w.frameIndex, 0, 255);
            assert(Number.isFinite(w.timestamp) && w.timestamp >= c.firstTimestamp && w.timestamp <= c.lastTimestamp);
            assert.equal(w.frame.name, `jscRestartPhase${i + 1}`);
            assert(typeof w.frame.category === "string" && w.frame.category.length > 0 && w.frame.category.length <= 64);
            assert(typeof w.frame.location === "string" && w.frame.location.length > 0 && w.frame.location.length <= 512);
        }
        assert(Array.isArray(c.histogram)); integer(c.histogram.length, 0, 16);
        const identities = new Set();
        for (const h of c.histogram) {
            assert(typeof h.name === "string" && h.name.length <= 128);
            assert(typeof h.category === "string" && h.category.length <= 64);
            const key = JSON.stringify([h.name, h.category]); assert(!identities.has(key)); identities.add(key);
            integer(h.frames, 1, c.frames);
        }
        integer(c.overflowFrames, 0, c.frames);
        if (c.histogram.length < 16) assert.equal(c.overflowFrames, 0);
        assert.equal(sum(c.histogram.map(h => h.frames)) + c.overflowFrames, c.frames);
        // Retained histogram pairs account for all their occurrences. Only
        // omitted pairs may contribute to overflow, never an invented target.
        for (const t of [...tiers, "other"]) {
            const n = sum(c.histogram.filter(h => (tiers.includes(h.category) ? h.category : "other") === t).map(h => h.frames));
            assert(n <= c.tierFrames[t]); if (!c.overflowFrames) assert.equal(n, c.tierFrames[t]);
        }
        for (const h of c.histogram) {
            if (tiers.includes(h.category) && ["jscPressureHotLoop", "jscRestartControlLoop"].includes(h.name))
                assert.equal(h.frames, (h.name === "jscPressureHotLoop" ? c.targetFrames : c.controlFrames)[h.category]);
        }
        for (let phase = 0; phase < 4; phase++) {
            const n = sum(c.histogram.filter(h => h.name === `jscRestartPhase${phase + 1}`).map(h => h.frames));
            assert(n <= c.phaseFrames[phase]); if (!c.overflowFrames) assert.equal(n, c.phaseFrames[phase]);
        }
    }
    assert(totalMillis <= p.elapsedMillis);
    assert.deepEqual(p.samples, total); assert.equal(p.calls, calls);
    assert.equal(p.witnesses.length, Math.min(3, total.DFG));
    for (const w of p.witnesses) {
        integer(w.profile, 1, p.captures.length); integer(w.frameIndex, 0, 255);
        const c = p.captures[w.profile - 1]; assert(c.targetFrames.DFG > 0);
        assert(Number.isFinite(w.timestamp) && w.timestamp >= c.firstTimestamp && w.timestamp <= c.lastTimestamp);
        assert.equal(w.frame.name, "jscPressureHotLoop"); assert.equal(w.frame.category, "DFG");
        assert(typeof w.frame.location === "string" && w.frame.location.length > 0 && w.frame.location.length <= 512);
    }
    const gate = total.DFG >= 3 && p.finalState.compiles > 0 && total.FTL === 0 && new Set(p.witnesses.map(w => w.timestamp)).size === 3;
    assert.equal(p.targetGatePassed, gate, "Target sample gate must match the actual retained counts");
    assert.equal(p.sampledTargetCalls, mode === "target" ? calls - 128 : 0);
    assert.equal(p.sampledControlCalls, mode === "target-absent" ? calls - 128 : 0);
    const restarted = p.captures.every((c, i) => c.phaseFrames[i] > 0
        && c.phaseFrames.every((n, phase) => phase === i || n === 0)
        && (i === 0 || c.firstTimestamp > p.captures[i - 1].lastTimestamp));
    assert.equal(p.restartObserved, restarted);
    const absent = mode === "target-absent" ? p.captures.every(c =>
        Object.values(c.targetFrames).every(n => n === 0) && c.unknownTargetFrames === 0
        && Object.values(c.controlFrames).some(n => n > 0)) : null;
    assert.equal(p.absentControlObserved, absent);
    assert.equal(record.succeeded, gate); assert.equal(record.exitCode, gate ? 0 : 1);
    return record;
}

export function validateRestartInstrumentation(text, pages, sourceSha256 = fixtureFacts().sha256) {
    assert(Buffer.byteLength(text) <= 2 * 1024 * 1024);
    const observations = [], started = [], passed = [];
    let bundle = {};
    for (const line of text.split(/\r?\n/)) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        if (field) { assert(!Object.hasOwn(bundle, field[1])); bundle[field[1]] = field[2]; }
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (!field && !status && bundle.stream !== undefined) bundle.stream += "\n" + line;
        if (!status) continue;
        const code = Number(status[1]); assert([0, 1].includes(code), "Failed diagnostic instrumentation");
        if (bundle.class === undefined && bundle.test === undefined) {
            assert.equal(code, 0); assert.deepEqual(Object.keys(bundle), ["stream"]);
            const stream = bundle.stream.trim();
            assert(stream.startsWith("JSC_RESTART=") && !stream.includes("\n"));
            observations.push(validateRestartRecord(JSON.parse(stream.slice("JSC_RESTART=".length)), MODES[observations.length], pages, sourceSha256));
        } else {
            assert.equal(bundle.class, RESTART_CLASS); assert.equal(bundle.test, RESTART_TEST);
            assert.equal(Number(bundle.numtests), 1); assert.equal(Number(bundle.current), 1);
            (code === 0 ? passed : started).push(bundle.test);
        }
        bundle = {};
    }
    assert.deepEqual(started, [RESTART_TEST]); assert.deepEqual(passed, [RESTART_TEST]);
    assert.equal(observations.length, 2);
    assert.match(text, /OK \(1 test\)/);
    assert.deepEqual([...text.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\s*$/gm)].map(m => m[1]), ["-1"]);
    assert.doesNotMatch(text, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed/);
    return observations;
}
