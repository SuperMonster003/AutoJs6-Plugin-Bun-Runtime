import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep, win32 } from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(toolDirectory, "../../../..");
const defaultLockPath = resolve(toolDirectory, "distribution-source.lock.json");
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const EXPECTED_VARIANT = "bun-1.4.0-android-api28-patched-experimental";
const EXPECTED_UPSTREAM_COMMIT = "34cbb9a40b4bd1bd767d134a7065e66c2432a676";
const EXPECTED_DOWNSTREAM_COMMIT = "06e518f73b4fccc6c3ffb17412ea166bf886bed0";
const EXPECTED_WEBKIT_COMMIT = "0f966e81b78c84bb23213e391bc679c4ef83e56b";
const REQUIRED_REDISTRIBUTION_FLAGS = Object.freeze([
  "includeBunNotice",
  "includeWebKitLicenseFiles",
  "provideExactBunBaseSource",
  "provideAllDownstreamPatches",
  "provideExactWebKitSource",
  "provideLockedNativeAndRegistrySources",
  "provideBuildAndRelinkInstructions",
  "publishRuntimeAndSourceDigests",
  "doNotRelyOnlyOnUpstreamAvailability",
  "publishLicenseAndRelinkingNotice",
  "requireSameReleaseSourceAssets",
  "requireSha256Manifest",
  "requireAutomatedTechnicalValidation",
]);

