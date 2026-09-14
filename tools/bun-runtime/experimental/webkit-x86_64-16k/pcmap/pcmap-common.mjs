import assert from "node:assert/strict";
import { fixtureFacts, validateRestartRecord } from "../restart/restart-common.mjs";

export { fixtureFacts };
export const PCMAP_KIND = "experimental-jsc-pcmap-diagnostic";
export const PCMAP_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.JscPcMapInstrumentedTest";
export const PCMAP_TEST = "fixedPcMappingControls";
export const MAP_MODES = Object.freeze(["map-off", "map-on"]);
export const modeOrder = round => {
    assert([1, 2].includes(round));
    return round === 1 ? MAP_MODES.slice() : MAP_MODES.slice().reverse();
};
export function environmentFor(mode) {
    assert(MAP_MODES.includes(mode));
    return { AUTOJS6_JSC_RESTART_MODE: "target", BUN_JSC_alwaysGeneratePCToCodeOriginMap: String(mode === "map-on"),
        BUN_JSC_dumpOptions: "1", BUN_JSC_printEachDFGFTLInlineCall: "true" };
}

// These are finalized JSC values, not an echo of the requested environment.
// Compiler inline decisions are retained separately from executed sample tiers.
export function parsePcMapLog(stderr, mode) {
    assert(MAP_MODES.includes(mode));
    assert(typeof stderr === "string" && Buffer.byteLength(stderr) <= 65536);
    const options = {}, inlineDecisions = [];
    let titles = 0;
    for (const line of stderr.split(/\r?\n/)) {
        if (line === "") continue;
        assert(Buffer.byteLength(line) <= 4096);
        if (line === "Modified JSC options:") { titles++; continue; }
        const option = line.match(/^   ([A-Za-z][A-Za-z0-9]*)=(true|false|[0-9]+) \(default: (true|false|[0-9]+)\)$/);
        if (option) {
            assert.equal(titles, 1); assert(!Object.hasOwn(options, option[1]), "Duplicate finalized option");
            options[option[1]] = { value: option[2], default: option[3] }; continue;
        }
        const edge = line.match(/^\[InlineCall\]\[(DFG|FTL)\] Callee: (.+) -> Caller: (.+)$/);
        assert(edge, `Unexpected JSC diagnostic line: ${line.slice(0, 256)}`);
        assert.equal(titles, 1);
        assert(inlineDecisions.length < 512);
        const identity = text => {
            const parts = text.match(/^(.*)#([A-Za-z0-9]{6})$/);
            assert(parts && parts[1].length <= 512, "Invalid inlined function identity");
            return { name: parts[1], hash: parts[2] };
        };
        inlineDecisions.push({ tier: edge[1], callee: identity(edge[2]), caller: identity(edge[3]) });
    }
    assert.equal(titles, 1);
    assert.deepEqual(options, {
        dumpOptions: { value: "1", default: "0" },
        printEachDFGFTLInlineCall: { value: "true", default: "false" },
        alwaysGeneratePCToCodeOriginMap: { value: String(mode === "map-on"), default: "false" },
    }, "Finalized options must prove the single PC-map difference and shared observation settings");
    return { options, inlineDecisions };
}

export function validatePcMapRecord(record, mode, pages, sourceSha256 = fixtureFacts().sha256) {
    assert.equal(record.mapMode, mode);
    assert.deepEqual(record.environment, environmentFor(mode));
    assert.equal(record.compatibilityAcceptance, false);
    validateRestartRecord(record.restart, "target", pages, sourceSha256);
    assert(Buffer.byteLength(record.restart.stdout) + Buffer.byteLength(record.stderr) <= 65536);
    assert.deepEqual(record.terminal, { succeeded: record.restart.succeeded, exitCode: record.restart.exitCode,
        errorCode: record.restart.succeeded ? null : "NON_ZERO_EXIT" });
    return { ...record, jsc: parsePcMapLog(record.stderr, mode) };
}

export function validatePcMapInstrumentation(text, pages, round, sourceSha256 = fixtureFacts().sha256) {
    assert(Buffer.byteLength(text) <= 2 * 1024 * 1024);
    const observations = [], started = [], passed = [], order = modeOrder(round);
    let bundle = {};
    for (const line of text.split(/\r?\n/)) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        if (field) { assert(!Object.hasOwn(bundle, field[1])); bundle[field[1]] = field[2]; }
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (!field && !status && bundle.stream !== undefined) bundle.stream += "\n" + line;
        if (!status) continue;
        const code = Number(status[1]); assert([0, 1].includes(code), "Failed PC-map diagnostic instrumentation");
        if (bundle.class === undefined && bundle.test === undefined) {
            assert.equal(code, 0); assert.deepEqual(Object.keys(bundle), ["stream"]);
            const stream = bundle.stream.trim(); assert(stream.startsWith("JSC_PCMAP=") && !stream.includes("\n"));
            observations.push(validatePcMapRecord(JSON.parse(stream.slice("JSC_PCMAP=".length)), order[observations.length], pages, sourceSha256));
        } else {
            assert.equal(bundle.class, PCMAP_CLASS); assert.equal(bundle.test, PCMAP_TEST);
            assert.equal(Number(bundle.numtests), 1); assert.equal(Number(bundle.current), 1);
            (code === 0 ? passed : started).push(bundle.test);
        }
        bundle = {};
    }
    assert.deepEqual(started, [PCMAP_TEST]); assert.deepEqual(passed, [PCMAP_TEST]);
    assert.equal(observations.length, 2); assert.match(text, /OK \(1 test\)/);
    assert.deepEqual([...text.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\s*$/gm)].map(m => m[1]), ["-1"]);
    assert.doesNotMatch(text, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed/);
    return observations;
}

export function summarizePcMapObservations(observations) {
    assert.equal(observations.length, 8);
    return { collectedDiagnostics: 8, profiles: 32, finalizedOptionReports: 8,
        modes: MAP_MODES.map(mode => {
            const records = observations.filter(r => r.mapMode === mode); assert.equal(records.length, 4);
            const captures = records.flatMap(r => r.restart.evidence.captures);
            const invokeFtl = c => c.histogram.some(h => h.name === "invoke" && h.category === "FTL" && h.frames > 0);
            return { mode, diagnostics: 4, profiles: captures.length,
                targetFtlFrames: captures.reduce((n, c) => n + c.targetFrames.FTL, 0),
                targetDfgFrames: captures.reduce((n, c) => n + c.targetFrames.DFG, 0),
                invokeFtlProfiles: captures.filter(invokeFtl).length,
                zeroTargetProfilesWithCallsAndInvokeFtl: captures.filter(c => c.calls > 0 && invokeFtl(c)
                    && Object.values(c.targetFrames).every(n => n === 0) && c.unknownTargetFrames === 0).length,
                targetIntoInvokeFtlDecisionProcesses: records.filter(r => r.jsc.inlineDecisions.some(d =>
                    d.tier === "FTL" && d.callee.name === "jscPressureHotLoop" && d.caller.name === "invoke")).length,
                targetGateMatched: records.filter(r => r.restart.evidence.targetGatePassed).length,
                retainedExitOneDiagnostics: records.filter(r => r.restart.exitCode === 1).length };
        }), compatibilityPassesAdded: 0, historicalFailureRootCauseEstablished: false };
}
