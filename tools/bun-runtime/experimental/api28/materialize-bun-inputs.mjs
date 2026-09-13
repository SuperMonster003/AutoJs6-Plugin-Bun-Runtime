import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep, win32 } from "node:path";
import { tmpdir } from "node:os";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import {
  prepareOutputDirectory,
  verifyRegularFile,
} from "./materialize-source-inputs.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const defaultLockPath = resolve(toolDirectory, "bun-inputs.lock.json");
const EXPECTED_BUN_COMMIT = "06e518f73b4fccc6c3ffb17412ea166bf886bed0";
const EXPECTED_LOCKFILES = Object.freeze([
  Object.freeze({
    directory: ".",
    path: "bun.lock",
    bytes: 15271,
    gitBlobSha1: "6ccdf254cb0b4f377632cb72c9da4969d313a34b",
    sha256: "49d0dd03629473c0c264e85c003adb0f713f27abdda80a371f137781f71104fa",
    packageEntryCount: 62,
    sha512IntegrityCount: 60,
    workspaceEntryCount: 2,
  }),
  Object.freeze({
    directory: "packages/bun-error",
    path: "packages/bun-error/bun.lock",
    bytes: 319,
    gitBlobSha1: "3081551fc3b46ab721804fe91612e04ae6202c6a",
    sha256: "e5f358227dd67c5c14ddbe5fe3348e2fbffb1399382909eda00e606b178a313d",
    packageEntryCount: 1,
    sha512IntegrityCount: 1,
    workspaceEntryCount: 0,
  }),
  Object.freeze({
    directory: "src/node-fallbacks",
    path: "src/node-fallbacks/bun.lock",
    bytes: 25135,
    gitBlobSha1: "a34d182b48ef4dccbc26412e9b79352e277ca2a4",
    sha256: "f2694f1fbc8689075bf005d90cecaeb393967cf96b735a8315198144278ea11d",
    packageEntryCount: 111,
    sha512IntegrityCount: 111,
    workspaceEntryCount: 0,
  }),
]);
const EXPECTED_COUNTS = Object.freeze({
  packageEntries: 174,
  externalReferences: 172,
  workspaceReferences: 2,
  uniqueExternalPackages: 164,
  selectedReferences: 133,
  selectedPackages: 125,
  excludedReferences: 39,
  excludedPackages: 39,
});
const REGISTRY_ORIGIN = "https://registry.npmjs.org";
const TARGET_OS = "linux";
const TARGET_CPU = "x64";
const CACHE_VERSION = 1;
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const PACKAGE_NAME = /^(?:@[A-Za-z0-9._~-]+\/)?[A-Za-z0-9._~-]+$/;
const PACKAGE_VERSION = /^[0-9A-Za-z][0-9A-Za-z.+_-]*$/;
const ALLOWED_FINAL_HOSTS = new Set(["registry.npmjs.org"]);
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const LIFECYCLE_KEYS = Object.freeze(["preinstall", "install", "postinstall"]);

export async function materializeBunInputs({
  outputDirectory,
  offline = false,
  prepareCache = false,
  lockPath = defaultLockPath,
} = {}) {
  require(typeof outputDirectory === "string" && outputDirectory.length > 0, "An output directory is required");
  const outputRoot = prepareOutputDirectory(outputDirectory);
  const archiveDirectory = prepareOutputDirectory(join(outputRoot, "archives"));
  const lock = readJson(lockPath);
  const artifacts = collectBunArtifacts(lock);

  const results = [];
  for (const artifact of artifacts) {
    const target = join(archiveDirectory, artifact.filename);
    if (existsSync(target)) {
      verifyRegularFile(target, `${artifact.id}: Bun registry archive`);
      await verifyBunArchive(target, artifact);
      results.push({ ...artifact, path: target, source: "existing" });
      continue;
    }
    require(!offline, `${artifact.id}: locked Bun registry archive is absent in offline mode`);
    await downloadLockedBunArchive(target, artifact);
    results.push({ ...artifact, path: target, source: "downloaded" });
  }

  const cache = prepareCache
    ? await prepareBunCache({
      archiveDirectory,
      cacheDirectory: join(outputRoot, "cache"),
      artifacts,
    })
    : null;
  return { outputRoot, artifacts: results, cache };
}

export function collectBunArtifacts(lock) {
  requireRecord(lock, "Bun input lock");
  require(lock.schemaVersion === 1, "Unsupported Bun input lock schema");
  require(/^\d{4}-\d{2}-\d{2}$/.test(lock.snapshotDate ?? ""), "Bun input snapshot date is invalid");
  require(lock.bunCommit === EXPECTED_BUN_COMMIT, "Bun input commit does not match the downstream backport");
  verifyLockfileRecords(lock.lockfiles);
  requireRecord(lock.bootstrapBun, "bootstrap Bun identity");
  require(lock.bootstrapBun.version === "1.3.13", "bootstrap Bun version is invalid");
  require(lock.bootstrapBun.revision === "1.3.13+bf2e2cecf", "bootstrap Bun revision is invalid");
  require(lock.bootstrapBun.cacheVersion === CACHE_VERSION, "bootstrap Bun cache version is invalid");
  require(lock.command === "bun install --frozen-lockfile", "Bun install command is invalid");
  verifySelectionRecord(lock.selection);
  verifyRegistryRecord(lock.registry);
  require(Array.isArray(lock.archives), "Bun input lock has no archives array");

  const artifacts = lock.archives.map(normalizeLockedArtifact);
  require(artifacts.length === EXPECTED_COUNTS.selectedPackages, "Bun archive count does not match the pinned Linux x64 package set");
  require(lock.archiveCount === artifacts.length, "Bun archive count does not match the archive list");
  require(
    lock.totalArchiveBytes === artifacts.reduce((total, artifact) => total + artifact.bytes, 0),
    "Bun total archive byte count does not match the archive list",
  );
  const identities = new Set();
  const filenames = new Set();
  const urls = new Set();
  const cacheDirectories = new Set();
  const selectedIdentities = new Set();
  const lockfileReferenceKeys = new Set();
  let selectedReferenceCount = 0;
  let previousSortKey = null;
  for (const artifact of artifacts) {
    require(!identities.has(artifact.id), `Duplicate Bun package identity: ${artifact.id}`);
    require(!filenames.has(artifact.filename), `Duplicate Bun archive filename: ${artifact.filename}`);
    require(!urls.has(artifact.url), `Duplicate Bun archive URL: ${artifact.url}`);
    require(!cacheDirectories.has(artifact.cacheDirectory), `Duplicate Bun cache directory: ${artifact.cacheDirectory}`);
    const sortKey = `${artifact.name}\0${artifact.version}`;
    require(previousSortKey === null || previousSortKey < sortKey, `Bun archives are not strictly sorted at ${artifact.id}`);
    previousSortKey = sortKey;
    identities.add(artifact.id);
    filenames.add(artifact.filename);
    urls.add(artifact.url);
    cacheDirectories.add(artifact.cacheDirectory);
    selectedIdentities.add(`${artifact.name}@${artifact.version}`);
    for (const reference of artifact.lockfileReferences) {
      for (const key of reference.keys) {
        const referenceKey = `${reference.path}\0${key}`;
        require(!lockfileReferenceKeys.has(referenceKey), `${artifact.id}: duplicate Bun lockfile reference ${reference.path}:${key}`);
        lockfileReferenceKeys.add(referenceKey);
        selectedReferenceCount += 1;
      }
    }
  }
  require(selectedReferenceCount === lock.selection.selectedReferenceCount, "Bun selected lockfile reference count does not match the archive list");
  for (const identity of lock.selection.excludedPackageIdentities) {
    require(!selectedIdentities.has(identity), `Bun package is both selected and excluded: ${identity}`);
  }
  verifyLifecycleRecord(lock.lifecycle, artifacts);
  verifyCacheRecord(lock.cache, artifacts);
  verifyOfflineReplay(lock.offlineReplay);
  require(lock.readiness?.lockfileSelectionResolved === true, "Bun lockfile platform selection is not resolved");
  require(lock.readiness?.registryTarballUrlsLocked === true, "Bun registry tarball URLs are not locked");
  require(lock.readiness?.archiveByteCountsLocked === true, "Bun archive byte counts are not locked");
  require(lock.readiness?.archivesMaterializedAndVerified === true, "Bun archives are not recorded as materialized");
  require(lock.readiness?.minimalOfflineCacheReady === true, "Bun minimal offline cache is not ready");
  require(lock.readiness?.networkDisabledReplayPassed === true, "Bun network-disabled replay has not passed");
  return artifacts;
}

