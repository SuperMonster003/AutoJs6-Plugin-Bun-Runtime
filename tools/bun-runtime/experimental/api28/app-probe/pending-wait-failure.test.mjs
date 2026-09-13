import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validatePendingWaitFailureRecord, validatePendingWaitFailureProof } from "./pending-wait-failure.mjs";

const archived = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-pending-wait-failure.json", import.meta.url), "utf8"));
const fixture = () => ({ ...structuredClone(archived.reports[0]), build: structuredClone(archived.build) });
const raw = record => record.instrumentation.map(item => item.text);

test("eleven-patch failure keeps immediate pending preservation and later early delivery distinct", () => {
  for (const report of archived.reports) {
    const record = { ...report, build: archived.build };
    assert.equal(validatePendingWaitFailureRecord(record, raw(record)), record);
    assert.equal(record.runs.flatMap(r => r.probes).filter(p => p.passed).length, 62);
  }
  assert.equal(archived.summary.pendingAsyncPassedProbes, 0);
});

test("failed wait record cannot accept source substitution, other regressions or incomplete cleanup", () => {
  for (const change of [r => { r.build.runtimes['arm64-v8a'].sha256 = '0'.repeat(64); },
    r => { r.build.inputs.pop(); }, r => { r.build.apks[0].sha256 = '0'.repeat(64); },
    r => { r.passed = true; }, r => { r.distributionReady = true; },
    r => { r.runs[0].probes[0].passed = false; }, r => { r.lifecycle.finalUidProcessCount = 1; },
    r => { r.lifecycle.uninstalled = false; }, r => { r.runs.pop(); }]) {
    const record = fixture(); change(record);
    assert.throws(() => validatePendingWaitFailureRecord(record, raw(record)));
  }
  const record = fixture(), changedRaw = raw(record);
  changedRaw[0] = changedRaw[0].replace('INSTRUMENTATION_CODE: 0', 'INSTRUMENTATION_CODE: -1');
  assert.throws(() => validatePendingWaitFailureRecord(record, changedRaw));
});

test("wait failure semantics reject the earlier spawn failure or a missing JS delivery", () => {
  const run = archived.reports[0].runs[0], uid = run.environment.uid;
  const original = run.probes.find(p => p.id === 'sigsys-pending-async-native').pendingSignalEvidence;
  for (const change of [p => { p.pending.checks = [[1,0],[1,0],[0,0]]; },
    p => { p.pending.checks[2] = [0,0]; }, p => { p.pending.checks[3] = [0,0]; },
    p => { p.pending.checks[3] = [1,0]; }, p => { p.before[0]++; },
    p => { p.pending.queueResult.result = -1; }, p => { p.passed = true; },
    p => { p.rows.push({}); }, p => { p.skipped = true; }]) {
    const proof = structuredClone(original); change(proof);
    assert.throws(() => validatePendingWaitFailureProof(proof, 'native', 'arm64-v8a', uid));
  }
});
