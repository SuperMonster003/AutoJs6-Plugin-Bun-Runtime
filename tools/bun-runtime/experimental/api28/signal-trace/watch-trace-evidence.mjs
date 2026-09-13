import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hash } from "../app-probe/probe-common.mjs";
import { validateWatchReloadEvidence } from "../app-probe/watch-reload-evidence.mjs";
import { fixtureSource } from "./build-trace.mjs";

const BASELINE = new URL("../../../../../docs/compatibility/2026-09-13-m2-watch-reload-runtime-evidence.json", import.meta.url);
const integer = (n, min, max) => assert(Number.isSafeInteger(n) && n >= min && n <= max);

// This parser accepts a complete observation with no reproduced abort. A fatal
// snapshot or incomplete generation remains raw diagnostic evidence and must
// be examined separately; it cannot be coerced into this result shape.
export function parseWatchTrace(stderr, proof) {
  assert(typeof stderr === "string" && Buffer.byteLength(stderr) <= 16384 && stderr.endsWith("\n"));
  const lines = stderr.trimEnd().split("\n"), last = lines.pop();
  assert(last.startsWith("TRACE_DONE="));
  const done = JSON.parse(last.slice("TRACE_DONE=".length));
  assert.equal(done.leader, proof.pid); assert.equal(done.exitCode, 0);
  integer(done.events, 1, 256); integer(done.exits, 2, done.events); integer(done.signals, 3, 32);
  const events = [], waits = [], attachedTids = new Set();
  let waitAllowed = false;
  for (const line of lines) {
    const at = line.indexOf("="); assert(at > 0);
    const type = line.slice(0, at), event = JSON.parse(line.slice(at + 1));
    assert.equal(event.leader, proof.pid);
    if (type === "TRACE_USER_WAIT") {
      assert(waitAllowed, "At most one immediate register context per ordinary signal");
      waitAllowed = false;
      assert.deepEqual(Object.keys(event).sort(), ["leader", "maskAddress", "maskRead", "maskWord", "syscallRegister", "tid"]);
      assert.equal(event.tid, proof.childPid); assert([22, 441].includes(event.syscallRegister));
      assert(/^[0-9a-f]{16}$/.test(event.maskAddress) && /^[0-9a-f]{16}$/.test(event.maskWord));
      assert.equal(event.maskRead, event.maskAddress !== "0000000000000000");
      waits.push(event); continue;
    }
    waitAllowed = type === "TRACE_USER_SIGSYS";
    assert(["TRACE_SIGSYS", "TRACE_USER_SIGSYS"].includes(type), "Unexpected or fatal trace output remains diagnostic");
    assert.equal(event.signo, 31);
    integer(event.tid, 2, 0x7fffffff); attachedTids.add(event.tid);
    if (type === "TRACE_USER_SIGSYS") {
      assert.deepEqual(Object.keys(event).sort(), ["code", "leader", "senderPid", "senderUid", "signo", "tid"]);
      assert.equal(event.code, -6); assert.equal(event.tid, proof.childPid);
      assert.equal(event.senderPid, proof.childPid); assert.equal(event.senderUid, proof.uid);
    } else {
      assert.deepEqual(Object.keys(event).sort(), ["arch", "code", "leader", "signo", "syscall", "tid"]);
      assert.equal(event.code, 1); assert.equal(event.arch, 0xc00000b7);
      assert([167, 291, 434, 436].includes(event.syscall), "ARM64 prctl/statx/pidfd/close-range observations only");
      // The source-bound observer receives stops only from its kernel-attached
      // tracees. close_range also runs on other attached threads during reload;
      // their TIDs do not establish a more specific thread/parent relationship.
      if (event.syscall !== 436) assert([proof.pid, proof.childPid].includes(event.tid));
    }
    events.push({ type, ...event });
  }
  assert.equal(events.length, done.signals);
  assert.equal(events.filter(e => e.type === "TRACE_USER_SIGSYS").length, 3, "One ordinary signal per image");
  assert(waits.length <= 3);
  assert(attachedTids.size <= done.exits);
  return { done, events, waits, attachedTids: [...attachedTids] };
}

