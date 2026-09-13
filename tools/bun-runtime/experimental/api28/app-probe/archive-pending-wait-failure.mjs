import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { HERE, ROOT, fileFacts, inputFacts, json } from "./probe-common.mjs";
import { environmentKey } from "./archive-probe.mjs";
import { validatePendingWaitFailureRecord } from "./pending-wait-failure.mjs";

export function archivePendingWaitFailure(output, directories) {
  const target = resolve(output);
  assert.equal(realpathSync(dirname(target)), realpathSync(join(ROOT, "docs/compatibility")));
  assert(target.endsWith(".json") && directories.length > 0);
  const reports = directories.map(directory => {
    const path = join(directory, "probe-result.json"), record = json(path);
    const instrumentation = [1,2].map(round => {
      const filename = `instrumentation-${round}.txt`, raw = join(directory,filename);
      return { filename, ...fileFacts(raw), text: readFileSync(raw,"utf8") };
    });
    validatePendingWaitFailureRecord(record, instrumentation.map(item => item.text));
    assert.deepEqual(record.build.inputs, inputFacts(), "a historical failure cannot be archived as a current-source run");
    return { ...record, rawReport: fileFacts(path), instrumentation };
  });
  assert.equal(new Set(reports.map(r => environmentKey(r.runs[0].environment))).size, reports.length);
  reports.forEach(r => assert.deepEqual(r.build, reports[0].build));
  const git = spawnSync("git", ["rev-parse","HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  assert.equal(git.status,0);
  const rounds = reports.length*2;
  const archive = { schemaVersion: 1, kind: "archived-pending-wait-failure", archivedAt: new Date().toISOString(),
    projectBaseCommit: git.stdout.trim(), passed: false, distributionReady: false, pluginBinderExercised: false,
    productionReleaseAcceptance: false, officialMinimumApi: 33,
    scope: "Fixed 33-probe suite: original 31 pass; both pending-SIGSYS modes preserve the pending signal on return from spawn but fail after the first asynchronous child wait with early JS delivery. A failed gate, never expected-failure acceptance.",
    summary: { environments: reports.length, rounds, probesPerRound: 33, totalProbes: rounds*33,
      passedProbes: rounds*31, failedProbes: rounds*2, original31PassedProbes: rounds*31, pendingAsyncPassedProbes: 0 },
    inputs: inputFacts(), probes: json(join(HERE,"probes.json")), build: reports[0].build,
    validators: ["archive-pending-wait-failure.mjs","pending-wait-failure.mjs"].map(name => ({
      path: "tools/bun-runtime/experimental/api28/app-probe/"+name, ...fileFacts(join(HERE,name)) })),
    reports: reports.map(({build,...record}) => record),
  };
  writeFileSync(target, JSON.stringify(archive,null,2)+"\n", { flag:"wx" });
  console.log(`Archived ${archive.summary.failedProbes} pending-signal failures; gate remains failed.`);
  return archive;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [output,...directories] = process.argv.slice(2); assert(output && directories.length);
  archivePendingWaitFailure(output,directories);
}
