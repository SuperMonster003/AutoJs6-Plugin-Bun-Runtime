import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve, sep, win32 } from "node:path";
import { fileURLToPath } from "node:url";

import { collectCargoArtifacts } from "./materialize-cargo-inputs.mjs";
import { collectBunArtifacts } from "./materialize-bun-inputs.mjs";
import { collectHostPackageArtifacts } from "./materialize-host-package-inputs.mjs";
import { verifyDistributionSource } from "./verify-distribution-source.mjs";
import { verifyRuntimeEvidenceManifest } from "./verify-built-runtime.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const EXPECTED_UPSTREAM_COMMIT = "34cbb9a40b4bd1bd767d134a7065e66c2432a676";
const EXPECTED_PR_BASE = "01c4e2fd6d94adf2e9157d1e6329c328eb37dfae";
const EXPECTED_PR_HEAD = "d6171ce7e2efa4f3eb3e6f5a099da922df15bc0c";
const EXPECTED_APIS = [28, 29, 30, 31, 32];
const EXPECTED_CONFIG_KEYS = [
  "androidApiLevel",
  "arch",
  "baseline",
  "buildDir",
  "cacheDir",
  "canary",
  "lto",
];
const REQUIRED_FORBIDDEN_ROOTS = [
  "app/src/main/jniLibs",
  "tools/bun-runtime/prebuilt",
  "tools/bun-runtime/runtime.lock.json",
];
const REQUIRED_EVIDENCE = new Map([
  [".buildkite/Dockerfile", "f2bcac12a6b48843a20deca5c7a9fc3ce51f7f89"],
  ["rust-toolchain.toml", "e48bb2731da8046ad2b2a9e4ad408b43c7bc4698"],
  ["scripts/build.ts", "2af7a1ee594287eb3b4d71eabb9a5f76f6e5b05f"],
  ["scripts/build/config.ts", "5a20204a4759a14ce5983b8a7ce308f73592baac"],
  ["scripts/build/flags.ts", "184aa86f8fc32c07ebf95224f49b441303dd9c2f"],
  ["scripts/build/profiles.ts", "04a3d46b9c73aee19506a7ea6445b24030371237"],
  ["scripts/build/tools.ts", "c12e7e088a91b04e44ef2dde06464e1662901a2c"],
]);
const EXPECTED_TOOLCHAIN_DOWNLOAD_IDS = [
  "android-ndk-r27c",
  "cmake-3.30.5-linux-x86_64",
  "bootstrap-bun-1.3.13-linux-x64",
  "node-24.3.0-linux-x64",
  "ninja-1.13.2-linux-x86_64",
  "rustup-init-1.29.1-linux-x86_64",
  "rustc-nightly-2026-07-20-linux-x86_64",
  "cargo-nightly-2026-07-20-linux-x86_64",
  "rust-std-nightly-2026-07-20-linux-x86_64",
  "rust-std-nightly-2026-07-20-android-arm64",
  "rust-std-nightly-2026-07-20-android-x86_64",
  "rust-src-nightly-2026-07-20",
  "cmake-3.30.5-sha256-manifest",
  "node-24.3.0-shasums256",
  "rustup-init-1.29.1-sha256",
  "rust-nightly-2026-07-20-channel-manifest",
  "rust-nightly-2026-07-20-channel-manifest-sha256",
];
const ALLOWED_TOOLCHAIN_HOSTS = new Set([
  "dl.google.com",
  "github.com",
  "nodejs.org",
  "pub-5e11e972747a44bf9aaf9394f185a982.r2.dev",
  "static.rust-lang.org",
]);

export function verifyExperiment(baseDirectory = toolDirectory) {
  const inputs = verifyBuildInputs(baseDirectory);
  const root = resolve(baseDirectory);
  const lock = readJson(resolveInside(root, "experiment.lock.json", "experiment lock"));
  requireEqual(lock.identity.status, "reproducible-runtime-static-audit-complete", "identity.status");
  requireEqual(lock.identity.runtimeProduced, true, "identity.runtimeProduced");
  const runtimeEvidenceResult = verifyRuntimeEvidence(root, lock);
  requireEqual(lock.distributionSourceLock, "distribution-source.lock.json", "distributionSourceLock");
  const distributionSourceResult = verifyDistributionSource({ baseDirectory: root });
  return {
    ...inputs,
    runtimeEvidenceVerified: true,
    reproducibleRuntimeArtifactCount: runtimeEvidenceResult.artifacts.length,
    reproducibleRuntimeArtifacts: runtimeEvidenceResult.artifacts,
    packagedLicenseCount: distributionSourceResult.packagedLicenseCount,
    lockedDistributionSourceArchiveCount:
      distributionSourceResult.nativeSourceArchiveCount +
      distributionSourceResult.cargoArchiveCount +
      distributionSourceResult.bunRegistryArchiveCount + 1,
  };
}

// Building a new source revision cannot require evidence from binaries not yet built.
// This result authorizes only the locked build; consumers of binaries use verifyExperiment.
export function verifyBuildInputs(baseDirectory = toolDirectory) {
  const root = resolve(baseDirectory);
  const lock = readJson(resolveInside(root, "experiment.lock.json", "experiment lock"));
  requireEqual(lock.schemaVersion, 1, "experiment.lock.json: schemaVersion");
  requireRecord(lock.identity, "experiment.lock.json: identity");
  requireEqual(lock.identity.variant, "bun-1.4.0-android-api28-patched-experimental", "identity.variant");
  require(typeof lock.identity.runtimeProduced === "boolean", "identity.runtimeProduced must be boolean");
  requireEqual(lock.identity.status, lock.identity.runtimeProduced
    ? "reproducible-runtime-static-audit-complete" : "source-locked-awaiting-runtime-evidence", "identity.status");
  requireEqual(lock.identity.officialArtifact, false, "identity.officialArtifact");
  requireEqual(lock.identity.buildReady, true, "identity.buildReady");
  requireEqual(lock.identity.distributionReady, false, "identity.distributionReady");

  verifyUpstream(lock.upstream);
  verifyToolchain(lock.toolchain);
  verifyOutputPolicy(lock.outputPolicy);
  verifyBuildEntry(root, lock);
  verifyEvidence(lock.sourceEvidence);

  const abiResults = verifyTarget(root, lock.target);
  const seriesPath = resolveInside(root, lock.patchSeries, "patchSeries");
  const series = readJson(seriesPath);
  const patchResult = verifyPatchSeries(dirname(seriesPath), lock, series);
  const sourceInputResult = verifySourceInputs(root, lock, series);
  const toolchainInputResult = verifyToolchainInputs(root, lock);
  const buildNetworkInputResult = verifyBuildNetworkInputs(root, lock, series);
  verifyBlockers(lock.knownBlockers, lock.identity);
  verifyNoRuntimeArtifacts(root);

  return {
    runtimeEvidenceVerified: false,
    variant: lock.identity.variant,
    upstreamCommit: lock.upstream.commit,
    abiCount: abiResults.length,
    referencePatchCount: patchResult.total,
    materializedPatchCount: patchResult.materialized,
    missingReferencePatchCount: patchResult.missing,
    downstreamPatchCount: patchResult.downstream,
    activeDependencyCount: sourceInputResult.active,
    lockedGithubArchiveCount: sourceInputResult.githubArchives,
    lockedPrebuiltCount: sourceInputResult.prebuilt,
    lockedToolchainDownloadCount: toolchainInputResult.directDownloads,
    lockedToolchainBuildArtifactCount: toolchainInputResult.buildArtifacts,
    lockedToolchainProvenanceCount: toolchainInputResult.provenanceDocuments,
    lockedHostPackageCount: toolchainInputResult.hostPackages,
    lockedHostPackageBytes: toolchainInputResult.hostPackageBytes,
    hostImageManifestDigest: toolchainInputResult.hostImageManifestDigest,
    cargoRegistryPackageCount: buildNetworkInputResult.cargoRegistryPackages,
    lockedCargoArchiveBytes: buildNetworkInputResult.cargoArchiveBytes,
    bunIntegrityEntryCount: buildNetworkInputResult.bunIntegrityEntries,
    bunRegistryPackageCount: buildNetworkInputResult.bunRegistryPackages,
    lockedBunArchiveBytes: buildNetworkInputResult.bunArchiveBytes,
    buildReady: lock.identity.buildReady,
    distributionReady: lock.identity.distributionReady,
  };
}

function verifyUpstream(upstream) {
  requireRecord(upstream, "upstream");
  requireEqual(upstream.repository, "https://github.com/oven-sh/bun", "upstream.repository");
  requireEqual(upstream.tag, "bun-v1.4.0", "upstream.tag");
  requireEqual(upstream.commit, EXPECTED_UPSTREAM_COMMIT, "upstream.commit");
  require(SHA1.test(upstream.commit), "upstream.commit must be a full lowercase commit SHA");
  requireEqual(upstream.license, "MIT", "upstream.license");
  requireEqual(
    upstream.licenseFile,
    `https://github.com/oven-sh/bun/blob/${EXPECTED_UPSTREAM_COMMIT}/LICENSE.md`,
    "upstream.licenseFile",
  );
  requireNonEmptyString(upstream.dependencyPolicy, "upstream.dependencyPolicy");
}

