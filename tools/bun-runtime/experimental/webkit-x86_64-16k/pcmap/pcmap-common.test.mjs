import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PCMAP_KIND, PCMAP_CLASS, PCMAP_TEST, MAP_MODES, environmentFor, modeOrder, fixtureFacts,
    parsePcMapLog, validatePcMapRecord, validatePcMapInstrumentation, summarizePcMapObservations } from "./pcmap-common.mjs";
import { validatePcMapRun, summarizePcMapRuns } from "./archive-pcmap.mjs";
import { buildInputs } from "../../api28/binder/binder-common.mjs";
import { validateRestartInstrumentation } from "../restart/restart-common.mjs";

const archived = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-14-m5-jsc-restart-diagnostics.json", import.meta.url), "utf8"));
const log = mode => "Modified JSC options:\n   dumpOptions=1 (default: 0)\n   printEachDFGFTLInlineCall=true (default: false)\n"
    + `   alwaysGeneratePCToCodeOriginMap=${mode === "map-on"} (default: false)\n`
    + "[InlineCall][FTL] Callee: jscPressureHotLoop#Ab12Cd -> Caller: invoke#Ef34Gh\n";
function observation(mode = "map-off", pages = 4096) {
    // Constructed host controls from immutable prior data, never a new device claim.
    const restart = structuredClone(archived.reports.find(r => r.expected.pages === pages).rounds[0].restart[0]);
    if (mode === "map-on") {
        const p = restart.evidence, c = p.captures[3], n = c.targetFrames.DFG;
        c.targetFrames.DFG = 0; c.targetFrames.FTL += n; c.tierFrames.DFG -= n; c.tierFrames.FTL += n;
        c.histogram.find(h => h.name === "jscPressureHotLoop" && h.category === "DFG").category = "FTL";
        c.distinctDfgTraceTimestamps = 0; p.samples.DFG -= n; p.samples.FTL += n;
        p.targetGatePassed = false; restart.succeeded = false; restart.exitCode = 1;
        restart.stdout = "JSC_RESTART_RESULT=" + JSON.stringify(p) + "\n";
    }
    return { mapMode: mode, environment: environmentFor(mode), compatibilityAcceptance: false,
        restart, stderr: log(mode), terminal: { succeeded: restart.succeeded, exitCode: restart.exitCode,
            errorCode: restart.succeeded ? null : "NON_ZERO_EXIT" } };
}
function raw(observations) {
    const status = code => `INSTRUMENTATION_STATUS: class=${PCMAP_CLASS}\nINSTRUMENTATION_STATUS: current=1\nINSTRUMENTATION_STATUS: numtests=1\nINSTRUMENTATION_STATUS: test=${PCMAP_TEST}\nINSTRUMENTATION_STATUS_CODE: ${code}\n`;
    return status(1) + observations.map(o => "INSTRUMENTATION_STATUS: stream=JSC_PCMAP=" + JSON.stringify(o) + "\nINSTRUMENTATION_STATUS_CODE: 0\n").join("")
        + status(0) + "INSTRUMENTATION_RESULT: stream=\nOK (1 test)\nINSTRUMENTATION_CODE: -1\n";
}
function run(pages) {
    const r = structuredClone(archived.reports.find(r => r.expected.pages === pages));
    r.kind = PCMAP_KIND; r.build.inputs = buildInputs();
    r.rounds = r.rounds.map(round => {
        const records = modeOrder(round.round).map(mode => observation(mode, pages));
        return { ...round, restart: undefined, stdout: raw(records), passedTests: [PCMAP_TEST],
            pcmap: records.map(o => validatePcMapRecord(o, o.mapMode, pages)) };
    });
    return r;
}
const rawRounds = r => r.rounds.map(round => round.stdout + round.stderr);

test("finalized options prove a single map switch; requested environment alone is insufficient", () => {
    for (const mode of MAP_MODES) {
        const parsed = parsePcMapLog(log(mode), mode);
        assert.equal(parsed.options.alwaysGeneratePCToCodeOriginMap.value, String(mode === "map-on"));
        assert.equal(parsed.inlineDecisions[0].callee.name, "jscPressureHotLoop");
        assert.equal(parsed.inlineDecisions[0].tier, "FTL");
        assert.equal(parsePcMapLog(log(mode).split("[InlineCall]")[0], mode).inlineDecisions.length, 0);
    }
    for (const text of ["", log("map-off"), log("map-on") + "Modified JSC options:\n",
        log("map-on").replace("printEachDFGFTLInlineCall=true", "printEachDFGFTLInlineCall=false"),
        log("map-on").replace("(default: false)", "(default: true)"),
        log("map-on") + "   useFTLJIT=false (default: true)\n", log("map-on") + "Error: crashed\n",
        log("map-on").replace("#Ab12Cd", "#bad!"), log("map-on").replace("[FTL]", "[Unknown]")]) {
        assert.throws(() => parsePcMapLog(text, "map-on"));
    }
});

