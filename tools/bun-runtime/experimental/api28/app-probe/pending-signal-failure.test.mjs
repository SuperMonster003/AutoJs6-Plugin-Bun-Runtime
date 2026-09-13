import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validatePendingFailureRecord } from "./pending-signal-failure.mjs";
import { validateRunRecord } from "./archive-probe.mjs";
const archive=JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-pending-sigsys-failure.json",import.meta.url),"utf8"));
const fixture=index => structuredClone({ ...archive.reports[index],build:archive.build });
const raw=record => record.runs.map(run => "INSTRUMENTATION_RESULT: report="+JSON.stringify(run)+"\nINSTRUMENTATION_CODE: 0\n");

test("two actual pending-signal failures retain old successes without accepting the expanded suite", () => {
  for(let i=0;i<2;i++) {
    const record=fixture(i),before=structuredClone(record);
    assert.equal(validatePendingFailureRecord(record,raw(record)),record);
    assert.deepEqual(record,before);
    assert.throws(() => validateRunRecord(record,raw(record)));
  }
  assert.equal(archive.summary.failedProbes,8); assert.equal(archive.summary.original31PassedProbes,124);
});
test("pending-failure archive rejects hidden regressions, changed signals and absent cleanup", () => {
  for(const change of [r => {r.passed=true;}, r => {r.distributionReady=true;}, r => {r.runs.pop();},
    r => {r.lifecycle.uninstalled=false;}, r => {r.lifecycle.finalUidProcessCount=1;},
    r => {r.build.inputs[0].sha256="0".repeat(64);}, r => {r.runs[0].probes[0].passed=false;},
    r => {r.runs[0].probes[30].exitCode=159;}, r => {r.runs[0].probes[30].forciblyTerminated=true;},
    r => {r.runs[0].probes[30].processReaped=false;}, r => {r.runs[0].probes[30].workspaceRemoved=false;},
    r => {r.runs[0].probes[30].evidenceError="hidden";}, r => {r.runs[0].probes[30].possibleSignalFromExitConvention=31;},
    r => {r.runs[0].environment.uid++;}, r => {r.runs[1].environment.kernel+="changed";}]) {
    const record=fixture(0);change(record);assert.throws(() => validatePendingFailureRecord(record,raw(record)));
  }
  for(const change of [p => {p.before[0]++;}, p => {p.before[1]=p.blocked;}, p => {p.blocked="00000000c0000000";},
    p => {p.pending.checks[2]=[1,0];}, p => {p.pending.checks[2]=[0,1];}, p => {p.pending.queueResult.result=-1;},
    p => {p.pending.queued=p.pending.before;}, p => {p.passed=true;}, p => {p.error="different failure";}]) {
    const record=fixture(0),result=record.runs[0].probes[30];change(result.pendingSignalEvidence);
    result.stdout="PENDING_SIGNAL_RESULT="+JSON.stringify(result.pendingSignalEvidence)+"\n";
    result.capturedBytes=Buffer.byteLength(result.stdout);
    assert.throws(() => validatePendingFailureRecord(record,raw(record)));
  }
});
test("failed instrumentation codes and raw output remain independently bound", () => {
  const record=fixture(0),rounds=raw(record);
  for(const changed of [rounds.slice(0,1),[rounds[0].replace("INSTRUMENTATION_CODE: 0","INSTRUMENTATION_CODE: -1"),rounds[1]],
    [rounds[0].replace('"exitCode":1','"exitCode":0'),rounds[1]], [rounds[0]+"Process crashed\n",rounds[1]]])
    assert.throws(() => validatePendingFailureRecord(record,changed));
});