export function parseBunLock(contents, label = "bun.lock") {
  require(typeof contents === "string" && contents.length > 0, `${label}: contents are required`);
  let parsed;
  try {
    parsed = JSON.parse(stripTrailingCommas(contents));
  } catch (error) {
    throw new Error(`${label}: cannot parse Bun text lockfile: ${error.message}`, { cause: error });
  }
  requireRecord(parsed, `${label}: root`);
  require(parsed.lockfileVersion === 1, `${label}: lockfileVersion must be 1`);
  requireRecord(parsed.packages, `${label}: packages`);
  const entries = [];
  let externalReferenceCount = 0;
  let workspaceReferenceCount = 0;
  for (const [key, value] of Object.entries(parsed.packages)) {
    require(typeof key === "string" && key.length > 0, `${label}: package key is empty`);
    require(Array.isArray(value) && value.length > 0, `${label}: ${key} has an invalid package tuple`);
    require(typeof value[0] === "string", `${label}: ${key} has an invalid resolution`);
    const identity = parsePackageIdentity(value[0], `${label}: ${key}`);
    if (identity.workspace) {
      require(value.length === 1, `${label}: ${key} workspace tuple has unexpected fields`);
      workspaceReferenceCount += 1;
      entries.push(Object.freeze({ key, ...identity, selected: false }));
      continue;
    }
    require(value.length === 4, `${label}: ${key} registry tuple must have four fields`);
    require(value[1] === "", `${label}: ${key} has an unexpected registry field`);
    requireRecord(value[2], `${label}: ${key} metadata`);
    const metadata = value[2];
    for (const field of ["os", "cpu"]) {
      if (metadata[field] !== undefined) {
        require(typeof metadata[field] === "string" && metadata[field].length > 0, `${label}: ${key} has an invalid ${field}`);
      }
    }
    const integrity = normalizeIntegrity(value[3], `${label}: ${key}`);
    const selected = matchesTarget(metadata.os, TARGET_OS) && matchesTarget(metadata.cpu, TARGET_CPU);
    externalReferenceCount += 1;
    entries.push(Object.freeze({
      key,
      ...identity,
      integrity,
      os: metadata.os ?? null,
      cpu: metadata.cpu ?? null,
      selected,
    }));
  }
  return Object.freeze({
    packageEntryCount: entries.length,
    externalReferenceCount,
    workspaceReferenceCount,
    entries: Object.freeze(entries),
  });
}

export async function resolveBunInputs({
  bunRepository,
  observedCacheDirectory,
  outputDirectory,
  prepareCache = false,
  onProgress = () => {},
} = {}) {
  require(typeof bunRepository === "string" && bunRepository.length > 0, "A Bun repository is required");
  require(typeof observedCacheDirectory === "string" && observedCacheDirectory.length > 0, "An observed Bun cache directory is required");
  require(typeof outputDirectory === "string" && outputDirectory.length > 0, "An output directory is required");
  require(typeof onProgress === "function", "onProgress must be a function");
  const repository = verifyBunRepository(bunRepository);
  const parsedLocks = [];
  for (const expected of EXPECTED_LOCKFILES) {
    const path = resolveInside(repository, expected.path, `${expected.path}: lockfile`);
    const bytes = readFileSync(path);
    require(bytes.length === expected.bytes, `${expected.path}: byte count drifted`);
    require(sha256(bytes) === expected.sha256, `${expected.path}: SHA-256 drifted`);
    require(runGit(repository, ["hash-object", expected.path]) === expected.gitBlobSha1, `${expected.path}: Git blob drifted`);
    const parsed = parseBunLock(bytes.toString("utf8"), expected.path);
    require(parsed.packageEntryCount === expected.packageEntryCount, `${expected.path}: package entry count drifted`);
    require(parsed.externalReferenceCount === expected.sha512IntegrityCount, `${expected.path}: integrity entry count drifted`);
    require(parsed.workspaceReferenceCount === expected.workspaceEntryCount, `${expected.path}: workspace entry count drifted`);
    parsedLocks.push({ expected, parsed });
  }

  const selection = aggregateSelections(parsedLocks);
  verifyExpectedCounts(selection);
  const observed = await inspectObservedCache(observedCacheDirectory, selection.selectedPackages);
  const outputRoot = prepareOutputDirectory(outputDirectory);
  const archiveDirectory = prepareOutputDirectory(join(outputRoot, "archives"));
  const archives = [];
  for (let index = 0; index < selection.selectedPackages.length; index += 1) {
    const selected = selection.selectedPackages[index];
    const identity = createArchiveIdentity(selected);
    const target = join(archiveDirectory, identity.filename);
    let source;
    if (existsSync(target)) {
      verifyRegularFile(target, `${identity.id}: Bun registry archive`);
      await verifyResolutionArchive(target, identity);
      source = "existing";
    } else {
      await downloadResolutionArchive(target, identity);
      source = "downloaded";
    }
    const inspection = await inspectNpmArchive(target, identity);
    const observedPackage = observed.get(identity.id);
    require(observedPackage !== undefined, `${identity.id}: no observed Bun cache package was matched`);
    require(inspection.treeSha256 === observedPackage.treeSha256, `${identity.id}: archive extraction differs from Bun's observed cache`);
    require(inspection.fileCount === observedPackage.fileCount, `${identity.id}: observed cache file count differs from the archive`);
    require(inspection.directoryCount === observedPackage.directoryCount, `${identity.id}: observed cache directory count differs from the archive`);
    const bytes = lstatSync(target).size;
    const archive = Object.freeze({
      id: identity.id,
      name: identity.name,
      version: identity.version,
      manifestVersion: inspection.manifestVersion,
      filename: identity.filename,
      url: identity.url,
      bytes,
      sha512: identity.sha512,
      sha256: await sha256File(target),
      archiveRoot: inspection.archiveRoot,
      cacheDirectory: observedPackage.cacheDirectory,
      fileCount: inspection.fileCount,
      directoryCount: inspection.directoryCount,
      treeSha256: inspection.treeSha256,
      requiredExecutableFiles: inspection.executableFiles,
      lifecycleScripts: inspection.lifecycleScripts,
      lockfileReferences: selected.lockfileReferences,
    });
    archives.push(archive);
    onProgress({ index: index + 1, total: selection.selectedPackages.length, artifact: archive, source });
  }

  let cache = null;
  if (prepareCache) {
    cache = await prepareBunCache({
      archiveDirectory,
      cacheDirectory: join(outputRoot, "cache"),
      artifacts: archives,
    });
  }
  const lifecyclePackages = archives
    .filter((archive) => Object.keys(archive.lifecycleScripts).length > 0)
    .map((archive) => ({
      name: archive.name,
      version: archive.version,
      scripts: archive.lifecycleScripts,
      trust: archive.name === "esbuild" ? "bun-default-trusted" : "not-observed",
    }));
  require(lifecyclePackages.length === 1 && lifecyclePackages[0].name === "esbuild", "Unexpected dependency lifecycle scripts were found");

  return {
    schemaVersion: 1,
    snapshotDate: "2026-09-03",
    bunCommit: EXPECTED_BUN_COMMIT,
    bootstrapBun: {
      version: "1.3.13",
      revision: "1.3.13+bf2e2cecf",
      cacheVersion: CACHE_VERSION,
    },
    command: "bun install --frozen-lockfile",
    lockfiles: EXPECTED_LOCKFILES.map((lockfile) => ({ ...lockfile })),
    selection: {
      target: { os: TARGET_OS, cpu: TARGET_CPU },
      rule: "An npm record is selected when each present Bun lockfile os/cpu field exactly matches linux/x64; absent fields match. Bun lockfiles have no libc field, so both x64 GNU and musl bindings are selected.",
      packageEntryCount: selection.packageEntryCount,
      externalReferenceCount: selection.externalReferenceCount,
      workspaceReferenceCount: selection.workspaceReferenceCount,
      uniqueExternalPackageCount: selection.uniqueExternalPackageCount,
      selectedReferenceCount: selection.selectedReferenceCount,
      selectedUniquePackageCount: selection.selectedPackages.length,
      excludedReferenceCount: selection.excludedReferenceCount,
      excludedUniquePackageCount: selection.excludedPackages.length,
      excludedPackageIdentities: selection.excludedPackages.map((entry) => entry.id),
    },
    registry: {
      origin: REGISTRY_ORIGIN,
      tarballUrlPattern: "https://registry.npmjs.org/{name}/-/{basename}-{version}.tgz",
      integrityAlgorithm: "sha512",
    },
    archiveCount: archives.length,
    totalArchiveBytes: archives.reduce((total, archive) => total + archive.bytes, 0),
    archives,
    lifecycle: {
      dependencyScriptKeys: [...LIFECYCLE_KEYS],
      packageCount: lifecyclePackages.length,
      packages: lifecyclePackages,
      observedUntrustedPackageCount: 0,
      observationCommand: "bun pm untrusted",
      note: "Only esbuild@0.21.5 contains a dependency install lifecycle script. Bun 1.3.13 reports zero untrusted scripted dependencies and treats esbuild as default-trusted.",
    },
    cache: {
      layout: "bun-v1-version-directories",
      directoryName: "cache",
      packageCount: archives.length,
      containsAliasSymlinks: false,
      materializer: "materialize-bun-inputs.mjs --prepare-cache",
      archiveExtractionComparedWithObservedBunCache: true,
      materialized: cache !== null,
    },
    offlineReplay: {
      passed: false,
      networkMode: "docker --network none",
      containerImage: "ubuntu:20.04",
      containerDigest: "sha256:8feb4d8ca5354def3d8fce243717141ce31e2c428701f6682bd2fafe15388214",
      cacheFilesystem: null,
      bootstrapBunVersion: "1.3.13",
      bootstrapBunExecutableSha256: null,
      nodeVersion: "v24.3.0",
      nodeExecutableSha256: null,
      cacheReadOnly: false,
      directories: EXPECTED_LOCKFILES.map((lockfile) => lockfile.directory),
      reportedInstallCounts: [],
      untrustedScriptedPackageCount: null,
      lockfilesUnchanged: false,
      cleanGitTree: false,
      esbuildProbe: null,
      note: "Set only after the project-materialized cache passes all three frozen installs with container networking disabled.",
    },
    readiness: {
      lockfileSelectionResolved: true,
      registryTarballUrlsLocked: true,
      archiveByteCountsLocked: true,
      archivesMaterializedAndVerified: true,
      minimalOfflineCacheReady: cache !== null,
      networkDisabledReplayPassed: false,
    },
  };
}

