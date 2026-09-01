import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve, sep, win32 } from "node:path";
import { fileURLToPath } from "node:url";

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

export function verifyExperiment(baseDirectory = toolDirectory) {
  const root = resolve(baseDirectory);
  const lock = readJson(resolveInside(root, "experiment.lock.json", "experiment lock"));
  requireEqual(lock.schemaVersion, 1, "experiment.lock.json: schemaVersion");
  requireRecord(lock.identity, "experiment.lock.json: identity");
  requireEqual(lock.identity.variant, "bun-1.4.0-android-api28-patched-experimental", "identity.variant");
  requireEqual(lock.identity.status, "source-backport-and-inputs-verified", "identity.status");
  requireEqual(lock.identity.officialArtifact, false, "identity.officialArtifact");
  requireEqual(lock.identity.runtimeProduced, false, "identity.runtimeProduced");
  requireEqual(lock.identity.buildReady, false, "identity.buildReady");
  requireEqual(lock.identity.distributionReady, false, "identity.distributionReady");

  verifyUpstream(lock.upstream);
  verifyToolchain(lock.toolchain);
  verifyOutputPolicy(lock.outputPolicy);
  verifyEvidence(lock.sourceEvidence);

  const abiResults = verifyTarget(root, lock.target);
  const seriesPath = resolveInside(root, lock.patchSeries, "patchSeries");
  const series = readJson(seriesPath);
  const patchResult = verifyPatchSeries(dirname(seriesPath), lock, series);
  const sourceInputResult = verifySourceInputs(root, lock, series);
  verifyBlockers(lock.knownBlockers, lock.identity);
  verifyNoRuntimeArtifacts(root);

  return {
    variant: lock.identity.variant,
    upstreamCommit: lock.upstream.commit,
    abiCount: abiResults.length,
    referencePatchCount: patchResult.total,
    materializedPatchCount: patchResult.materialized,
    missingReferencePatchCount: patchResult.missing,
    downstreamPatchCount: patchResult.downstream,
    activeDependencyCount: sourceInputResult.active,
    lockedPrebuiltCount: sourceInputResult.prebuilt,
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
  requireEqual(toolchain.host?.status, "base-image-locked", "toolchain.host.status");
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
  requireEqual(toolchain.llvm?.version, "21.1.8", "toolchain.llvm.version");
  requireEqual(toolchain.rust?.channel, "nightly-2026-07-20", "toolchain.rust.channel");
  requireSameArray(
    toolchain.rust?.targets,
    ["aarch64-linux-android", "x86_64-linux-android"],
    "toolchain.rust.targets",
  );
  requireEqual(toolchain.cmake?.version, "3.30.5", "toolchain.cmake.version");
  requireEqual(toolchain.bootstrapBun?.version, "1.3.13", "toolchain.bootstrapBun.version");
  requireEqual(toolchain.ninja?.version, null, "toolchain.ninja.version");
  requireEqual(toolchain.ninja?.status, "version-pending", "toolchain.ninja.status");
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
  requireEqual(downstream.patches.length, pr.commitCount + 1, "downstreamBackport.patches length");
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
    if (upstreamPatch === undefined) {
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
  requireEqual(inputs.status, "android-release-revision-identities-locked", "source inputs status");
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
  requireEqual(inputs.readiness?.githubArchiveChecksumsComplete, false, "GitHub archive checksum readiness");
  requireEqual(inputs.readiness?.allDownloadedBytesLocked, false, "download byte-lock readiness");
  requireNonEmptyString(inputs.readiness?.note, "source readiness note");

  return { active: expectedActive.length, prebuilt };
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
    ["toolchain-byte-lock", false],
    ["dependency-lock", true],
    ["build-and-runtime-evidence", false],
  ]);
  requireEqual(blockers.length, expectedResolution.size, "knownBlockers length");
  const ids = new Set();
  let unresolved = 0;
  for (const blocker of blockers) {
    requireRecord(blocker, "known blocker");
    requireNonEmptyString(blocker.id, "known blocker id");
    require(!ids.has(blocker.id), `duplicate known blocker id: ${blocker.id}`);
    ids.add(blocker.id);
    require(expectedResolution.has(blocker.id), `unexpected known blocker id: ${blocker.id}`);
    requireEqual(blocker.resolved, expectedResolution.get(blocker.id), `${blocker.id}: resolved`);
    if (!blocker.resolved) unresolved += 1;
    requireNonEmptyString(blocker.description, `${blocker.id}: description`);
  }
  requireEqual(unresolved, 2, "unresolved blocker count");
  requireEqual(identity.buildReady, false, "identity.buildReady with unresolved blockers");
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
      `OK ${result.activeDependencyCount} Android-release dependency identities and ` +
        `${result.lockedPrebuiltCount} prebuilt SHA-256 values are locked`,
    );
    console.log("OK no runtime/archive artifact is present in the experiment directory");
    console.log("NOT BUILD READY: remaining downloaded-byte/toolchain locks, build, ELF audit, and device evidence are open");
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
