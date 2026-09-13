import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inputFacts, lockedEvidence } from "./probe-common.mjs";
import { summarizeRecords, validateRunRecord } from "./archive-probe.mjs";
import { HARD_LIMIT_MODES } from "./hard-limit-evidence.mjs";
import { hardLimitResult } from "./hard-limit-fixture.test-support.mjs";
import { ASYNC_SIGNAL_MODES } from "./async-signal-evidence.mjs";
import { asyncSignalResult } from "./async-signal-fixture.test-support.mjs";
import { PENDING_SIGNAL_MODES } from "./pending-signal-evidence.mjs";
import { pendingSignalResult } from "./pending-signal-fixture.test-support.mjs";

function fixture() {
  const historical = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-11-m3-lchmod-bin-link.json", import.meta.url), "utf8"));
  const device = historical.devices[0];
  const record = { schemaVersion: 2, kind: "test-only-application-process-probe-runs",
    capturedAt: device.capturedAt, pluginBinderExercised: false, distributionReady: false,
    passed: true, build: historical.build, runs: device.runs, lifecycle: device.lifecycle };
  // Synthetic validator fixture ONLY. Historical receipts on disk are untouched;
  // a real old APK cannot pass this substitution because the device runner binds it.
  record.build.inputs = inputFacts();
  record.build.runtimes = Object.fromEntries(lockedEvidence().artifacts.map(a => [a.abi, { bytes: a.bytes, sha256: a.sha256 }]));
  for (const run of record.runs) {
    const runtime = record.build.runtimes[run.environment.abi];
    run.runtimeBytes = runtime.bytes;
    run.runtimeSha256 = runtime.sha256;
    run.probes.find(p => p.id === "revision").stdout = "1.4.0+06e518f73";
  }
  for (const run of record.runs) run.probes.splice(run.probes.length - 1, 0,
    ...Object.values(HARD_LIMIT_MODES).map(mode => hardLimitResult(mode, run.environment.abi, run.environment.uid)),
    ...Object.values(ASYNC_SIGNAL_MODES).map(mode => asyncSignalResult(mode, run.environment.abi, run.environment.uid)),
    ...Object.values(PENDING_SIGNAL_MODES).map(mode => pendingSignalResult(mode, run.environment.abi, run.environment.uid)));
  return record;
}
const raw = record => record.runs.map(run => "INSTRUMENTATION_RESULT: report=" + JSON.stringify(run) + "\nINSTRUMENTATION_CODE: -1\n");

test("archive revalidates both complete application rounds and counts only their scope", () => {
  const record = fixture();
  validateRunRecord(record, raw(record));
  const summary = summarizeRecords([record]);
  assert.equal(summary.environments, 1);
  assert.equal(summary.rounds, 2);
  assert.equal(summary.passedProbes, 66);
  assert.equal(summary.totalProbes, 66);
  assert.equal(summary.blockedAsyncSignalObservations, 4);
  assert.equal(summary.blockedAsyncChildObservations, 12);
  assert.equal(summary.pendingAsyncSignalObservations, 4);
  assert.equal(summary.pendingAsyncChildObservations, 12);
  assert.equal(summary.loweredSoftLimitObservations, 4);
  assert.equal(summary.forcibleLifecycleObservations, 6);
  assert.equal(summary.loweredHardLimitObservations, 8);
  assert.equal(summary.hardLimitStartupObservations, 4);
  assert.equal(summary.hardLimitSpawnObservations, 4);
  assert.equal(summary.hardLimitSpawnApiObservations, 8);
});

test("archive rejects failed, incomplete, wrong-source, wrong-payload and unclean runs", () => {
  for (const change of [
    r => { r.passed = false; }, r => { r.distributionReady = true; }, r => { r.pluginBinderExercised = true; },
    r => { r.validationErrors = []; }, r => { r.cleanupError = "leftover"; }, r => { r.runs.pop(); },
    r => { r.build.inputs[0].sha256 = "a".repeat(64); }, r => { r.build.runtimes["arm64-v8a"].sha256 = "b".repeat(64); },
    r => { r.runs[0].installedApkSha256 = "c".repeat(64); }, r => { r.runs[0].probes.pop(); },
    r => { r.runs[0].probes[0].passed = false; }, r => { r.lifecycle.uninstalled = false; },
    r => { r.lifecycle.installedByThisRun = false; }, r => { delete r.lifecycle.finalUidProcessCount; },
    r => { r.lifecycle.rounds[0].uidProcessCount = 1; }, r => { r.lifecycle.installedUid++; },
    r => { r.runs[1].environment.apiLevel = 32; }, r => { r.runs[1].environment.fingerprint += "changed"; },
    r => { r.runs[0].environment.kernelMachine = "x86_64"; },
  ]) {
    const record = fixture(); change(record);
    assert.throws(() => validateRunRecord(record, raw(record)));
  }
});

test("raw instrumentation cannot be missing, diverge from JSON or hide a crash", () => {
  const record = fixture(), rounds = raw(record);
  for (const changed of [rounds.slice(0, 1), [rounds[0].replace('"passed":true', '"passed":false'), rounds[1]],
    [rounds[0].replace("INSTRUMENTATION_CODE: -1", "INSTRUMENTATION_CODE: 0"), rounds[1]],
    [rounds[0] + "INSTRUMENTATION_FAILED: crash\n", rounds[1]], ["x".repeat(1024 * 1024 + 1), rounds[1]]])
    assert.throws(() => validateRunRecord(record, changed));
});

test("a changed UID, time or directory is not a new environment; APK builds stay separate", () => {
  const first = fixture(), repeat = fixture();
  repeat.lifecycle.installedUid++;
  repeat.runs.forEach(run => {
    run.environment.uid++;
    for (const probe of run.probes.filter(p => p.hardLimitEvidence)) {
      probe.hardLimitEvidence.uid++;
      probe.stdout = "HARD_LIMIT_RESULT=" + JSON.stringify(probe.hardLimitEvidence) + "\n";
    }
    for (const probe of run.probes.filter(p => p.pendingSignalEvidence)) {
      probe.pendingSignalEvidence.uid++;
      probe.pendingSignalEvidence.rows[2].uid++;
      probe.stdout = "PENDING_SIGNAL_RESULT=" + JSON.stringify(probe.pendingSignalEvidence) + "\n";
    }
    for (const probe of run.probes.filter(p => p.asyncSignalEvidence)) {
      probe.asyncSignalEvidence.uid++;
      probe.asyncSignalEvidence.rows[2].uid++;
      probe.stdout = "ASYNC_SIGNAL_RESULT=" + JSON.stringify(probe.asyncSignalEvidence) + "\n";
    }
  });
  validateRunRecord(repeat, raw(repeat));
  assert.throws(() => summarizeRecords([first, repeat]), /Repeated environments/);
  repeat.runs.forEach(run => run.environment.fingerprint += "-different-image");
  repeat.build.apks[0].sha256 = "d".repeat(64);
  assert.throws(() => summarizeRecords([first, repeat]), /different APK builds/);
});
