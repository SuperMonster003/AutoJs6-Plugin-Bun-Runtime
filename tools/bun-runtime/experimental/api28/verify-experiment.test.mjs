import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { verifyExperiment } from "./verify-experiment.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));

test("the checked-in API 28 experiment backport passes offline verification", () => {
  const result = verifyExperiment(experimentRoot);
  assert.equal(result.buildReady, false);
  assert.equal(result.distributionReady, false);
  assert.equal(result.abiCount, 2);
  assert.equal(result.referencePatchCount, 5);
  assert.equal(result.materializedPatchCount + result.missingReferencePatchCount, 5);
  assert.equal(result.downstreamPatchCount, 6);
  assert.equal(result.lockedGithubArchiveCount, 19);
  assert.equal(result.lockedToolchainDownloadCount, 17);
  assert.equal(result.lockedToolchainBuildArtifactCount, 12);
  assert.equal(result.lockedToolchainProvenanceCount, 5);
  assert.equal(result.cargoRegistryPackageCount, 181);
  assert.equal(result.bunIntegrityEntryCount, 172);
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

test("buildReady cannot be enabled while build and runtime blockers remain", () => {
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

test("a downstream patch must match its locked digest", () => {
  withExperimentCopy((copy) => {
    const patchPath = resolve(
      copy,
      "patches/downstream/0005-Set-SA_RESTART-on-the-SIGSYS-handler.patch",
    );
    writeFileSync(patchPath, `${readFileSync(patchPath, "utf8")}\n`);
    assert.throws(() => verifyExperiment(copy), /downstream patch 5: byte count/);
  });
});

test("a downstream patch cannot claim a different upstream diff", () => {
  withExperimentCopy((copy) => {
    const seriesPath = resolve(copy, "patches/series.lock.json");
    const series = JSON.parse(readFileSync(seriesPath, "utf8"));
    series.downstreamBackport.patches[2].stablePatchId = series.upstreamReferencePatches[1].stablePatchId;
    writeFileSync(seriesPath, `${JSON.stringify(series, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /downstream patch 3: stablePatchId/);
  });
});

test("an unlisted downstream patch is rejected", () => {
  withExperimentCopy((copy) => {
    const patchPath = resolve(copy, "patches/downstream/unreviewed.patch");
    writeFileSync(patchPath, "unreviewed\n");
    assert.throws(() => verifyExperiment(copy), /unlisted patch file/);
  });
});

test("a dependency source cannot regress to a movable tag", () => {
  withExperimentCopy((copy) => {
    const sourcePath = resolve(copy, "source-inputs.lock.json");
    const sources = JSON.parse(readFileSync(sourcePath, "utf8"));
    sources.activeDependencies.find((dependency) => dependency.name === "brotli").revision = "v1.1.0";
    writeFileSync(sourcePath, `${JSON.stringify(sources, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /revision must be an immutable full commit/);
  });
});

test("a GitHub source archive cannot have a pending SHA-256", () => {
  withExperimentCopy((copy) => {
    const sourcePath = resolve(copy, "source-inputs.lock.json");
    const sources = JSON.parse(readFileSync(sourcePath, "utf8"));
    sources.activeDependencies.find((dependency) => dependency.name === "zlib").sha256 = "pending";
    writeFileSync(sourcePath, `${JSON.stringify(sources, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /dependency zlib: invalid archive SHA-256/);
  });
});

test("a prebuilt dependency must retain its authoritative SHA-256", () => {
  withExperimentCopy((copy) => {
    const sourcePath = resolve(copy, "source-inputs.lock.json");
    const sources = JSON.parse(readFileSync(sourcePath, "utf8"));
    sources.activeDependencies.find((dependency) => dependency.name === "WebKit").variants[0].sha256 = "pending";
    writeFileSync(sourcePath, `${JSON.stringify(sources, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /WebKit\/arm64-v8a: invalid SHA-256/);
  });
});

test("the container base digest cannot drift", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "experiment.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.toolchain.host.containerDigest = "sha256:" + "0".repeat(64);
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /toolchain\.host\.containerDigest/);
  });
});

test("a direct toolchain download cannot have a pending SHA-256", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "toolchain-inputs.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.directDownloads.find((artifact) => artifact.id === "node-24.3.0-linux-x64").sha256 = "pending";
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /node-24\.3\.0-linux-x64: invalid SHA-256/);
  });
});

test("the mutable host package layer cannot be reported as complete", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "toolchain-inputs.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.hostPackageLayer.status = "locked";
    lock.readiness.hostPackageLayerLocked = true;
    lock.readiness.complete = true;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /host package layer status/);
  });
});

test("every Cargo registry package must retain a Cargo.lock checksum", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "build-network-inputs.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.cargo.registrySha256Count -= 1;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /Cargo registry SHA-256 count/);
  });
});

test("the unmaterialized build-network closure cannot be reported complete", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "build-network-inputs.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.readiness.complete = true;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /build network lock completeness/);
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
