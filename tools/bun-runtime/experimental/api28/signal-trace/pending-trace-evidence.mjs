import assert from "node:assert/strict";
import { hash } from "../app-probe/probe-common.mjs";
import { parsePendingFailure } from "../app-probe/pending-signal-failure.mjs";
import { fixtureSource } from "./build-trace.mjs";

const integer = (n,min,max) => assert(Number.isSafeInteger(n) && n >= min && n <= max);
export function parsePendingTrace(stderr, proof) {
  assert(typeof stderr === "string" && Buffer.byteLength(stderr) < 16384 && stderr.endsWith("\n"));
  const lines = stderr.trimEnd().split("\n"), last = lines.pop();
  assert(last.startsWith("TRACE_DONE="));
  const done = JSON.parse(last.slice("TRACE_DONE=".length));
  assert.equal(done.leader,proof.pid); assert.equal(done.exitCode,1);
  integer(done.events,1,256); integer(done.exits,1,done.events); integer(done.signals,1,32);
  assert.equal(lines.length,done.signals);
  const events = lines.map(line => {
    const user = line.startsWith("TRACE_USER_SIGSYS=");
    assert(user || line.startsWith("TRACE_SIGSYS="));
    const event = JSON.parse(line.slice(line.indexOf("=")+1));
    assert.equal(event.leader,proof.pid); assert.equal(event.signo,31); integer(event.tid,2,0x7fffffff);
    if (user) {
      assert.deepEqual(Object.keys(event).sort(),["code","leader","senderPid","senderUid","signo","tid"]);
      assert.equal(event.code,-6); assert.equal(event.tid,proof.pid);
      assert.equal(event.senderPid,proof.pid); assert.equal(event.senderUid,proof.uid);
    } else {
      assert.deepEqual(Object.keys(event).sort(),["arch","code","leader","signo","syscall","tid"]);
      assert.equal(event.code,1); assert.equal(event.arch,0xc00000b7);
      assert([167,436].includes(event.syscall), "no pidfd SIGSYS in this diagnosis");
    }
    return { user,...event };
  });
  const users = events.filter(e => e.user);
  assert.equal(users.length,1,"exactly one early ordinary SIGSYS delivery required");
  const userIndex = events.findIndex(e => e.user);
  const childIndex = events.findIndex(e => !e.user && e.tid !== proof.pid && e.syscall === 436);
  assert(userIndex < childIndex,"caller signal delivery precedes the child close_range trap");
  assert.deepEqual(events.filter(e => !e.user).map(e => [e.tid === proof.pid,e.syscall]),
    proof.mode === "native" ? [[true,436],[true,436],[false,436]] :
      [[true,436],[true,436],[true,167],[true,436],[false,436]]);
  return { done,events };
}

export function validatePendingTraceRecord(record) {
  assert.equal(record.schemaVersion,1); assert.equal(record.kind,"test-only-signal-trace-runs");
  assert.equal(record.compatibilityAcceptance,false); assert.equal(record.completed,true);
  assert(!record.error && !record.cleanupError); assert(Number.isFinite(Date.parse(record.capturedAt)));
  const build = record.build, life = record.lifecycle;
  assert.equal(build.kind,"test-only-signal-trace-build"); assert.equal(build.fixtureSet,"pending-async");
  assert.equal(build.packageName,"io.github.supermonster003.autojs6.plugin.bun.runtime.signaltrace");
  assert.equal(build.compatibilityAcceptance,false); assert.equal(build.abi,"arm64-v8a");
  assert.equal(build.runtimeSourceCommit,"a9c76a599bacb75c72d3c00fc6f99c5cc9483b47");
  assert.deepEqual(build.payloads[build.abi]["libbun_exec.so"], { bytes:87923328,
    sha256:"96c8460903ed8e80843a6fac96e2f9d4f0372e97bd76ae58cbde092a3e9a2f5f" });
  assert.equal(life.installedByThisRun,true); assert.equal(life.uninstalled,true); assert.equal(life.finalUidProcessCount,0);
  assert.deepEqual(life.rounds,[1,2].map(round => ({round,uidProcessCount:0})));
  assert.equal(record.runs.length,2);
  const identity = r => [r.api,r.abi,r.pageSize,r.uid,r.model,r.fingerprint,r.kernel,r.selinux];
  for (const run of record.runs) {
    assert.equal(run.bytes,Buffer.byteLength(run.raw)); assert.equal(run.sha256,hash(run.raw));
    assert(run.bytes < 1024*1024);
    const lines=run.raw.split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length,2); assert.equal(lines[1],"INSTRUMENTATION_CODE: -1");
    assert(lines[0].startsWith("INSTRUMENTATION_RESULT: report="));
    assert.deepEqual(JSON.parse(lines[0].slice("INSTRUMENTATION_RESULT: report=".length)),run.report);
    const r=run.report;
    assert.equal(r.kind,"test-only-signal-trace-observation"); assert.equal(r.fixtureSet,build.fixtureSet);
    assert.equal(r.compatibilityAcceptance,false); assert.equal(r.completed,true); assert.equal(r.workspaceRemoved,true);
    assert(!r.error && !r.cleanupError); assert([28,31].includes(r.api)); assert.equal(r.abi,build.abi); assert.equal(r.pageSize,4096);
    assert.equal(r.uid,life.installedUid); integer(r.uid % 100000,10000,99999);
    assert.equal(r.seccomp,2); assert(r.selinux.startsWith("u:r:untrusted_app"));
    assert.deepEqual(identity(r),identity(record.runs[0].report)); assert.deepEqual(r.payloads,build.payloads[build.abi]);
    assert.equal(r.apkSha256,build.apk.sha256);
    assert.deepEqual(r.rows.map(row => [row.mode,row.traced]),[["native",false],["native",true],["trap",false],["trap",true]]);
    for (const row of r.rows) {
      assert.equal(row.sourceSha256,hash(fixtureSource("pending-async",row.mode))); assert.equal(row.processReaped,true);
      integer(row.elapsedMillis,0,14999); assert(Buffer.byteLength(row.stdout)+Buffer.byteLength(row.stderr) <= 16384);
      assert.equal(row.exitCode,1);
      const proof=parsePendingFailure(row.stdout,row.mode,r.abi,r.uid);
      if (row.traced) parsePendingTrace(row.stderr,proof); else assert.equal(row.stderr,"");
    }
  }
  return record;
}
