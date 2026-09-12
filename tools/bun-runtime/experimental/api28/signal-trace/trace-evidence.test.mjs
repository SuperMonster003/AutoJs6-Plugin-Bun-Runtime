import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseTrace, validateBaselineTraceRecord } from "./trace-evidence.mjs";
const archive = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-blocked-pidfd-diagnosis.json",import.meta.url)));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function synchronize(record) {
  for (const run of record.runs) {
    run.raw = "INSTRUMENTATION_RESULT: report="+JSON.stringify(run.report)+"\nINSTRUMENTATION_CODE: -1\n";
    run.bytes = Buffer.byteLength(run.raw); run.sha256 = hash(run.raw);
  }
}
test("preserves diagnostic failure/control and four directly observed pidfd deliveries", () => {
  assert.deepEqual(archive.records.map((r,i)=>validateBaselineTraceRecord(r,i===0?28:31)),archive.summary);
  assert.equal(archive.compatibilityAcceptance,false);
});
test("rejects raw-output tampering even with an unchanged parsed report", () => {
  const r = structuredClone(archive.records[0]); r.runs[0].raw += "noise";
  assert.throws(()=>validateBaselineTraceRecord(r,28));
});
for (const [name, mutate] of [
  ["wrong syscall", r=>r.runs[0].report.rows[1].stderr=r.runs[0].report.rows[1].stderr.replace('"syscall":434','"syscall":436')],
  ["not the leader", r=>r.runs[0].report.rows[1].stderr=r.runs[0].report.rows[1].stderr.replace(/"tid":\d+,"signo":31,"code":1,"syscall":434/,'"tid":2,"signo":31,"code":1,"syscall":434')],
  ["not native ARM64", r=>r.runs[0].report.rows[1].stderr=r.runs[0].report.rows[1].stderr.replaceAll('"arch":3221225655','"arch":3221225534')],
  ["not a seccomp signal", r=>r.runs[0].report.rows[1].stderr=r.runs[0].report.rows[1].stderr.replaceAll('"code":1','"code":0')],
  ["observer changes outcome", r=>r.runs[0].report.rows[1].exitCode=0],
  ["observer failed", r=>r.runs[0].report.rows[1].stderr='TRACE_ERROR={"phase":"ptrace","errno":1}\n'],
  ["source drift", r=>r.runs[0].report.rows[0].sourceSha256="0".repeat(64)],
  ["UID process left", r=>r.lifecycle.finalUidProcessCount=1],
  ["missing restart", r=>r.lifecycle.rounds.pop()],
  ["acceptance relabel", r=>r.compatibilityAcceptance=true],
]) test(`rejects ${name}`,()=>{
  const r=structuredClone(archive.records[0]); mutate(r); synchronize(r);
  assert.throws(()=>validateBaselineTraceRecord(r,28));
});
test("API 31 control must preserve the original semantic mask assertions",()=>{
  const r=structuredClone(archive.records[1]), row=r.runs[0].report.rows[0];
  const p=JSON.parse(row.stdout.slice("ASYNC_SIGNAL_RESULT=".length)); p.rows[0].immediate=p.before;
  row.stdout="ASYNC_SIGNAL_RESULT="+JSON.stringify(p)+"\n"; synchronize(r);
  assert.throws(()=>validateBaselineTraceRecord(r,31));
});
test("trace parser enforces the signal and event budgets and final record",()=>{
  const text=archive.records[0].runs[0].report.rows[1].stderr;
  for(const changed of [text+text,text.replace(/"events":\d+/, '"events":257'),text.replace(/"signals":\d+/, '"signals":33'),text.trimEnd()])
    assert.throws(()=>parseTrace(changed,159));
});
