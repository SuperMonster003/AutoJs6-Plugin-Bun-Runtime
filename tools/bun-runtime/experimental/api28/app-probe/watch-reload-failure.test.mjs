import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateWatchReloadFailureRecord } from "./watch-reload-failure.mjs";
import { validateRunRecord } from "./archive-probe.mjs";
import { hash } from "./probe-common.mjs";

const archives = ["initial-failure", "einval-failure", "native-control"].map(suffix => JSON.parse(readFileSync(
  new URL("../../../../../docs/compatibility/2026-09-13-m3-watch-reload-" + suffix + ".json", import.meta.url), "utf8")));
const records = archives.flatMap(archive => archive.reports.map(report => ({ archive, record: { ...report, build: archive.build } })));
const raw = record => record.runs.map(run => "INSTRUMENTATION_RESULT: report=" + JSON.stringify(run) + "\nINSTRUMENTATION_CODE: 0\n");

test("four native device records preserve the failed watch gate and the working native control", () => {
  for (const { archive, record } of records) {
    const original = JSON.stringify(record);
    validateWatchReloadFailureRecord(record, record.instrumentation.map(p => p.text), archive.probes);
    assert.equal(JSON.stringify(record), original, "validation cannot rewrite failed observations");
    assert.throws(() => validateRunRecord(record, raw(record)), "failed gates cannot enter passing archive");
    for (const input of archive.supersededSourceInputs) {
      assert.deepEqual({ path: input.path, bytes: Buffer.byteLength(input.text), sha256: hash(input.text) },
        archive.inputs.find(p => p.path === input.path));
    }
  }
  assert.equal(archives.reduce((n,a) => n+a.summary.original33PassedProbes,0), 264);
  assert.equal(archives.reduce((n,a) => n+a.summary.watchPassedModes,0), 2);
  assert.equal(archives.reduce((n,a) => n+a.summary.watchFailedModes,0), 14);
  assert.equal(archives.reduce((n,a) => n+a.summary.leakedSentinelObservations,0), 28);
});
test("failed-watch archival rejects source drift, concealed regressions, missing reloads and residual processes", () => {
  const { archive, record } = records[0];
  for (const mutate of [
    r => { r.build.inputs[0].sha256 = "0".repeat(64); },
    r => { r.build.runtimes["arm64-v8a"].sha256 = "0".repeat(64); },
    r => { r.passed = true; }, r => { r.runs.pop(); }, r => { r.runs[0].probes[0].passed = false; },
    r => { r.lifecycle.finalUidProcessCount = 1; }, r => { r.lifecycle.rounds[1].uidProcessCount = 1; },
    r => { r.runs[0].probes[32].exitCode = 159; },
    r => { r.runs[0].probes[32].watchReloadEvidence.rows.pop(); },
    r => { r.runs[0].probes[32].watchReloadEvidence.rows[1].inherited = [-1,false,-1]; },
    r => { r.runs[0].probes[32].watchReloadEvidence.cleanup.gone = false; },
    r => { r.runs[0].probes[32].evidenceError = "truncated"; },
    r => { r.runs[0].probes[32].stdout += r.runs[0].probes[32].stdout; },
  ]) {
    const changed = structuredClone(record); mutate(changed);
    assert.throws(() => validateWatchReloadFailureRecord(changed, raw(changed), archive.probes));
  }
  const changedProbes = structuredClone(archive.probes); changedProbes[32].timeoutMillis = 30000;
  assert.throws(() => validateWatchReloadFailureRecord(record, raw(record), changedProbes));
});
test("watch failure raw records retain failed instrumentation status and exact semantic bytes", () => {
  const { archive, record } = records[0];
  for (const mutate of [r => r.pop(), r => { r[0] += "Process crashed\n"; },
    r => { r[0] = r[0].replace("INSTRUMENTATION_CODE: 0", "INSTRUMENTATION_CODE: -1"); },
    r => { r[0] += r[0]; }, r => { r[0] = r[0].replace('"reloads":2', '"reloads":1'); }]) {
    const changed = raw(record); mutate(changed);
    assert.throws(() => validateWatchReloadFailureRecord(record, changed, archive.probes));
  }
});
