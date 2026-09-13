import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hash, materializeWatchReloadSource } from "../app-probe/probe-common.mjs";
import { fixtureSource } from "./build-trace.mjs";
import { parseWatchTrace, validateWatchTraceRecord } from "./watch-trace-evidence.mjs";

const archive = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-watch-reload-trace.json", import.meta.url), "utf8"));
function rebound(record) {
  for (const run of record.runs) {
    run.raw = "INSTRUMENTATION_RESULT: report=" + JSON.stringify(run.report) + "\nINSTRUMENTATION_CODE: -1\n";
    run.bytes = Buffer.byteLength(run.raw); run.sha256 = hash(run.raw);
  }
  return record;
}
test("fixed watch pairs preserve all images without resolving the original abort", () => {
  for (const mode of ["native", "trap"]) assert.equal(fixtureSource("watch-reload", mode), materializeWatchReloadSource(mode));
  for (const record of archive.records) validateWatchTraceRecord(record);
  assert.equal(archive.rootCauseResolved, false); assert.equal(archive.compatibilityAcceptance, false);
  assert.equal(archive.summary.compatibilityPasses, 0);
  assert.equal(archive.summary.tracedOrdinarySigsysDeliveries, 24);
  const original = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-watch-reload-api28-abort-failure.json", import.meta.url), "utf8"));
  assert.throws(() => validateWatchTraceRecord(original), "A failed baseline run cannot be relabeled as these observations");
});
test("wrong source, cleanup, identity or partial watch semantics cannot become complete observations", () => {
  for (const mutate of [
    r => { r.completed = false; }, r => { r.compatibilityAcceptance = true; },
    r => { r.build.runtimeSourceCommit = "0".repeat(40); }, r => { r.build.fixtureSet = "pending-async"; },
    r => { r.lifecycle.finalUidProcessCount = 1; }, r => { r.lifecycle.rounds.pop(); },
    r => { r.runs[1].report.kernel += "drift"; }, r => { r.runs[0].report.pageSize = 16384; },
    r => { r.runs[0].report.rows[0].sourceSha256 = "0".repeat(64); },
    r => { r.runs[0].report.rows[0].exitCode = 134; },
    r => { r.runs[0].report.rows[0].elapsedMillis = 15000; },
    r => { const row = r.runs[0].report.rows[0], proof = JSON.parse(row.stdout.slice("WATCH_RELOAD_RESULT=".length));
      proof.rows.pop(); row.stdout = "WATCH_RELOAD_RESULT=" + JSON.stringify(proof) + "\n"; },
  ]) {
    const record = structuredClone(archive.records[0]); mutate(record);
    assert.throws(() => validateWatchTraceRecord(rebound(record)));
  }
  const rawDrift = structuredClone(archive.records[0]); rawDrift.runs[0].raw += "\n";
  assert.throws(() => validateWatchTraceRecord(rawDrift));
});
test("fatal stops, foreign user senders, unknown syscalls and incomplete delivery records remain diagnostic", () => {
  const row = archive.records[0].runs[0].report.rows[1];
  const proof = JSON.parse(row.stdout.slice("WATCH_RELOAD_RESULT=".length));
  const lines = row.stderr.trimEnd().split("\n");
  for (const mutate of [
    a => { a.splice(0, 0, 'TRACE_ABORT={"leader":' + proof.pid + '}'); },
    a => { a.pop(); }, a => { a.splice(a.findIndex(s => s.startsWith("TRACE_USER_SIGSYS=")), 1); },
    a => { a[0] = a[0].replace('"syscall":436', '"syscall":999'); },
    a => { a[0] = a[0].replace('"arch":3221225655', '"arch":3221225534'); },
    a => { const i = a.findIndex(s => s.startsWith("TRACE_USER_SIGSYS=")), e = JSON.parse(a[i].split("=")[1]);
      e.senderPid++; a[i] = "TRACE_USER_SIGSYS=" + JSON.stringify(e); },
    a => { const i = a.findIndex(s => s.startsWith("TRACE_USER_SIGSYS=")), e = JSON.parse(a[i].split("=")[1]);
      e.senderUid++; a[i] = "TRACE_USER_SIGSYS=" + JSON.stringify(e); },
  ]) {
    const changed = [...lines]; mutate(changed);
    assert.throws(() => parseWatchTrace(changed.join("\n") + "\n", proof));
  }
});
