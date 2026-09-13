// Failure evidence only. Never manufacture a passing full-suite record.
import assert from "node:assert/strict";
import { PENDING_SIGNAL_MODES } from "./pending-signal-evidence.mjs";
import { hash, validateReport } from "./probe-common.mjs";
import { environmentKey } from "./archive-probe.mjs";
import { hardLimitFilterSha256 } from "./hard-limit-evidence.mjs";
import { readFileSync } from "node:fs";

// Fixed eleven-patch failed APK receipt; historical ten-patch evidence stays separate.
const BUILD_SHA256 = "0f580bd74a96e8b32cef3a2e14f4ce72e9213c262873caf3e7cf4475e91b21e0";
const priorText = readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-pending-sigsys-failure.json", import.meta.url), "utf8").replace(/\r\n/g, "\n");
assert.equal(hash(Buffer.from(priorText)), "560a11991a039a50c1970557c990871dcf530ad6ef99b9c7f03bca6b98e602a4", "historical pending failure archive drifted");
const prior = JSON.parse(priorText);
const probes = prior.probes.map(p => p.id === "revision" ? { ...p, stdout: "1.4.0+946f082ab" } : p);
assert.equal(probes.length, 33, "fixed historical inventory, separate from the expanded live suite");
const ids = Object.keys(PENDING_SIGNAL_MODES);
export function validatePendingWaitFailureProof(proof, mode, abi, uid) {
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.mode, mode); assert.equal(proof.passed, false);
  assert.equal(proof.error, "pending SIGSYS remains queued without early JS delivery");
  assert(!Object.hasOwn(proof, "skipped"));
  assert.equal(proof.arch, abi === "arm64-v8a" ? "arm64" : "x64");
  assert.equal(proof.uid, uid); assert(Number.isSafeInteger(proof.pid) && proof.pid > 1);
  assert.equal(proof.before.length, 2); assert.equal(proof.before[0], proof.pid);
  assert(/^[a-f0-9]{16}$/.test(proof.before[1]) && /^[a-f0-9]{16}$/.test(proof.blocked));
  const before = BigInt("0x" + proof.before[1]), bit = 1n << 30n;
  assert.equal(before & bit, 0n); assert.equal(BigInt("0x" + proof.blocked), before | bit);
  assert.equal(proof.fd, 256);
  assert.deepEqual(proof.rows, [], "failure must occur after the first asynchronous child wait");
  assert.deepEqual(proof.pending, { before: "0000000000000000", checks: [[1,0],[1,0],[1,0],[0,1]],
    queueResult: { result: 0, errno: 0 }, queued: "0000000040000000" });
  assert.deepEqual(proof.nativeCloseRange, { result: -1, errno: 38 });
  if (mode === "trap") {
    assert.deepEqual(proof.policy, { before: { result: -1, errno: 22 }, after: { result: -1, errno: 38 }, sha256: hardLimitFilterSha256(abi) });
    assert.deepEqual(proof.trap, { result: -1, errno: 38 });
  } else for (const key of ["policy", "trap"]) assert(!Object.hasOwn(proof, key));
  for (const key of ["restored", "postMarker", "parentFlags", "sentinelIdentity"]) assert(!Object.hasOwn(proof, key));
  return proof;
}

export function parsePendingWaitFailure(stdout, mode, abi, uid) {
  assert(typeof stdout === "string" && Buffer.byteLength(stdout) <= 2048);
  const line = stdout.trim(); assert(!line.includes("\n") && line.startsWith("PENDING_SIGNAL_RESULT="));
  return validatePendingWaitFailureProof(JSON.parse(line.slice("PENDING_SIGNAL_RESULT=".length)), mode, abi, uid);
}

