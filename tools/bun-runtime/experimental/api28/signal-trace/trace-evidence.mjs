// Diagnostic evidence is deliberately separate from compatibility acceptance.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validateAsyncSignalEvidence } from "../app-probe/async-signal-evidence.mjs";
const hash = data => createHash("sha256").update(data).digest("hex");
const integer = (n, min, max) => assert(Number.isSafeInteger(n) && n >= min && n <= max);
const sources = Object.freeze({
  native: "638c3f711cba674aae87d59bfbc61fa0fc8121c38cb2b4ac1ef85aeca4f3be70",
  trap: "78ad02b72c1485319db36b0362de00494299c17944f1ddac9092253c4b9b8d75",
});
export function parseTrace(stderr, exitCode) {
  assert(typeof stderr === "string" && Buffer.byteLength(stderr) <= 16384 && stderr.endsWith("\n"));
  const lines = stderr.trimEnd().split("\n"), last = lines.pop();
  assert(last.startsWith("TRACE_DONE="), "trace must finish without observer failure");
  const done = JSON.parse(last.slice("TRACE_DONE=".length));
  integer(done.leader, 2, 0x7fffffff); integer(done.events, 1, 256);
  integer(done.exits, 1, done.events); integer(done.signals, 0, 32);
  assert.equal(done.exitCode, exitCode); assert.equal(lines.length, done.signals);
  const signals = lines.map(line => {
    assert(line.startsWith("TRACE_SIGSYS="), "unexpected trace output");
    const event = JSON.parse(line.slice("TRACE_SIGSYS=".length));
    assert.deepEqual(Object.keys(event).sort(), ["arch", "code", "leader", "signo", "syscall", "tid"]);
    assert.equal(event.leader, done.leader); integer(event.tid, 2, 0x7fffffff);
    assert.equal(event.signo, 31); assert.equal(event.code, 1); // SYS_SECCOMP
    assert.equal(event.arch, 0xc00000b7); // AUDIT_ARCH_AARCH64, not translated x86
    assert([167, 434, 436].includes(event.syscall));
    return event;
  });
  return { done, signals };
}
export function validateBaselineTraceRecord(record, api) {
  assert([28, 31].includes(api));
  assert.equal(record.schemaVersion, 1); assert.equal(record.kind, "test-only-signal-trace-runs");
  assert.equal(record.compatibilityAcceptance, false); assert.equal(record.completed, true);
  assert(!record.error && !record.cleanupError); assert(Number.isFinite(Date.parse(record.capturedAt)));
  const build = record.build;
  assert.equal(build.kind, "test-only-signal-trace-build"); assert.equal(build.compatibilityAcceptance, false);
  assert.equal(build.packageName, "io.github.supermonster003.autojs6.plugin.bun.runtime.signaltrace");
  assert.equal(build.abi, "arm64-v8a");
  assert.equal(build.runtimeSourceCommit, "7b9ac266888abda7ee6ec0b8ac11a74236420030");
  assert.deepEqual(build.payloads[build.abi]["libbun_exec.so"], {
    bytes: 87923320, sha256: "22b7e0778c5355d664045b9b04e849a90eae2572f203a23a8f57081a86879be7",
  });
  assert.equal(record.lifecycle.installedByThisRun, true); assert.equal(record.lifecycle.uninstalled, true);
  assert.equal(record.lifecycle.finalUidProcessCount, 0);
  assert.deepEqual(record.lifecycle.rounds, [1,2].map(round => ({ round, uidProcessCount: 0 })));
  assert.equal(record.runs.length, 2);
  const identity = r => [r.api, r.abi, r.pageSize, r.uid, r.model, r.fingerprint, r.kernel, r.selinux];
  let fatalPidfdSignals = 0;
  for (const run of record.runs) {
    assert.equal(run.bytes, Buffer.byteLength(run.raw)); assert.equal(run.sha256, hash(run.raw));
    assert(run.bytes <= 1024 * 1024);
    const lines = run.raw.split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 2); assert.equal(lines[1], "INSTRUMENTATION_CODE: -1");
    assert(lines[0].startsWith("INSTRUMENTATION_RESULT: report="));
    assert.deepEqual(JSON.parse(lines[0].slice("INSTRUMENTATION_RESULT: report=".length)), run.report);
    const r = run.report;
    assert.equal(r.kind, "test-only-signal-trace-observation"); assert.equal(r.compatibilityAcceptance, false);
    assert.equal(r.completed, true); assert.equal(r.workspaceRemoved, true); assert(!r.error && !r.cleanupError);
    assert.equal(r.api, api); assert.equal(r.abi, "arm64-v8a"); assert.equal(r.pageSize, 4096);
    assert.equal(r.uid, record.lifecycle.installedUid); integer(r.uid % 100000, 10000, 99999);
    assert.equal(r.seccomp, 2); assert(r.selinux.startsWith("u:r:untrusted_app"));
    assert.deepEqual(identity(r), identity(record.runs[0].report));
    assert.deepEqual(r.payloads, build.payloads[build.abi]); assert.equal(r.apkSha256, build.apk.sha256);
    assert.deepEqual(r.rows.map(row => [row.mode, row.traced]), [["native",false],["native",true],["trap",false],["trap",true]]);
    for (const row of r.rows) {
      assert.equal(row.sourceSha256, sources[row.mode]); assert.equal(row.processReaped, true);
      integer(row.elapsedMillis, 0, 14999); assert(Buffer.byteLength(row.stdout) + Buffer.byteLength(row.stderr) <= 16384);
      assert.equal(row.exitCode, api === 28 ? 159 : 0);
      let trace;
      if (row.traced) trace = parseTrace(row.stderr, row.exitCode);
      else assert.equal(row.stderr, "");
      if (api === 28) {
        assert.equal(row.stdout, "");
        if (trace) {
          const last = trace.signals.at(-1);
          assert(last); assert.equal(last.syscall, 434); assert.equal(last.tid, trace.done.leader);
          assert.equal(trace.signals.filter(s => s.syscall === 434).length, 1);
          fatalPidfdSignals++;
        }
      } else {
        assert(/^ASYNC_SIGNAL_RESULT=[^\n]+\n$/.test(row.stdout));
        const proof = validateAsyncSignalEvidence(JSON.parse(row.stdout.slice("ASYNC_SIGNAL_RESULT=".length)), row.mode, r.abi);
        assert.equal(proof.uid, r.uid);
        if (trace) { assert.equal(proof.pid, trace.done.leader); assert(!trace.signals.some(s => s.syscall === 434)); }
      }
    }
  }
  assert.equal(fatalPidfdSignals, api === 28 ? 4 : 0);
  return { api, rounds: 2, executions: 8, fatalPidfdSignals };
}