function verifyToolchain(toolchain) {
  requireRecord(toolchain, "toolchain");
  requireEqual(toolchain.host?.os, "linux", "toolchain.host.os");
  requireEqual(toolchain.host?.architecture, "x86_64", "toolchain.host.architecture");
  requireEqual(toolchain.host?.containerBase, "ubuntu:20.04", "toolchain.host.containerBase");
  requireEqual(
    toolchain.host?.containerDigest,
    "sha256:8feb4d8ca5354def3d8fce243717141ce31e2c428701f6682bd2fafe15388214",
    "toolchain.host.containerDigest",
  );
  requireEqual(
    toolchain.host?.linuxAmd64ManifestDigest,
    "sha256:c664f8f86ed5a386b0a340d981b8f81714e21a8b9c73f658c4bea56aa179d54a",
    "toolchain.host.linuxAmd64ManifestDigest",
  );
  requireEqual(
    toolchain.host?.buildImageManifestDigest,
    "sha256:8f2f92e61f13defcfc91cd4a3722bbb55edced4163c6277fbc6375d05b6731aa",
    "toolchain.host.buildImageManifestDigest",
  );
  requireEqual(
    toolchain.host?.buildImageConfigDigest,
    "sha256:5bcfc00215b7f44236d009a7c3e7a53495fe8c8488908dd4e896e9da9a9c035b",
    "toolchain.host.buildImageConfigDigest",
  );
  requireEqual(toolchain.host?.status, "host-image-locked-and-reproducible", "toolchain.host.status");
  requireEqual(toolchain.host?.snapshotDate, "2026-09-02", "toolchain.host.snapshotDate");
  requireEqual(
    toolchain.host?.registryManifestUrl,
    "https://registry-1.docker.io/v2/library/ubuntu/manifests/20.04",
    "toolchain.host.registryManifestUrl",
  );
  requireEqual(toolchain.androidNdk?.version, "r27c", "toolchain.androidNdk.version");
  requireEqual(toolchain.androidNdk?.revision, "27.2.12479018", "toolchain.androidNdk.revision");
  requireEqual(
    toolchain.androidNdk?.url,
    "https://dl.google.com/android/repository/android-ndk-r27c-linux.zip",
    "toolchain.androidNdk.url",
  );
  requireEqual(toolchain.androidNdk?.archiveBytes, 663987688, "toolchain.androidNdk.archiveBytes");
  requireEqual(
    toolchain.androidNdk?.archiveSha1,
    "090e8083a715fdb1a3e402d0763c388abb03fb4e",
    "toolchain.androidNdk.archiveSha1",
  );
  requireEqual(
    toolchain.androidNdk?.archiveSha256,
    "59c2f6dc96743b5daf5d1626684640b20a6bd2b1d85b13156b90333741bad5cc",
    "toolchain.androidNdk.archiveSha256",
  );
  requireEqual(toolchain.androidNdk?.status, "archive-locked", "toolchain.androidNdk.status");
  requireNonEmptyString(toolchain.androidNdk?.officialChecksumSource, "toolchain.androidNdk.officialChecksumSource");
  requireEqual(toolchain.llvm?.upstreamRequestedVersion, "21.1.8", "toolchain.llvm.upstreamRequestedVersion");
  requireEqual(toolchain.llvm?.resolvedVersion, "21.1.5", "toolchain.llvm.resolvedVersion");
  requireEqual(
    toolchain.llvm?.packageVersion,
    "1:21.1.5~++20251023083255+45afac62e373-1~exp1~20251023083404.50",
    "toolchain.llvm.packageVersion",
  );
  requireEqual(toolchain.llvm?.status, "host-package-locked", "toolchain.llvm.status");
  requireEqual(toolchain.rust?.channel, "nightly-2026-07-20", "toolchain.rust.channel");
  requireEqual(
    toolchain.rust?.version,
    "1.99.0-nightly (9f36de775 2026-07-19)",
    "toolchain.rust.version",
  );
  requireEqual(toolchain.rust?.profile, "minimal", "toolchain.rust.profile");
  requireEqual(toolchain.rust?.status, "direct-downloads-locked", "toolchain.rust.status");
  requireSameArray(
    toolchain.rust?.targets,
    ["aarch64-linux-android", "x86_64-linux-android"],
    "toolchain.rust.targets",
  );
  requireEqual(toolchain.cmake?.version, "3.30.5", "toolchain.cmake.version");
  requireEqual(toolchain.cmake?.status, "direct-download-locked", "toolchain.cmake.status");
  requireEqual(toolchain.bootstrapBun?.version, "1.3.13", "toolchain.bootstrapBun.version");
  requireEqual(toolchain.bootstrapBun?.status, "direct-download-locked", "toolchain.bootstrapBun.status");
  requireEqual(toolchain.ninja?.version, "1.13.2", "toolchain.ninja.version");
  requireEqual(toolchain.ninja?.status, "direct-download-locked", "toolchain.ninja.status");
}

function verifyToolchainInputs(root, experiment) {
  requireEqual(experiment.toolchainInputLock, "toolchain-inputs.lock.json", "toolchainInputLock");
  const lockPath = resolveInside(root, experiment.toolchainInputLock, "toolchainInputLock");
  const lock = readJson(lockPath);
  requireEqual(lock.schemaVersion, 1, "toolchain-inputs.lock.json: schemaVersion");
  requireEqual(lock.snapshotDate, "2026-09-02", "toolchain-inputs.lock.json: snapshotDate");
  requireEqual(lock.host?.os, "linux", "toolchain inputs host OS");
  requireEqual(lock.host?.architecture, "x86_64", "toolchain inputs host architecture");
  requireEqual(lock.source?.bunCommit, EXPECTED_UPSTREAM_COMMIT, "toolchain inputs source commit");
  requireEqual(lock.source?.path, ".buildkite/Dockerfile", "toolchain inputs source path");
  requireEqual(lock.source?.gitBlobSha1, REQUIRED_EVIDENCE.get(".buildkite/Dockerfile"), "toolchain inputs source blob");

  requireArray(lock.directDownloads, "toolchain directDownloads");
  requireSameArray(
    lock.directDownloads.map((artifact) => artifact.id),
    EXPECTED_TOOLCHAIN_DOWNLOAD_IDS,
    "toolchain direct download IDs",
  );
  const ids = new Set();
  const urls = new Set();
  const filenames = new Set();
  let totalBytes = 0;
  let buildArtifacts = 0;
  let provenanceDocuments = 0;
  for (const artifact of lock.directDownloads) {
    const label = `toolchain input ${artifact.id}`;
    requireRecord(artifact, label);
    requireNonEmptyString(artifact.id, `${label}: id`);
    require(!ids.has(artifact.id), `${label}: duplicate ID`);
    ids.add(artifact.id);
    require(artifact.group === "build" || artifact.group === "provenance", `${label}: invalid group`);
    if (artifact.group === "build") buildArtifacts += 1;
    else provenanceDocuments += 1;
    requireNonEmptyString(artifact.role, `${label}: role`);
    requireNonEmptyString(artifact.version, `${label}: version`);
    requireSafeFilename(artifact.filename, `${label}: filename`);
    require(!filenames.has(artifact.filename), `${label}: duplicate filename`);
    filenames.add(artifact.filename);
    requireHttpsUrl(artifact.url, `${label}: URL`, ALLOWED_TOOLCHAIN_HOSTS);
    require(!urls.has(artifact.url), `${label}: duplicate URL`);
    urls.add(artifact.url);
    require(Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0, `${label}: invalid byte count`);
    require(SHA256.test(artifact.sha256), `${label}: invalid SHA-256`);
    if (artifact.sha1 !== undefined) require(SHA1.test(artifact.sha1), `${label}: invalid SHA-1`);
    if (artifact.group === "build") requireNonEmptyString(artifact.checksumSource, `${label}: checksumSource`);
    totalBytes += artifact.bytes;
  }
  requireEqual(buildArtifacts, 12, "toolchain build artifact count");
  requireEqual(provenanceDocuments, 5, "toolchain provenance document count");
  requireEqual(totalBytes, 1024309832, "toolchain locked byte total");

  const byId = new Map(lock.directDownloads.map((artifact) => [artifact.id, artifact]));
  const ndk = byId.get("android-ndk-r27c");
  requireEqual(ndk.url, experiment.toolchain.androidNdk.url, "NDK lock URL consistency");
  requireEqual(ndk.bytes, experiment.toolchain.androidNdk.archiveBytes, "NDK lock byte consistency");
  requireEqual(ndk.sha1, experiment.toolchain.androidNdk.archiveSha1, "NDK lock SHA-1 consistency");
  requireEqual(ndk.sha256, experiment.toolchain.androidNdk.archiveSha256, "NDK lock SHA-256 consistency");
  requireEqual(byId.get("cmake-3.30.5-linux-x86_64")?.version, experiment.toolchain.cmake.version, "CMake lock version");
  requireEqual(byId.get("bootstrap-bun-1.3.13-linux-x64")?.version, experiment.toolchain.bootstrapBun.version, "bootstrap Bun lock version");
  requireEqual(byId.get("node-24.3.0-linux-x64")?.version, "24.3.0", "Node lock version");
  requireEqual(byId.get("ninja-1.13.2-linux-x86_64")?.version, experiment.toolchain.ninja.version, "Ninja lock version");
  requireEqual(byId.get("rustup-init-1.29.1-linux-x86_64")?.version, lock.rust?.rustupVersion, "rustup lock version");

  requireEqual(lock.rust?.channel, experiment.toolchain.rust.channel, "Rust channel consistency");
  requireEqual(lock.rust?.toolchainVersion, experiment.toolchain.rust.version, "Rust version consistency");
  requireEqual(lock.rust?.profile, experiment.toolchain.rust.profile, "Rust profile consistency");
  requireSameArray(lock.rust?.components, ["rustc", "cargo", "rust-std", "rust-src"], "Rust minimal components");
  requireSameArray(lock.rust?.targets, experiment.toolchain.rust.targets, "Rust target consistency");
  requireArray(lock.rust?.excludedForThisExperiment, "Rust excluded components");
  requireNonEmptyString(lock.rust?.exclusionReason, "Rust exclusion reason");

  requireEqual(lock.hostPackageLayer?.status, "locked-and-reproducible", "host package layer status");
  requireEqual(lock.hostPackageLayer?.archiveLock, "host-package-inputs.lock.json", "host package archive lock");
  requireEqual(lock.hostPackageLayer?.imageEvidence, "host-image-evidence.json", "host image evidence path");
  requireEqual(lock.hostPackageLayer?.containerBase, experiment.toolchain.host.containerBase, "host package base");
  requireEqual(
    lock.hostPackageLayer?.containerIndexDigest,
    experiment.toolchain.host.containerDigest,
    "host package container index digest",
  );
  requireEqual(
    lock.hostPackageLayer?.linuxAmd64ManifestDigest,
    experiment.toolchain.host.linuxAmd64ManifestDigest,
    "host package amd64 manifest digest",
  );
  requireEqual(lock.hostPackageLayer?.requiredVersionFacts?.upstreamRequestedLlvm, experiment.toolchain.llvm.upstreamRequestedVersion, "host requested LLVM version");
  requireEqual(lock.hostPackageLayer?.requiredVersionFacts?.resolvedLlvm, experiment.toolchain.llvm.resolvedVersion, "host resolved LLVM version");
  requireEqual(lock.hostPackageLayer?.requiredVersionFacts?.resolvedLlvmPackage, experiment.toolchain.llvm.packageVersion, "host resolved LLVM package");
  requireEqual(lock.hostPackageLayer?.requiredVersionFacts?.resolvedGcc, "13.1.0", "host resolved GCC version");
  requireEqual(lock.hostPackageLayer?.requiredVersionFacts?.resolvedGccPackage, "13.1.0-8ubuntu1~20.04.2", "host resolved GCC package");
  requireArray(lock.hostPackageLayer?.requiredPackages, "host required packages");
  requireNonEmptyString(lock.hostPackageLayer?.resolution, "host package resolution");

  const hostPackageResult = verifyHostPackageInputs(root, experiment, lock.hostPackageLayer);

  requireEqual(lock.readiness?.directDownloadCount, 17, "toolchain readiness directDownloadCount");
  requireEqual(lock.readiness?.buildArtifactCount, buildArtifacts, "toolchain readiness buildArtifactCount");
  requireEqual(
    lock.readiness?.provenanceDocumentCount,
    provenanceDocuments,
    "toolchain readiness provenanceDocumentCount",
  );
  requireEqual(lock.readiness?.directDownloadBytesLocked, true, "toolchain direct-download byte readiness");
  requireEqual(lock.readiness?.hostPackageLayerLocked, true, "host package lock readiness");
  requireEqual(lock.readiness?.hostImageReproducible, true, "host image reproducibility readiness");
  requireEqual(lock.readiness?.complete, true, "toolchain lock completeness");
  requireNonEmptyString(lock.readiness?.note, "toolchain readiness note");
  return {
    directDownloads: lock.directDownloads.length,
    buildArtifacts,
    provenanceDocuments,
    hostPackages: hostPackageResult.packages,
    hostPackageBytes: hostPackageResult.bytes,
    hostImageManifestDigest: hostPackageResult.imageManifestDigest,
  };
}

