import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inputFacts, lockedEvidence } from "./probe-common.mjs";
import { validateRunRecord } from "./archive-probe.mjs";
import { pendingSignalResult } from "./pending-signal-fixture.test-support.mjs";
import { validateAsyncSignalFailure } from "./archive-async-signal-failure.mjs";
const archived = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-blocked-async-api28-failure.json", import.meta.url), "utf8"));
function fixture() {
  const record = structuredClone(archived.record);
  // Synthetic validator input only. The retained failed receipt is not changed.
  record.build.inputs = inputFacts();
  record.build.runtimes = Object.fromEntries(lockedEvidence().artifacts.map(a => [a.abi, { bytes: a.bytes, sha256: a.sha256 }]));
  for (const run of record.runs) {
    const runtime = record.build.runtimes[run.environment.abi];
    run.runtimeBytes = runtime.bytes;
    run.runtimeSha256 = runtime.sha256;
    run.probes.find(p => p.id === "revision").stdout = "1.4.0+06e518f73";
  }
  return record;
}
const raw = record => record.runs.map(run => "INSTRUMENTATION_RESULT: report=" + JSON.stringify(run) + "\nINSTRUMENTATION_CODE: 0\n");
test("failure archive preserves two failed rounds and cannot enter the passing archive", () => {
  const record = fixture(), original = structuredClone(record);
  assert.equal(validateAsyncSignalFailure(record, raw(record)), record);
  assert.deepEqual(record, original, "validation never rewrites failures as success");
  assert.throws(() => validateRunRecord(record, raw(record)));
  const sourceMatched = structuredClone(archived.record); sourceMatched.build.inputs = inputFacts();
  assert.throws(() => validateAsyncSignalFailure(sourceMatched, archived.instrumentation.map(item => item.text)), /runtime receipt drift/);
});
test("failure archival rejects hidden regressions, missing signals, source drift and residual processes", () => {
  for (const change of [r => { r.passed = true; }, r => { r.distributionReady = true; }, r => { r.pluginBinderExercised = true; },
    r => { r.cleanupError = ""; }, r => { r.error = ""; }, r => { r.validationErrors.pop(); }, r => { r.runs.pop(); },
    r => { r.build.inputs[0].sha256 = "0".repeat(64); }, r => { r.lifecycle.uninstalled = false; },
    r => { r.lifecycle.rounds[1].uidProcessCount = 1; }, r => { r.lifecycle.finalUidProcessCount = 1; },
    r => { r.runs[0].passed = true; }, r => { r.runs[0].environment.apiLevel = 31; },
    r => { r.runs[0].environment.uid++; }, r => { r.runs[1].environment.fingerprint += "changed"; },
    r => { r.runs[0].probes[0].passed = false; }, r => { r.runs[0].probes[28].passed = true; },
    r => { r.runs[0].probes[28].exitCode = 137; }, r => { delete r.runs[0].probes[28].possibleSignalFromExitConvention; },
    r => { r.runs[0].probes[28].termination = "timeout"; }, r => { r.runs[0].probes[28].workspaceRemoved = false; },
    r => { r.runs[0].probes[28].capturedBytes = 1; }, r => { r.runs[0].probes[28].stdout = "fake"; },
    r => { r.runs[0].probes[28].asyncSignalEvidence = { passed: true }; }, r => { r.runs[0].probes[28].elapsedMillis = 15000; }]) {
    const record = fixture(); change(record); assert.throws(() => validateAsyncSignalFailure(record, raw(record)));
  }
});
test("legacy failure archival refuses an expanded suite instead of reusing historical counts", () => {
  const record = fixture();
  for (const run of record.runs) run.probes.splice(-1, 0, pendingSignalResult("native", run.environment.abi, run.environment.uid));
  assert.throws(() => validateAsyncSignalFailure(record, raw(record)));
});

test("failure raw output must retain the failed instrumentation code and exact original observations", () => {
  const record = fixture(), rounds = raw(record);
  for (const changed of [rounds.slice(0,1), [rounds[0].replace("INSTRUMENTATION_CODE: 0", "INSTRUMENTATION_CODE: -1"), rounds[1]],
    [rounds[0].replace('"exitCode":159', '"exitCode":137'), rounds[1]], [rounds[0] + "INSTRUMENTATION_FAILED: crash\n", rounds[1]]])
    assert.throws(() => validateAsyncSignalFailure(record, changed));
});