export function verifyDistributionSource({
  baseDirectory = toolDirectory,
  repositoryRoot = defaultRepositoryRoot,
  bunSourceArchive,
  webkitRepository,
} = {}) {
  const root = resolve(baseDirectory);
  const repo = resolve(repositoryRoot);
  const lock = readJson(resolveInside(root, "distribution-source.lock.json", "distribution-source lock"));
  verifyDistributionSourceManifest(lock);

  const runtimeEvidence = readJson(resolveInside(root, lock.runtimeEvidence, "runtime evidence"));
  requireEqual(runtimeEvidence.identity?.variant, lock.identity.variant, "runtime evidence variant");
  requireEqual(runtimeEvidence.source?.upstreamCommit, lock.bunSource.baseCommit, "runtime evidence upstream commit");
  requireEqual(runtimeEvidence.source?.downstreamHeadCommit, lock.bunSource.downstreamCommit, "runtime evidence downstream commit");
  requireEqual(
    JSON.stringify(runtimeEvidence.artifacts.map(({ abi, bytes, sha256 }) => ({ abi, bytes, sha256 }))),
    JSON.stringify(lock.artifacts),
    "runtime artifact identities",
  );

  const patchSeries = readJson(resolveInside(root, lock.bunSource.patchSeries, "patch series"));
  requireEqual(patchSeries.downstreamBackport?.baseCommit, lock.bunSource.baseCommit, "patch-series base commit");
  requireEqual(patchSeries.downstreamBackport?.headCommit, lock.bunSource.downstreamCommit, "patch-series head commit");
  requireEqual(patchSeries.downstreamBackport?.headTreeSha1, lock.bunSource.downstreamTreeSha1, "patch-series head tree");
  requireEqual(patchSeries.downstreamBackport?.patches?.length, lock.bunSource.downstreamPatchCount, "patch-series count");
  for (const patch of patchSeries.downstreamBackport.patches) {
    const patchPath = resolveInside(dirname(resolveInside(root, lock.bunSource.patchSeries, "patch series")), patch.path, "downstream patch");
    verifyFile(patchPath, patch.bytes, patch.sha256, `downstream patch ${patch.order}`);
    requireEqual(patch.licenseImpact.startsWith("No license change;"), true, `downstream patch ${patch.order} license review`);
  }

  verifyBuildSourceClosures(root, lock.lockedBuildSourceClosures);
  verifyPackagedLicenses(repo, lock);

  let bunSourceVerified = false;
  if (bunSourceArchive !== undefined) {
    const archivePath = existingRegularFile(bunSourceArchive, "Bun source archive");
    verifyFile(archivePath, lock.bunSource.archive.bytes, lock.bunSource.archive.sha256, "Bun source archive");
    verifyTarRoot(archivePath, lock.bunSource.archive.archiveRoot, "Bun source archive");
    const sourceLicense = extractTarFile(archivePath, `${lock.bunSource.archive.archiveRoot}/${lock.bunSource.licenseSourcePath}`);
    requireEqual(sourceLicense.length, lock.bunSource.licenseSourceBytes, "Bun source license byte count");
    requireEqual(sha256(sourceLicense), lock.bunSource.licenseSourceSha256, "Bun source license SHA-256");
    const packagedLicense = readFileSync(resolveInside(repo, lock.bunNotice.packagedPath, "packaged Bun notice"));
    require(packagedLicense.equals(Buffer.concat([sourceLicense, Buffer.from("\n")])), "packaged Bun notice is not the pinned source text plus one final LF");
    bunSourceVerified = true;
  }

  let webkitSourceVerified = false;
  if (webkitRepository !== undefined) {
    const checkout = existingDirectory(webkitRepository, "WebKit source repository");
    requireEqual(runGit(checkout, ["rev-parse", "HEAD"]), lock.webkitSource.commit, "WebKit checkout commit");
    requireEqual(runGit(checkout, ["rev-parse", "HEAD^{tree}"]), lock.webkitSource.treeSha1, "WebKit checkout tree");
    requireEqual(runGit(checkout, ["describe", "--tags", "--exact-match", "HEAD"]), lock.webkitSource.tag, "WebKit checkout tag");
    requireEqual(runGit(checkout, ["status", "--short"]), "", "WebKit checkout cleanliness");
    const remote = runGit(checkout, ["remote", "get-url", "origin"]);
    require(remote === lock.webkitSource.repository || remote === `${lock.webkitSource.repository}.git`, `WebKit origin drifted: ${remote}`);
    const trackedFiles = runGitBuffer(checkout, ["ls-files", "-z"]);
    requireEqual(countNulRecords(trackedFiles), lock.webkitSource.trackedFileCount, "WebKit tracked-file count");
    for (const license of lock.webkitSource.licenseFiles) {
      const sourcePath = resolveInside(checkout, license.sourcePath, `WebKit license ${license.sourcePath}`);
      const source = verifyFile(sourcePath, license.sourceBytes, license.sourceSha256, `WebKit license ${license.sourcePath}`);
      const packaged = readFileSync(resolveInside(repo, license.packagedPath, `packaged WebKit license ${license.packagedPath}`));
      require(packaged.equals(Buffer.concat([source, Buffer.from("\n")])), `${license.packagedPath}: packaged license is not source text plus one final LF`);
    }
    webkitSourceVerified = true;
  }

  return {
    variant: lock.identity.variant,
    artifactCount: lock.artifacts.length,
    packagedLicenseCount: 1 + lock.webkitSource.licenseFiles.length,
    nativeSourceArchiveCount: lock.lockedBuildSourceClosures.nativeDependencies.githubSourceArchiveCount,
    cargoArchiveCount: lock.lockedBuildSourceClosures.cargo.uniqueArchiveCount,
    bunRegistryArchiveCount: lock.lockedBuildSourceClosures.bunRegistry.selectedLinuxX64ArchiveCount,
    bunSourceVerified,
    webkitSourceVerified,
    distributionReady: lock.identity.distributionReady,
  };
}