function verifyHostPackageInputs(root, experiment, layer) {
  requireEqual(experiment.hostImageEvidence, layer.imageEvidence, "experiment host image evidence path");
  const archiveLockPath = resolveInside(root, layer.archiveLock, "host package archive lock");
  const archiveLockBytes = readFileSync(archiveLockPath);
  const archiveLock = JSON.parse(archiveLockBytes.toString("utf8"));
  const artifacts = collectHostPackageArtifacts(archiveLock);
  requireEqual(artifacts.length, 155, "host package archive count");
  requireEqual(layer.packageCount, artifacts.length, "host package layer archive count");
  requireEqual(layer.packageArchiveBytes, archiveLock.readiness.archiveBytes, "host package layer archive bytes");
  requireEqual(archiveLock.readiness.archiveBytes, 422223096, "host package archive byte total");
  requireEqual(archiveLock.baseImage?.reference, experiment.toolchain.host.containerBase, "host package base reference");
  requireEqual(archiveLock.baseImage?.indexDigest, experiment.toolchain.host.containerDigest, "host package base index digest");
  requireEqual(archiveLock.baseImage?.linuxAmd64ManifestDigest, experiment.toolchain.host.linuxAmd64ManifestDigest, "host package base amd64 digest");
  requireEqual(archiveLock.resolutionEnvironment?.containerImageId, experiment.toolchain.host.containerDigest, "host package resolver image");
  requireEqual(archiveLock.resolutionEnvironment?.ubuntuSnapshot, "20260902T000000Z", "host Ubuntu snapshot");
  requireEqual(archiveLock.resolutionEnvironment?.aptVersion, "apt 2.0.10 (amd64)", "host APT version");
  requireArray(archiveLock.resolutionEnvironment?.sourceLines, "host APT source lines");
  requireEqual(archiveLock.resolutionEnvironment.sourceLines.length, 12, "host APT source line count");
  requireArray(archiveLock.resolutionEnvironment?.signingKeys, "host signing keys");
  requireSameArray(
    archiveLock.resolutionEnvironment.signingKeys.map((key) => key.fingerprint),
    ["6084F3CF814B57C1CF12EFD515CF4D18AF4F7421", "C8EC952E2A0E1FBDC5090F6A2C277A0A352154E5"],
    "host signing-key fingerprints",
  );
  requireEqual(archiveLock.resolutionEnvironment?.baseManifest?.packageCount, 92, "host base package count");
  requireEqual(archiveLock.resolutionEnvironment?.baseManifest?.sha256, "0e32b83447c7fd2f7a560e4a833b5c3a7f5acdaf2f8b624e6a57fa84afb317f7", "host base package manifest");
  requireEqual(archiveLock.resolutionEnvironment?.provisionedManifest?.packageCount, layer.installedPackageCount, "host installed package count");
  requireEqual(archiveLock.resolutionEnvironment?.provisionedManifest?.sha256, layer.installedPackageManifestSha256, "host installed package manifest");
  requireEqual(archiveLock.resolutionEnvironment?.toolVersions?.clang, "Ubuntu clang version 21.1.5 (++20251023083255+45afac62e373-1~exp1~20251023083404.50)", "host Clang report");
  requireEqual(archiveLock.resolutionEnvironment?.toolVersions?.gcc, "gcc-13 (Ubuntu 13.1.0-8ubuntu1~20.04.2) 13.1.0", "host GCC report");
  requireEqual(archiveLock.readiness?.repositoryCounts?.["apt-llvm-focal-21"], 9, "host LLVM package count");
  requireEqual(archiveLock.readiness?.repositoryCounts?.["ubuntu-focal-snapshot"], 124, "host Ubuntu package count");
  requireEqual(archiveLock.readiness?.repositoryCounts?.["ubuntu-toolchain-r-test"], 22, "host toolchain PPA package count");
  requireEqual(archiveLock.containerLayout?.androidNdkRoot, "/opt/autojs6/android-ndk-r27c", "container NDK root");
  requireEqual(archiveLock.containerLayout?.pathPrefix, "/usr/lib/llvm-21/bin", "container LLVM PATH prefix");
  requireArray(archiveLock.containerLayout?.compilerRuntimeLinks, "compiler runtime links");
  requireEqual(archiveLock.containerLayout.compilerRuntimeLinks.length, 8, "compiler runtime link count");
  for (const link of archiveLock.containerLayout.compilerRuntimeLinks) {
    requireNonEmptyString(link.path, "compiler runtime link path");
    requireNonEmptyString(link.target, "compiler runtime link target");
    require(link.path.startsWith("/usr/lib/llvm-21/"), `unexpected compiler runtime link path: ${link.path}`);
    require(link.target.startsWith(`${archiveLock.containerLayout.androidNdkRoot}/`), `unexpected compiler runtime link target: ${link.target}`);
  }
  // Package order is inherited from the byte-hashed dpkg manifest. Debian's
  // package query order is deterministic, but it is not a simple byte sort
  // after the architecture has been normalized into each artifact identity.
  require(
    artifacts.some((artifact) => artifact.id === `clang-21:amd64=${experiment.toolchain.llvm.packageVersion}`),
    "locked Clang package is missing",
  );
  require(artifacts.some((artifact) => artifact.id === "gcc-13:amd64=13.1.0-8ubuntu1~20.04.2"), "locked GCC package is missing");

  const evidencePath = resolveInside(root, layer.imageEvidence, "host image evidence");
  const evidence = readJson(evidencePath);
  requireEqual(evidence.schemaVersion, 1, "host image evidence schema");
  requireEqual(evidence.evidenceDate, "2026-09-03", "host image evidence date");
  requireArray(evidence.inputs?.files, "host image input files");
  requireSameArray(
    evidence.inputs.files.map((file) => file.path),
    [
      "host-package-inputs.lock.json",
      "host-package.Dockerfile",
      "install-host-packages.sh",
      "normalize-host-python-bytecode.py",
      "build-host-image.mjs",
    ],
    "host image input paths",
  );
  for (const file of evidence.inputs.files) {
    const localPath = resolveInside(root, file.path, `host image input ${file.path}`);
    const bytes = readFileSync(localPath);
    requireEqual(bytes.length, file.bytes, `${file.path}: host image input byte count`);
    requireEqual(sha256(bytes), file.sha256, `${file.path}: host image input SHA-256`);
  }
  requireEqual(evidence.inputs.packageArchiveCount, artifacts.length, "host image evidence archive count");
  requireEqual(evidence.inputs.packageArchiveBytes, archiveLock.readiness.archiveBytes, "host image evidence archive bytes");
  requireEqual(evidence.inputs.packageManifestCount, layer.installedPackageCount, "host image evidence package count");
  requireEqual(evidence.inputs.packageManifestSha256, layer.installedPackageManifestSha256, "host image evidence package manifest");
  requireEqual(evidence.buildEnvironment?.sourceDateEpoch, 1788278400, "host image SOURCE_DATE_EPOCH");
  requireEqual(evidence.buildEnvironment?.cacheDisabled, true, "host image no-cache evidence");
  requireEqual(evidence.buildEnvironment?.packageMaterializerOffline, true, "host image offline materializer evidence");
  requireEqual(evidence.buildEnvironment?.buildRunNetwork, "none", "host image RUN network policy");
  requireEqual(evidence.buildEnvironment?.basePullAllowed, false, "host image base pull policy");
  requireEqual(evidence.buildEnvironment?.externalDockerfileFrontend, false, "host image Dockerfile frontend policy");
  requireEqual(evidence.buildEnvironment?.layerTimestampRewrite, true, "host image timestamp rewrite");
  requireEqual(evidence.buildEnvironment?.automaticProvenanceAttestation, false, "host image automatic provenance setting");
  requireEqual(evidence.output?.os, "linux", "host image OS");
  requireEqual(evidence.output?.architecture, "amd64", "host image architecture");
  requireEqual(evidence.output?.created, "2026-09-01T16:00:00Z", "host image created timestamp");
  requireEqual(evidence.output?.imageManifestDigest, layer.hostImageManifestDigest, "host image manifest digest");
  requireEqual(evidence.output?.imageManifestDigest, experiment.toolchain.host.buildImageManifestDigest, "experiment host image manifest digest");
  requireEqual(evidence.output?.imageConfigDigest, layer.hostImageConfigDigest, "host image config digest");
  requireEqual(evidence.output?.imageConfigDigest, experiment.toolchain.host.buildImageConfigDigest, "experiment host image config digest");
  requireArray(evidence.output?.rootfsDiffIds, "host image rootfs diff IDs");
  requireEqual(evidence.output.rootfsDiffIds.length, 5, "host image rootfs diff ID count");
  for (const digest of evidence.output.rootfsDiffIds) require(/^sha256:[0-9a-f]{64}$/.test(digest), `invalid host rootfs diff ID: ${digest}`);
  requireEqual(evidence.output?.compilerRuntimeLinkCount, archiveLock.containerLayout.compilerRuntimeLinks.length, "host image runtime link count");
  requireArray(evidence.repeatedBuilds, "repeated host image builds");
  requireEqual(evidence.repeatedBuilds.length, 2, "repeated host image build count");
  for (const build of evidence.repeatedBuilds) {
    requireEqual(build.imageManifestDigest, evidence.output.imageManifestDigest, `host image build ${build.ordinal}: manifest digest`);
    requireEqual(build.imageConfigDigest, evidence.output.imageConfigDigest, `host image build ${build.ordinal}: config digest`);
  }
  requireEqual(layer.cleanImageBuildCount, evidence.repeatedBuilds.length, "host clean image build count");
  requireEqual(layer.imageDigestMatch, true, "host image digest match");
  requireEqual(evidence.result?.cleanBuildCount, 2, "host image result build count");
  requireEqual(evidence.result?.imageManifestDigestMatch, true, "host image manifest reproducibility");
  requireEqual(evidence.result?.imageConfigDigestMatch, true, "host image config reproducibility");
  requireEqual(evidence.result?.rootfsDiffIdsMatch, true, "host image rootfs reproducibility");
  requireEqual(evidence.result?.installedPackageManifestMatch, true, "host package manifest reproducibility");
  requireEqual(evidence.result?.hostImageReproducible, true, "host image reproducibility result");
  requireEqual(evidence.result?.runtimeReproducibilityProven, false, "runtime reproducibility evidence boundary");
  requireEqual(sha256(archiveLockBytes), evidence.inputs.files[0].sha256, "host package lock evidence digest");
  return {
    packages: artifacts.length,
    bytes: archiveLock.readiness.archiveBytes,
    imageManifestDigest: evidence.output.imageManifestDigest,
  };
}

