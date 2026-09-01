import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { verifyExperiment } from "./verify-experiment.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));

test("the checked-in API 28 experiment scaffold passes offline verification", () => {
  const result = verifyExperiment(experimentRoot);
  assert.equal(result.buildReady, false);
  assert.equal(result.distributionReady, false);
  assert.equal(result.abiCount, 2);
  assert.equal(result.referencePatchCount, 5);
  assert.equal(result.materializedPatchCount + result.missingReferencePatchCount, 5);
});

test("a moving PR patch URL is rejected", () => {
  withExperimentCopy((copy) => {
    const seriesPath = resolve(copy, "patches/series.lock.json");
    const series = JSON.parse(readFileSync(seriesPath, "utf8"));
    series.upstreamReferencePatches[0].url = "https://github.com/oven-sh/bun/pull/39775.patch";
    writeFileSync(seriesPath, `${JSON.stringify(series, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /immutable commit URL/);
  });
});

test("buildReady cannot be enabled while the downstream backport is absent", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "experiment.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.identity.buildReady = true;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /identity\.buildReady/);
  });
});

test("host-specific absolute build paths are rejected", () => {
  withExperimentCopy((copy) => {
    const configPath = resolve(copy, "config/arm64-v8a.configure.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.overrides.buildDir = "C:\\developer\\bun-build";
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /buildDir/);
  });
});

test("a materialized reference patch must match its locked bytes", () => {
  withExperimentCopy((copy) => {
    const patchPath = resolve(copy, "patches/upstream-reference/0001-3c00f0f6.patch");
    writeFileSync(patchPath, "not the locked upstream patch\n");
    assert.throws(() => verifyExperiment(copy), /materialized byte count/);
  });
});

function withExperimentCopy(callback) {
  const parent = mkdtempSync(resolve(tmpdir(), "autojs6-bun-api28-test-"));
  const copy = resolve(parent, "api28");
  try {
    cpSync(experimentRoot, copy, { recursive: true });
    callback(copy);
  } finally {
    rmSync(parent, { force: true, recursive: true });
  }
}
