// Archive new, source-matched runs. Never rewrite or rebind historical evidence.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { HERE, ROOT, PROBE_IDS, fileFacts, inputFacts, json, parseInstrumentation,
  validateProbes, validateReceipt, validateReport } from "./probe-common.mjs";

const probes = validateProbes(json(join(HERE, "probes.json")));
export function environmentKey(environment) {
  const names = ["manufacturer", "model", "fingerprint", "apiLevel", "abi", "kernelMachine", "kernel", "pageSizeBytes"];
  for (const name of ["manufacturer", "model", "fingerprint", "kernel"])
    assert(typeof environment[name] === "string" && environment[name].length > 0 &&
      environment[name].length <= 1024, "Missing or unbounded environment identity: " + name);
  // Deliberately exclude PID, UID, serial, time and report directory. Repeating
  // the same system image must not inflate the distinct environment count.
  return JSON.stringify(names.map(name => environment[name]));
}

export function validateRunRecord(record, rawRounds) {
  assert.equal(record.schemaVersion, 2);
  assert.equal(record.kind, "test-only-application-process-probe-runs");
  assert.equal(record.pluginBinderExercised, false);
  assert.equal(record.distributionReady, false);
  assert.equal(record.passed, true);
  for (const field of ["error", "cleanupError", "validationErrors"])
    assert(!Object.hasOwn(record, field), "Run contains failure diagnostics: " + field);
  assert(typeof record.capturedAt === "string" && Number.isFinite(Date.parse(record.capturedAt)), "Missing capture time");
  const build = validateReceipt(record.build);
  assert.equal(record.runs.length, 2, "Exactly two process-restarted rounds required");
  assert.equal(rawRounds.length, 2, "Both retained raw instrumentation files required");
  const lifecycle = record.lifecycle;
  assert.equal(lifecycle.installedByThisRun, true);
  assert.equal(lifecycle.forceStopVerified, true);
  assert.equal(lifecycle.uninstalled, true);
  assert.equal(lifecycle.finalUidProcessCount, 0);
  assert.deepEqual(lifecycle.rounds, [1, 2].map(round => ({ round, packageProcessAbsent: true, uidProcessCount: 0 })));
  const identity = environmentKey(record.runs[0].environment);
  for (let index = 0; index < 2; index++) {
    const run = record.runs[index], raw = rawRounds[index], env = run.environment;
    assert(typeof raw === "string" && Buffer.byteLength(raw) <= 1024 * 1024, "Bounded raw instrumentation required");
    assert.doesNotMatch(raw, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed/);
    assert.deepEqual(parseInstrumentation(raw), run, "Raw instrumentation and retained report differ");
    assert.equal(environmentKey(env), identity, "Device identity changed between rounds");
    assert.equal(env.uid, lifecycle.installedUid, "Installed UID differs from instrumentation UID");
    assert(Number.isSafeInteger(env.uid) && env.uid % 100000 >= 10000, "Ordinary application UID required");
    assert(Number.isInteger(env.apiLevel) && env.apiLevel >= 28 && env.apiLevel <= 100);
    assert([4096, 16384].includes(env.pageSizeBytes));
    validateReport(run, { abi: env.abi, api: env.apiLevel, pageSize: env.pageSizeBytes,
      apk: build.apks.find(apk => apk.abi === env.abi), runtime: build.runtimes[env.abi],
      supervisor: build.supervisor.artifacts.find(artifact => artifact.abi === env.abi), variant: build.variant, probes });
  }
  return record;
}

export function summarizeRecords(records) {
  assert(records.length > 0, "At least one validated environment required");
  const identities = new Set(records.map(record => environmentKey(record.runs[0].environment)));
  assert.equal(identities.size, records.length, "Repeated environments cannot inflate the matrix");
  for (const record of records) assert.deepEqual(record.build, records[0].build, "Use separate archives for different APK builds");
  const results = records.flatMap(record => record.runs.flatMap(run => run.probes));
  const lifecycle = results.filter(probe => probe.termination !== "exited");
  return { environments: records.length, rounds: records.length * 2, probesPerRound: PROBE_IDS.length,
    passedProbes: results.filter(probe => probe.passed).length, totalProbes: results.length,
    loweredSoftLimitObservations: results.filter(probe => probe.id.startsWith("fd-spawn-lowered-")).length,
    loweredHardLimitObservations: results.filter(probe => probe.id.startsWith("fd-hard-")).length,
    hardLimitStartupObservations: results.filter(probe => probe.id.startsWith("fd-hard-startup-")).length,
    hardLimitSpawnObservations: results.filter(probe => probe.id.startsWith("fd-hard-spawn-")).length,
    hardLimitSpawnApiObservations: results.filter(probe => probe.id.startsWith("fd-hard-spawn-")).length * 2,
    forcibleLifecycleObservations: lifecycle.length,
    terminationToExitMillis: { minimum: Math.min(...lifecycle.map(probe => probe.terminationToExitMillis)),
      maximum: Math.max(...lifecycle.map(probe => probe.terminationToExitMillis)) } };
}

export function archiveProbe(output, directories) {
  assert(directories.length > 0, "At least one run directory required");
  const target = resolve(output);
  assert.equal(realpathSync(dirname(target)), realpathSync(join(ROOT, "docs/compatibility")), "Archive must be directly under docs/compatibility");
  assert(target.endsWith(".json"));
  const retained = directories.map(directory => {
    const reportPath = join(directory, "probe-result.json");
    const instrumentation = [1, 2].map(round => {
      const filename = `instrumentation-${round}.txt`, path = join(directory, filename);
      return { filename, ...fileFacts(path), text: readFileSync(path, "utf8") };
    });
    const record = validateRunRecord(json(reportPath), instrumentation.map(item => item.text));
    return { record, rawReport: fileFacts(reportPath), instrumentation };
  });
  const records = retained.map(item => item.record), summary = summarizeRecords(records);
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  assert.equal(git.status, 0);
  const archive = { schemaVersion: 1, kind: "archived-test-only-application-process-probes",
    archivedAt: new Date().toISOString(), projectBaseCommit: git.stdout.trim(),
    passed: true, distributionReady: false, pluginBinderExercised: false, productionReleaseAcceptance: false,
    scope: `Two process-restarted rounds of the fixed ${PROBE_IDS.length}-probe test-only application suite per native environment. Not the full syscall/API/FD, plugin Binder or Release matrix.`,
    sourceBinding: "Current canonical inputs must match the retained build receipt. Raw instrumentation is independently revalidated and bound below; no historical report or runtime bytes are rewritten.",
    officialMinimumApi: 33, inputs: inputFacts(),
    archiveValidator: { path: "tools/bun-runtime/experimental/api28/app-probe/archive-probe.mjs", ...fileFacts(new URL(import.meta.url)) },
    summary, probes, build: records[0].build,
    reports: retained.map(({ record, ...raw }) => { const { build, ...run } = record; return { ...raw, ...run }; }),
  };
  writeFileSync(target, JSON.stringify(archive, null, 2) + "\n", { flag: "wx" });
  console.log(`Archived ${summary.passedProbes}/${summary.totalProbes} application probes: ${target}`);
  return archive;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [output, ...directories] = process.argv.slice(2);
  assert(output && directories.length > 0, "Usage: node archive-probe.mjs <new-report.json> <run-directory>...");
  archiveProbe(output, directories);
}