function verifyBuildNetworkInputs(root, experiment, series) {
  requireEqual(experiment.buildNetworkInputLock, "build-network-inputs.lock.json", "buildNetworkInputLock");
  const lockPath = resolveInside(root, experiment.buildNetworkInputLock, "buildNetworkInputLock");
  const lock = readJson(lockPath);
  requireEqual(lock.schemaVersion, 1, "build-network-inputs.lock.json: schemaVersion");
  requireEqual(lock.snapshotDate, "2026-09-03", "build-network-inputs.lock.json: snapshotDate");
  requireEqual(lock.bunCommit, series.downstreamBackport.headCommit, "build network Bun commit");
  verifyDefinitionRecords(
    lock.buildMachinery,
    ["scripts/build/codegen.ts", "scripts/build/rust.ts"],
    "build network machinery",
  );
  for (const record of lock.buildMachinery) requireNonEmptyString(record.fact, `${record.path}: network fact`);
  requireEqual(
    lock.buildMachinery[0].gitBlobSha1,
    "7aa6c2238db71f6967377b841ed5e1db7b33a0db",
    "codegen network machinery blob",
  );
  requireEqual(
    lock.buildMachinery[1].gitBlobSha1,
    "5b7872b7072de24157fa5f9ffa4cf05cbeb5066e",
    "Rust network machinery blob",
  );

  requireRecord(lock.cargo, "build network Cargo closure");
  requireEqual(lock.cargo.archiveLock, "cargo-inputs.lock.json", "Cargo archive lock path");
  const cargoArchiveLockPath = resolveInside(root, lock.cargo.archiveLock, "Cargo archive lock path");
  const cargoArchiveLock = readJson(cargoArchiveLockPath);
  const cargoArtifacts = collectCargoArtifacts(cargoArchiveLock);
  verifyLockfileIdentity(lock.cargo.bunLockfile, {
    path: "Cargo.lock",
    bytes: 70318,
    gitBlobSha1: "28c08e1b7bc188aa32a7d5ba3fc7647f616fe749",
    sha256: "819a552d52819d4d33897df69e16b698d703cec4e9009c2d132791931ab40856",
  }, "Cargo.lock");
  verifyNonGitLockfileIdentity(lock.cargo.rustStdLockfile, {
    path: "lib/rustlib/src/rust/library/Cargo.lock",
    bytes: 9835,
    sha256: "9e87d1ac04edbf5fa61e27cb21984a83566573a007767713868965fba70acb6d",
    sourceArtifactId: "rust-src-nightly-2026-07-20",
    sourceArtifactSha256: "d4ffe57cc99d8846761bdbefc631bfd8f06fc001d7208576887e381c5709341a",
  }, "Rust standard-library Cargo.lock");
  requireEqual(lock.cargo.bunPackageCount, 284, "Bun Cargo package count");
  requireEqual(lock.cargo.bunRegistryPackageCount, 181, "Bun Cargo registry package count");
  requireEqual(lock.cargo.rustStdPackageCount, 49, "Rust standard-library Cargo package count");
  requireEqual(lock.cargo.rustStdRegistryPackageCount, 30, "Rust standard-library Cargo registry package count");
  requireEqual(lock.cargo.registryPackageReferenceCount, 211, "Cargo registry package reference count");
  requireEqual(lock.cargo.sharedRegistryPackageCount, 5, "Cargo shared registry package count");
  requireEqual(lock.cargo.uniqueRegistryPackageCount, 206, "Cargo unique registry package count");
  requireEqual(lock.cargo.registrySha256Count, 206, "Cargo registry SHA-256 count");
  requireEqual(lock.cargo.gitSourceCount, 0, "Cargo Git source count");
  requireEqual(
    lock.cargo.registrySource,
    "registry+https://github.com/rust-lang/crates.io-index",
    "Cargo registry source",
  );
  requireEqual(
    lock.cargo.archiveUrlPattern,
    "https://static.crates.io/crates/{name}/{name}-{version}.crate",
    "Cargo archive URL pattern",
  );
  requireEqual(lock.cargo.archiveIdentitiesLockedByCargoLocks, true, "Cargo archive identity readiness");
  requireEqual(lock.cargo.archiveByteCountsLockedByProject, true, "Cargo archive byte readiness");
  requireEqual(lock.cargo.archivesMaterializedByProject, true, "Cargo archive materialization readiness");
  requireEqual(lock.cargo.archiveBytes, 28919277, "Cargo archive bytes");
  requireEqual(lock.cargo.offlineSourceReplacementReady, true, "Cargo offline source readiness");
  requireEqual(cargoArchiveLock.cargoLock.path, lock.cargo.bunLockfile.path, "Cargo archive Bun lock path");
  requireEqual(cargoArchiveLock.cargoLock.bytes, lock.cargo.bunLockfile.bytes, "Cargo archive Bun lock bytes");
  requireEqual(cargoArchiveLock.cargoLock.gitBlobSha1, lock.cargo.bunLockfile.gitBlobSha1, "Cargo archive Bun lock blob");
  requireEqual(cargoArchiveLock.cargoLock.sha256, lock.cargo.bunLockfile.sha256, "Cargo archive Bun lock SHA-256");
  requireEqual(cargoArchiveLock.cargoLock.packageCount, lock.cargo.bunPackageCount, "Cargo archive Bun package count");
  requireEqual(cargoArchiveLock.cargoLock.registryPackageCount, lock.cargo.bunRegistryPackageCount, "Cargo archive Bun registry count");
  requireEqual(cargoArchiveLock.rustStdCargoLock.path, lock.cargo.rustStdLockfile.path, "Cargo archive Rust standard-library lock path");
  requireEqual(cargoArchiveLock.rustStdCargoLock.bytes, lock.cargo.rustStdLockfile.bytes, "Cargo archive Rust standard-library lock bytes");
  requireEqual(cargoArchiveLock.rustStdCargoLock.sha256, lock.cargo.rustStdLockfile.sha256, "Cargo archive Rust standard-library lock SHA-256");
  requireEqual(cargoArchiveLock.rustStdCargoLock.sourceArtifactId, lock.cargo.rustStdLockfile.sourceArtifactId, "Cargo archive Rust source artifact");
  requireEqual(cargoArchiveLock.rustStdCargoLock.sourceArtifactSha256, lock.cargo.rustStdLockfile.sourceArtifactSha256, "Cargo archive Rust source artifact SHA-256");
  requireEqual(cargoArchiveLock.rustStdCargoLock.packageCount, lock.cargo.rustStdPackageCount, "Cargo archive Rust standard-library package count");
  requireEqual(cargoArchiveLock.rustStdCargoLock.registryPackageCount, lock.cargo.rustStdRegistryPackageCount, "Cargo archive Rust standard-library registry count");
  requireEqual(cargoArchiveLock.registryPackageReferenceCount, lock.cargo.registryPackageReferenceCount, "Cargo archive registry reference count");
  requireEqual(cargoArchiveLock.sharedRegistryPackageCount, lock.cargo.sharedRegistryPackageCount, "Cargo archive shared registry count");
  requireEqual(cargoArchiveLock.archiveCount, lock.cargo.uniqueRegistryPackageCount, "Cargo archive unique registry count");
  requireEqual(cargoArchiveLock.cargoLock.gitSourceCount + cargoArchiveLock.rustStdCargoLock.gitSourceCount, lock.cargo.gitSourceCount, "Cargo archive source Git count");
  requireEqual(cargoArchiveLock.registrySource, lock.cargo.registrySource, "Cargo archive registry source");
  requireEqual(cargoArchiveLock.archiveUrlPattern, lock.cargo.archiveUrlPattern, "Cargo archive URL pattern cross-lock");
  requireEqual(cargoArchiveLock.totalArchiveBytes, lock.cargo.archiveBytes, "Cargo archive byte cross-lock");
  requireEqual(cargoArtifacts.length, lock.cargo.uniqueRegistryPackageCount, "Cargo locked archive count");
  requireNonEmptyString(lock.cargo.note, "Cargo closure note");

  requireRecord(lock.bunInstall, "build network Bun install closure");
  requireEqual(lock.bunInstall.command, "bun install --frozen-lockfile", "Bun install command");
  requireEqual(lock.bunInstall.archiveLock, "bun-inputs.lock.json", "Bun archive lock path");
  const bunArchiveLockPath = resolveInside(root, lock.bunInstall.archiveLock, "Bun archive lock path");
  const bunArchiveLock = readJson(bunArchiveLockPath);
  const bunArtifacts = collectBunArtifacts(bunArchiveLock);
  requireSameArray(
    lock.bunInstall.directories,
    [".", "packages/bun-error", "src/node-fallbacks"],
    "Bun install directories",
  );
  requireArray(lock.bunInstall.lockfiles, "Bun install lockfiles");
  const expectedBunLockfiles = [
    {
      path: "bun.lock",
      bytes: 15271,
      gitBlobSha1: "6ccdf254cb0b4f377632cb72c9da4969d313a34b",
      sha256: "49d0dd03629473c0c264e85c003adb0f713f27abdda80a371f137781f71104fa",
      packageEntryCount: 62,
      sha512IntegrityCount: 60,
      workspaceEntryCount: 2,
    },
    {
      path: "packages/bun-error/bun.lock",
      bytes: 319,
      gitBlobSha1: "3081551fc3b46ab721804fe91612e04ae6202c6a",
      sha256: "e5f358227dd67c5c14ddbe5fe3348e2fbffb1399382909eda00e606b178a313d",
      packageEntryCount: 1,
      sha512IntegrityCount: 1,
      workspaceEntryCount: 0,
    },
    {
      path: "src/node-fallbacks/bun.lock",
      bytes: 25135,
      gitBlobSha1: "a34d182b48ef4dccbc26412e9b79352e277ca2a4",
      sha256: "f2694f1fbc8689075bf005d90cecaeb393967cf96b735a8315198144278ea11d",
      packageEntryCount: 111,
      sha512IntegrityCount: 111,
      workspaceEntryCount: 0,
    },
  ];
  requireEqual(lock.bunInstall.lockfiles.length, expectedBunLockfiles.length, "Bun lockfile count");
  for (let index = 0; index < expectedBunLockfiles.length; index += 1) {
    const observed = lock.bunInstall.lockfiles[index];
    const expected = expectedBunLockfiles[index];
    verifyLockfileIdentity(observed, expected, expected.path);
    requireEqual(observed.packageEntryCount, expected.packageEntryCount, `${expected.path}: package entries`);
    requireEqual(observed.sha512IntegrityCount, expected.sha512IntegrityCount, `${expected.path}: SHA-512 entries`);
    requireEqual(observed.workspaceEntryCount, expected.workspaceEntryCount, `${expected.path}: workspace entries`);
  }
  requireEqual(lock.bunInstall.packageEntryCount, 174, "Bun package entry count");
  requireEqual(lock.bunInstall.sha512IntegrityCount, 172, "Bun SHA-512 integrity count");
  requireEqual(lock.bunInstall.workspaceEntryCount, 2, "Bun workspace entry count");
  requireEqual(lock.bunInstall.uniqueExternalPackageCount, 164, "Bun unique external package count");
  requireEqual(lock.bunInstall.selectedReferenceCount, 133, "Bun selected reference count");
  requireEqual(lock.bunInstall.selectedUniquePackageCount, 125, "Bun selected package count");
  requireEqual(lock.bunInstall.excludedPlatformPackageCount, 39, "Bun excluded platform package count");
  requireEqual(lock.bunInstall.archiveBytes, 31498870, "Bun archive bytes");
  for (const field of [
    "platformSelectionResolved",
    "registryTarballUrlsLockedByProject",
    "archiveByteCountsLockedByProject",
    "archivesMaterializedByProject",
    "offlineCacheReady",
    "networkDisabledReplayPassed",
  ]) {
    requireEqual(lock.bunInstall[field], true, `Bun install ${field}`);
  }
  requireEqual(bunArchiveLock.bunCommit, lock.bunCommit, "Bun archive lock commit");
  requireEqual(bunArchiveLock.command, lock.bunInstall.command, "Bun archive lock command");
  requireEqual(bunArchiveLock.archiveCount, lock.bunInstall.selectedUniquePackageCount, "Bun archive lock count");
  requireEqual(bunArchiveLock.totalArchiveBytes, lock.bunInstall.archiveBytes, "Bun archive byte cross-lock");
  requireEqual(bunArchiveLock.selection.packageEntryCount, lock.bunInstall.packageEntryCount, "Bun archive package entry cross-lock");
  requireEqual(bunArchiveLock.selection.externalReferenceCount, lock.bunInstall.sha512IntegrityCount, "Bun archive reference cross-lock");
  requireEqual(bunArchiveLock.selection.workspaceReferenceCount, lock.bunInstall.workspaceEntryCount, "Bun archive workspace cross-lock");
  requireEqual(bunArchiveLock.selection.uniqueExternalPackageCount, lock.bunInstall.uniqueExternalPackageCount, "Bun archive unique package cross-lock");
  requireEqual(bunArchiveLock.selection.selectedReferenceCount, lock.bunInstall.selectedReferenceCount, "Bun archive selected reference cross-lock");
  requireEqual(bunArchiveLock.selection.selectedUniquePackageCount, lock.bunInstall.selectedUniquePackageCount, "Bun archive selected package cross-lock");
  requireEqual(bunArchiveLock.selection.excludedUniquePackageCount, lock.bunInstall.excludedPlatformPackageCount, "Bun archive excluded package cross-lock");
  requireEqual(bunArtifacts.length, lock.bunInstall.selectedUniquePackageCount, "Bun locked archive count");
  requireNonEmptyString(lock.bunInstall.note, "Bun install closure note");

  requireRecord(lock.targetExclusions, "build network target exclusions");
  requireArray(lock.targetExclusions.excludedDownloaders, "excluded network downloaders");
  requireEqual(lock.targetExclusions.excludedDownloaders.length, 4, "excluded network downloader count");
  requireNonEmptyString(lock.targetExclusions.reason, "network target exclusion reason");
  requireEqual(lock.readiness?.lockfileIdentitiesComplete, true, "network lockfile identity readiness");
  requireEqual(lock.readiness?.cargoArchiveClosureComplete, true, "Cargo archive closure readiness");
  requireEqual(lock.readiness?.bunArchiveClosureComplete, true, "Bun archive closure readiness");
  requireEqual(lock.readiness?.offlineBunInstallReplayPassed, true, "offline Bun install replay readiness");
  requireEqual(lock.readiness?.offlineBuildNetworkTestPassed, true, "offline network test readiness");
  requireEqual(lock.readiness?.complete, true, "build network lock completeness");
  requireNonEmptyString(lock.readiness?.resolution, "build network resolution");
  return {
    cargoRegistryPackages: lock.cargo.uniqueRegistryPackageCount,
    cargoArchiveBytes: lock.cargo.archiveBytes,
    bunIntegrityEntries: lock.bunInstall.sha512IntegrityCount,
    bunRegistryPackages: lock.bunInstall.selectedUniquePackageCount,
    bunArchiveBytes: lock.bunInstall.archiveBytes,
  };
}