export async function prepareBunCache({ archiveDirectory, cacheDirectory, artifacts } = {}) {
  require(process.platform !== "win32", "Preparing a Bun cache requires a mode-preserving Linux filesystem; run this step in WSL/Linux outside /mnt/<drive>");
  require(typeof archiveDirectory === "string" && archiveDirectory.length > 0, "A Bun archive directory is required");
  require(typeof cacheDirectory === "string" && cacheDirectory.length > 0, "A Bun cache directory is required");
  require(Array.isArray(artifacts) && artifacts.length > 0, "Bun artifacts are required");
  const archiveRoot = realpathDirectory(archiveDirectory, "Bun archive directory");
  const target = resolve(cacheDirectory);
  const parent = prepareOutputDirectory(dirname(target));
  require(dirname(target) === parent, "The Bun cache parent must be a real directory");
  if (existsSync(target)) {
    await verifyBunCache(target, artifacts);
    return { path: realpathSync(target), source: "existing", packageCount: artifacts.length };
  }

  const staging = `${target}.partial-${process.pid}`;
  require(dirname(staging) === parent && basename(staging).startsWith(`${basename(target)}.partial-`), "The Bun cache staging path is unsafe");
  require(!existsSync(staging), `Bun cache staging path already exists: ${staging}`);
  mkdirSync(staging);
  try {
    for (const artifact of artifacts) {
      const archive = join(archiveRoot, artifact.filename);
      verifyRegularFile(archive, `${artifact.id}: Bun registry archive`);
      await verifyBunArchive(archive, artifact);
      const tarRoot = inspectTarEntries(archive, artifact);
      require(tarRoot === artifact.archiveRoot, `${artifact.id}: npm archive root drifted`);
      const packageDirectory = resolveInside(staging, artifact.cacheDirectory, `${artifact.id}: cache directory`);
      require(!existsSync(packageDirectory), `${artifact.id}: duplicate cache directory`);
      mkdirSync(packageDirectory, { recursive: true });
      extractNpmTarball(archive, packageDirectory, artifact);
      await verifyExtractedPackage(packageDirectory, artifact, true);
    }
    await verifyBunCache(staging, artifacts);
    require(!existsSync(target), "The Bun cache directory appeared while it was being prepared");
    renameSync(staging, target);
    return { path: realpathSync(target), source: "created", packageCount: artifacts.length };
  } catch (error) {
    if (existsSync(staging)) rmSync(staging, { force: true, recursive: true });
    throw error;
  }
}

export async function verifyBunCache(cacheDirectory, artifacts) {
  const cacheRoot = realpathDirectory(cacheDirectory, "Bun cache directory");
  const expectedRoots = artifacts.map((artifact) => artifact.cacheDirectory).sort();
  const observedRoots = discoverCachePackageRoots(cacheRoot);
  require(JSON.stringify(observedRoots) === JSON.stringify(expectedRoots), "Bun cache package directories do not match the locked Linux x64 set");
  for (const artifact of artifacts) {
    const packageDirectory = resolveInside(cacheRoot, artifact.cacheDirectory, `${artifact.id}: cache directory`);
    await verifyExtractedPackage(packageDirectory, artifact, process.platform !== "win32");
  }
  return { path: cacheRoot, packageCount: artifacts.length };
}

export async function verifyBunArchive(path, artifact) {
  verifyRegularFile(path, `${artifact.id}: Bun registry archive`);
  const stat = lstatSync(path);
  require(stat.size === artifact.bytes, `${artifact.id}: expected ${artifact.bytes} bytes, found ${stat.size}`);
  const [sha512Digest, sha256Digest] = await hashFile(path);
  require(`sha512-${sha512Digest}` === artifact.sha512, `${artifact.id}: SHA-512 integrity drifted`);
  require(sha256Digest === artifact.sha256, `${artifact.id}: SHA-256 drifted`);
  return { bytes: stat.size, sha512: `sha512-${sha512Digest}`, sha256: sha256Digest };
}