export function validateWatchTraceRecord(record) {
  assert.equal(record.schemaVersion, 1); assert.equal(record.kind, "test-only-signal-trace-runs");
  assert.equal(record.compatibilityAcceptance, false); assert.equal(record.completed, true);
  assert(!record.error && !record.cleanupError);
  assert(Number.isFinite(Date.parse(record.capturedAt)));
  const build = record.build, life = record.lifecycle;
  const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  const artifact = baseline.artifacts.find(a => a.abi === "arm64-v8a");
  assert.equal(build.kind, "test-only-signal-trace-build"); assert.equal(build.fixtureSet, "watch-reload");
  assert.equal(build.packageName, "io.github.supermonster003.autojs6.plugin.bun.runtime.signaltrace");
  assert.equal(build.compatibilityAcceptance, false); assert.equal(build.abi, "arm64-v8a");
  assert.equal(build.runtimeSourceCommit, baseline.source.downstreamHeadCommit);
  assert.deepEqual(build.payloads[build.abi]["libbun_exec.so"], { bytes: artifact.bytes, sha256: artifact.sha256 });
  assert.equal(life.installedByThisRun, true); assert.equal(life.uninstalled, true); assert.equal(life.finalUidProcessCount, 0);
  assert.deepEqual(life.rounds, [1, 2].map(round => ({ round, uidProcessCount: 0 })));
  assert.equal(record.runs.length, 2);
  const identity = r => [r.api, r.abi, r.pageSize, r.uid, r.model, r.fingerprint, r.kernel, r.selinux];
  for (const run of record.runs) {
    assert.equal(run.bytes, Buffer.byteLength(run.raw)); assert.equal(run.sha256, hash(run.raw));
    assert(run.bytes < 1024 * 1024);
    const lines = run.raw.split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 2); assert.equal(lines[1], "INSTRUMENTATION_CODE: -1");
    assert(lines[0].startsWith("INSTRUMENTATION_RESULT: report="));
    assert.deepEqual(JSON.parse(lines[0].slice("INSTRUMENTATION_RESULT: report=".length)), run.report);
    const r = run.report;
    assert.equal(r.kind, "test-only-signal-trace-observation"); assert.equal(r.fixtureSet, "watch-reload");
    assert.equal(r.compatibilityAcceptance, false); assert.equal(r.completed, true); assert.equal(r.workspaceRemoved, true);
    assert(!r.error && !r.cleanupError); assert([28, 31].includes(r.api)); assert.equal(r.abi, build.abi); assert.equal(r.pageSize, 4096);
    assert.equal(r.uid, life.installedUid); integer(r.uid % 100000, 10000, 99999);
    assert.equal(r.seccomp, 2); assert(r.selinux.startsWith("u:r:untrusted_app"));
    assert.deepEqual(identity(r), identity(record.runs[0].report));
    assert.deepEqual(r.payloads, build.payloads[build.abi]); assert.equal(r.apkSha256, build.apk.sha256);
    assert.deepEqual(r.rows.map(row => [row.mode, row.traced]), [["native", false], ["native", true], ["trap", false], ["trap", true]]);
    for (const row of r.rows) {
      assert.equal(row.sourceSha256, hash(fixtureSource("watch-reload", row.mode))); assert.equal(row.processReaped, true);
      integer(row.elapsedMillis, 0, 14999); assert(Buffer.byteLength(row.stdout) + Buffer.byteLength(row.stderr) <= 16384);
      assert.equal(row.exitCode, 0); assert(row.stdout.startsWith("WATCH_RELOAD_RESULT="));
      const proof = JSON.parse(row.stdout.trim().slice("WATCH_RELOAD_RESULT=".length));
      validateWatchReloadEvidence(proof, row.mode, r.abi); assert.equal(proof.uid, r.uid);
      if (row.traced) parseWatchTrace(row.stderr, proof); else assert.equal(row.stderr, "");
    }
  }
  return record;
}
