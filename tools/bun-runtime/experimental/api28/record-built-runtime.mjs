import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectBuiltRuntime, verifyRuntimeEvidenceManifest } from "./verify-built-runtime.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../..");
const HEAD = "e8b1296169a8e6f20c81e926dba6448afb25cd11";
const TREE = "7d715cd177328d44b12b6346bcf0e07e835b3578";
const ABIS = ["arm64-v8a", "x86_64"];
const facts = path => {
  const bytes = readFileSync(path);
  return { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
};
const json = path => JSON.parse(readFileSync(path, "utf8"));
function git(path, ...args) {
  const result = spawnSync("git", ["-C", path, ...args], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

// Collect only completed drivers; never build, resume, rewrite a receipt or infer
// an exit from Ninja output. Original local records and logs remain unchanged.
export function recordBuiltRuntime({ checkouts, driverRecords, output }) {
  assert.equal(process.platform, "linux", "collect native POSIX mode facts on Linux");
  assert.equal(checkouts.length, 2); assert.equal(driverRecords.length, 2);
  checkouts = checkouts.map(path => realpathSync(path));
  driverRecords = driverRecords.map(path => realpathSync(path));
  assert.equal(new Set(checkouts).size, 2); assert.equal(new Set(driverRecords).size, 2);
  const target = join(realpathSync(dirname(resolve(output))), basename(output)), rel = relative(ROOT, target);
  assert(rel.startsWith(".." + sep) && relative(target, ROOT).startsWith(".." + sep), "output must be outside project and ancestors");
  const old = json(join(ROOT, "docs/compatibility/2026-09-13-m2-pending-wait-runtime-evidence.json"));
  const repositoryInputs = old.build.repositoryInputs.map(({ path }) => ({ path, ...facts(join(HERE, path)) }));
  const driverSource = facts(join(dirname(driverRecords[0]), "drive-build.py"));
  const inspections = [], runs = [];
  for (let index = 0; index < 2; index++) {
    const record = json(driverRecords[index]), checkout = checkouts[index], run = index + 1;
    assert.equal(record.schema, 1); assert.equal(record.run, run); assert.equal(record.state, "complete");
    assert.equal(record.exitCode, 0, "actual captured build exit required");
    for (const field of ["freshCheckout", "cleanBefore", "cleanAfter", "recipesUnchanged"]) assert.equal(record[field], true);
    assert.equal(record.head, HEAD); assert.equal(record.headAfter, HEAD);
    assert.equal(record.tree, TREE); assert.equal(record.treeAfter, TREE);
    assert.equal(git(checkout, "rev-parse", "HEAD"), HEAD);
    assert.equal(git(checkout, "rev-parse", "HEAD^{tree}"), TREE);
    assert.equal(git(checkout, "status", "--porcelain=v1", "--untracked-files=all"), "");
    const command = record.command;
    assert.equal(realpathSync(command[1]), realpathSync(join(HERE, "run-locked-build.mjs")));
    assert.deepEqual(command.slice(2, 5), ["--execute", "--abi", "all"]);
    assert.equal(command[5], "--bun-repository"); assert.equal(realpathSync(command[6]), checkout);
    assert.deepEqual(command.filter((value, i) => i >= 7 && i % 2 === 1), ["--bun-input-directory", "--cargo-input-directory",
      "--source-prefetch-directory", "--toolchain-input-directory", "--toolchain-install-directory", "--android-ndk-root"]);
    assert.equal(command.length, 19);
    assert.deepEqual(Object.keys(record.recipes), [...repositoryInputs.map(input => input.path), "experiment.lock.json",
      "verify-experiment.mjs", "materialize-cargo-inputs.mjs", "materialize-bun-inputs.mjs",
      "materialize-source-inputs.mjs", "materialize-toolchain-inputs.mjs"], "complete captured build recipe inventory required");
    for (const [path, value] of Object.entries(record.recipes)) assert.deepEqual(facts(join(HERE, path)), value, path + " changed since build");
    const log = facts(join(dirname(driverRecords[index]), `native-run-${run}.log`));
    assert.deepEqual(log, record.log);
    assert.deepEqual(facts(join(dirname(driverRecords[index]), "drive-build.py")), driverSource);
    assert.deepEqual(record.artifacts.map(a => a.abi), ABIS);
    const pair = ABIS.map((abi, i) => {
      const directory = join(checkout, "build/autojs6-api28", abi), inspected = inspectBuiltRuntime(join(directory, "bun"));
      assert.deepEqual({ bytes: inspected.bytes, sha256: inspected.sha256 },
        { bytes: record.artifacts[i].bytes, sha256: record.artifacts[i].sha256 });
      assert.deepEqual(facts(join(directory, ".ninja_log")), record.artifacts[i].ninjaLog);
      const edges = readFileSync(join(directory, ".ninja_log"), "utf8").split(/\r?\n/).filter(line => {
        const fields = line.split("\t"); return fields.length === 5 && ["bun-profile", "bun-profile.linker-map", "bun"].includes(fields[3]);
      });
      assert.deepEqual(edges, record.artifacts[i].finalEdges);
      return inspected;
    });
    inspections.push(pair);
    runs.push({ run, head: record.head, tree: record.tree, headAfter: record.headAfter, treeAfter: record.treeAfter,
      freshCheckout: true, cleanBefore: true, cleanAfter: true, recipesUnchanged: true,
      entry: "run-locked-build.mjs", execute: true, abi: "all", exitCode: record.exitCode,
      buildStartedAt: record.buildStartedAt, buildFinishedAt: record.buildFinishedAt,
      receipt: facts(driverRecords[index]), log, repositoryInputs, artifacts: record.artifacts });
  }
  assert.deepEqual(inspections[0], inspections[1], "independent complete ELF outputs must match");
  const evidence = { ...old, schemaVersion: 3,
    source: { ...old.source, downstreamHeadCommit: HEAD },
    build: { evidenceDate: new Date().toISOString().slice(0, 10), hostImageManifestDigest: old.build.hostImageManifestDigest,
      hostImageConfigDigest: old.build.hostImageConfigDigest, entry: "run-locked-build.mjs", cleanBuildCount: 2,
      bothRunsExitCode: 0, byteForByteIdentical: true, containerPolicy: old.build.containerPolicy, repositoryInputs,
      notes: "Two new independent clean Bun checkouts, each both ABIs, completed with actual captured driver exits 0. Complete logs, recipes, clean source heads/trees and final Ninja edges are bound separately. The exact locked upstream Android WebKit/JSC/ICU bundle is reused; no new WebKit or ICU builds are claimed. No historical device acceptance is transferred.",
      completion: { method: "captured-build-driver-exits", originalDriverExitCodes: [0, 0], driverSource, runs } },
    artifacts: ABIS.map((abi, i) => ({ abi, filename: `bun-${abi}`, ...inspections[0][i],
      repeatSha256: inspections.map(pair => pair[i].sha256) })) };
  verifyRuntimeEvidenceManifest(evidence);
  mkdirSync(target); // no recursive creation or overwrite of an earlier record
  for (let run = 1; run <= 2; run++) {
    mkdirSync(join(target, `run-${run}`));
    for (const abi of ABIS) copyFileSync(join(checkouts[run - 1], "build/autojs6-api28", abi, "bun"), join(target, `run-${run}`, `bun-${abi}`));
  }
  writeFileSync(join(target, "runtime-evidence.json"), JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  return evidence;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [run1, run2, driver1, driver2, output, ...extra] = process.argv.slice(2);
  assert(run1 && run2 && driver1 && driver2 && output && !extra.length,
    "Usage: node record-built-runtime.mjs <checkout-1> <checkout-2> <driver-1.json> <driver-2.json> <new-output-directory>");
  const evidence = recordBuiltRuntime({ checkouts: [run1, run2], driverRecords: [driver1, driver2], output });
  console.log(JSON.stringify({ source: evidence.source, artifacts: evidence.artifacts.map(({abi, bytes, sha256}) => ({abi, bytes, sha256})) }, null, 2));
}