function aggregateSelections(parsedLocks) {
  let packageEntryCount = 0;
  let externalReferenceCount = 0;
  let workspaceReferenceCount = 0;
  let selectedReferenceCount = 0;
  const packages = new Map();
  for (const { expected, parsed } of parsedLocks) {
    packageEntryCount += parsed.packageEntryCount;
    externalReferenceCount += parsed.externalReferenceCount;
    workspaceReferenceCount += parsed.workspaceReferenceCount;
    for (const entry of parsed.entries) {
      if (entry.workspace) continue;
      if (entry.selected) selectedReferenceCount += 1;
      const id = `${entry.name}@${entry.version}`;
      const existing = packages.get(id);
      if (existing === undefined) {
        packages.set(id, {
          id,
          name: entry.name,
          version: entry.version,
          integrity: entry.integrity,
          selected: entry.selected,
          os: entry.os,
          cpu: entry.cpu,
          references: new Map([[expected.path, [entry.key]]]),
        });
      } else {
        require(existing.integrity === entry.integrity, `${id}: duplicate lock references disagree on integrity`);
        require(existing.selected === entry.selected, `${id}: duplicate lock references disagree on platform selection`);
        require(existing.os === entry.os && existing.cpu === entry.cpu, `${id}: duplicate lock references disagree on platform metadata`);
        const keys = existing.references.get(expected.path) ?? [];
        keys.push(entry.key);
        existing.references.set(expected.path, keys);
      }
    }
  }
  const normalized = [...packages.values()].map((entry) => Object.freeze({
    id: entry.id,
    name: entry.name,
    version: entry.version,
    integrity: entry.integrity,
    selected: entry.selected,
    os: entry.os,
    cpu: entry.cpu,
    lockfileReferences: EXPECTED_LOCKFILES
      .filter((lockfile) => entry.references.has(lockfile.path))
      .map((lockfile) => ({
        path: lockfile.path,
        keys: [...entry.references.get(lockfile.path)].sort(),
      })),
  })).sort(comparePackageIdentity);
  return Object.freeze({
    packageEntryCount,
    externalReferenceCount,
    workspaceReferenceCount,
    uniqueExternalPackageCount: normalized.length,
    selectedReferenceCount,
    selectedPackages: Object.freeze(normalized.filter((entry) => entry.selected)),
    excludedReferenceCount: externalReferenceCount - selectedReferenceCount,
    excludedPackages: Object.freeze(normalized.filter((entry) => !entry.selected)),
  });
}

async function inspectObservedCache(cacheDirectory, selectedPackages) {
  const root = realpathDirectory(cacheDirectory, "Observed Bun cache directory");
  const roots = discoverCachePackageRoots(root);
  require(roots.length === selectedPackages.length, `Observed Bun cache has ${roots.length} packages; expected ${selectedPackages.length}`);
  const candidatesByName = new Map();
  for (const cacheDirectoryPath of roots) {
    const packageDirectory = resolveInside(root, cacheDirectoryPath, "observed cache package");
    const manifest = readPackageManifest(packageDirectory, "observed cache package");
    const tree = await calculatePackageTree(packageDirectory);
    const candidates = candidatesByName.get(manifest.name) ?? [];
    candidates.push({ cacheDirectory: cacheDirectoryPath, manifestVersion: manifest.version, ...tree });
    candidatesByName.set(manifest.name, candidates);
  }
  const result = new Map();
  for (const selected of selectedPackages) {
    const candidates = candidatesByName.get(selected.name) ?? [];
    let matching = candidates.filter((candidate) => candidate.manifestVersion === selected.version && !candidate.consumed);
    if (matching.length === 0) matching = candidates.filter((candidate) => !candidate.consumed);
    require(matching.length === 1, `${selected.id}: cannot uniquely match the observed Bun cache directory`);
    const candidate = matching[0];
    candidate.consumed = true;
    result.set(`npm:${selected.id}`, Object.freeze(candidate));
  }
  for (const candidates of candidatesByName.values()) {
    require(candidates.every((candidate) => candidate.consumed), "Observed Bun cache contains an unmatched package directory");
  }
  return result;
}

