import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { verifyBuildInputs, verifyExperiment } from "./verify-experiment.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));

test("the reload fix requires its reviewed origin, exact path and complete source context", () => {
  for (const change of [p => { p.origin = "autojs6-spawn-fd"; },
    p => { p.affectedPaths = ["src/jsc/bindings/bun-spawn.cpp"]; },
    p => { p.formatPatchAdditionalOptions = ["--unified=20"]; },
    p => { p.sourceCommit = "0".repeat(40); }]) {
    withExperimentCopy(copy => {
      const path = resolve(copy, "patches/series.lock.json"), series = JSON.parse(readFileSync(path, "utf8"));
      change(series.downstreamBackport.patches[12]);
      writeFileSync(path, JSON.stringify(series, null, 2) + "\n");
      assert.throws(() => verifyBuildInputs(copy), /origin|affectedPaths|complete reload source context|sourceCommit/);
    });
  }
});

test("the epoll-mask patch requires its reviewed origin, path, context and uSockets license", () => {
  for (const change of [p => { p.origin = "autojs6-pending-spawn-mask"; },
    p => { p.affectedPaths = ["src/platform/linux.rs"]; },
    p => { p.formatPatchAdditionalOptions = ["--unified=20"]; },
    p => { p.sourceCommit = "0".repeat(40); },
    p => { p.licenseImpact = "MIT only"; }]) {
    withExperimentCopy(copy => {
      const path = resolve(copy, "patches/series.lock.json"), series = JSON.parse(readFileSync(path, "utf8"));
      change(series.downstreamBackport.patches[11]);
      writeFileSync(path, JSON.stringify(series, null, 2) + "\n");
      assert.throws(() => verifyBuildInputs(copy), /origin|affectedPaths|complete epoll source context|sourceCommit|Apache-2.0/);
    });
  }
});

test("the pending-mask patch requires the reviewed origin, source path and complete source hunk", () => {
  for (const change of [p => { p.origin = "autojs6-blocked-pidfd"; },
    p => { p.affectedPaths = ["src/sys/linux_syscall.rs"]; },
    p => { p.formatPatchAdditionalOptions = ["--unified=20"]; },
    p => { p.sourceCommit = "0".repeat(40); }]) {
    withExperimentCopy(copy => {
      const path = resolve(copy, "patches/series.lock.json"), series = JSON.parse(readFileSync(path, "utf8"));
      change(series.downstreamBackport.patches[10]);
      writeFileSync(path, JSON.stringify(series, null, 2) + "\n");
      assert.throws(() => verifyBuildInputs(copy), /origin|affectedPaths|complete spawn source context|sourceCommit/);
    });
  }
});

