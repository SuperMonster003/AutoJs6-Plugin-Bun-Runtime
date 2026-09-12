// Failure-only archival. This cannot publish acceptance or weaken archive-probe.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { HERE, ROOT, fileFacts, inputFacts, json, validateProbes, validateReceipt, validateReport } from "./probe-common.mjs";
import { ASYNC_SIGNAL_MODES } from "./async-signal-evidence.mjs";
import { environmentKey } from "./archive-probe.mjs";

const probes = validateProbes(json(join(HERE, "probes.json"))), failureIds = Object.keys(ASYNC_SIGNAL_MODES);
export function validateAsyncSignalFailure(record, rawRounds) {
  assert.equal(record.schemaVersion, 2); assert.equal(record.kind, "test-only-application-process-probe-runs");
  assert.equal(record.passed, false); assert.equal(record.distributionReady, false); assert.equal(record.pluginBinderExercised, false);
  assert(!Object.hasOwn(record, "cleanupError"));
  assert(Number.isFinite(Date.parse(record.capturedAt)));
  assert(typeof record.error === "string" && record.error.length > 0 && record.error.length <= 4096);
  assert.equal(record.validationErrors.length, 2);
  record.validationErrors.forEach((error, i) => assert(typeof error === "string" && error.length <= 2048 &&
    error.startsWith(`Round ${i + 1}: sigsys-blocked-async-native failed`)));
  const build = validateReceipt(record.build), lifecycle = record.lifecycle;
  assert.equal(lifecycle.installedByThisRun, true); assert.equal(lifecycle.forceStopVerified, true);
  assert.equal(lifecycle.uninstalled, true); assert.equal(lifecycle.finalUidProcessCount, 0);
  assert.deepEqual(lifecycle.rounds, [1,2].map(round => ({ round, packageProcessAbsent: true, uidProcessCount: 0 })));
  assert.equal(record.runs.length, 2); assert.equal(rawRounds.length, 2);
  const identity = environmentKey(record.runs[0].environment);
  record.runs.forEach((run, i) => {
    const raw = rawRounds[i];
    assert(typeof raw === "string" && Buffer.byteLength(raw) <= 1024 * 1024);
    const lines = raw.split(/\r?\n/), reports = lines.filter(line => line.startsWith("INSTRUMENTATION_RESULT: report="));
    assert.equal(reports.length, 1);
    assert.deepEqual(lines.filter(line => line.startsWith("INSTRUMENTATION_CODE:")), ["INSTRUMENTATION_CODE: 0"]);
    assert.doesNotMatch(raw, /INSTRUMENTATION_FAILED|Process crashed/);
    assert.deepEqual(JSON.parse(reports[0].slice("INSTRUMENTATION_RESULT: report=".length)), run);
    assert.equal(run.passed, false); assert.equal(environmentKey(run.environment), identity);
    assert.equal(run.environment.uid, lifecycle.installedUid);
    assert.equal(run.environment.apiLevel, 28); assert.equal(run.environment.abi, "arm64-v8a");
    assert.equal(run.environment.pageSizeBytes, 4096);
    assert.deepEqual(run.probes.map(p => p.id), probes.map(p => p.id));
    assert.deepEqual(run.probes.filter(p => !p.passed).map(p => p.id), failureIds);
    for (const p of run.probes.filter(p => failureIds.includes(p.id))) {
      assert.equal(p.passed, false); assert.equal(p.exitCode, 159); assert.equal(p.possibleSignalFromExitConvention, 31);
      assert.equal(p.termination, "exited"); assert.equal(p.forciblyTerminated, false);
      assert.equal(p.processReaped, true); assert.equal(p.workspaceRemoved, true);
      assert.equal(p.capturedBytes, 0); assert.equal(p.outputLimitBytes, 16384);
      assert.equal(p.stdout, ""); assert.equal(p.stderr, "");
      assert.equal(p.evidenceError, "java.lang.IllegalStateException: exactly one bounded fixture evidence record");
      for (const key of ["asyncSignalEvidence", "error", "streamError"]) assert(!Object.hasOwn(p, key));
      assert(Number.isInteger(p.elapsedMillis) && p.elapsedMillis >= 0 && p.elapsedMillis < 15000);
    }
    // Validate ONLY the original passing subset through the unchanged strict
    // validator. This in-memory projection is never saved as the full result:
    // both original failed rounds and failed instrumentation codes stay exact.
    const subset = run.probes.filter(p => !failureIds.includes(p.id));
    validateReport({ ...run, probes: subset, passed: true }, {
      abi: "arm64-v8a", api: 28, pageSize: 4096, apk: build.apks.find(a => a.abi === "arm64-v8a"),
      runtime: build.runtimes["arm64-v8a"], supervisor: build.supervisor.artifacts.find(a => a.abi === "arm64-v8a"),
      variant: build.variant, probes: probes.filter(p => !failureIds.includes(p.id)),
    });
  });
  return record;
}
export function archiveAsyncSignalFailure(output, directory) {
  const target = resolve(output);
  assert.equal(realpathSync(dirname(target)), realpathSync(join(ROOT, "docs/compatibility")));
  assert(target.endsWith(".json"));
  const reportPath = join(directory, "probe-result.json");
  const instrumentation = [1,2].map(round => {
    const filename = `instrumentation-${round}.txt`, path = join(directory, filename);
    return { filename, ...fileFacts(path), text: readFileSync(path, "utf8") };
  });
  const record = validateAsyncSignalFailure(json(reportPath), instrumentation.map(item => item.text));
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  assert.equal(git.status, 0);
  const archive = { schemaVersion: 1, kind: "archived-blocked-async-signal-failure", archivedAt: new Date().toISOString(),
    projectBaseCommit: git.stdout.trim(), passed: false, distributionReady: false, pluginBinderExercised: false,
    productionReleaseAcceptance: false, officialMinimumApi: 33,
    scope: "Two 29/31 rounds on native ARM64 API 28 / 4 KiB. Both new blocked-async modes exit 159 without a semantic record; original 29 pass. This is a failed gate, not expected-failure acceptance.",
    signalAttribution: "31 inferred from supervisor exit convention (159 - 128), not directly captured si_syscall. pidfd_open is a source-review hypothesis, not a confirmed dynamic call site.",
    summary: { environments: 1, rounds: 2, probesPerRound: 31, totalProbes: 62, passedProbes: 58, failedProbes: 4,
      original29PassedProbes: 58, blockedAsyncPassedProbes: 0 },
    inputs: inputFacts(), probes, rawReport: fileFacts(reportPath), instrumentation, record,
    archiveValidator: { path: "tools/bun-runtime/experimental/api28/app-probe/archive-async-signal-failure.mjs", ...fileFacts(new URL(import.meta.url)) },
  };
  writeFileSync(target, JSON.stringify(archive, null, 2) + "\n", { flag: "wx" });
  console.log("Archived failed blocked-async gate: 58/62, four failures retained: " + target);
  return archive;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [output, directory, extra] = process.argv.slice(2);
  assert(output && directory && !extra, "Usage: node archive-async-signal-failure.mjs <new-report.json> <run-directory>");
  archiveAsyncSignalFailure(output, directory);
}