function verifyLockfileIdentity(observed, expected, label) {
  requireRecord(observed, `${label}: lockfile identity`);
  requireEqual(observed.path, expected.path, `${label}: path`);
  requireEqual(observed.bytes, expected.bytes, `${label}: bytes`);
  requireEqual(observed.gitBlobSha1, expected.gitBlobSha1, `${label}: Git blob`);
  requireEqual(observed.sha256, expected.sha256, `${label}: SHA-256`);
  requireSafeRelativePath(observed.path, `${label}: safe path`);
  require(SHA1.test(observed.gitBlobSha1), `${label}: invalid Git blob`);
  require(SHA256.test(observed.sha256), `${label}: invalid SHA-256`);
}

function verifyNonGitLockfileIdentity(observed, expected, label) {
  requireRecord(observed, `${label}: lockfile identity`);
  requireEqual(observed.path, expected.path, `${label}: path`);
  requireEqual(observed.bytes, expected.bytes, `${label}: bytes`);
  requireEqual(observed.sha256, expected.sha256, `${label}: SHA-256`);
  requireEqual(observed.sourceArtifactId, expected.sourceArtifactId, `${label}: source artifact`);
  requireEqual(observed.sourceArtifactSha256, expected.sourceArtifactSha256, `${label}: source artifact SHA-256`);
  requireSafeRelativePath(observed.path, `${label}: safe path`);
  require(SHA256.test(observed.sha256), `${label}: invalid SHA-256`);
  require(SHA256.test(observed.sourceArtifactSha256), `${label}: invalid source artifact SHA-256`);
}

function verifyOutputPolicy(policy) {
  requireRecord(policy, "outputPolicy");
  requireSafeRelativePath(policy.bunCheckoutBuildRoot, "outputPolicy.bunCheckoutBuildRoot");
  requireEqual(policy.bunCheckoutBuildRoot, "build/autojs6-api28", "outputPolicy.bunCheckoutBuildRoot");
  requireArray(policy.repositoryForbiddenWriteRoots, "outputPolicy.repositoryForbiddenWriteRoots");
  const roots = new Set(policy.repositoryForbiddenWriteRoots);
  for (const requiredRoot of REQUIRED_FORBIDDEN_ROOTS) {
    require(roots.has(requiredRoot), `outputPolicy must forbid writes to ${requiredRoot}`);
  }
  for (const root of roots) requireSafeRelativePath(root, `forbidden write root ${root}`);
}

function verifyBuildEntry(root, lock) {
  requireEqual(lock.buildEntry, "build-experiment.mjs", "buildEntry");
  const entryPath = resolveInside(root, lock.buildEntry, "buildEntry");
  require(existsSync(entryPath), `buildEntry is missing: ${lock.buildEntry}`);
  const stat = lstatSync(entryPath);
  require(stat.isFile() && !stat.isSymbolicLink(), "buildEntry must be a regular file");
  requireEqual(lock.containerBuildEntry, "run-locked-build.mjs", "containerBuildEntry");
  const containerEntryPath = resolveInside(root, lock.containerBuildEntry, "containerBuildEntry");
  require(existsSync(containerEntryPath), `containerBuildEntry is missing: ${lock.containerBuildEntry}`);
  const containerStat = lstatSync(containerEntryPath);
  require(containerStat.isFile() && !containerStat.isSymbolicLink(), "containerBuildEntry must be a regular file");
  requireEqual(lock.reproducibility?.sourceDateEpoch, 1788278400, "reproducibility.sourceDateEpoch");
  requireEqual(lock.reproducibility?.timezone, "UTC", "reproducibility.timezone");
  requireEqual(lock.reproducibility?.locale, "C.UTF-8", "reproducibility.locale");
  requireNonEmptyString(lock.reproducibility?.networkPolicy, "reproducibility.networkPolicy");
}

function verifyRuntimeEvidence(root, lock) {
  requireEqual(lock.runtimeEvidence, "runtime-evidence.json", "runtimeEvidence");
  const evidencePath = resolveInside(root, lock.runtimeEvidence, "runtimeEvidence");
  require(existsSync(evidencePath), `runtimeEvidence is missing: ${lock.runtimeEvidence}`);
  const stat = lstatSync(evidencePath);
  require(stat.isFile() && !stat.isSymbolicLink(), "runtimeEvidence must be a regular file");
  const evidence = verifyRuntimeEvidenceManifest(readJson(evidencePath));
  requireEqual(evidence.identity.variant, lock.identity.variant, "runtime evidence variant");
  requireEqual(evidence.source.upstreamCommit, lock.upstream.commit, "runtime evidence upstream commit");
  requireEqual(
    evidence.build.hostImageManifestDigest,
    lock.toolchain.host.buildImageManifestDigest,
    "runtime evidence host image manifest digest",
  );
  requireEqual(
    evidence.build.hostImageConfigDigest,
    lock.toolchain.host.buildImageConfigDigest,
    "runtime evidence host image config digest",
  );
  requireEqual(evidence.build.entry, lock.containerBuildEntry, "runtime evidence build entry");
  for (const input of evidence.build.repositoryInputs) {
    const inputPath = resolveInside(root, input.path, `runtime evidence repository input ${input.path}`);
    require(existsSync(inputPath), `runtime evidence repository input is missing: ${input.path}`);
    const inputStat = lstatSync(inputPath);
    require(inputStat.isFile() && !inputStat.isSymbolicLink(), `${input.path}: runtime evidence input must be a regular file`);
    const bytes = readFileSync(inputPath);
    requireEqual(bytes.length, input.bytes, `${input.path}: runtime evidence input byte count`);
    requireEqual(sha256(bytes), input.sha256, `${input.path}: runtime evidence input SHA-256`);
  }
  return {
    artifacts: evidence.artifacts.map((artifact) => ({
      abi: artifact.abi,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
      buildId: artifact.elf.buildId,
      minimumLoadAlignment: artifact.elf.minimumLoadAlignment,
    })),
  };
}

function verifyEvidence(evidence) {
  requireArray(evidence, "sourceEvidence");
  const observed = new Map();
  for (const item of evidence) {
    requireRecord(item, "sourceEvidence entry");
    requireNonEmptyString(item.path, "sourceEvidence.path");
    require(SHA1.test(item.gitBlobSha1), `${item.path}: gitBlobSha1 must be a full lowercase SHA-1`);
    requireEqual(
      item.url,
      `https://github.com/oven-sh/bun/blob/${EXPECTED_UPSTREAM_COMMIT}/${item.path}`,
      `${item.path}: immutable evidence URL`,
    );
    requireNonEmptyString(item.fact, `${item.path}: fact`);
    require(!observed.has(item.path), `duplicate sourceEvidence path: ${item.path}`);
    observed.set(item.path, item.gitBlobSha1);
  }
  for (const [path, blob] of REQUIRED_EVIDENCE) {
    requireEqual(observed.get(path), blob, `sourceEvidence ${path} blob`);
  }
}

