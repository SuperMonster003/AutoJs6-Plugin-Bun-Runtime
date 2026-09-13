import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fixtureAsset, fixtureSource } from "./build-trace.mjs";
import { hash, materializeAsyncSignalSource, materializePendingSignalSource } from "../app-probe/probe-common.mjs";
import { validatePendingTraceRecord } from "./pending-trace-evidence.mjs";
const archive=JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-pending-sigsys-diagnosis.json",import.meta.url),"utf8"));
const rebound=record => {
  for(const run of record.runs) {
    run.raw="INSTRUMENTATION_RESULT: report="+JSON.stringify(run.report)+"\nINSTRUMENTATION_CODE: -1\n";
    run.bytes=Buffer.byteLength(run.raw);run.sha256=hash(run.raw);
  }
  return record;
};
test("both diagnostic profiles bind only fixed source and modes", () => {
  for(const mode of ["native","trap"]) {
    assert.equal(fixtureAsset("pending-async",mode),`pending-signal-${mode}.mjs`);
    assert.equal(fixtureSource("pending-async",mode),materializePendingSignalSource(mode));
    assert.equal(fixtureSource("blocked-async",mode),materializeAsyncSignalSource(mode));
  }
  for(const value of ["", "../pending-async", "pending-async\n", "arbitrary"]) {
    assert.throws(() => fixtureSource(value,"native"));assert.throws(() => fixtureSource("pending-async",value));
  }
});
test("all plain/traced pairs confirm early user delivery without compatibility acceptance", () => {
  for(const record of archive.records) validatePendingTraceRecord(record);
  assert.equal(archive.summary.earlyUserSignals,8);assert.equal(archive.summary.compatibilityPasses,0);
});
test("wrong sender, kind, thread, ordering, source or cleanup cannot pass the diagnosis", () => {
  for(const change of [r => {r.completed=false;}, r => {r.compatibilityAcceptance=true;},
    r => {r.build.fixtureSet="blocked-async";}, r => {r.build.runtimeSourceCommit="0".repeat(40);},
    r => {r.lifecycle.finalUidProcessCount=1;}, r => {r.runs[0].report.rows[0].exitCode=0;},
    r => {r.runs[0].report.rows[1].sourceSha256="0".repeat(64);}, r => {r.runs[1].report.kernel+="changed";}]) {
    const record=structuredClone(archive.records[0]);change(record);assert.throws(() => validatePendingTraceRecord(rebound(record)));
  }
  for(const change of [e => {e.code=1;}, e => {e.senderPid++;}, e => {e.senderUid++;},e => {e.tid++;},
    e => {e.syscall=434;},e => {e.arch=0xc00000b7;}]) {
    const record=structuredClone(archive.records[0]),row=record.runs[0].report.rows[1];
    row.stderr=row.stderr.split("\n").map(line => {
      if(!line.startsWith("TRACE_USER_SIGSYS="))return line;
      const event=JSON.parse(line.slice("TRACE_USER_SIGSYS=".length));change(event);return "TRACE_USER_SIGSYS="+JSON.stringify(event);
    }).join("\n");
    assert.throws(() => validatePendingTraceRecord(rebound(record)));
  }
  for(const change of [lines => {lines.splice(2,1);},lines => { [lines[2],lines[3]]=[lines[3],lines[2]]; },
    lines => {lines[lines.length-2]=lines[lines.length-2].replace('"exitCode":1','"exitCode":159');}]) {
    const record=structuredClone(archive.records[0]),row=record.runs[0].report.rows[1],lines=row.stderr.split("\n");
    change(lines);row.stderr=lines.join("\n");assert.throws(() => validatePendingTraceRecord(rebound(record)));
  }
});
