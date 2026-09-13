import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, fileFacts, json } from "../app-probe/probe-common.mjs";
import { HERE, traceInputs } from "./build-trace.mjs";
import { validateWatchTraceRecord } from "./watch-trace-evidence.mjs";

export function archiveWatchTrace(output, directories) {
  const target = resolve(output);
  assert.equal(realpathSync(dirname(target)), realpathSync(join(ROOT, "docs/compatibility")));
  assert(target.endsWith(".json") && directories.length > 0);
  const records = directories.map(directory => {
    const path = join(directory, "trace-result.json"), record = validateWatchTraceRecord(json(path));
    assert.deepEqual(record.build.inputs, traceInputs(), "Diagnostic source drift");
    const instrumentation = [1, 2].map(round => {
      const filename = `instrumentation-${round}.txt`, raw = join(directory, filename);
      assert.equal(readFileSync(raw, "utf8"), record.runs[round - 1].raw);
      return { filename, ...fileFacts(raw) };
    });
    return { ...record, rawReport: fileFacts(path), instrumentation };
  });
  const identity = r => JSON.stringify([r.api, r.abi, r.pageSize, r.model, r.fingerprint, r.kernel]);
  assert.equal(new Set(records.map(r => identity(r.runs[0].report))).size, records.length);
  records.forEach(r => assert.deepEqual(r.build, records[0].build));
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  assert.equal(git.status, 0);
  const archive = { schemaVersion: 1, kind: "archived-watch-reload-trace-observations", archivedAt: new Date().toISOString(),
    projectBaseCommit: git.stdout.trim(), compatibilityAcceptance: false, countedInAcceptance: false,
    distributionReady: false, productionReleaseAcceptance: false, rootCauseResolved: false,
    scope: "Fixed unchanged watch fixtures, two rounds of native/TRAP plain/traced pairs per native ARM64 4 KiB environment. These bounded observations did not reproduce SIGABRT; they do not resolve or replace the original API 28 abort/clone EAGAIN failure, prove stability, or add baseline compatibility passes.",
    summary: { environments: records.length, rounds: records.length * 2,
      plainObservations: records.length * 4, tracedObservations: records.length * 4,
      actualReloads: records.length * 16, images: records.length * 24,
      tracedOrdinarySigsysDeliveries: records.length * 12, observedAborts: 0, compatibilityPasses: 0 },
    originalFailure: { filename: "2026-09-13-m3-watch-reload-api28-abort-failure.json",
      ...fileFacts(join(ROOT, "docs/compatibility/2026-09-13-m3-watch-reload-api28-abort-failure.json")) },
    limits: "Fatal-stop snapshots observe bounded registers/frame-pointer candidates, mappings and process/memory facts without writing registers or changing signal delivery. No fatal stop occurred in these Android runs, so no Android abort stack or contemporaneous resource-limit cause was captured. Host SIGABRT controls validate the observer separately; they are not a reproduction of the original Android failure.",
    inputs: traceInputs(), validators: ["archive-watch-trace.mjs", "watch-trace-evidence.mjs"].map(name => ({
      path: "tools/bun-runtime/experimental/api28/signal-trace/" + name, ...fileFacts(join(HERE, name)) })), records,
  };
  writeFileSync(target, JSON.stringify(archive, null, 2) + "\n", { flag: "wx" });
  console.log(`Archived ${archive.summary.tracedObservations} paired watch traces; original abort remains unresolved.`);
  return archive;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [output, ...directories] = process.argv.slice(2); assert(output && directories.length);
  archiveWatchTrace(output, directories);
}