test("observed FTL frames and exit 1 survive unchanged target-gate validation", () => {
    const off = validatePcMapRecord(observation(), "map-off", 4096);
    const on = validatePcMapRecord(observation("map-on"), "map-on", 4096);
    assert.equal(off.restart.exitCode, 0); assert.equal(on.restart.exitCode, 1);
    assert(on.restart.evidence.samples.FTL > 0);
    for (const mutate of [r => { r.restart.exitCode = 0; }, r => { r.terminal.errorCode = null; },
        r => { r.environment.BUN_JSC_useFTLJIT = "false"; }, r => { r.environment.BUN_JSC_alwaysGeneratePCToCodeOriginMap = "false"; },
        r => { r.compatibilityAcceptance = true; }, r => { r.stderr = "x".repeat(65537); },
        r => { r.restart.sourceSha256 = "a".repeat(64); }, r => { r.restart.evidence.targetGatePassed = true; }]) {
        const r = observation("map-on"); mutate(r); assert.throws(() => validatePcMapRecord(r, "map-on", 4096));
    }
});

test("counterbalanced fixed rounds require both raw records and complete instrumentation", () => {
    for (const round of [1, 2]) {
        const records = modeOrder(round).map(mode => observation(mode));
        const text = raw(records); assert.equal(validatePcMapInstrumentation(text, 4096, round).length, 2);
        assert.throws(() => validateRestartInstrumentation(text, 4096));
        for (const changed of [raw(records.slice().reverse()), raw(records.slice(0, 1)), text + text,
            text.replace("OK (1 test)", "FAILURES!!!"), text.replace('"exitCode":1', '"exitCode":0')]) {
            assert.throws(() => validatePcMapInstrumentation(changed, 4096, round));
        }
    }
    assert.throws(() => modeOrder(3));
});

test("archive preserves exact source/APK/runtime, two UIDs and all rounds", () => {
    for (const pages of [4096, 16384]) { const r = run(pages); validatePcMapRun(r, rawRounds(r)); }
    for (const mutate of [r => { r.build.inputs[0].sha256 = "a".repeat(64); },
        r => { r.installedTestApkSha256 = "b".repeat(64); }, r => { r.payloads[0].sha256 = "c".repeat(64); },
        r => { r.rounds.pop(); }, r => { r.rounds[0].pcmap.pop(); }, r => { r.cleanup.pop(); },
        r => { r.finalProcessListing += `\n${Object.values(r.packageUids)[1]} 123 leak`; },
        r => { r.finalPackageListing = "package:still-installed"; }, r => { r.compatibilityAcceptance = true; }]) {
        const r = run(4096); mutate(r); assert.throws(() => validatePcMapRun(r, rawRounds(r)));
    }
    const pair = [run(4096), run(16384)];
    const s = summarizePcMapRuns(pair); assert.equal(s.profiles, 32); assert.equal(s.compatibilityPassesAdded, 0);
    assert.equal(s.modes[1].retainedExitOneDiagnostics, 4); assert.equal(s.historicalFailureRootCauseEstablished, false);
    assert.throws(() => summarizePcMapRuns([pair[0], pair[0]]));
    pair[1].apk.sha256 = "f".repeat(64); assert.throws(() => summarizePcMapRuns(pair));
    assert.throws(() => summarizePcMapObservations([]));
});

test("new diagnostics reuse the exact original restart workload and its four-capture contract", () => {
    const { path, ...original } = archived.fixture;
    assert.deepEqual(fixtureFacts(), original);
    const source = readFileSync(new URL("java/JscPcMapInstrumentedTest.kt", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/@Test\s+fun (\w+)/g)].map(m => m[1]), [PCMAP_TEST]);
    assert(source.includes('assets.open("jsc-restart.mjs")'));
});