export function verifyDistributionSourceManifest(lock) {
  requireEqual(lock?.schemaVersion, 2, "distribution-source schemaVersion");
  requireEqual(lock.identity?.status, "corresponding-source-release-workflow-implemented", "distribution-source status");
  requireEqual(lock.identity?.variant, EXPECTED_VARIANT, "distribution-source variant");
  requireEqual(lock.identity?.officialArtifact, false, "distribution-source official-artifact boundary");
  requireEqual(lock.identity?.sourceClosureReady, true, "distribution-source closure readiness");
  requireEqual(lock.identity?.distributionReady, false, "distribution-source readiness boundary");
  requireEqual(lock.runtimeEvidence, "runtime-evidence.json", "distribution-source runtime evidence path");
  require(Array.isArray(lock.artifacts) && lock.artifacts.length === 2, "distribution-source must identify two runtime artifacts");
  requireEqual(JSON.stringify(lock.artifacts.map((artifact) => artifact.abi)), JSON.stringify(["arm64-v8a", "x86_64"]), "distribution-source ABI order");
  for (const artifact of lock.artifacts) {
    require(Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0, `${artifact.abi}: invalid runtime byte count`);
    require(SHA256.test(artifact.sha256), `${artifact.abi}: invalid runtime SHA-256`);
  }

  requireEqual(lock.bunSource?.repository, "https://github.com/oven-sh/bun", "Bun source repository");
  requireEqual(lock.bunSource?.baseCommit, EXPECTED_UPSTREAM_COMMIT, "Bun source base commit");
  require(SHA1.test(lock.bunSource?.baseTreeSha1), "Bun source base tree is invalid");
  requireEqual(lock.bunSource?.downstreamCommit, EXPECTED_DOWNSTREAM_COMMIT, "Bun downstream commit");
  require(SHA1.test(lock.bunSource?.downstreamTreeSha1), "Bun downstream tree is invalid");
  requireEqual(lock.bunSource?.downstreamPatchCount, 12, "Bun downstream patch count");
  verifyArchiveRecord(lock.bunSource?.archive, "Bun source archive");
  requireEqual(lock.bunSource.archive.url, `https://github.com/oven-sh/bun/archive/${EXPECTED_UPSTREAM_COMMIT}.tar.gz`, "Bun source archive URL");
  requireEqual(lock.bunSource.archive.archiveRoot, `bun-${EXPECTED_UPSTREAM_COMMIT}`, "Bun source archive root");
  require(Number.isSafeInteger(lock.bunSource.licenseSourceBytes) && lock.bunSource.licenseSourceBytes > 0, "Bun source license byte count is invalid");
  require(SHA256.test(lock.bunSource.licenseSourceSha256), "Bun source license SHA-256 is invalid");

  requireEqual(lock.webkitSource?.repository, "https://github.com/oven-sh/WebKit", "WebKit source repository");
  requireEqual(lock.webkitSource?.tag, `autobuild-${EXPECTED_WEBKIT_COMMIT}`, "WebKit source tag");
  requireEqual(lock.webkitSource?.commit, EXPECTED_WEBKIT_COMMIT, "WebKit source commit");
  require(SHA1.test(lock.webkitSource?.treeSha1), "WebKit source tree is invalid");
  require(Number.isSafeInteger(lock.webkitSource?.trackedFileCount) && lock.webkitSource.trackedFileCount > 0, "WebKit tracked-file count is invalid");
  requireEqual(lock.webkitSource?.upstreamGeneratedArchiveAvailable, false, "WebKit upstream generated-archive availability");
  require(typeof lock.webkitSource?.upstreamGeneratedArchiveObservation === "string" && lock.webkitSource.upstreamGeneratedArchiveObservation.length > 0, "WebKit upstream archive observation is missing");
  verifyArchiveRecord(lock.webkitSource?.releaseArchive, "WebKit release source archive");
  requireEqual(lock.webkitSource.releaseArchive.filename, `webkit-${EXPECTED_WEBKIT_COMMIT}.tar.gz`, "WebKit release source filename");
  requireEqual(lock.webkitSource.releaseArchive.format, "git-archive-tar+gzip-level-9", "WebKit release source format");
  requireEqual(lock.webkitSource.releaseArchive.archivePrefix, `webkit-${EXPECTED_WEBKIT_COMMIT}/`, "WebKit release source prefix");
  requireEqual(lock.webkitSource.releaseArchive.generator?.node, "24.3.0", "WebKit release source Node version");
  requireEqual(lock.webkitSource.releaseArchive.generator?.zlib, "1.3.1-470d3a2", "WebKit release source zlib version");
  requireEqual(lock.webkitSource.releaseArchive.generator?.compressionLevel, 9, "WebKit release source compression level");
  requireEqual(lock.webkitSource.releaseArchive.generator?.mtime, 0, "WebKit release source gzip mtime");
  requireEqual(lock.webkitSource.releaseArchive.independentGenerationCount, 2, "WebKit release source repeat count");
  require(Array.isArray(lock.webkitSource?.licenseFiles) && lock.webkitSource.licenseFiles.length === 4, "WebKit license file set is incomplete");
  for (const license of lock.webkitSource.licenseFiles) verifyLicenseRecord(license, "WebKit license");
  verifyLicenseRecord(lock.bunNotice, "Bun notice");

  for (const flag of REQUIRED_REDISTRIBUTION_FLAGS) requireEqual(lock.redistributionRequirements?.[flag], true, `redistribution requirement ${flag}`);
  requireEqual(lock.redistributionRequirements?.legalReviewRequiredByProjectPolicy, false, "project legal-review policy");
  requireEqual(lock.boundaries?.patchedBinaryStoredInRepository, false, "patched-binary repository boundary");
  requireEqual(lock.boundaries?.patchedBinaryPackaged, false, "patched-binary packaging boundary");
  requireEqual(lock.boundaries?.correspondingSourceBundlePublished, false, "corresponding-source publication boundary");
  requireEqual(lock.boundaries?.correspondingSourceReleaseWorkflowImplemented, true, "corresponding-source workflow boundary");
  requireEqual(lock.boundaries?.legalReviewRequiredByProjectPolicy, false, "boundary legal-review policy");
  requireEqual(lock.boundaries?.legalApprovalClaimed, false, "legal-approval boundary");
  requireEqual(lock.boundaries?.distributionReady, false, "distribution boundary");
  require(typeof lock.boundaries?.note === "string" && lock.boundaries.note.length > 0, "distribution boundary note is missing");
  return lock;
}

