// A fixed twelve-patch failed gate. Historical receipts are pinned independently
// of the live suite so later native or fixture changes cannot relabel these runs.
import assert from "node:assert/strict";
import { hash, validateReport } from "./probe-common.mjs";
import { environmentKey } from "./archive-probe.mjs";
import { WATCH_RELOAD_MODES, validateWatchReloadEvidence, validateWatchReloadFailureEvidence } from "./watch-reload-evidence.mjs";

const BUILDS = new Set([
  "eb568c58f7de8d4c331d8d88b366ac0b1dcad98d7c545ba02feecca9af874741",
  "e2bee5b2e316785ae582bee7be183ab18147d4665155f90ce0c67a3d2bc13794",
  "637672abbf62a1cfd58fed884195d329b91986f25bdacb88cf80727b3a4c2799",
]);
const PROBES_SHA256 = "222f84844ca08a56568755018c3bc64bfdf717581f7d9ba8b35b9cb062f94486";

export function validateWatchReloadFailureRecord(record, rawRounds, probes) {
  assert.equal(hash(JSON.stringify(probes)), PROBES_SHA256, "exact twelve-patch 35 definitions required");
  assert(BUILDS.has(hash(JSON.stringify(record.build))), "exact retained APK/source receipt required");
  assert.equal(record.schemaVersion, 2); assert.equal(record.kind, "test-only-application-process-probe-runs");
  assert.equal(record.passed, false); assert.equal(record.distributionReady, false);
  assert.equal(record.pluginBinderExercised, false); assert(!record.cleanupError);
  assert(Number.isFinite(Date.parse(record.capturedAt)));
  assert.equal(record.runs?.length, 2); assert.equal(rawRounds.length, 2);
  assert.equal(record.validationErrors?.length, 2);
  assert.equal(record.error, record.validationErrors.join("; "));
  const build = record.build, life = record.lifecycle;
  assert.equal(life.installedByThisRun, true); assert.equal(life.forceStopVerified, true);
  assert.equal(life.uninstalled, true); assert.equal(life.finalUidProcessCount, 0);
  assert.deepEqual(life.rounds, [1,2].map(round => ({ round, packageProcessAbsent: true, uidProcessCount: 0 })));
  const oldProbes = probes.filter(p => !Object.hasOwn(WATCH_RELOAD_MODES, p.id));
  assert.equal(oldProbes.length, 33);
  for (const [index, run] of record.runs.entries()) {
    const raw = rawRounds[index], env = run.environment;
    assert(typeof raw === "string" && Buffer.byteLength(raw) < 1024*1024);
    assert.doesNotMatch(raw, /INSTRUMENTATION_FAILED|Process crashed/);
    const lines = raw.split(/\r?\n/), reports = lines.filter(line => line.startsWith("INSTRUMENTATION_RESULT: report="));
    assert.equal(reports.length, 1);
    assert.deepEqual(lines.filter(line => line.startsWith("INSTRUMENTATION_CODE:")), ["INSTRUMENTATION_CODE: 0"]);
    assert.deepEqual(JSON.parse(reports[0].slice("INSTRUMENTATION_RESULT: report=".length)), run);
    assert.equal(run.passed, false);
    assert.equal(environmentKey(env), environmentKey(record.runs[0].environment));
    assert([28,33,35].includes(env.apiLevel)); assert.equal(env.abi, "arm64-v8a");
    assert.equal(env.pageSizeBytes, 4096); assert.equal(env.uid, life.installedUid);
    assert.deepEqual(run.probes.map(p => p.id), probes.map(p => p.id));
    const failed = run.probes.filter(p => !p.passed);
    assert(failed.length >= 1 && failed.length <= 2 && failed.every(p => Object.hasOwn(WATCH_RELOAD_MODES, p.id)), "only the observed watch gate may fail");
    assert(record.validationErrors[index].startsWith(`Round ${index+1}: ${failed[0].id} failed`));
    assert(record.validationErrors[index].length < 2048);
    for (const result of run.probes.filter(p => Object.hasOwn(WATCH_RELOAD_MODES, p.id))) {
      const mode = WATCH_RELOAD_MODES[result.id], proof = result.watchReloadEvidence;
      assert.equal(result.exitCode, result.passed ? 0 : 1); assert.equal(result.termination, "exited");
      assert.equal(result.forciblyTerminated, false); assert.equal(result.processReaped, true);
      assert.equal(result.workspaceRemoved, true); assert.equal(result.outputLimitBytes, 16384);
      assert(Number.isInteger(result.elapsedMillis) && result.elapsedMillis > 0 && result.elapsedMillis < 15000);
      for (const key of ["error", "streamError", "evidenceError", "possibleSignalFromExitConvention"])
        assert(!Object.hasOwn(result, key), "semantic FD failure, not a crash or harness failure");
      assert.equal(result.stderr, ""); assert.equal(result.capturedBytes, Buffer.byteLength(result.stdout));
      assert(Buffer.byteLength(result.stdout) <= 2048);
      const line = result.stdout.trim();
      assert(line.startsWith("WATCH_RELOAD_RESULT=") && !line.includes("\n"));
      assert.deepEqual(JSON.parse(line.slice("WATCH_RELOAD_RESULT=".length)), proof);
      assert.equal(proof.uid, env.uid);
      if (result.passed) {
        assert.equal(mode, "native", "forced TRAP remains the failed gate");
        validateWatchReloadEvidence(proof, mode, env.abi);
        for (const row of proof.rows) assert.deepEqual(row.rawClose, [0,0], "working native CLOEXEC positive control");
      } else validateWatchReloadFailureEvidence(proof, mode, env.abi);
    }
    // Validate only the original 33 observations as a local projection. The
    // actual failed 35-case report and its raw bytes remain unchanged on disk.
    validateReport({ ...run, passed: true, probes: run.probes.filter(p => !Object.hasOwn(WATCH_RELOAD_MODES, p.id)) }, {
      abi: env.abi, api: env.apiLevel, pageSize: env.pageSizeBytes,
      apk: build.apks.find(a => a.abi === env.abi), runtime: build.runtimes[env.abi],
      supervisor: build.supervisor.artifacts.find(a => a.abi === env.abi), variant: build.variant, probes: oldProbes,
    });
  }
  return record;
}