function verifyTarget(root, target) {
  requireRecord(target, "target");
  requireEqual(target.androidApi, 28, "target.androidApi");
  requireEqual(target.androidRange, "9-12L", "target.androidRange");
  requireSameArray(target.supportedApis, EXPECTED_APIS, "target.supportedApis");
  requireEqual(target.buildProfile, "android-release", "target.buildProfile");
  requireNonEmptyString(target.scope, "target.scope");
  requireArray(target.abis, "target.abis");
  requireEqual(target.abis.length, 2, "target.abis length");

  const expectedAbis = new Map([
    [
      "arm64-v8a",
      {
        bunArch: "aarch64",
        rustTarget: "aarch64-linux-android",
        clangTarget: "aarch64-unknown-linux-android28",
        cpuFloor: "armv8-a+crc",
        baseline: false,
        config: "config/arm64-v8a.configure.json",
        buildDir: "build/autojs6-api28/arm64-v8a",
      },
    ],
    [
      "x86_64",
      {
        bunArch: "x64",
        rustTarget: "x86_64-linux-android",
        clangTarget: "x86_64-unknown-linux-android28",
        cpuFloor: "nehalem-no-avx",
        baseline: true,
        config: "config/x86_64.configure.json",
        buildDir: "build/autojs6-api28/x86_64",
      },
    ],
  ]);

  const seen = new Set();
  const results = [];
  for (const abi of target.abis) {
    requireRecord(abi, "target ABI entry");
    const expected = expectedAbis.get(abi.androidAbi);
    require(expected !== undefined, `unsupported target ABI: ${abi.androidAbi}`);
    require(!seen.has(abi.androidAbi), `duplicate target ABI: ${abi.androidAbi}`);
    seen.add(abi.androidAbi);
    for (const field of ["bunArch", "rustTarget", "clangTarget", "cpuFloor", "baseline", "config"]) {
      requireEqual(abi[field], expected[field], `${abi.androidAbi}.${field}`);
    }

    const configPath = resolveInside(root, abi.config, `${abi.androidAbi}: config`);
    const config = readJson(configPath);
    requireEqual(config.profile, target.buildProfile, `${abi.androidAbi}: profile`);
    requireRecord(config.overrides, `${abi.androidAbi}: overrides`);
    requireSameArray(Object.keys(config.overrides).sort(), EXPECTED_CONFIG_KEYS, `${abi.androidAbi}: override keys`);
    requireEqual(config.overrides.arch, expected.bunArch, `${abi.androidAbi}: overrides.arch`);
    requireEqual(config.overrides.androidApiLevel, target.androidApi, `${abi.androidAbi}: androidApiLevel`);
    requireEqual(config.overrides.baseline, expected.baseline, `${abi.androidAbi}: baseline`);
    requireEqual(config.overrides.canary, false, `${abi.androidAbi}: canary`);
    requireEqual(config.overrides.lto, false, `${abi.androidAbi}: lto`);
    requireEqual(config.overrides.buildDir, expected.buildDir, `${abi.androidAbi}: buildDir`);
    requireEqual(config.overrides.cacheDir, "build/autojs6-api28/cache", `${abi.androidAbi}: cacheDir`);
    requireSafeRelativePath(config.overrides.buildDir, `${abi.androidAbi}: buildDir`);
    requireSafeRelativePath(config.overrides.cacheDir, `${abi.androidAbi}: cacheDir`);
    require(
      !("androidNdk" in config.overrides),
      `${abi.androidAbi}: androidNdk must come from the locked build environment, not a host path`,
    );
    results.push({ abi: abi.androidAbi, configPath });
  }
  requireSameArray([...seen].sort(), [...expectedAbis.keys()].sort(), "target ABI set");
  return results;
}

function verifyPatchSeries(patchRoot, lock, series) {
  requireEqual(series.schemaVersion, 1, "patch series schemaVersion");
  requireEqual(series.seriesId, "bun-pr-39775-upstream-reference-2026-09-01", "patch seriesId");
  requireEqual(series.applicationTarget?.tag, lock.upstream.tag, "patch application target tag");
  requireEqual(series.applicationTarget?.commit, lock.upstream.commit, "patch application target commit");
  requireEqual(series.applicationTarget?.status, "clean-replay-verified", "patch application target status");

  const pr = series.upstreamPullRequest;
  requireRecord(pr, "upstreamPullRequest");
  requireEqual(pr.number, 39775, "upstreamPullRequest.number");
  requireEqual(pr.url, "https://github.com/oven-sh/bun/pull/39775", "upstreamPullRequest.url");
  requireEqual(pr.stateAtSnapshot, "open", "upstreamPullRequest.stateAtSnapshot");
  requireEqual(pr.mergedAtSnapshot, false, "upstreamPullRequest.mergedAtSnapshot");
  requireEqual(pr.snapshotDate, "2026-09-01", "upstreamPullRequest.snapshotDate");
  requireEqual(pr.baseCommit, EXPECTED_PR_BASE, "upstreamPullRequest.baseCommit");
  requireEqual(pr.headCommit, EXPECTED_PR_HEAD, "upstreamPullRequest.headCommit");
  requireEqual(pr.commitCount, 5, "upstreamPullRequest.commitCount");
  requireEqual(pr.applicationTargetRelationship?.kind, "ancestor", "PR target relationship kind");
  requireEqual(pr.applicationTargetRelationship?.commitsBehindPullRequestBase, 4, "PR base distance");
  requireEqual(pr.applicationTargetRelationship?.mergeBase, EXPECTED_UPSTREAM_COMMIT, "PR merge base");
  requireEqual(
    pr.applicationTargetRelationship?.verificationUrl,
    `https://github.com/oven-sh/bun/compare/${EXPECTED_UPSTREAM_COMMIT}...${EXPECTED_PR_BASE}`,
    "PR relationship verification URL",
  );

  requireArray(series.upstreamReferencePatches, "upstreamReferencePatches");
  requireEqual(series.upstreamReferencePatches.length, pr.commitCount, "upstream reference patch count");
  let expectedParent = pr.baseCommit;
  let materialized = 0;
  let missing = 0;
  const listedMaterializedPaths = new Set();

  for (let index = 0; index < series.upstreamReferencePatches.length; index += 1) {
    const patch = series.upstreamReferencePatches[index];
    const label = `upstream patch ${index + 1}`;
    requireRecord(patch, label);
    requireEqual(patch.order, index + 1, `${label}: order`);
    require(SHA1.test(patch.commit), `${label}: commit must be a full lowercase SHA`);
    requireEqual(patch.parent, expectedParent, `${label}: parent`);
    requireEqual(
      patch.url,
      `https://github.com/oven-sh/bun/commit/${patch.commit}.patch`,
      `${label}: immutable commit URL`,
    );
    require(Number.isSafeInteger(patch.bytes) && patch.bytes > 0, `${label}: bytes must be positive`);
    require(SHA256.test(patch.sha256), `${label}: sha256 must be a full lowercase digest`);
    require(SHA1.test(patch.stablePatchId), `${label}: stablePatchId must be a full lowercase SHA-1`);
    requireNonEmptyString(patch.title, `${label}: title`);
    requireNonEmptyString(patch.purpose, `${label}: purpose`);
    requireArray(patch.affectedPaths, `${label}: affectedPaths`);
    require(patch.affectedPaths.length > 0, `${label}: affectedPaths must not be empty`);
    requireEqual(patch.upstreamStatus, "open-unmerged-pr-at-snapshot", `${label}: upstreamStatus`);
    require(
      typeof patch.licenseContext === "string" && patch.licenseContext.includes("MIT"),
      `${label}: licenseContext must record the Bun repository license context`,
    );
    requireEqual(
      patch.materializedPath,
      `upstream-reference/${String(patch.order).padStart(4, "0")}-${patch.commit.slice(0, 8)}.patch`,
      `${label}: materializedPath`,
    );
    require(!listedMaterializedPaths.has(patch.materializedPath), `${label}: duplicate materializedPath`);
    listedMaterializedPaths.add(patch.materializedPath);

    const localPath = resolveInside(patchRoot, patch.materializedPath, `${label}: materializedPath`);
    if (existsSync(localPath)) {
      const stat = lstatSync(localPath);
      require(stat.isFile() && !stat.isSymbolicLink(), `${label}: materialized patch must be a regular file`);
      const bytes = readFileSync(localPath);
      requireEqual(bytes.length, patch.bytes, `${label}: materialized byte count`);
      requireEqual(sha256(bytes), patch.sha256, `${label}: materialized SHA-256`);
      require(
        bytes.subarray(0, 46).toString("ascii").startsWith(`From ${patch.commit} `),
        `${label}: materialized patch has the wrong From header`,
      );
      materialized += 1;
    } else {
      missing += 1;
    }
    expectedParent = patch.commit;
  }
  requireEqual(expectedParent, pr.headCommit, "upstream reference series head");
  rejectUnlistedPatches(resolve(patchRoot, "upstream-reference"), listedMaterializedPaths, "upstream-reference");

  const downstream = series.downstreamBackport;
  requireRecord(downstream, "downstreamBackport");
  requireEqual(downstream.directory, "downstream", "downstreamBackport.directory");
  requireEqual(downstream.status, "clean-replay-verified", "downstreamBackport.status");
  requireEqual(downstream.requiredForBuild, true, "downstreamBackport.requiredForBuild");
  requireEqual(downstream.baseCommit, lock.upstream.commit, "downstreamBackport.baseCommit");
  require(SHA1.test(downstream.headCommit), "downstreamBackport.headCommit must be a full lowercase SHA-1");
  require(SHA1.test(downstream.headTreeSha1), "downstreamBackport.headTreeSha1 must be a full lowercase SHA-1");
  requireRecord(downstream.generation, "downstreamBackport.generation");
  requireEqual(
    downstream.generation.strategy,
    "git am of immutable upstream commits followed by deterministic git format-patch",
    "downstreamBackport.generation.strategy",
  );
  requireSameArray(
    downstream.generation.gitAmOptions,
    ["--keep-cr", "--committer-date-is-author-date"],
    "downstreamBackport.generation.gitAmOptions",
  );
  requireSameArray(
    downstream.generation.formatPatchOptions,
    ["--full-index", "--binary", "--no-signature"],
    "downstreamBackport.generation.formatPatchOptions",
  );
  require(/^\d{4}-\d{2}-\d{2}$/.test(downstream.generation.verifiedDate), "invalid downstream verification date");

  requireRecord(downstream.upstreamEquivalence, "downstreamBackport.upstreamEquivalence");
  requireEqual(
    downstream.upstreamEquivalence.upstreamHeadCommit,
    pr.headCommit,
    "downstreamBackport.upstreamEquivalence.upstreamHeadCommit",
  );
  requireEqual(
    downstream.upstreamEquivalence.affectedPathsMatchExactly,
    true,
    "downstreamBackport.upstreamEquivalence.affectedPathsMatchExactly",
  );
  const expectedComparisonPaths = [...new Set(
    series.upstreamReferencePatches.flatMap((patch) => patch.affectedPaths),
  )].sort();
  requireSameArray(
    [...downstream.upstreamEquivalence.comparisonPaths].sort(),
    expectedComparisonPaths,
    "downstreamBackport.upstreamEquivalence.comparisonPaths",
  );

  requireArray(downstream.patches, "downstreamBackport.patches");
  requireEqual(downstream.patches.length, pr.commitCount + 2, "downstreamBackport.patches length");
  requireEqual(downstream.upstreamEquivalence.downstreamPrefixHeadCommit,
    downstream.patches[pr.commitCount - 1].commit, "upstream equivalence prefix head");
  requireEqual(downstream.upstreamEquivalence.scope, "upstream-compatibility-prefix", "upstream equivalence scope");
  const listedDownstreamPaths = new Set();
  expectedParent = downstream.baseCommit;
  for (let index = 0; index < downstream.patches.length; index += 1) {
    const patch = downstream.patches[index];
    const upstreamPatch = series.upstreamReferencePatches[index];
    const label = `downstream patch ${index + 1}`;
    requireRecord(patch, label);
    requireEqual(patch.order, index + 1, `${label}: order`);
    require(SHA1.test(patch.commit), `${label}: commit must be a full lowercase SHA-1`);
    requireEqual(patch.parent, expectedParent, `${label}: parent`);
    if (index === pr.commitCount + 1) {
      requireEqual(patch.origin, "autojs6-startup-cloexec", `${label}: origin`);
      requireEqual(patch.sourceCommit, null, `${label}: sourceCommit`);
      require(SHA1.test(patch.stablePatchId), `${label}: invalid stablePatchId`);
      requireSameArray(patch.affectedPaths,
        ["src/jsc/bindings/bun-startup-cloexec.h", "src/jsc/bindings/c-bindings.cpp"], `${label}: affectedPaths`);
    } else if (upstreamPatch === undefined) {
      requireEqual(patch.origin, "autojs6-supply-chain", `${label}: origin`);
      requireEqual(patch.sourceCommit, null, `${label}: sourceCommit`);
      require(SHA1.test(patch.stablePatchId), `${label}: stablePatchId must be a full lowercase SHA-1`);
      requireEqual(patch.declaredUpstreamRef, "v1.1.0", `${label}: declaredUpstreamRef`);
      requireEqual(
        patch.resolvedCommit,
        "ed738e842d2fbdf2d6459e39267a633c4a9b2f5d",
        `${label}: resolvedCommit`,
      );
      requireSameArray(patch.affectedPaths, ["scripts/build/deps/brotli.ts"], `${label}: affectedPaths`);
    } else {
      requireEqual(patch.sourceCommit, upstreamPatch.commit, `${label}: sourceCommit`);
      requireEqual(patch.stablePatchId, upstreamPatch.stablePatchId, `${label}: stablePatchId`);
      requireSameArray(patch.affectedPaths, upstreamPatch.affectedPaths, `${label}: affectedPaths`);
    }
    requireSafeRelativePath(patch.path, `${label}: path`);
    require(
      patch.path.startsWith(`${downstream.directory}/`) && extname(patch.path).toLowerCase() === ".patch",
      `${label}: path must name a patch in ${downstream.directory}`,
    );
    require(!listedDownstreamPaths.has(patch.path), `${label}: duplicate path`);
    listedDownstreamPaths.add(patch.path);
    require(Number.isSafeInteger(patch.bytes) && patch.bytes > 0, `${label}: bytes must be positive`);
    require(SHA256.test(patch.sha256), `${label}: sha256 must be a full lowercase digest`);
    requireNonEmptyString(patch.purpose, `${label}: purpose`);
    require(
      typeof patch.licenseImpact === "string" && patch.licenseImpact.includes("MIT"),
      `${label}: licenseImpact must record the Bun repository license context`,
    );

    const localPath = resolveInside(patchRoot, patch.path, `${label}: path`);
    require(existsSync(localPath), `${label}: patch file is missing`);
    const stat = lstatSync(localPath);
    require(stat.isFile() && !stat.isSymbolicLink(), `${label}: patch must be a regular file`);
    const bytes = readFileSync(localPath);
    requireEqual(bytes.length, patch.bytes, `${label}: byte count`);
    requireEqual(sha256(bytes), patch.sha256, `${label}: SHA-256`);
    require(
      bytes.subarray(0, 46).toString("ascii").startsWith(`From ${patch.commit} `),
      `${label}: patch has the wrong From header`,
    );
    expectedParent = patch.commit;
  }
  requireEqual(expectedParent, downstream.headCommit, "downstream backport series head");
  rejectUnlistedPatches(resolve(patchRoot, downstream.directory), listedDownstreamPaths, "downstream");
  requireNonEmptyString(downstream.note, "downstreamBackport.note");

  return {
    total: series.upstreamReferencePatches.length,
    materialized,
    missing,
    downstream: downstream.patches.length,
  };
}