function verifyBuildSourceClosures(root, closures) {
  const native = readJson(resolveInside(root, closures.nativeDependencies.lock, "native source lock"));
  requireEqual(native.activeDependencies.length, closures.nativeDependencies.activeDependencyCount, "active native dependency count");
  requireEqual(native.activeDependencies.filter((dependency) => dependency.kind === "github-archive").length, closures.nativeDependencies.githubSourceArchiveCount, "native source archive count");
  requireEqual(native.activeDependencies.filter((dependency) => dependency.kind === "prebuilt" && dependency.name === "nodejs").length, closures.nativeDependencies.nodeHeaderSourceArchiveCount, "Node.js header source archive count");
  requireEqual(closures.nativeDependencies.githubSourceArchiveCount + closures.nativeDependencies.nodeHeaderSourceArchiveCount, closures.nativeDependencies.publishedSourceArchiveCount, "published native/header source archive count");
  const prebuilts = native.activeDependencies.reduce((count, dependency) => {
    if (dependency.kind === "prebuilt") return count + 1;
    if (dependency.kind === "prebuilt-matrix") return count + dependency.variants.length;
    return count;
  }, 0);
  requireEqual(prebuilts, closures.nativeDependencies.prebuiltCount, "native prebuilt count");

  const cargo = readJson(resolveInside(root, closures.cargo.lock, "Cargo source lock"));
  requireEqual(cargo.registryPackageReferenceCount, closures.cargo.registryReferenceCount, "Cargo registry reference count");
  requireEqual(cargo.archiveCount, closures.cargo.uniqueArchiveCount, "Cargo source archive count");
  requireEqual(cargo.totalArchiveBytes, closures.cargo.archiveBytes, "Cargo source archive bytes");

  const bun = readJson(resolveInside(root, closures.bunRegistry.lock, "Bun registry source lock"));
  requireEqual(bun.selection.externalReferenceCount, closures.bunRegistry.integrityReferenceCount, "Bun registry reference count");
  requireEqual(bun.archiveCount, closures.bunRegistry.selectedLinuxX64ArchiveCount, "Bun registry source archive count");
  requireEqual(bun.totalArchiveBytes, closures.bunRegistry.archiveBytes, "Bun registry source archive bytes");

  const toolchain = readJson(resolveInside(root, closures.directToolchain.lock, "toolchain lock"));
  requireEqual(toolchain.directDownloads.length, closures.directToolchain.downloadCount, "direct toolchain count");
  const host = readJson(resolveInside(root, closures.hostPackages.lock, "host-package lock"));
  requireEqual(host.packages.length, closures.hostPackages.archiveCount, "host-package archive count");
  requireEqual(host.readiness.archiveBytes, closures.hostPackages.archiveBytes, "host-package archive bytes");
}