export function validatePendingWaitFailureRecord(record, rawRounds) {
  assert.equal(record.schemaVersion, 2); assert.equal(record.kind, "test-only-application-process-probe-runs");
  assert.equal(record.passed, false); assert.equal(record.distributionReady, false); assert.equal(record.pluginBinderExercised, false);
  assert(!Object.hasOwn(record, "cleanupError")); assert(Number.isFinite(Date.parse(record.capturedAt)));
  assert(typeof record.error === "string" && record.error.length > 0 && record.error.length <= 4096);
  assert.equal(record.validationErrors.length, 2);
  record.validationErrors.forEach((error,i) => assert(error.startsWith(`Round ${i+1}: sigsys-pending-async-native failed`) && error.length < 2048));
  assert.equal(hash(Buffer.from(JSON.stringify(record.build))), BUILD_SHA256, "exact eleven-patch failed APK/source receipt required");
  const build = record.build, life = record.lifecycle;
  assert.equal(life.installedByThisRun, true); assert.equal(life.forceStopVerified, true);
  assert.equal(life.uninstalled, true); assert.equal(life.finalUidProcessCount, 0);
  assert.deepEqual(life.rounds, [1,2].map(round => ({ round, packageProcessAbsent: true, uidProcessCount: 0 })));
  assert.equal(record.runs.length, 2); assert.equal(rawRounds.length, 2);
  for (let i = 0; i < 2; i++) {
    const run = record.runs[i], env = run.environment, raw = rawRounds[i];
    assert(typeof raw === "string" && Buffer.byteLength(raw) < 1024*1024);
    assert.doesNotMatch(raw, /INSTRUMENTATION_FAILED|Process crashed/);
    const lines = raw.split(/\r?\n/), reports = lines.filter(line => line.startsWith("INSTRUMENTATION_RESULT: report="));
    assert.equal(reports.length, 1);
    assert.deepEqual(lines.filter(line => line.startsWith("INSTRUMENTATION_CODE:")), ["INSTRUMENTATION_CODE: 0"]);
    assert.deepEqual(JSON.parse(reports[0].slice("INSTRUMENTATION_RESULT: report=".length)), run);
    assert.equal(run.passed, false); assert.equal(environmentKey(env), environmentKey(record.runs[0].environment));
    assert([28,31].includes(env.apiLevel)); assert.equal(env.abi, "arm64-v8a"); assert.equal(env.pageSizeBytes, 4096);
    assert.equal(env.uid, life.installedUid); assert(env.uid % 100000 >= 10000);
    assert.deepEqual(run.probes.map(p => p.id), probes.map(p => p.id));
    assert.deepEqual(run.probes.filter(p => !p.passed).map(p => p.id), ids);
    for (const result of run.probes.filter(p => ids.includes(p.id))) {
      assert.equal(result.exitCode, 1); assert.equal(result.termination, "exited"); assert.equal(result.forciblyTerminated, false);
      assert.equal(result.processReaped, true); assert.equal(result.workspaceRemoved, true);
      assert.equal(result.outputLimitBytes, 16384); assert.equal(result.capturedBytes, Buffer.byteLength(result.stdout));
      assert.equal(result.stderr, ""); assert(Number.isInteger(result.elapsedMillis) && result.elapsedMillis >= 0 && result.elapsedMillis < 15000);
      for (const key of ["error", "streamError", "evidenceError", "possibleSignalFromExitConvention"])
        assert(!Object.hasOwn(result, key), "controlled semantic failure, not a crash or harness error");
      assert.deepEqual(parsePendingWaitFailure(result.stdout, PENDING_SIGNAL_MODES[result.id], env.abi, env.uid), result.pendingSignalEvidence);
    }
    // Only the original 31 pass through the full semantic validator. This
    // projection is never persisted as a successful 33-case run.
    validateReport({ ...run, passed: true, probes: run.probes.filter(p => !ids.includes(p.id)) }, {
      abi: env.abi, api: env.apiLevel, pageSize: env.pageSizeBytes,
      apk: build.apks.find(a => a.abi === env.abi), runtime: build.runtimes[env.abi],
      supervisor: build.supervisor.artifacts.find(a => a.abi === env.abi), variant: build.variant,
      probes: probes.filter(p => !ids.includes(p.id)),
    });
  }
  return record;
}