function verifySourceInputs(root, lock, series) {
  const sourceInputPath = resolveInside(root, lock.sourceInputLock, "sourceInputLock");
  const inputs = readJson(sourceInputPath);
  requireEqual(inputs.schemaVersion, 1, "source input schemaVersion");
  requireEqual(inputs.bunBaseCommit, lock.upstream.commit, "source inputs Bun base commit");
  requireEqual(
    inputs.downstreamHeadCommit,
    series.downstreamBackport.headCommit,
    "source inputs downstream head commit",
  );
  requireEqual(inputs.status, "android-release-source-bytes-locked", "source inputs status");
  requireEqual(inputs.snapshotDate, "2026-09-02", "source inputs snapshotDate");
  requireEqual(inputs.resolution?.profile, "android-release", "source inputs profile");
  requireEqual(inputs.resolution?.androidApiLevel, 28, "source inputs Android API");
  requireSameArray(inputs.resolution?.abis, ["arm64-v8a", "x86_64"], "source inputs ABIs");
  requireEqual(inputs.resolution?.submodulesPresent, false, "source inputs submodulesPresent");
  requireNonEmptyString(inputs.resolution?.submoduleEvidence, "source inputs submoduleEvidence");

  const expectedMachinery = [
    "scripts/build/config.ts",
    "scripts/build/profiles.ts",
    "scripts/build/source.ts",
    "scripts/build/deps/index.ts",
  ];
  verifyDefinitionRecords(inputs.sourceMachinery, expectedMachinery, "source machinery");

  const expectedActive = [
    "picohttpparser",
    "nodejs",
    "zlib",
    "zstd",
    "brotli",
    "libdeflate",
    "libarchive",
    "libjpeg-turbo",
    "libspng",
    "libwebp",
    "cares",
    "hdrhistogram",
    "highway",
    "lolhtml",
    "rust-argon2",
    "lshpack",
    "lsqpack",
    "mimalloc",
    "sqlite",
    "boringssl",
    "lsquic",
    "WebKit",
  ];
  requireArray(inputs.activeDependencies, "activeDependencies");
  requireSameArray(inputs.activeDependencies.map((dependency) => dependency.name), expectedActive, "active dependencies");
  const definitionPaths = new Set();
  let githubArchives = 0;
  let prebuilt = 0;
  for (const dependency of inputs.activeDependencies) {
    const label = `dependency ${dependency.name}`;
    requireRecord(dependency, label);
    requireSafeRelativePath(dependency.definitionPath, `${label}: definitionPath`);
    require(
      dependency.definitionPath.startsWith("scripts/build/deps/"),
      `${label}: definitionPath must be in scripts/build/deps`,
    );
    require(!definitionPaths.has(dependency.definitionPath), `${label}: duplicate definitionPath`);
    definitionPaths.add(dependency.definitionPath);
    require(SHA1.test(dependency.definitionBlobSha1), `${label}: invalid definition blob`);

    if (dependency.kind === "github-archive") {
      githubArchives += 1;
      require(/^[^/]+\/[^/]+$/.test(dependency.repository), `${label}: invalid GitHub repository`);
      require(SHA1.test(dependency.revision), `${label}: revision must be an immutable full commit`);
      requireEqual(
        dependency.url,
        `https://github.com/${dependency.repository}/archive/${dependency.revision}.tar.gz`,
        `${label}: archive URL`,
      );
      require(Number.isSafeInteger(dependency.bytes) && dependency.bytes > 0, `${label}: archive bytes`);
      require(SHA256.test(dependency.sha256), `${label}: invalid archive SHA-256`);
      requireEqual(
        dependency.topLevelDirectory,
        `${dependency.repository.split("/")[1]}-${dependency.revision}`,
        `${label}: archive root`,
      );
      if (dependency.name === "brotli") {
        requireEqual(dependency.upstreamTag, "v1.1.0", `${label}: upstreamTag`);
        requireEqual(
          dependency.revision,
          "ed738e842d2fbdf2d6459e39267a633c4a9b2f5d",
          `${label}: revision`,
        );
        require(SHA1.test(dependency.baseDefinitionBlobSha1), `${label}: invalid base definition blob`);
        requireEqual(
          dependency.pinPatch,
          "patches/downstream/0006-build-pin-Brotli-v1.1.0-to-immutable-commit.patch",
          `${label}: pinPatch`,
        );
        const seriesPatchPath = dependency.pinPatch.replace(/^patches\//, "");
        const pinPatch = series.downstreamBackport.patches.find((patch) => patch.path === seriesPatchPath);
        require(pinPatch !== undefined, `${label}: pin patch is absent from the downstream series`);
        requireEqual(pinPatch.resolvedCommit, dependency.revision, `${label}: pin patch resolution`);
      }
    } else if (dependency.kind === "prebuilt") {
      prebuilt += 1;
      requireEqual(dependency.name, "nodejs", `${label}: prebuilt name`);
      requireEqual(dependency.version, "26.3.0", `${label}: version`);
      requireEqual(dependency.identity, dependency.version, `${label}: identity`);
      requireEqual(dependency.bytes, 9957179, `${label}: bytes`);
      require(SHA256.test(dependency.sha256), `${label}: invalid SHA-256`);
      requireEqual(
        dependency.url,
        `https://nodejs.org/dist/v${dependency.version}/node-v${dependency.version}-headers.tar.gz`,
        `${label}: URL`,
      );
      requireEqual(
        dependency.checksumManifest,
        `https://nodejs.org/dist/v${dependency.version}/SHASUMS256.txt`,
        `${label}: checksum manifest`,
      );
    } else if (dependency.kind === "in-tree") {
      requireEqual(dependency.name, "sqlite", `${label}: in-tree name`);
      requireEqual(dependency.path, "src/jsc/bindings/sqlite", `${label}: in-tree path`);
      requireEqual(dependency.identityCommit, lock.upstream.commit, `${label}: identity commit`);
    } else if (dependency.kind === "prebuilt-matrix") {
      prebuilt += 2;
      requireEqual(dependency.name, "WebKit", `${label}: matrix name`);
      require(SHA1.test(dependency.revision), `${label}: WebKit revision`);
      requireEqual(dependency.identity, `${dependency.revision}-android`, `${label}: identity`);
      requireArray(dependency.variants, `${label}: variants`);
      requireSameArray(dependency.variants.map((variant) => variant.abi), ["arm64-v8a", "x86_64"], `${label}: ABIs`);
      for (const variant of dependency.variants) {
        require(Number.isSafeInteger(variant.bytes) && variant.bytes > 0, `${label}/${variant.abi}: bytes`);
        require(SHA256.test(variant.sha256), `${label}/${variant.abi}: invalid SHA-256`);
        requireNonEmptyString(variant.asset, `${label}/${variant.abi}: asset`);
        requireEqual(
          variant.url,
          `https://github.com/oven-sh/WebKit/releases/download/autobuild-${dependency.revision}/${variant.asset}`,
          `${label}/${variant.abi}: URL`,
        );
      }
      requireEqual(
        dependency.releaseApi,
        `https://api.github.com/repos/oven-sh/WebKit/releases/tags/autobuild-${dependency.revision}`,
        `${label}: release API`,
      );
    } else {
      throw new Error(`${label}: unsupported source kind ${JSON.stringify(dependency.kind)}`);
    }
  }
  requireEqual(githubArchives, 19, "GitHub archive dependency count");
  requireEqual(prebuilt, 3, "prebuilt input count");

  requireArray(inputs.excludedDependencies, "excludedDependencies");
  requireSameArray(inputs.excludedDependencies.map((dependency) => dependency.name), ["libuv", "tinycc"], "excluded dependencies");
  for (const dependency of inputs.excludedDependencies) {
    requireSafeRelativePath(dependency.definitionPath, `excluded ${dependency.name}: definitionPath`);
    require(SHA1.test(dependency.definitionBlobSha1), `excluded ${dependency.name}: invalid definition blob`);
    requireNonEmptyString(dependency.reason, `excluded ${dependency.name}: reason`);
  }

  requireEqual(inputs.readiness?.activeDependencyCount, expectedActive.length, "source readiness dependency count");
  requireEqual(inputs.readiness?.revisionIdentitiesComplete, true, "source revision readiness");
  requireEqual(inputs.readiness?.prebuiltChecksumsComplete, true, "prebuilt checksum readiness");
  requireEqual(inputs.readiness?.githubArchiveChecksumsComplete, true, "GitHub archive checksum readiness");
  requireEqual(inputs.readiness?.allDownloadedBytesLocked, true, "download byte-lock readiness");
  requireNonEmptyString(inputs.readiness?.note, "source readiness note");

  return { active: expectedActive.length, githubArchives, prebuilt };
}

function verifyDefinitionRecords(records, expectedPaths, label) {
  requireArray(records, label);
  requireSameArray(records.map((record) => record.path), expectedPaths, `${label} paths`);
  for (const record of records) {
    requireSafeRelativePath(record.path, `${label}: path`);
    require(SHA1.test(record.gitBlobSha1), `${label}: invalid Git blob for ${record.path}`);
  }
}

function rejectUnlistedPatches(directory, listedPaths, label) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".patch") continue;
    const relativePath = `${label}/${entry.name}`;
    require(listedPaths.has(relativePath), `unlisted patch file: ${relativePath}`);
  }
}