function verifyPackagedLicenses(repositoryRoot, lock) {
  verifyFile(
    resolveInside(repositoryRoot, lock.bunNotice.packagedPath, "packaged Bun notice"),
    lock.bunNotice.packagedBytes,
    lock.bunNotice.packagedSha256,
    "packaged Bun notice",
  );
  for (const license of lock.webkitSource.licenseFiles) {
    verifyFile(
      resolveInside(repositoryRoot, license.packagedPath, `packaged WebKit license ${license.packagedPath}`),
      license.packagedBytes,
      license.packagedSha256,
      `packaged WebKit license ${license.packagedPath}`,
    );
  }
}

function verifyArchiveRecord(archive, label) {
  require(archive && typeof archive === "object" && !Array.isArray(archive), `${label} is missing`);
  require(typeof archive.id === "string" && archive.id.length > 0, `${label} id is missing`);
  require(typeof archive.filename === "string" && !/[\\/\0\r\n]/.test(archive.filename), `${label} filename is invalid`);
  require(Number.isSafeInteger(archive.bytes) && archive.bytes > 0, `${label} byte count is invalid`);
  require(SHA256.test(archive.sha256), `${label} SHA-256 is invalid`);
}

function verifyLicenseRecord(record, label) {
  require(record && typeof record === "object" && !Array.isArray(record), `${label} record is missing`);
  require(typeof record.sourcePath === "string" && record.sourcePath.length > 0, `${label} source path is missing`);
  require(Number.isSafeInteger(record.sourceBytes) && record.sourceBytes > 0, `${label} source byte count is invalid`);
  require(SHA256.test(record.sourceSha256), `${label} source SHA-256 is invalid`);
  require(typeof record.packagedPath === "string" && record.packagedPath.length > 0, `${label} packaged path is missing`);
  require(Number.isSafeInteger(record.packagedBytes) && record.packagedBytes === record.sourceBytes + 1, `${label} packaged byte count is invalid`);
  require(SHA256.test(record.packagedSha256), `${label} packaged SHA-256 is invalid`);
  requireEqual(record.normalization, "packaged copy adds one final LF", `${label} normalization`);
}

function verifyTarRoot(path, expectedRoot, label) {
  const tar = process.platform === "win32" && process.env.SystemRoot
    ? resolve(process.env.SystemRoot, "System32", "tar.exe")
    : "tar";
  const result = spawnSync(tar, ["-tzf", path], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024, windowsHide: true });
  require(result.status === 0, `${label} listing failed: ${result.stderr.trim()}`);
  const prefix = `${expectedRoot}/`;
  const entries = result.stdout.split(/\r?\n/).filter(Boolean);
  require(entries.length > 0, `${label} is empty`);
  for (const entry of entries) {
    require(!entry.startsWith("/") && !entry.includes("\0"), `${label} contains unsafe entry ${entry}`);
    require(entry === expectedRoot || entry === prefix || entry.startsWith(prefix), `${label} entry escapes the expected root: ${entry}`);
    require(!entry.split("/").includes(".."), `${label} contains traversal entry ${entry}`);
  }
}