async function inspectNpmArchive(path, identity) {
  const archiveRoot = inspectTarEntries(path, identity);
  const root = mkdtempSync(resolve(tmpdir(), "autojs6-bun-archive-"));
  try {
    const packageDirectory = resolve(root, "package");
    mkdirSync(packageDirectory);
    extractNpmTarball(path, packageDirectory, identity);
    const manifest = readPackageManifest(packageDirectory, identity.id);
    require(manifest.name === identity.name, `${identity.id}: archive manifest package name is ${JSON.stringify(manifest.name)}`);
    const tree = await calculatePackageTree(packageDirectory);
    return Object.freeze({
      archiveRoot,
      manifestVersion: manifest.version,
      lifecycleScripts: collectLifecycleScripts(manifest),
      ...tree,
    });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

function inspectTarEntries(path, artifact) {
  const tarExecutable = tarPath();
  const names = spawnSync(tarExecutable, ["-tzf", path], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (names.error) throw names.error;
  require(names.status === 0, `${artifact.id}: npm archive listing failed: ${names.stderr.trim()}`);
  const entries = names.stdout.split(/\r?\n/).filter(Boolean);
  require(entries.length > 0, `${artifact.id}: npm archive is empty`);
  let archiveRoot = null;
  for (const rawEntry of entries) {
    const entry = rawEntry.replace(/^\.\//, "").replace(/\/$/, "");
    require(entry.length > 0 && !entry.startsWith("/") && !entry.includes("\\") && !entry.includes("\0"), `${artifact.id}: unsafe npm archive entry ${rawEntry}`);
    require(!entry.split("/").includes(".."), `${artifact.id}: parent traversal in npm archive entry ${rawEntry}`);
    const root = entry.split("/", 1)[0];
    require(/^[A-Za-z0-9@._~-]+$/.test(root), `${artifact.id}: npm archive root is unsafe: ${root}`);
    if (archiveRoot === null) archiveRoot = root;
    require(root === archiveRoot, `${artifact.id}: npm archive has multiple top-level directories`);
  }
  const verbose = spawnSync(tarExecutable, ["-tvzf", path], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (verbose.error) throw verbose.error;
  require(verbose.status === 0, `${artifact.id}: verbose npm archive listing failed: ${verbose.stderr.trim()}`);
  const typedEntries = verbose.stdout.split(/\r?\n/).filter(Boolean);
  require(typedEntries.length === entries.length, `${artifact.id}: npm archive listings disagree`);
  for (const entry of typedEntries) require(entry[0] === "-" || entry[0] === "d", `${artifact.id}: npm archive contains a link or special entry`);
  return archiveRoot;
}

function extractNpmTarball(path, outputDirectory, artifact) {
  const result = spawnSync(tarPath(), ["-xzf", path, "--strip-components=1", "-C", outputDirectory], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  require(result.status === 0, `${artifact.id}: npm archive extraction failed: ${result.stderr.trim()}`);
}

async function verifyExtractedPackage(packageDirectory, artifact, verifyExecutableModes) {
  const root = realpathDirectory(packageDirectory, `${artifact.id}: extracted package directory`);
  const manifest = readPackageManifest(root, artifact.id);
  require(manifest.name === artifact.name, `${artifact.id}: extracted package name drifted`);
  require(manifest.version === artifact.manifestVersion, `${artifact.id}: extracted manifest version drifted`);
  const lifecycleScripts = collectLifecycleScripts(manifest);
  require(JSON.stringify(lifecycleScripts) === JSON.stringify(artifact.lifecycleScripts), `${artifact.id}: lifecycle scripts drifted`);
  const tree = await calculatePackageTree(root);
  require(tree.fileCount === artifact.fileCount, `${artifact.id}: extracted file count drifted`);
  require(tree.directoryCount === artifact.directoryCount, `${artifact.id}: extracted directory count drifted`);
  require(tree.treeSha256 === artifact.treeSha256, `${artifact.id}: extracted package tree drifted`);
  if (verifyExecutableModes) {
    require(
      JSON.stringify(tree.executableFiles) === JSON.stringify(artifact.requiredExecutableFiles),
      `${artifact.id}: executable file modes drifted; use a mode-preserving Linux filesystem rather than DrvFS /mnt/<drive>`,
    );
  }
  return tree;
}

async function calculatePackageTree(packageDirectory) {
  const root = realpathDirectory(packageDirectory, "package tree");
  const directories = [];
  const files = [];
  const visit = (directory, prefix) => {
    const entries = readdirSync(directory, { withFileTypes: true }).sort(compareDirectoryEntry);
    for (const entry of entries) {
      require(entry.name !== "." && entry.name !== ".." && !entry.name.includes("/") && !entry.name.includes("\\") && !entry.name.includes("\0"), "Package tree contains an unsafe filename");
      const relativePath = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      const absolutePath = join(directory, entry.name);
      require(!entry.isSymbolicLink(), `Package tree contains a symbolic link: ${relativePath}`);
      if (entry.isDirectory()) {
        directories.push(relativePath);
        visit(absolutePath, relativePath);
      } else {
        require(entry.isFile(), `Package tree contains a special file: ${relativePath}`);
        files.push({ path: relativePath, absolutePath, stat: lstatSync(absolutePath) });
      }
    }
  };
  visit(root, "");
  directories.sort();
  files.sort((left, right) => left.path < right.path ? -1 : left.path === right.path ? 0 : 1);
  const digest = createHash("sha256");
  for (const path of directories) digest.update(`D\0${path}\n`);
  const executableFiles = [];
  for (const file of files) {
    const fileDigest = await sha256File(file.absolutePath);
    digest.update(`F\0${file.path}\0${file.stat.size}\0${fileDigest}\n`);
    if ((file.stat.mode & 0o111) !== 0) executableFiles.push(file.path);
  }
  return Object.freeze({
    fileCount: files.length,
    directoryCount: directories.length,
    treeSha256: digest.digest("hex"),
    executableFiles: Object.freeze(executableFiles),
  });
}

function discoverCachePackageRoots(cacheRoot) {
  const roots = [];
  for (const entry of readdirSync(cacheRoot, { withFileTypes: true }).sort(compareDirectoryEntry)) {
    require(entry.isDirectory() && !entry.isSymbolicLink(), `Bun cache top-level entry is not a real directory: ${entry.name}`);
    const topPath = join(cacheRoot, entry.name);
    if (entry.name.startsWith("@") && !entry.name.includes("@@@")) {
      for (const child of readdirSync(topPath, { withFileTypes: true }).sort(compareDirectoryEntry)) {
        require(child.isDirectory() && !child.isSymbolicLink(), `Bun cache scoped entry is not a real directory: ${entry.name}/${child.name}`);
        require(child.name.endsWith(`@@@${CACHE_VERSION}`), `Bun cache scoped package has an unexpected version layout: ${entry.name}/${child.name}`);
        require(existsSync(join(topPath, child.name, "package.json")), `Bun cache scoped package has no package.json: ${entry.name}/${child.name}`);
        roots.push(`${entry.name}/${child.name}`);
      }
    } else {
      require(entry.name.endsWith(`@@@${CACHE_VERSION}`), `Bun cache package has an unexpected version layout: ${entry.name}`);
      require(existsSync(join(topPath, "package.json")), `Bun cache package has no package.json: ${entry.name}`);
      roots.push(entry.name);
    }
  }
  return roots.sort();
}

function createArchiveIdentity(selected) {
  const name = selected.name;
  const version = selected.version;
  const packageBasename = name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
  return Object.freeze({
    id: `npm:${name}@${version}`,
    name,
    version,
    filename: `${name.replace("/", "+")}-${version}.tgz`,
    url: `${REGISTRY_ORIGIN}/${name}/-/${packageBasename}-${version}.tgz`,
    sha512: selected.integrity,
  });
}

function normalizeLockedArtifact(archive) {
  requireRecord(archive, "Bun registry archive");
  require(PACKAGE_NAME.test(archive.name ?? ""), "Bun archive package name is invalid");
  require(PACKAGE_VERSION.test(archive.version ?? ""), `${archive.name}: Bun archive version is invalid`);
  const identity = createArchiveIdentity({ name: archive.name, version: archive.version, integrity: archive.sha512 });
  require(archive.id === identity.id, `${identity.id}: Bun archive ID is not canonical`);
  require(archive.filename === identity.filename, `${identity.id}: Bun archive filename is not canonical`);
  require(archive.url === identity.url, `${identity.id}: Bun archive URL is not canonical`);
  normalizeIntegrity(archive.sha512, identity.id);
  require(Number.isSafeInteger(archive.bytes) && archive.bytes > 0 && archive.bytes <= MAX_ARCHIVE_BYTES, `${identity.id}: archive byte count is invalid`);
  require(SHA256.test(archive.sha256 ?? ""), `${identity.id}: archive SHA-256 is invalid`);
  require(typeof archive.archiveRoot === "string" && /^[A-Za-z0-9@._~-]+$/.test(archive.archiveRoot), `${identity.id}: archive root is invalid`);
  require(archive.manifestVersion === archive.version, `${identity.id}: manifest version does not match the selected package`);
  requireSafeCacheDirectory(archive.cacheDirectory, archive.name, identity.id);
  require(Number.isSafeInteger(archive.fileCount) && archive.fileCount > 0, `${identity.id}: file count is invalid`);
  require(Number.isSafeInteger(archive.directoryCount) && archive.directoryCount >= 0, `${identity.id}: directory count is invalid`);
  require(SHA256.test(archive.treeSha256 ?? ""), `${identity.id}: package tree SHA-256 is invalid`);
  require(Array.isArray(archive.requiredExecutableFiles), `${identity.id}: requiredExecutableFiles must be an array`);
  requireStrictlySortedSafePaths(archive.requiredExecutableFiles, `${identity.id}: requiredExecutableFiles`);
  const lifecycleScripts = normalizeLifecycleScripts(archive.lifecycleScripts, identity.id);
  const lockfileReferences = normalizeLockfileReferences(archive.lockfileReferences, identity.id);
  return Object.freeze({
    ...identity,
    manifestVersion: archive.manifestVersion,
    bytes: archive.bytes,
    sha256: archive.sha256,
    archiveRoot: archive.archiveRoot,
    cacheDirectory: archive.cacheDirectory,
    fileCount: archive.fileCount,
    directoryCount: archive.directoryCount,
    treeSha256: archive.treeSha256,
    requiredExecutableFiles: Object.freeze([...archive.requiredExecutableFiles]),
    lifecycleScripts: Object.freeze(lifecycleScripts),
    lockfileReferences: Object.freeze(lockfileReferences),
  });
}

function verifyLockfileRecords(records) {
  require(Array.isArray(records) && records.length === EXPECTED_LOCKFILES.length, "Bun input lockfile records are incomplete");
  for (let index = 0; index < EXPECTED_LOCKFILES.length; index += 1) {
    const observed = records[index];
    const expected = EXPECTED_LOCKFILES[index];
    requireRecord(observed, `${expected.path}: lockfile record`);
    for (const [key, value] of Object.entries(expected)) require(observed[key] === value, `${expected.path}: ${key} drifted`);
  }
}

function verifySelectionRecord(selection) {
  requireRecord(selection, "Bun platform selection");
  require(selection.target?.os === TARGET_OS && selection.target?.cpu === TARGET_CPU, "Bun platform selection target is invalid");
  for (const [key, expected] of Object.entries({
    packageEntryCount: EXPECTED_COUNTS.packageEntries,
    externalReferenceCount: EXPECTED_COUNTS.externalReferences,
    workspaceReferenceCount: EXPECTED_COUNTS.workspaceReferences,
    uniqueExternalPackageCount: EXPECTED_COUNTS.uniqueExternalPackages,
    selectedReferenceCount: EXPECTED_COUNTS.selectedReferences,
    selectedUniquePackageCount: EXPECTED_COUNTS.selectedPackages,
    excludedReferenceCount: EXPECTED_COUNTS.excludedReferences,
    excludedUniquePackageCount: EXPECTED_COUNTS.excludedPackages,
  })) require(selection[key] === expected, `Bun platform selection ${key} is invalid`);
  require(typeof selection.rule === "string" && selection.rule.length > 0, "Bun platform selection rule is missing");
  require(Array.isArray(selection.excludedPackageIdentities), "Bun excluded package identities are missing");
  require(selection.excludedPackageIdentities.length === EXPECTED_COUNTS.excludedPackages, "Bun excluded package identity count is invalid");
  requireStrictlySortedIdentities(selection.excludedPackageIdentities, "Bun excluded package identities");
}

function verifyRegistryRecord(registry) {
  requireRecord(registry, "Bun registry");
  require(registry.origin === REGISTRY_ORIGIN, "Bun registry origin is invalid");
  require(registry.tarballUrlPattern === "https://registry.npmjs.org/{name}/-/{basename}-{version}.tgz", "Bun registry tarball URL pattern is invalid");
  require(registry.integrityAlgorithm === "sha512", "Bun registry integrity algorithm is invalid");
}

function verifyLifecycleRecord(lifecycle, artifacts) {
  requireRecord(lifecycle, "Bun lifecycle record");
  require(JSON.stringify(lifecycle.dependencyScriptKeys) === JSON.stringify(LIFECYCLE_KEYS), "Bun lifecycle script keys are invalid");
  const scripted = artifacts.filter((artifact) => Object.keys(artifact.lifecycleScripts).length > 0);
  require(lifecycle.packageCount === scripted.length && scripted.length === 1, "Bun lifecycle package count is invalid");
  require(Array.isArray(lifecycle.packages) && lifecycle.packages.length === 1, "Bun lifecycle package list is invalid");
  const record = lifecycle.packages[0];
  require(record.name === "esbuild" && record.version === "0.21.5", "Unexpected Bun lifecycle package");
  require(record.trust === "bun-default-trusted", "esbuild lifecycle trust is invalid");
  require(JSON.stringify(record.scripts) === JSON.stringify(scripted[0].lifecycleScripts), "esbuild lifecycle script record drifted");
  require(lifecycle.observedUntrustedPackageCount === 0, "Bun untrusted scripted package count is invalid");
  require(lifecycle.observationCommand === "bun pm untrusted", "Bun lifecycle observation command is invalid");
}

function verifyCacheRecord(cache, artifacts) {
  requireRecord(cache, "Bun offline cache record");
  require(cache.layout === "bun-v1-version-directories", "Bun cache layout is invalid");
  require(cache.directoryName === "cache", "Bun cache directory name is invalid");
  require(cache.packageCount === artifacts.length, "Bun cache package count is invalid");
  require(cache.containsAliasSymlinks === false, "Bun cache must not rely on alias symlinks");
  require(cache.materializer === "materialize-bun-inputs.mjs --prepare-cache", "Bun cache materializer is invalid");
  require(cache.archiveExtractionComparedWithObservedBunCache === true, "Bun archive/cache comparison evidence is missing");
  require(cache.materialized === true, "Bun cache is not recorded as materialized");
}

function verifyOfflineReplay(replay) {
  requireRecord(replay, "Bun offline replay");
  require(replay.passed === true, "Bun offline replay did not pass");
  require(replay.verificationDate === "2026-09-03", "Bun offline replay date is invalid");
  require(replay.networkMode === "docker --network none", "Bun offline replay network mode is invalid");
  require(replay.containerImage === "ubuntu:20.04", "Bun offline replay image is invalid");
  require(replay.containerDigest === "sha256:8feb4d8ca5354def3d8fce243717141ce31e2c428701f6682bd2fafe15388214", "Bun offline replay image digest is invalid");
  require(replay.cacheFilesystem === "WSL2 ext4", "Bun offline replay cache filesystem is invalid");
  require(replay.bootstrapBunVersion === "1.3.13", "Bun offline replay bootstrap version is invalid");
  require(replay.bootstrapBunExecutableSha256 === "b29d78892abd5a9398e0700f0cb602f725089602ed1a5082d681c7257b2bf4d0", "Bun offline replay bootstrap executable is invalid");
  require(replay.nodeVersion === "v24.3.0", "Bun offline replay Node.js version is invalid");
  require(replay.nodeExecutableSha256 === "11ee468e2ac16c11dde59c6897b341968442430439733fdce6ff6f4da8bca38f", "Bun offline replay Node.js executable is invalid");
  require(replay.cacheReadOnly === true, "Bun offline replay cache was not read-only");
  require(JSON.stringify(replay.directories) === JSON.stringify(EXPECTED_LOCKFILES.map((lockfile) => lockfile.directory)), "Bun offline replay directories are invalid");
  require(JSON.stringify(replay.reportedInstallCounts) === JSON.stringify([42, 1, 103]), "Bun offline replay install counts are invalid");
  require(replay.untrustedScriptedPackageCount === 0, "Bun offline replay found an untrusted scripted package");
  require(replay.lockfilesUnchanged === true, "Bun offline replay changed a lockfile");
  require(replay.cleanGitTree === true, "Bun offline replay changed the Git tree");
  require(replay.esbuildProbe?.command === "./node_modules/.bin/esbuild --version", "Bun offline replay esbuild command is invalid");
  require(replay.esbuildProbe?.stdout === "0.21.5", "Bun offline replay esbuild result is invalid");
  require(typeof replay.note === "string" && replay.note.length > 0, "Bun offline replay note is missing");
}

function normalizeLockfileReferences(references, label) {
  require(Array.isArray(references) && references.length > 0, `${label}: lockfileReferences are missing`);
  let previousPathIndex = -1;
  return references.map((reference) => {
    requireRecord(reference, `${label}: lockfile reference`);
    const pathIndex = EXPECTED_LOCKFILES.findIndex((lockfile) => lockfile.path === reference.path);
    require(pathIndex > previousPathIndex, `${label}: lockfile references are not in canonical order`);
    previousPathIndex = pathIndex;
    require(Array.isArray(reference.keys) && reference.keys.length > 0, `${label}: lockfile reference keys are missing`);
    const keys = [...reference.keys];
    requireStrictlySortedStrings(keys, `${label}: lockfile reference keys`);
    return Object.freeze({ path: reference.path, keys: Object.freeze(keys) });
  });
}

function normalizeLifecycleScripts(scripts, label) {
  requireRecord(scripts, `${label}: lifecycleScripts`);
  const normalized = Object.create(null);
  for (const key of Object.keys(scripts)) {
    require(LIFECYCLE_KEYS.includes(key), `${label}: unexpected lifecycle script ${key}`);
    require(typeof scripts[key] === "string" && scripts[key].length > 0, `${label}: lifecycle script ${key} is invalid`);
    normalized[key] = scripts[key];
  }
  require(JSON.stringify(Object.keys(normalized)) === JSON.stringify(LIFECYCLE_KEYS.filter((key) => scripts[key] !== undefined)), `${label}: lifecycle scripts are not in canonical order`);
  return normalized;
}

function collectLifecycleScripts(manifest) {
  const scripts = manifest.scripts;
  if (scripts === undefined) return {};
  requireRecord(scripts, `${manifest.name}: package scripts`);
  const result = {};
  for (const key of LIFECYCLE_KEYS) {
    if (scripts[key] === undefined) continue;
    require(typeof scripts[key] === "string" && scripts[key].length > 0, `${manifest.name}: ${key} script is invalid`);
    result[key] = scripts[key];
  }
  return result;
}

function readPackageManifest(packageDirectory, label) {
  const path = resolveInside(packageDirectory, "package.json", `${label}: package.json`);
  verifyRegularFile(path, `${label}: package.json`);
  const manifest = readJson(path);
  requireRecord(manifest, `${label}: package manifest`);
  require(PACKAGE_NAME.test(manifest.name ?? ""), `${label}: package manifest name is invalid`);
  require(PACKAGE_VERSION.test(manifest.version ?? ""), `${label}: package manifest version is invalid`);
  return manifest;
}

function parsePackageIdentity(resolution, label) {
  const workspaceMarker = "@workspace:";
  const workspaceIndex = resolution.lastIndexOf(workspaceMarker);
  if (workspaceIndex > 0) {
    const name = resolution.slice(0, workspaceIndex);
    require(PACKAGE_NAME.test(name), `${label}: workspace package name is invalid`);
    const workspacePath = resolution.slice(workspaceIndex + workspaceMarker.length);
    require(workspacePath.length > 0, `${label}: workspace path is empty`);
    return Object.freeze({ name, version: workspacePath, workspace: true });
  }
  const separator = resolution.lastIndexOf("@");
  require(separator > 0, `${label}: registry resolution has no version separator`);
  const name = resolution.slice(0, separator);
  const version = resolution.slice(separator + 1);
  require(PACKAGE_NAME.test(name), `${label}: package name is invalid`);
  require(PACKAGE_VERSION.test(version), `${label}: package version is invalid`);
  return Object.freeze({ name, version, workspace: false });
}

function stripTrailingCommas(contents) {
  let result = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index];
    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }
    if (character === ",") {
      let next = index + 1;
      while (next < contents.length && /\s/.test(contents[next])) next += 1;
      if (contents[next] === "}" || contents[next] === "]") continue;
    }
    result += character;
  }
  require(!inString && !escaped, "Bun text lockfile ends inside a string");
  return result;
}

function normalizeIntegrity(value, label) {
  require(typeof value === "string" && value.startsWith("sha512-"), `${label}: SHA-512 integrity is missing`);
  const encoded = value.slice("sha512-".length);
  require(/^[A-Za-z0-9+/]+={0,2}$/.test(encoded), `${label}: SHA-512 integrity is not canonical base64`);
  const digest = Buffer.from(encoded, "base64");
  require(digest.length === 64 && digest.toString("base64") === encoded, `${label}: SHA-512 integrity does not decode to 64 bytes`);
  return value;
}

function matchesTarget(constraint, target) {
  return constraint === undefined || constraint === target;
}

function verifyExpectedCounts(selection) {
  for (const [key, expected] of Object.entries({
    packageEntryCount: EXPECTED_COUNTS.packageEntries,
    externalReferenceCount: EXPECTED_COUNTS.externalReferences,
    workspaceReferenceCount: EXPECTED_COUNTS.workspaceReferences,
    uniqueExternalPackageCount: EXPECTED_COUNTS.uniqueExternalPackages,
    selectedReferenceCount: EXPECTED_COUNTS.selectedReferences,
    excludedReferenceCount: EXPECTED_COUNTS.excludedReferences,
  })) require(selection[key] === expected, `Bun lock selection ${key}: expected ${expected}, found ${selection[key]}`);
  require(selection.selectedPackages.length === EXPECTED_COUNTS.selectedPackages, "Bun lock selected package count drifted");
  require(selection.excludedPackages.length === EXPECTED_COUNTS.excludedPackages, "Bun lock excluded package count drifted");
}

function requireSafeCacheDirectory(value, name, label) {
  require(typeof value === "string" && value.length > 0, `${label}: cache directory is missing`);
  require(!isAbsolute(value) && !win32.isAbsolute(value) && !value.includes("\\") && !value.includes("\0"), `${label}: cache directory is unsafe`);
  const segments = value.split("/");
  require(!segments.includes("") && !segments.includes(".") && !segments.includes(".."), `${label}: cache directory contains unsafe segments`);
  if (name.startsWith("@")) {
    const [scope, packageName] = name.split("/");
    require(segments.length === 2 && segments[0] === scope && segments[1].startsWith(`${packageName}@`), `${label}: scoped cache directory does not match the package name`);
  } else {
    require(segments.length === 1 && segments[0].startsWith(`${name}@`), `${label}: cache directory does not match the package name`);
  }
  require(value.endsWith(`@@@${CACHE_VERSION}`), `${label}: cache directory has the wrong cache version`);
}

async function verifyResolutionArchive(path, identity) {
  const stat = lstatSync(path);
  require(stat.size > 0 && stat.size <= MAX_ARCHIVE_BYTES, `${identity.id}: Bun registry archive byte count is invalid`);
  const [digest] = await hashFile(path);
  require(`sha512-${digest}` === identity.sha512, `${identity.id}: lockfile SHA-512 integrity does not match the registry archive`);
}

async function downloadResolutionArchive(target, identity) {
  await downloadArchive(target, identity, async (path) => verifyResolutionArchive(path, identity));
}

async function downloadLockedBunArchive(target, artifact) {
  await downloadArchive(target, artifact, async (path) => verifyBunArchive(path, artifact));
}

async function downloadArchive(target, artifact, verifier) {
  const partial = `${target}.partial-${process.pid}`;
  require(!existsSync(partial), `${artifact.id}: temporary path already exists`);
  try {
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const response = await fetch(artifact.url, { redirect: "follow", signal: AbortSignal.timeout(300_000) });
        require(response.ok && response.body !== null, `${artifact.id}: HTTP ${response.status}`);
        const finalUrl = new URL(response.url);
        require(finalUrl.protocol === "https:" && finalUrl.username === "" && finalUrl.password === "", `${artifact.id}: final URL is not credential-free HTTPS`);
        require(ALLOWED_FINAL_HOSTS.has(finalUrl.hostname), `${artifact.id}: unexpected final host ${finalUrl.hostname}`);
        const contentLength = response.headers.get("content-length");
        if (contentLength !== null && /^\d+$/.test(contentLength)) {
          require(Number(contentLength) > 0 && Number(contentLength) <= MAX_ARCHIVE_BYTES, `${artifact.id}: HTTP Content-Length is invalid`);
          if (artifact.bytes !== undefined) require(Number(contentLength) === artifact.bytes, `${artifact.id}: HTTP Content-Length differs from the lock`);
        }
        let received = 0;
        const byteLimit = new Transform({
          transform(chunk, _encoding, callback) {
            received += chunk.length;
            if (received > MAX_ARCHIVE_BYTES || (artifact.bytes !== undefined && received > artifact.bytes)) {
              callback(new Error(`${artifact.id}: response exceeds the allowed byte count`));
            } else callback(null, chunk);
          },
        });
        await pipeline(Readable.fromWeb(response.body), byteLimit, createWriteStream(partial, { flags: "wx" }));
        await verifier(partial);
        require(!existsSync(target), `${artifact.id}: target appeared during download`);
        renameSync(partial, target);
        return;
      } catch (error) {
        lastError = error;
        if (existsSync(partial)) rmSync(partial, { force: true });
        if (attempt < 4) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 500));
      }
    }
    throw lastError;
  } finally {
    if (existsSync(partial)) rmSync(partial, { force: true });
  }
}