function verifyBlockers(blockers, identity) {
  requireArray(blockers, "knownBlockers");
  const expectedResolution = new Map([
    ["v1.4.0-backport", true],
    ["toolchain-byte-lock", true],
    ["dependency-lock", true],
    ["build-and-runtime-evidence", false],
  ]);
  const expectedBuildBlocking = new Map([
    ["v1.4.0-backport", true],
    ["toolchain-byte-lock", true],
    ["dependency-lock", true],
    ["build-and-runtime-evidence", false],
  ]);
  requireEqual(blockers.length, expectedResolution.size, "knownBlockers length");
  const ids = new Set();
  let unresolved = 0;
  let unresolvedBuildBlocking = 0;
  for (const blocker of blockers) {
    requireRecord(blocker, "known blocker");
    requireNonEmptyString(blocker.id, "known blocker id");
    require(!ids.has(blocker.id), `duplicate known blocker id: ${blocker.id}`);
    ids.add(blocker.id);
    require(expectedResolution.has(blocker.id), `unexpected known blocker id: ${blocker.id}`);
    requireEqual(blocker.resolved, expectedResolution.get(blocker.id), `${blocker.id}: resolved`);
    requireEqual(blocker.blocksBuild, expectedBuildBlocking.get(blocker.id), `${blocker.id}: blocksBuild`);
    if (!blocker.resolved) {
      unresolved += 1;
      if (blocker.blocksBuild) unresolvedBuildBlocking += 1;
    }
    requireNonEmptyString(blocker.description, `${blocker.id}: description`);
  }
  requireEqual(unresolved, 1, "unresolved blocker count");
  requireEqual(unresolvedBuildBlocking, 0, "unresolved build-blocking count");
  requireEqual(identity.buildReady, true, "identity.buildReady with all build-input blockers resolved");
  requireEqual(identity.distributionReady, false, "identity.distributionReady with unresolved blockers");
}

function verifyNoRuntimeArtifacts(root) {
  const forbiddenExtensions = new Set([
    ".7z",
    ".aar",
    ".apk",
    ".bin",
    ".bz2",
    ".elf",
    ".exe",
    ".gz",
    ".jar",
    ".so",
    ".tar",
    ".tgz",
    ".xz",
    ".zip",
    ".zst",
  ]);
  for (const file of walkFiles(root)) {
    const stat = lstatSync(file);
    require(!stat.isSymbolicLink(), `symbolic links are not allowed in the experiment: ${relative(root, file)}`);
    const extension = extname(file).toLowerCase();
    require(!forbiddenExtensions.has(extension), `runtime/archive artifact is not allowed here: ${relative(root, file)}`);
    const bytes = readFileSync(file);
    require(
      !(bytes.length >= 4 && bytes[0] === 0x7f && bytes.subarray(1, 4).toString("ascii") === "ELF"),
      `ELF artifact is not allowed here: ${relative(root, file)}`,
    );
  }
}

function* walkFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) yield* walkFiles(path);
    else if (entry.isFile() || entry.isSymbolicLink()) yield path;
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`, { cause: error });
  }
}

function resolveInside(root, value, label) {
  requireSafeRelativePath(value, label);
  const result = resolve(root, value);
  const fromRoot = relative(root, result);
  require(fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot), `${label} escapes its root`);
  return result;
}

function requireSafeRelativePath(value, label) {
  requireNonEmptyString(value, label);
  require(!isAbsolute(value) && !win32.isAbsolute(value), `${label} must be relative`);
  const segments = value.replaceAll("\\", "/").split("/");
  require(!segments.includes(".."), `${label} must not contain parent traversal`);
  require(!segments.includes("."), `${label} must not contain dot segments`);
  require(!segments.includes(""), `${label} must not contain empty segments`);
}

function requireSafeFilename(value, label) {
  requireNonEmptyString(value, label);
  require(!value.includes("/") && !value.includes("\\") && !value.includes("\0"), `${label} must be a filename`);
  require(value !== "." && value !== ".." && !value.includes(".."), `${label} must not contain traversal`);
  require(/^[A-Za-z0-9._-]+$/.test(value), `${label} contains unsupported characters`);
}

function requireHttpsUrl(value, label, allowedHosts) {
  requireNonEmptyString(value, label);
  const url = new URL(value);
  require(url.protocol === "https:" && url.username === "" && url.password === "", `${label} must use HTTPS without credentials`);
  require(allowedHosts.has(url.hostname), `${label} has unexpected host ${url.hostname}`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireRecord(value, label) {
  require(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
}

function requireArray(value, label) {
  require(Array.isArray(value), `${label} must be an array`);
}

function requireNonEmptyString(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
}

function requireSameArray(actual, expected, label) {
  require(Array.isArray(actual), `${label} must be an array`);
  requireEqual(JSON.stringify(actual), JSON.stringify(expected), label);
}

function requireEqual(actual, expected, label) {
  require(Object.is(actual, expected), `${label}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyExperiment();
    console.log(`OK ${result.variant}`);
    console.log(`OK Bun ${result.upstreamCommit}; ${result.abiCount} API 28 ABI configure inputs`);
    console.log(
      `OK ${result.referencePatchCount} immutable upstream patch records; ` +
        `${result.materializedPatchCount} materialized, ${result.missingReferencePatchCount} optional copies absent`,
    );
    console.log(`OK ${result.downstreamPatchCount} deterministic downstream patches are locked and materialized`);
    console.log(
      `OK ${result.activeDependencyCount} Android-release dependency identities, ` +
        `${result.lockedGithubArchiveCount} source archives, and ${result.lockedPrebuiltCount} prebuilts are byte-locked`,
    );
    console.log(
      `OK ${result.lockedToolchainDownloadCount} direct toolchain downloads are byte-locked ` +
        `(${result.lockedToolchainBuildArtifactCount} build artifacts, ` +
        `${result.lockedToolchainProvenanceCount} provenance documents)`,
    );
    console.log(
      `OK ${result.lockedHostPackageCount} host package archives (${result.lockedHostPackageBytes} bytes) ` +
        `produce repeated image ${result.hostImageManifestDigest}`,
    );
    console.log(
      `OK ${result.cargoRegistryPackageCount} Cargo archives are byte-locked ` +
        `(${result.lockedCargoArchiveBytes} bytes) with a verified offline directory source`,
    );
    console.log(
      `OK ${result.bunIntegrityEntryCount} Bun registry references resolve to ` +
        `${result.bunRegistryPackageCount} locked archives (${result.lockedBunArchiveBytes} bytes) ` +
        "and a network-disabled read-only cache replay",
    );
    for (const artifact of result.reproducibleRuntimeArtifacts) {
      console.log(
        `OK ${artifact.abi} reproducible runtime ${artifact.sha256} ` +
          `(${artifact.bytes} bytes, build-id ${artifact.buildId}, minimum PT_LOAD ${artifact.minimumLoadAlignment})`,
      );
    }
    console.log(
      `OK ${result.packagedLicenseCount} Bun/WebKit license files and ` +
        `${result.lockedDistributionSourceArchiveCount} exact Bun/native/Cargo/npm source archives are locked`,
    );
    console.log("OK no runtime/archive artifact is present in the experiment directory");
    console.log("BUILD READY: immutable input gates and the network-disabled dependency closure are complete");
    console.log("STATIC RUNTIME GATE: two clean builds are byte-for-byte identical and both ABI ELF audits are locked");
    console.log("OPEN DISTRIBUTION GATE: application-process device, experimental APK packaging, and matching same-Release APK/source publication remain open");
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
