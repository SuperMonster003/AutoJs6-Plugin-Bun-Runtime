import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { HERE, ROOT, hash, fileFacts, inputFacts, json, verifyProbeApk } from "./probe-common.mjs";
import { environmentKey } from "./archive-probe.mjs";
import { WATCH_RELOAD_MODES } from "./watch-reload-evidence.mjs";
import { validateWatchReloadFailureRecord } from "./watch-reload-failure.mjs";

export function archiveWatchReloadFailure(output, apkDirectory, snapshotPath, directories) {
  const target = resolve(output);
  assert.equal(realpathSync(dirname(target)), realpathSync(join(ROOT, "docs/compatibility")));
  assert(target.endsWith(".json") && directories.length > 0);
  const build = json(join(apkDirectory, "probe-build.json")), probes = json(join(HERE, "probes.json"));
  const current = inputFacts(), snapshots = snapshotPath === "current" ? [] : json(snapshotPath);
  assert.deepEqual(build.inputs.map(p => p.path), current.map(p => p.path), "exact compiled input inventory");
  const supersededSourceInputs = [];
  for (const input of build.inputs) {
    const now = current.find(p => p.path === input.path);
    if (JSON.stringify(input) === JSON.stringify(now)) continue;
    assert(input.path.endsWith("/watch-reload-evidence.mjs"), "only the retained early watch validator differs");
    const prior = snapshots.find(p => p.path === input.path);
    assert(prior && typeof prior.text === "string" && !prior.text.includes("\r"));
    assert.deepEqual({ path: prior.path, bytes: Buffer.byteLength(prior.text), sha256: hash(prior.text) }, input);
    supersededSourceInputs.push(prior);
  }
  for (const apk of build.apks) verifyProbeApk(join(apkDirectory, apk.filename), apk, build.runtimes, build.supervisor);
  const reports = directories.map(directory => {
    const path = join(directory, "probe-result.json"), record = json(path);
    assert.deepEqual(record.build, build, "separate APK batches require separate archives");
    const instrumentation = [1,2].map(round => {
      const filename = `instrumentation-${round}.txt`, raw = join(directory,filename);
      return { filename, ...fileFacts(raw), text: readFileSync(raw,"utf8") };
    });
    validateWatchReloadFailureRecord(record, instrumentation.map(item => item.text), probes);
    const { build: omitted, ...run } = record;
    return { ...run, rawReport: fileFacts(path), instrumentation };
  });
  assert.equal(new Set(reports.map(r => environmentKey(r.runs[0].environment))).size, reports.length);
  const results = reports.flatMap(r => r.runs.flatMap(run => run.probes));
  const watch = results.filter(p => Object.hasOwn(WATCH_RELOAD_MODES,p.id));
  const git = spawnSync("git",["rev-parse","HEAD"],{cwd:ROOT,encoding:"utf8",windowsHide:true});assert.equal(git.status,0);
  const archive = { schemaVersion: 1, kind: "archived-watch-reload-failure", archivedAt: new Date().toISOString(),
    projectBaseCommit: git.stdout.trim(), passed: false, distributionReady: false,
    pluginBinderExercised: false, productionReleaseAcceptance: false, officialMinimumApi: 33,
    scope: "Fixed 35-probe suite: original 33 pass; watch reload retains a non-CLOEXEC sentinel when close_range CLOEXEC is unavailable. Two actual same-PID reloads and ordinary SIGSYS controls are preserved. Failed compatibility gate; no native fix or Release acceptance.",
    summary: { environments: reports.length, rounds: reports.length*2, probesPerRound: 35,
      totalProbes: results.length, passedProbes: results.filter(p=>p.passed).length, failedProbes: results.filter(p=>!p.passed).length,
      original33PassedProbes: results.filter(p=>!Object.hasOwn(WATCH_RELOAD_MODES,p.id)).length,
      watchModes: watch.length, watchPassedModes: watch.filter(p=>p.passed).length, watchFailedModes: watch.filter(p=>!p.passed).length,
      actualReloadTransitions: watch.length*2, watchedImages: watch.length*3,
      leakedSentinelObservations: watch.flatMap(p=>p.watchReloadEvidence.rows.slice(1)).filter(r=>r.inherited[1]).length,
      ordinarySigsysDeliveries: watch.length*3, ownedWatchedChildrenReaped: watch.length },
    inputs: build.inputs, probes, build, supersededSourceInputs,
    sourceBinding: "Exact APK receipts and complete runtime bytes are rechecked. Every unchanged input matches the repository; earlier watch-validator text is retained with its original canonical hash. Device fixture/Java/definitions/budgets are identical across these separately archived builds.",
    validators: ["archive-watch-reload-failure.mjs","watch-reload-failure.mjs","watch-reload-evidence.mjs"].map(name=>({
      path:"tools/bun-runtime/experimental/api28/app-probe/"+name,...fileFacts(join(HERE,name))})), reports };
  writeFileSync(target,JSON.stringify(archive,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify(archive.summary)); return archive;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [output,apks,snapshots,...directories]=process.argv.slice(2);
  assert(output&&apks&&snapshots&&directories.length);archiveWatchReloadFailure(output,apks,snapshots,directories);
}