test("the checked-in API 28 experiment backport passes offline verification", () => {
  const result = verifyExperiment(experimentRoot);
  assert.equal(result.buildReady, true);
  assert.equal(result.distributionReady, false);
  assert.equal(result.abiCount, 2);
  assert.equal(result.referencePatchCount, 5);
  assert.equal(result.materializedPatchCount + result.missingReferencePatchCount, 5);
  assert.equal(result.downstreamPatchCount, 13);
  assert.equal(result.runtimeEvidenceVerified, true);
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
      ["arm64-v8a", "c8f2513f3bea1a37d5c34c1f84722b0b4563363cc121f7a0f4eee8aa15427160"],
      ["x86_64", "cb3104fbd41fb55ac301a177756b41fa57065e2cf18fa836bafb2b13cf4043ac"],
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

test("build-input verification never presents old or missing binaries as verified evidence", () => {
  withExperimentCopy((copy) => {
    const lockPath = resolve(copy, "experiment.lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.identity.status = "source-locked-awaiting-runtime-evidence";
    lock.identity.runtimeProduced = false;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyBuildInputs(copy), /build-and-runtime-evidence: resolved/);
    lock.knownBlockers.find(b => b.id === "build-and-runtime-evidence").resolved = false;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    for (const name of ["runtime-evidence.json", "distribution-source.lock.json"]) rmSync(resolve(copy, name));
    const inputs = verifyBuildInputs(copy);
    assert.equal(inputs.buildReady, true);
    assert.equal(inputs.distributionReady, false);
    assert.equal(inputs.runtimeEvidenceVerified, false);
    assert.equal(Object.hasOwn(inputs, "reproducibleRuntimeArtifacts"), false);
    assert.throws(() => verifyExperiment(copy), /identity.status/);
    lock.identity.status = "reproducible-runtime-static-audit-complete";
    lock.identity.runtimeProduced = true;
    lock.knownBlockers.find(b => b.id === "build-and-runtime-evidence").resolved = true;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(() => verifyExperiment(copy), /runtime-evidence.json/);
  });
});

test("build-input verification still rejects source, toolchain and boundary drift", () => {
  for (const mutation of ["patch", "toolchain", "distribution", "identity"]) {
    withExperimentCopy((copy) => {
      if (mutation === "patch") {
        const series = JSON.parse(readFileSync(resolve(copy, "patches/series.lock.json"), "utf8"));
        const path = resolve(copy, "patches", series.downstreamBackport.patches.at(-1).path);
        writeFileSync(path, `${readFileSync(path, "utf8")}\n`);
      } else {
        const path = resolve(copy, "experiment.lock.json");
        const lock = JSON.parse(readFileSync(path, "utf8"));
        if (mutation === "toolchain") lock.toolchain.host.buildImageManifestDigest = "sha256:" + "0".repeat(64);
        if (mutation === "distribution") lock.identity.distributionReady = true;
        if (mutation === "identity") lock.identity.runtimeProduced = "false";
        writeFileSync(path, `${JSON.stringify(lock, null, 2)}\n`);
      }
      assert.throws(() => verifyBuildInputs(copy), /byte count|buildImageManifestDigest|distributionReady|runtimeProduced/);
    });
  }
});

test("upstream equivalence must cover every upstream path at the exact compatibility prefix", () => {
  for (const mutation of ["path", "prefix", "scope"]) {
    withExperimentCopy((copy) => {
      const path = resolve(copy, "patches/series.lock.json");
      const series = JSON.parse(readFileSync(path, "utf8"));
      const equivalence = series.downstreamBackport.upstreamEquivalence;
      if (mutation === "path") equivalence.comparisonPaths = equivalence.comparisonPaths.filter((p) => !p.endsWith("c-bindings.cpp"));
      if (mutation === "prefix") equivalence.downstreamPrefixHeadCommit = series.downstreamBackport.headCommit;
      if (mutation === "scope") equivalence.scope = "final-tree";
      writeFileSync(path, `${JSON.stringify(series, null, 2)}\n`);
      assert.throws(() => verifyBuildInputs(copy), /comparisonPaths|prefix head|equivalence scope/);
    });
  }
});

test("the scoped-open fix requires its reviewed origin and all three source paths", () => {
  for (const mutation of ["origin", "path", "missing"]) {
    withExperimentCopy(copy => {
      const path = resolve(copy, "patches/series.lock.json");
      const series = JSON.parse(readFileSync(path, "utf8"));
      const patch = series.downstreamBackport.patches[8];
      if (mutation === "origin") patch.origin = "autojs6-spawn-fd";
      if (mutation === "path") patch.affectedPaths = patch.affectedPaths.slice(0, 2);
      if (mutation === "missing") series.downstreamBackport.patches.pop();
      writeFileSync(path, JSON.stringify(series, null, 2) + "\n");
      assert.throws(() => verifyBuildInputs(copy), /origin|affectedPaths|patches length/);
    });
  }
});

test("the spawn fix requires its reviewed origin and both exact source paths", () => {
  for (const mutation of ["origin", "path", "missing"]) {
    withExperimentCopy((copy) => {
      const path = resolve(copy, "patches/series.lock.json");
      const series = JSON.parse(readFileSync(path, "utf8"));
      const patch = series.downstreamBackport.patches[7];
      if (mutation === "origin") patch.origin = "autojs6-startup-cloexec";
      if (mutation === "path") patch.affectedPaths = ["src/jsc/bindings/bun-spawn-fd.h"];
      if (mutation === "missing") series.downstreamBackport.patches.splice(7, 1);
      writeFileSync(path, `${JSON.stringify(series, null, 2)}\n`);
      assert.throws(() => verifyBuildInputs(copy), /origin|affectedPaths|patches length/);
    });
  }
});