function verifyBunRepository(path) {
  require(isAbsolute(path), "The Bun repository path must be absolute");
  const requested = resolve(path);
  const stat = lstatSync(requested);
  require(stat.isDirectory() && !stat.isSymbolicLink(), "The Bun repository must be a real directory");
  const repository = realpathSync(requested);
  require(runGit(repository, ["rev-parse", "--show-toplevel"]) === repository, "The Bun repository path must be its Git root");
  require(runGit(repository, ["rev-parse", "HEAD"]) === EXPECTED_BUN_COMMIT, "The Bun repository is not at the deterministic downstream commit");
  require(runGit(repository, ["status", "--porcelain=v1", "--untracked-files=all"]) === "", "The Bun repository must be clean before Bun input resolution");
  return repository;
}

function runGit(repository, arguments_) {
  const result = spawnSync("git", ["-C", repository, ...arguments_], { encoding: "utf8", windowsHide: true });
  if (result.error) throw result.error;
  require(result.status === 0, `git ${arguments_.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`, { cause: error });
  }
}

function writeResolvedLock(path, lock) {
  require(typeof path === "string" && path.length > 0, "A resolved lock output path is required");
  const target = resolve(path);
  const parent = prepareOutputDirectory(dirname(target));
  require(dirname(target) === parent, "The resolved lock output parent must be a real directory");
  require(!existsSync(target), `Resolved lock output already exists: ${target}`);
  writeFileSync(target, `${JSON.stringify(lock, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return target;
}

function realpathDirectory(path, label) {
  const requested = resolve(path);
  const stat = lstatSync(requested);
  require(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a real directory`);
  return realpathSync(requested);
}

