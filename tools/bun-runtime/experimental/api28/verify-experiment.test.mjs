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
  assert.equal(result.buildReady, true);
  assert.equal(result.distributionReady, false);
  assert.equal(result.abiCount, 2);
  assert.equal(result.referencePatchCount, 5);
  assert.equal(result.materializedPatchCount + result.missingReferencePatchCount, 5);
  assert.equal(result.downstreamPatchCount, 6);
  assert.equal(result.lockedGithubArchiveCount, 19);
  assert.equal(result.lockedToolchainDownloadCount, 17);
  assert.equal(result.lockedToolchainBuildArtifactCount, 12);
  assert.equal(result.lockedToolchainProvenanceCount, 5);
  assert.equal(result.lockedHostPackageCount, 155);
  assert.equal(result.lockedHostPackageBytes, 422223096);
  assert.equal(result.hostImageManifestDigest, "sha256:8f2f92e61f13defcfc91cd4a3722bbb55edced4163c6277fbc6375d05b6731aa");
  assert.equal(result.cargoRegistryPackageCount, 206);
  assert.equal(result.lockedCargoArchiveBytes, 28919277);
  assert.equal(result.bunIntegrityEntryCount, 172);
  assert.equal(result.bunRegistryPackageCount, 125);
  assert.equal(result.lockedBunArchiveBytes, 31498870);
  assert.equal(result.reproducibleRuntimeArtifactCount, 2);
  assert.deepEqual(
    result.reproducibleRuntimeArtifacts.map((artifact) => [artifact.abi, artifact.sha256]),
    [
      ["arm64-v8a", "37bb5553c999ba8bc981199dadc5e3cfd9a476a2d4ebb8565132db83728a2dc6"],
      ["x86_64", "b079388f098c8f40cb14be7a6d343cf8fcb56d3d6694885e1b301f2cf7f89036"],
    ],
  );
  assert.equal(result.packagedLicenseCount, 5);
  assert.equal(result.lockedDistributionSourceArchiveCount, 351);
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

test("buildReady cannot be disabled after every build-input blocker is resolved", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "experiment.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.identity.buildReady = false;
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

test("the locked host package layer cannot regress to unresolved", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "toolchain-inputs.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.hostPackageLayer.status = "unresolved";
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

test("the completed build-network closure cannot lose its configure and Ninja evidence", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "build-network-inputs.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.readiness.offlineBuildNetworkTestPassed = false;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /offline network test readiness/);
  });
});

test("a locked host deb cannot lose its SHA-256", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "host-package-inputs.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.packages[0].sha256 = "pending";
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /invalid SHA-256/);
  });
});

test("host image evidence rejects drift in an input script", () => {
  withExperimentCopy((copy) => {
    const installerPath = resolve(copy, "install-host-packages.sh");
    writeFileSync(installerPath, `${readFileSync(installerPath, "utf8")}\n`);
    assert.throws(() => verifyExperiment(copy), /install-host-packages\.sh: host image input byte count/);
  });
});

test("Bun registry closure requires its locked network-disabled replay", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "bun-inputs.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.readiness.networkDisabledReplayPassed = false;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /network-disabled replay has not passed/);
  });
});

test("runtime evidence requires two identical clean-build digests", () => {
  withExperimentCopy((copy) => {
    const evidencePath = resolve(copy, "runtime-evidence.json");
    const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
    evidence.artifacts[0].repeatSha256[1] = "0".repeat(64);
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /repeat SHA-256 evidence drifted/);
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