function extractTarFile(path, entry) {
  const tar = process.platform === "win32" && process.env.SystemRoot
    ? resolve(process.env.SystemRoot, "System32", "tar.exe")
    : "tar";
  const result = spawnSync(tar, ["-xOzf", path, entry], { encoding: null, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  require(result.status === 0, `cannot extract ${entry}: ${Buffer.from(result.stderr ?? []).toString("utf8").trim()}`);
  return Buffer.from(result.stdout);
}

function runGit(directory, args) {
  return runGitBuffer(directory, args).toString("utf8").trim();
}

function runGitBuffer(directory, args) {
  const result = spawnSync("git", ["-C", directory, ...args], {
    encoding: null,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  require(result.status === 0, `git ${args.join(" ")} failed: ${Buffer.from(result.stderr ?? []).toString("utf8").trim()}`);
  return Buffer.from(result.stdout);
}

function countNulRecords(data) {
  let count = 0;
  for (const byte of data) if (byte === 0) count += 1;
  return count;
}

function verifyFile(path, bytes, digest, label) {
  const file = existingRegularFile(path, label);
  const data = readFileSync(file);
  requireEqual(data.length, bytes, `${label} byte count`);
  requireEqual(sha256(data), digest, `${label} SHA-256`);
  return data;
}

function existingRegularFile(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} is required`);
  require(isAbsolute(value) || win32.isAbsolute(value), `${label} must be absolute`);
  const path = resolve(value);
  const stat = lstatSync(path);
  require(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular non-symlink file: ${path}`);
  return path;
}

function existingDirectory(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} is required`);
  require(isAbsolute(value) || win32.isAbsolute(value), `${label} must be absolute`);
  const path = resolve(value);
  const stat = lstatSync(path);
  require(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a non-symlink directory: ${path}`);
  return path;
}

function resolveInside(root, candidate, label) {
  require(typeof candidate === "string" && candidate.length > 0 && !isAbsolute(candidate) && !win32.isAbsolute(candidate), `${label} must be repository-relative`);
  const result = resolve(root, candidate);
  const rel = relative(root, result);
  require(rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), `${label} escapes its root`);
  return result;
}

function readJson(path) {
  require(existsSync(path), `missing JSON file: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`, { cause: error });
  }
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function requireEqual(actual, expected, label) {
  require(Object.is(actual, expected), `${label}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArguments(argv) {
  const values = Object.create(null);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), USAGE.trim());
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
  }
  const allowed = new Set(["--bun-source-archive", "--webkit-repository"]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  return {
    bunSourceArchive: values["--bun-source-archive"],
    webkitRepository: values["--webkit-repository"],
  };
}

const USAGE = `
Usage: node verify-distribution-source.mjs [--bun-source-archive <absolute-tar.gz>] [--webkit-repository <absolute-clean-checkout>]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyDistributionSource(parseArguments(process.argv.slice(2)));
    console.log(`OK ${result.packagedLicenseCount} packaged Bun/WebKit license files match the locked source records`);
    console.log(
      `OK source closure: ${result.nativeSourceArchiveCount} native archives, ` +
        `${result.cargoArchiveCount} Cargo archives, ${result.bunRegistryArchiveCount} Bun registry archives`,
    );
    if (result.bunSourceVerified) console.log("OK exact Bun base source archive and bundled notice are verified");
    if (result.webkitSourceVerified) console.log("OK exact WebKit/JSC checkout, licenses, tag, commit, tree, and file count are verified");
    console.log(`OPEN RELEASE GATE: ${result.variant} remains distributionReady=${result.distributionReady}`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