function resolveInside(root, value, label) {
  require(typeof value === "string" && value.length > 0, `${label} is missing`);
  require(!isAbsolute(value) && !win32.isAbsolute(value), `${label} must be relative`);
  const segments = value.replaceAll("\\", "/").split("/");
  require(!segments.includes("") && !segments.includes(".") && !segments.includes(".."), `${label} contains unsafe path segments`);
  const result = resolve(root, ...segments);
  const fromRoot = relative(root, result);
  require(fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot), `${label} escapes its root`);
  return result;
}

function requireStrictlySortedSafePaths(paths, label) {
  let previous = null;
  for (const path of paths) {
    require(typeof path === "string" && path.length > 0 && !path.includes("\\") && !path.includes("\0"), `${label}: unsafe path`);
    const segments = path.split("/");
    require(!segments.includes("") && !segments.includes(".") && !segments.includes(".."), `${label}: unsafe path segments`);
    require(previous === null || previous < path, `${label}: paths are not strictly sorted`);
    previous = path;
  }
}

function requireStrictlySortedIdentities(identities, label) {
  let previous = null;
  for (const identity of identities) {
    const separator = typeof identity === "string" ? identity.lastIndexOf("@") : -1;
    require(separator > 0, `${label}: invalid package identity`);
    const sortKey = `${identity.slice(0, separator)}\0${identity.slice(separator + 1)}`;
    require(previous === null || previous < sortKey, `${label}: values are not strictly sorted`);
    previous = sortKey;
  }
}

