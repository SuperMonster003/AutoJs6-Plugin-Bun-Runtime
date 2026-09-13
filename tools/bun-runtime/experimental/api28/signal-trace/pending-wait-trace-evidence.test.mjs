import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parsePendingWaitFailure } from "../app-probe/pending-wait-failure.mjs";
import { parsePendingWaitTrace, validatePendingWaitTraceRecord } from "./pending-wait-trace-evidence.mjs";

const archive = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-pending-wait-diagnosis.json", import.meta.url), "utf8"));
test("both device diagnostics retain eight read-only epoll mask contexts and plain controls", () => {
  archive.records.forEach(record => assert.equal(validatePendingWaitTraceRecord(record), record));
  assert.equal(archive.summary.plainObservations, 8);
  assert.equal(archive.summary.tracedObservations, 8);
  assert.equal(archive.summary.compatibilityPasses, 0);
});

test("wait context needs the actual syscall register, non-null pointer, zero word and correct event order", () => {
  const report = archive.records[0].runs[0].report;
  const row = report.rows.find(r => r.traced);
  const proof = parsePendingWaitFailure(row.stdout, row.mode, report.abi, report.uid);
  for (const change of [c => { c.syscallRegister = 441; }, c => { c.maskAddress = '0000000000000000'; },
    c => { c.maskWord = '0000000040000000'; }, c => { c.maskRead = false; },
    c => { c.tid++; }, c => { c.leader++; }, c => { delete c.maskWord; }]) {
    const lines = row.stderr.trimEnd().split('\n');
    const index = lines.findIndex(line => line.startsWith('TRACE_USER_WAIT='));
    const context = JSON.parse(lines[index].split('=')[1]); change(context);
    lines[index] = 'TRACE_USER_WAIT=' + JSON.stringify(context);
    assert.throws(() => parsePendingWaitTrace(lines.join('\n') + '\n', proof));
  }
  const missing = row.stderr.split('\n').filter(line => !line.startsWith('TRACE_USER_WAIT=')).join('\n');
  assert.throws(() => parsePendingWaitTrace(missing, proof));
  const lines = row.stderr.trimEnd().split('\n'), index = lines.findIndex(line => line.startsWith('TRACE_USER_SIGSYS='));
  lines.unshift(...lines.splice(index, 2));
  assert.throws(() => parsePendingWaitTrace(lines.join('\n') + '\n', proof));
});

test("a different native source, missing raw pair or residual process cannot enter the diagnosis", () => {
  for (const change of [r => { r.build.runtimeSourceCommit = 'a9c76a599bacb75c72d3c00fc6f99c5cc9483b47'; },
    r => { r.build.payloads['arm64-v8a']['libbun_exec.so'].sha256 = '0'.repeat(64); },
    r => { r.runs.pop(); }, r => { r.runs[0].raw += '\n'; },
    r => { r.lifecycle.finalUidProcessCount = 1; }, r => { r.compatibilityAcceptance = true; }]) {
    const record = structuredClone(archive.records[0]); change(record);
    assert.throws(() => validatePendingWaitTraceRecord(record));
  }
});