function requireStrictlySortedStrings(values, label) {
  let previous = null;
  for (const value of values) {
    require(typeof value === "string" && value.length > 0, `${label}: invalid string`);
    require(previous === null || previous < value, `${label}: values are not strictly sorted`);
    previous = value;
  }
}

function comparePackageIdentity(left, right) {
  if (left.name !== right.name) return left.name < right.name ? -1 : 1;
  if (left.version === right.version) return 0;
  return left.version < right.version ? -1 : 1;
}

function compareDirectoryEntry(left, right) {
  return left.name < right.name ? -1 : left.name === right.name ? 0 : 1;
}

function tarPath() {
  return process.platform === "win32" && process.env.SystemRoot
    ? resolve(process.env.SystemRoot, "System32", "tar.exe")
    : "tar";
}

async function hashFile(path) {
  const sha512Hash = createHash("sha512");
  const sha256Hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    sha512Hash.update(chunk);
    sha256Hash.update(chunk);
  }
  return [sha512Hash.digest("base64"), sha256Hash.digest("hex")];
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireRecord(value, label) {
  require(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArguments(argv) {
  const values = Object.create(null);
  let offline = false;
  let prepareCache = false;
  let resolveMode = false;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--offline" || key === "--prepare-cache" || key === "--resolve") {
      if (key === "--offline") require(!offline, "Duplicate argument: --offline");
      if (key === "--prepare-cache") require(!prepareCache, "Duplicate argument: --prepare-cache");
      if (key === "--resolve") require(!resolveMode, "Duplicate argument: --resolve");
      offline = offline || key === "--offline";
      prepareCache = prepareCache || key === "--prepare-cache";
      resolveMode = resolveMode || key === "--resolve";
      continue;
    }
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), "Arguments must be --name value pairs, plus optional switches");
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
    index += 1;
  }
  const allowed = new Set(["--output-directory", "--bun-repository", "--observed-cache-directory", "--resolved-lock-output"]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  require(values["--output-directory"], USAGE.trim());
  if (resolveMode) {
    require(!offline, "--offline is only available when using the checked-in Bun input lock");
    require(values["--bun-repository"] && values["--observed-cache-directory"] && values["--resolved-lock-output"], USAGE.trim());
  } else {
    require(values["--bun-repository"] === undefined && values["--observed-cache-directory"] === undefined && values["--resolved-lock-output"] === undefined, USAGE.trim());
  }
  return {
    outputDirectory: values["--output-directory"],
    bunRepository: values["--bun-repository"],
    observedCacheDirectory: values["--observed-cache-directory"],
    resolvedLockOutput: values["--resolved-lock-output"],
    offline,
    prepareCache,
    resolveMode,
  };
}

const USAGE = `
Usage:
  node materialize-bun-inputs.mjs --output-directory <dir> [--offline] [--prepare-cache]
  node materialize-bun-inputs.mjs --resolve --bun-repository <dir> --observed-cache-directory <dir> --output-directory <dir> --resolved-lock-output <file> [--prepare-cache]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.resolveMode) {
      const lock = await resolveBunInputs({
        bunRepository: options.bunRepository,
        observedCacheDirectory: options.observedCacheDirectory,
        outputDirectory: options.outputDirectory,
        prepareCache: options.prepareCache,
        onProgress({ index, total, artifact, source }) {
          console.log(`OK ${index}/${total} ${artifact.name}@${artifact.version}: ${artifact.sha512} (${artifact.bytes} bytes, ${source})`);
        },
      });
      const target = writeResolvedLock(options.resolvedLockOutput, lock);
      console.log(`OK resolved ${lock.archiveCount} Bun registry archives (${lock.totalArchiveBytes} bytes): ${target}`);
      if (options.prepareCache) console.log(`OK prepared minimal ${lock.cache.packageCount}-package Bun cache: ${options.outputDirectory}`);
    } else {
      const result = await materializeBunInputs(options);
      for (const artifact of result.artifacts) {
        console.log(`OK ${artifact.id}: ${artifact.sha512} (${artifact.bytes} bytes, ${artifact.source})`);
      }
      console.log(`OK ${result.artifacts.length} locked Bun registry archives: ${result.outputRoot}`);
      if (result.cache !== null) console.log(`OK minimal Bun cache (${result.cache.packageCount} packages, ${result.cache.source}): ${result.cache.path}`);
    }
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
