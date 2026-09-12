import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import {
  downloadLockedArtifact,
  prepareOutputDirectory,
  verifyLockedArtifact,
  verifyRegularFile,
} from "./materialize-source-inputs.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const defaultLockPath = resolve(toolDirectory, "cargo-inputs.lock.json");
const EXPECTED_BUN_COMMIT = "a9c76a599bacb75c72d3c00fc6f99c5cc9483b47";
const EXPECTED_CARGO_LOCK = Object.freeze({
  path: "Cargo.lock",
  bytes: 70318,
  gitBlobSha1: "28c08e1b7bc188aa32a7d5ba3fc7647f616fe749",
  sha256: "819a552d52819d4d33897df69e16b698d703cec4e9009c2d132791931ab40856",
  packageCount: 284,
  registryPackageCount: 181,
  gitSourceCount: 0,
});
const EXPECTED_RUST_STD_CARGO_LOCK = Object.freeze({
  path: "lib/rustlib/src/rust/library/Cargo.lock",
  bytes: 9835,
  sha256: "9e87d1ac04edbf5fa61e27cb21984a83566573a007767713868965fba70acb6d",
  packageCount: 49,
  registryPackageCount: 30,
  gitSourceCount: 0,
  sourceArtifactId: "rust-src-nightly-2026-07-20",
  sourceArtifactSha256: "d4ffe57cc99d8846761bdbefc631bfd8f06fc001d7208576887e381c5709341a",
});
const REGISTRY_SOURCE = "registry+https://github.com/rust-lang/crates.io-index";
const ARCHIVE_URL_PATTERN = "https://static.crates.io/crates/{name}/{name}-{version}.crate";
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const CRATE_NAME = /^[A-Za-z0-9_-]+$/;
const CRATE_VERSION = /^[A-Za-z0-9.+-]+$/;
const ALLOWED_FINAL_HOSTS = new Set(["static.crates.io"]);
const MAX_RESOLUTION_ARCHIVE_BYTES = 512 * 1024 * 1024;
const CARGO_SOURCE_CONFIG = `[source.crates-io]
replace-with = "vendored-sources"

[source.vendored-sources]
directory = "vendor"

[net]
offline = true
`;

export async function materializeCargoInputs({
  outputDirectory,
  offline = false,
  prepareDirectorySource = false,
  lockPath = defaultLockPath,
} = {}) {
  require(typeof outputDirectory === "string" && outputDirectory.length > 0, "An output directory is required");
  const outputRoot = prepareOutputDirectory(outputDirectory);
  const archiveDirectory = prepareOutputDirectory(join(outputRoot, "archives"));
  const lock = readJson(lockPath);
  const artifacts = collectCargoArtifacts(lock);

  const results = [];
  for (const artifact of artifacts) {
    const target = join(archiveDirectory, artifact.filename);
    if (existsSync(target)) {
      verifyRegularFile(target, `${artifact.id}: Cargo archive`);
      await verifyLockedArtifact(target, artifact);
      results.push({ ...artifact, path: target, source: "existing" });
      continue;
    }
    require(!offline, `${artifact.id}: locked Cargo archive is absent in offline mode`);
    await downloadLockedArtifact(target, artifact, ALLOWED_FINAL_HOSTS);
    results.push({ ...artifact, path: target, source: "downloaded" });
  }
  const directorySource = prepareDirectorySource
    ? {
      ...await prepareCargoDirectorySource({
        archiveDirectory,
        vendorDirectory: join(outputRoot, "vendor"),
        artifacts,
      }),
      configPath: prepareCargoSourceConfig(outputRoot),
    }
    : null;
  return { outputRoot, artifacts: results, directorySource };
}

export async function prepareCargoDirectorySource({ archiveDirectory, vendorDirectory, artifacts } = {}) {
  require(typeof archiveDirectory === "string" && archiveDirectory.length > 0, "A Cargo archive directory is required");
  require(typeof vendorDirectory === "string" && vendorDirectory.length > 0, "A Cargo vendor directory is required");
  require(Array.isArray(artifacts) && artifacts.length > 0, "Cargo artifacts are required");
  const archiveRoot = realpathDirectory(archiveDirectory, "Cargo archive directory");
  const target = resolve(vendorDirectory);
  const parent = prepareOutputDirectory(dirname(target));
  require(dirname(target) === parent, "The Cargo vendor parent must be a real directory");
  if (existsSync(target)) {
    await verifyCargoDirectorySource(target, artifacts);
    return { path: realpathSync(target), source: "existing", packageCount: artifacts.length };
  }

  const staging = `${target}.partial-${process.pid}`;
  require(dirname(staging) === parent && basename(staging).startsWith(`${basename(target)}.partial-`), "The Cargo vendor staging path is unsafe");
  require(!existsSync(staging), `Cargo vendor staging path already exists: ${staging}`);
  mkdirSync(staging);
  try {
    for (const artifact of artifacts) {
      const archive = join(archiveRoot, artifact.filename);
      verifyRegularFile(archive, `${artifact.id}: Cargo archive`);
      await verifyLockedArtifact(archive, artifact);
      const packageRoot = artifact.filename.slice(0, -".crate".length);
      inspectCrateArchive(archive, artifact, packageRoot);
      require(!existsSync(join(staging, packageRoot)), `${artifact.id}: duplicate extracted package root`);
      extractCrateArchive(archive, staging, artifact);
      const packageDirectory = join(staging, packageRoot);
      const files = listPackageFiles(packageDirectory, artifact);
      require(!files.includes(".cargo-checksum.json"), `${artifact.id}: archive contains a reserved .cargo-checksum.json`);
      const checksums = Object.create(null);
      for (const path of files) checksums[path] = await sha256File(join(packageDirectory, ...path.split("/")));
      writeFileSync(
        join(packageDirectory, ".cargo-checksum.json"),
        `${JSON.stringify({ files: checksums, package: artifact.sha256 })}\n`,
        { encoding: "utf8", flag: "wx" },
      );
    }
    await verifyCargoDirectorySource(staging, artifacts);
    require(!existsSync(target), "The Cargo vendor directory appeared while it was being prepared");
    renameSync(staging, target);
    return { path: realpathSync(target), source: "created", packageCount: artifacts.length };
  } catch (error) {
    if (existsSync(staging)) rmSync(staging, { force: true, recursive: true });
    throw error;
  }
}

export async function verifyCargoDirectorySource(vendorDirectory, artifacts) {
  const vendorRoot = realpathDirectory(vendorDirectory, "Cargo vendor directory");
  const expectedRoots = artifacts.map((artifact) => artifact.filename.slice(0, -".crate".length)).sort();
  const observedEntries = readdirSync(vendorRoot, { withFileTypes: true });
  for (const entry of observedEntries) require(entry.isDirectory() && !entry.isSymbolicLink(), `Cargo vendor entry is not a real directory: ${entry.name}`);
  const observedRoots = observedEntries.map((entry) => entry.name).sort();
  require(JSON.stringify(observedRoots) === JSON.stringify(expectedRoots), "Cargo vendor package directories do not match the locked archive set");

  for (const artifact of artifacts) {
    const packageRoot = artifact.filename.slice(0, -".crate".length);
    const packageDirectory = join(vendorRoot, packageRoot);
    const files = listPackageFiles(packageDirectory, artifact);
    require(files.includes(".cargo-checksum.json"), `${artifact.id}: Cargo vendor checksum file is missing`);
    const checksumPath = join(packageDirectory, ".cargo-checksum.json");
    const checksum = readJson(checksumPath);
    requireRecord(checksum, `${artifact.id}: Cargo vendor checksum`);
    require(checksum.package === artifact.sha256, `${artifact.id}: Cargo vendor package checksum drifted`);
    requireRecord(checksum.files, `${artifact.id}: Cargo vendor file checksums`);
    const packageFiles = files.filter((path) => path !== ".cargo-checksum.json");
    const lockedFiles = Object.keys(checksum.files).sort();
    require(JSON.stringify(lockedFiles) === JSON.stringify(packageFiles), `${artifact.id}: Cargo vendor file list drifted`);
    for (const path of packageFiles) {
      require(SHA256.test(checksum.files[path] ?? ""), `${artifact.id}: invalid checksum for ${path}`);
      const digest = await sha256File(join(packageDirectory, ...path.split("/")));
      require(digest === checksum.files[path], `${artifact.id}: Cargo vendor file drifted: ${path}`);
    }
  }
  return { path: vendorRoot, packageCount: artifacts.length };
}

export function prepareCargoSourceConfig(cargoInputDirectory) {
  const root = realpathDirectory(cargoInputDirectory, "Cargo input directory");
  const cargoHome = prepareOutputDirectory(join(root, "cargo-home"));
  const path = join(cargoHome, "config.toml");
  if (existsSync(path)) {
    verifyRegularFile(path, "Cargo source replacement config");
    require(readFileSync(path, "utf8") === CARGO_SOURCE_CONFIG, "Cargo source replacement config drifted");
  } else {
    writeFileSync(path, CARGO_SOURCE_CONFIG, { encoding: "utf8", flag: "wx" });
  }
  return realpathSync(path);
}

export function verifyCargoSourceConfig(cargoInputDirectory) {
  const root = realpathDirectory(cargoInputDirectory, "Cargo input directory");
  const cargoHome = realpathDirectory(join(root, "cargo-home"), "Cargo home directory");
  const path = join(cargoHome, "config.toml");
  verifyRegularFile(path, "Cargo source replacement config");
  require(readFileSync(path, "utf8") === CARGO_SOURCE_CONFIG, "Cargo source replacement config drifted");
  return realpathSync(path);
}

export function collectCargoArtifacts(lock) {
  requireRecord(lock, "Cargo input lock");
  require(lock.schemaVersion === 2, "Unsupported Cargo input lock schema");
  require(typeof lock.snapshotDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(lock.snapshotDate), "Cargo input snapshot date is invalid");
  require(SHA1.test(lock.bunCommit), "Cargo input Bun commit is invalid");
  require(lock.bunCommit === EXPECTED_BUN_COMMIT, "Cargo input Bun commit does not match the downstream backport");
  verifyCargoLockIdentity(lock.cargoLock, EXPECTED_CARGO_LOCK, { requireGitBlob: true });
  verifyCargoLockIdentity(lock.rustStdCargoLock, EXPECTED_RUST_STD_CARGO_LOCK, { requireGitBlob: false });
  require(
    lock.rustStdCargoLock.sourceArtifactId === EXPECTED_RUST_STD_CARGO_LOCK.sourceArtifactId,
    "Rust standard-library Cargo.lock source artifact is invalid",
  );
  require(
    lock.rustStdCargoLock.sourceArtifactSha256 === EXPECTED_RUST_STD_CARGO_LOCK.sourceArtifactSha256,
    "Rust standard-library Cargo.lock source artifact SHA-256 is invalid",
  );
  require(lock.registrySource === REGISTRY_SOURCE, "Cargo registry source is invalid");
  require(lock.archiveUrlPattern === ARCHIVE_URL_PATTERN, "Cargo archive URL pattern is invalid");
  require(Array.isArray(lock.archives), "Cargo input lock has no archives array");

  const artifacts = lock.archives.map(normalizeLockedArtifact);
  require(lock.archiveCount === artifacts.length, "Cargo archive count does not match the archive list");
  require(
    Number.isSafeInteger(lock.registryPackageReferenceCount) && lock.registryPackageReferenceCount > 0,
    "Cargo registry package reference count is invalid",
  );
  require(
    lock.registryPackageReferenceCount === lock.cargoLock.registryPackageCount + lock.rustStdCargoLock.registryPackageCount,
    "Cargo registry package reference count does not match the two Cargo.lock files",
  );
  require(
    Number.isSafeInteger(lock.sharedRegistryPackageCount) && lock.sharedRegistryPackageCount >= 0,
    "Cargo shared registry package count is invalid",
  );
  require(
    lock.archiveCount === lock.registryPackageReferenceCount - lock.sharedRegistryPackageCount,
    "Cargo archive count does not match the unique union of both Cargo.lock files",
  );
  require(
    lock.totalArchiveBytes === artifacts.reduce((total, artifact) => total + artifact.bytes, 0),
    "Cargo total archive byte count does not match the archive list",
  );
  require(lock.readiness?.archiveIdentitiesLockedByCargoLocks === true, "Cargo archive identities are not locked by both Cargo.lock files");
  require(lock.readiness?.archiveByteCountsLockedByProject === true, "Cargo archive byte counts are not locked");
  require(lock.readiness?.archivesMaterializedAndVerified === true, "Cargo archives are not recorded as materialized and verified");
  require(typeof lock.readiness?.offlineSourceReplacementReady === "boolean", "Cargo offline source replacement readiness is invalid");
  if (lock.readiness.offlineSourceReplacementReady) verifyDirectorySourceRecord(lock.directorySource);

  const ids = new Set();
  const urls = new Set();
  const filenames = new Set();
  let previousSortKey = null;
  for (const artifact of artifacts) {
    require(!ids.has(artifact.id), `Duplicate Cargo package identity: ${artifact.id}`);
    require(!urls.has(artifact.url), `Duplicate Cargo archive URL: ${artifact.url}`);
    require(!filenames.has(artifact.filename), `Duplicate Cargo archive filename: ${artifact.filename}`);
    const sortKey = `${artifact.name}\0${artifact.version}`;
    require(previousSortKey === null || previousSortKey < sortKey, `Cargo archives are not strictly sorted at ${artifact.id}`);
    previousSortKey = sortKey;
    ids.add(artifact.id);
    urls.add(artifact.url);
    filenames.add(artifact.filename);
  }
  return artifacts;
}

export function parseCargoLock(contents) {
  require(typeof contents === "string" && contents.length > 0, "Cargo.lock contents are required");
  require(/^version\s*=\s*4\s*$/m.test(contents), "Cargo.lock must use format version 4");
  const packages = [];
  let current = null;
  for (const line of contents.split(/\r?\n/)) {
    if (line === "[[package]]") {
      if (current !== null) packages.push(finishCargoPackage(current, packages.length + 1));
      current = Object.create(null);
      continue;
    }
    if (current === null) continue;
    const match = /^(name|version|source|checksum)\s*=\s*("(?:[^"\\]|\\.)*")\s*$/.exec(line);
    if (match === null) continue;
    const [, key, encodedValue] = match;
    require(current[key] === undefined, `Cargo package ${packages.length + 1} repeats ${key}`);
    try {
      current[key] = JSON.parse(encodedValue);
    } catch (error) {
      throw new Error(`Cargo package ${packages.length + 1} has an invalid ${key}: ${error.message}`, { cause: error });
    }
  }
  if (current !== null) packages.push(finishCargoPackage(current, packages.length + 1));
  require(packages.length > 0, "Cargo.lock contains no package records");

  const registryPackages = [];
  let gitSourceCount = 0;
  const registryIdentities = new Set();
  for (const cargoPackage of packages) {
    if (cargoPackage.source?.startsWith("git+")) gitSourceCount += 1;
    if (cargoPackage.source !== REGISTRY_SOURCE) continue;
    require(SHA256.test(cargoPackage.checksum ?? ""), `${cargoPackage.name}@${cargoPackage.version}: registry checksum is missing or invalid`);
    const id = `${cargoPackage.name}@${cargoPackage.version}`;
    require(!registryIdentities.has(id), `Duplicate Cargo registry package: ${id}`);
    registryIdentities.add(id);
    registryPackages.push({
      name: cargoPackage.name,
      version: cargoPackage.version,
      sha256: cargoPackage.checksum,
    });
  }
  registryPackages.sort(compareCrateIdentity);
  return { packages, registryPackages, gitSourceCount };
}

export function mergeCargoRegistryPackages(...packageSets) {
  require(packageSets.length > 0, "At least one Cargo registry package set is required");
  const packagesByIdentity = new Map();
  let referenceCount = 0;
  for (const packageSet of packageSets) {
    require(Array.isArray(packageSet), "Cargo registry package set must be an array");
    const identitiesInSet = new Set();
    for (const cargoPackage of packageSet) {
      const identity = createArchiveIdentity(cargoPackage);
      require(!identitiesInSet.has(identity.id), `Duplicate Cargo registry package in one lockfile: ${identity.id}`);
      identitiesInSet.add(identity.id);
      referenceCount += 1;
      const previous = packagesByIdentity.get(identity.id);
      require(
        previous === undefined || previous.sha256 === identity.sha256,
        `${identity.id}: Cargo.lock files disagree on the registry checksum`,
      );
      if (previous === undefined) packagesByIdentity.set(identity.id, cargoPackage);
    }
  }
  const registryPackages = [...packagesByIdentity.values()].sort(compareCrateIdentity);
  return {
    registryPackages,
    referenceCount,
    sharedIdentityCount: referenceCount - registryPackages.length,
  };
}

export async function resolveCargoInputs({
  bunRepository,
  rustToolchain,
  outputDirectory,
  offline = false,
  onProgress = () => {},
} = {}) {
  require(typeof bunRepository === "string" && bunRepository.length > 0, "A Bun repository is required");
  require(typeof rustToolchain === "string" && rustToolchain.length > 0, "A Rust toolchain is required");
  require(typeof outputDirectory === "string" && outputDirectory.length > 0, "An output directory is required");
  require(typeof onProgress === "function", "onProgress must be a function");
  const repository = verifyBunRepository(bunRepository);
  const rustToolchainRoot = verifyRustToolchain(rustToolchain);
  const cargoLockPath = resolve(repository, EXPECTED_CARGO_LOCK.path);
  const cargoLockBytes = readFileSync(cargoLockPath);
  const parsed = parseCargoLock(cargoLockBytes.toString("utf8"));
  require(parsed.packages.length === EXPECTED_CARGO_LOCK.packageCount, "Cargo.lock package count changed during resolution");
  require(parsed.registryPackages.length === EXPECTED_CARGO_LOCK.registryPackageCount, "Cargo.lock registry package count changed during resolution");
  require(parsed.gitSourceCount === EXPECTED_CARGO_LOCK.gitSourceCount, "Cargo.lock gained a Git source during resolution");
  const rustStdCargoLockPath = resolve(rustToolchainRoot, EXPECTED_RUST_STD_CARGO_LOCK.path);
  const rustStdCargoLockBytes = readFileSync(rustStdCargoLockPath);
  const rustStdParsed = parseCargoLock(rustStdCargoLockBytes.toString("utf8"));
  require(
    rustStdParsed.packages.length === EXPECTED_RUST_STD_CARGO_LOCK.packageCount,
    "Rust standard-library Cargo.lock package count changed during resolution",
  );
  require(
    rustStdParsed.registryPackages.length === EXPECTED_RUST_STD_CARGO_LOCK.registryPackageCount,
    "Rust standard-library Cargo.lock registry package count changed during resolution",
  );
  require(
    rustStdParsed.gitSourceCount === EXPECTED_RUST_STD_CARGO_LOCK.gitSourceCount,
    "Rust standard-library Cargo.lock gained a Git source during resolution",
  );
  const merged = mergeCargoRegistryPackages(parsed.registryPackages, rustStdParsed.registryPackages);

  const outputRoot = prepareOutputDirectory(outputDirectory);
  const archiveDirectory = prepareOutputDirectory(join(outputRoot, "archives"));
  const archives = [];
  for (let index = 0; index < merged.registryPackages.length; index += 1) {
    const cargoPackage = merged.registryPackages[index];
    const identity = createArchiveIdentity(cargoPackage);
    const target = join(archiveDirectory, identity.filename);
    let source;
    if (existsSync(target)) {
      verifyRegularFile(target, `${identity.id}: Cargo archive`);
      await verifyResolutionArchive(target, identity);
      source = "existing";
    } else {
      require(!offline, `${identity.id}: Cargo archive is absent in offline resolution mode`);
      await downloadResolutionArchive(target, identity);
      source = "downloaded";
    }
    const bytes = lstatSync(target).size;
    archives.push({
      name: identity.name,
      version: identity.version,
      filename: identity.filename,
      url: identity.url,
      bytes,
      sha256: identity.sha256,
    });
    onProgress({ index: index + 1, total: merged.registryPackages.length, artifact: identity, bytes, source });
  }

  return {
    schemaVersion: 2,
    snapshotDate: "2026-09-03",
    bunCommit: EXPECTED_BUN_COMMIT,
    cargoLock: { ...EXPECTED_CARGO_LOCK },
    rustStdCargoLock: { ...EXPECTED_RUST_STD_CARGO_LOCK },
    registrySource: REGISTRY_SOURCE,
    archiveUrlPattern: ARCHIVE_URL_PATTERN,
    registryPackageReferenceCount: merged.referenceCount,
    sharedRegistryPackageCount: merged.sharedIdentityCount,
    archiveCount: archives.length,
    totalArchiveBytes: archives.reduce((total, archive) => total + archive.bytes, 0),
    archives,
    readiness: {
      archiveIdentitiesLockedByCargoLocks: true,
      archiveByteCountsLockedByProject: true,
      archivesMaterializedAndVerified: true,
      offlineSourceReplacementReady: false,
      note: "All crates.io archives were downloaded and verified against the Bun workspace and pinned Rust standard-library Cargo.lock files, then locked by canonical URL, exact byte count, and SHA-256. An unpacked Cargo directory source and offline Cargo invocation are still pending.",
    },
  };
}

function verifyBunRepository(path) {
  require(isAbsolute(path), "The Bun repository path must be absolute");
  const requested = resolve(path);
  const stat = lstatSync(requested);
  require(stat.isDirectory() && !stat.isSymbolicLink(), "The Bun repository must be a real directory");
  const repository = realpathSync(requested);
  require(runGit(repository, ["rev-parse", "--show-toplevel"]) === repository, "The Bun repository path must be its Git root");
  require(runGit(repository, ["rev-parse", "HEAD"]) === EXPECTED_BUN_COMMIT, "The Bun repository is not at the deterministic downstream commit");
  require(runGit(repository, ["status", "--porcelain=v1"]) === "", "The Bun repository must be clean before Cargo input resolution");
  const cargoLockPath = resolve(repository, EXPECTED_CARGO_LOCK.path);
  verifyRegularFile(cargoLockPath, "Cargo.lock");
  const bytes = readFileSync(cargoLockPath);
  require(bytes.length === EXPECTED_CARGO_LOCK.bytes, "Cargo.lock byte count does not match the locked identity");
  require(sha256(bytes) === EXPECTED_CARGO_LOCK.sha256, "Cargo.lock SHA-256 does not match the locked identity");
  require(runGit(repository, ["hash-object", EXPECTED_CARGO_LOCK.path]) === EXPECTED_CARGO_LOCK.gitBlobSha1, "Cargo.lock Git blob does not match the locked identity");
  return repository;
}

function verifyRustToolchain(path) {
  require(isAbsolute(path), "The Rust toolchain path must be absolute");
  const requested = resolve(path);
  const stat = lstatSync(requested);
  require(stat.isDirectory() && !stat.isSymbolicLink(), "The Rust toolchain must be a real directory");
  const toolchain = realpathSync(requested);
  const cargoLockPath = resolve(toolchain, EXPECTED_RUST_STD_CARGO_LOCK.path);
  require(cargoLockPath.startsWith(`${toolchain}/`) || cargoLockPath.startsWith(`${toolchain}\\`), "Rust standard-library Cargo.lock escapes the toolchain");
  verifyRegularFile(cargoLockPath, "Rust standard-library Cargo.lock");
  const bytes = readFileSync(cargoLockPath);
  require(bytes.length === EXPECTED_RUST_STD_CARGO_LOCK.bytes, "Rust standard-library Cargo.lock byte count does not match the locked identity");
  require(sha256(bytes) === EXPECTED_RUST_STD_CARGO_LOCK.sha256, "Rust standard-library Cargo.lock SHA-256 does not match the locked identity");
  return toolchain;
}

function runGit(repository, arguments_) {
  const result = spawnSync("git", ["-C", repository, ...arguments_], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  require(result.status === 0, `git ${arguments_.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function inspectCrateArchive(path, artifact, packageRoot) {
  const tarExecutable = process.platform === "win32" && process.env.SystemRoot
    ? resolve(process.env.SystemRoot, "System32", "tar.exe")
    : "tar";
  const names = spawnSync(tarExecutable, ["-tzf", path], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (names.error) throw names.error;
  require(names.status === 0, `${artifact.id}: Cargo archive listing failed: ${names.stderr.trim()}`);
  const entries = names.stdout.split(/\r?\n/).filter(Boolean);
  require(entries.length > 0, `${artifact.id}: Cargo archive is empty`);
  const prefix = `${packageRoot}/`;
  for (const rawEntry of entries) {
    const entry = rawEntry.replace(/^\.\//, "").replace(/\/$/, "");
    require(entry.length > 0 && !entry.startsWith("/") && !entry.includes("\\") && !entry.includes("\0"), `${artifact.id}: unsafe Cargo archive entry ${rawEntry}`);
    require(!entry.split("/").includes(".."), `${artifact.id}: parent traversal in Cargo archive entry ${rawEntry}`);
    require(entry === packageRoot || entry.startsWith(prefix), `${artifact.id}: Cargo archive entry escapes ${packageRoot}: ${rawEntry}`);
  }

  const verbose = spawnSync(tarExecutable, ["-tvzf", path], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (verbose.error) throw verbose.error;
  require(verbose.status === 0, `${artifact.id}: verbose Cargo archive listing failed: ${verbose.stderr.trim()}`);
  const typedEntries = verbose.stdout.split(/\r?\n/).filter(Boolean);
  require(typedEntries.length === entries.length, `${artifact.id}: Cargo archive listings disagree`);
  for (const entry of typedEntries) require(entry[0] === "-" || entry[0] === "d", `${artifact.id}: Cargo archive contains a link or special entry`);
}

function extractCrateArchive(path, outputDirectory, artifact) {
  const tarExecutable = process.platform === "win32" && process.env.SystemRoot
    ? resolve(process.env.SystemRoot, "System32", "tar.exe")
    : "tar";
  const result = spawnSync(tarExecutable, ["-xzf", path, "-C", outputDirectory], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  require(result.status === 0, `${artifact.id}: Cargo archive extraction failed: ${result.stderr.trim()}`);
}

function listPackageFiles(packageDirectory, artifact) {
  const root = realpathDirectory(packageDirectory, `${artifact.id}: extracted package directory`);
  const files = [];
  const visit = (directory, prefix) => {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name < right.name ? -1 : left.name === right.name ? 0 : 1);
    for (const entry of entries) {
      require(entry.name !== "." && entry.name !== ".." && !entry.name.includes("/") && !entry.name.includes("\\") && !entry.name.includes("\0"), `${artifact.id}: unsafe extracted filename`);
      const relativePath = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      const absolutePath = join(directory, entry.name);
      require(!entry.isSymbolicLink(), `${artifact.id}: extracted package contains a symbolic link: ${relativePath}`);
      if (entry.isDirectory()) visit(absolutePath, relativePath);
      else {
        require(entry.isFile(), `${artifact.id}: extracted package contains a special file: ${relativePath}`);
        files.push(relativePath);
      }
    }
  };
  visit(root, "");
  return files.sort();
}

function realpathDirectory(path, label) {
  const requested = resolve(path);
  const stat = lstatSync(requested);
  require(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a real directory`);
  return realpathSync(requested);
}

function finishCargoPackage(cargoPackage, index) {
  require(typeof cargoPackage.name === "string" && CRATE_NAME.test(cargoPackage.name), `Cargo package ${index} has an invalid name`);
  require(typeof cargoPackage.version === "string" && CRATE_VERSION.test(cargoPackage.version), `Cargo package ${index} has an invalid version`);
  if (cargoPackage.source !== undefined) require(typeof cargoPackage.source === "string" && cargoPackage.source.length > 0, `Cargo package ${index} has an invalid source`);
  if (cargoPackage.checksum !== undefined) require(typeof cargoPackage.checksum === "string", `Cargo package ${index} has an invalid checksum`);
  return Object.freeze({ ...cargoPackage });
}

function normalizeLockedArtifact(archive) {
  requireRecord(archive, "Cargo archive");
  const identity = createArchiveIdentity(archive);
  require(archive.filename === identity.filename, `${identity.id}: Cargo archive filename is not canonical`);
  require(archive.url === identity.url, `${identity.id}: Cargo archive URL is not canonical`);
  require(Number.isSafeInteger(archive.bytes) && archive.bytes > 0, `${identity.id}: Cargo archive byte count is invalid`);
  return Object.freeze({ ...identity, bytes: archive.bytes });
}

function createArchiveIdentity(cargoPackage) {
  requireRecord(cargoPackage, "Cargo package identity");
  require(typeof cargoPackage.name === "string" && CRATE_NAME.test(cargoPackage.name), "Cargo package name is invalid");
  require(typeof cargoPackage.version === "string" && CRATE_VERSION.test(cargoPackage.version), `${cargoPackage.name}: Cargo package version is invalid`);
  require(SHA256.test(cargoPackage.sha256 ?? ""), `${cargoPackage.name}@${cargoPackage.version}: Cargo checksum is invalid`);
  const filename = `${cargoPackage.name}-${cargoPackage.version}.crate`;
  require(basename(filename) === filename && !filename.includes("..") && /^[A-Za-z0-9._+-]+$/.test(filename), `${cargoPackage.name}@${cargoPackage.version}: Cargo filename is unsafe`);
  return Object.freeze({
    id: `crate:${cargoPackage.name}@${cargoPackage.version}`,
    name: cargoPackage.name,
    version: cargoPackage.version,
    filename,
    url: `https://static.crates.io/crates/${cargoPackage.name}/${filename}`,
    sha256: cargoPackage.sha256,
  });
}

function compareCrateIdentity(left, right) {
  if (left.name !== right.name) return left.name < right.name ? -1 : 1;
  if (left.version === right.version) return 0;
  return left.version < right.version ? -1 : 1;
}

async function verifyResolutionArchive(path, identity) {
  const stat = lstatSync(path);
  require(stat.size > 0 && stat.size <= MAX_RESOLUTION_ARCHIVE_BYTES, `${identity.id}: Cargo archive byte count is invalid`);
  const digest = await sha256File(path);
  require(digest === identity.sha256, `${identity.id}: expected SHA-256 ${identity.sha256}, found ${digest}`);
}

async function downloadResolutionArchive(target, identity) {
  const partial = `${target}.partial-${process.pid}`;
  require(!existsSync(partial), `${identity.id}: temporary path already exists`);
  try {
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const response = await fetch(identity.url, { redirect: "follow", signal: AbortSignal.timeout(300_000) });
        require(response.ok && response.body !== null, `${identity.id}: HTTP ${response.status}`);
        const finalUrl = new URL(response.url);
        require(finalUrl.protocol === "https:" && finalUrl.username === "" && finalUrl.password === "", `${identity.id}: final download URL is not credential-free HTTPS`);
        require(ALLOWED_FINAL_HOSTS.has(finalUrl.hostname), `${identity.id}: unexpected final host ${finalUrl.hostname}`);
        const contentLength = response.headers.get("content-length");
        if (contentLength !== null && /^\d+$/.test(contentLength)) {
          require(Number(contentLength) > 0 && Number(contentLength) <= MAX_RESOLUTION_ARCHIVE_BYTES, `${identity.id}: HTTP Content-Length is invalid`);
        }
        let received = 0;
        const byteLimit = new Transform({
          transform(chunk, _encoding, callback) {
            received += chunk.length;
            if (received > MAX_RESOLUTION_ARCHIVE_BYTES) callback(new Error(`${identity.id}: response exceeds the resolution byte limit`));
            else callback(null, chunk);
          },
        });
        await pipeline(Readable.fromWeb(response.body), byteLimit, createWriteStream(partial, { flags: "wx" }));
        await verifyResolutionArchive(partial, identity);
        require(!existsSync(target), `${identity.id}: target appeared during download`);
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

function writeResolvedLock(path, lock) {
  require(typeof path === "string" && path.length > 0, "A resolved lock output path is required");
  const target = resolve(path);
  const parent = prepareOutputDirectory(dirname(target));
  require(dirname(target) === parent, "The resolved lock output parent must be a real directory");
  require(!existsSync(target), `Resolved lock output already exists: ${target}`);
  writeFileSync(target, `${JSON.stringify(lock, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return target;
}

function verifyCargoLockIdentity(identity, expected, { requireGitBlob }) {
  requireRecord(identity, "Cargo.lock identity");
  for (const key of ["path", "bytes", "sha256"]) {
    require(identity[key] === expected[key], `Cargo.lock ${key} does not match the expected identity`);
  }
  if (requireGitBlob) require(identity.gitBlobSha1 === expected.gitBlobSha1, "Cargo.lock gitBlobSha1 does not match the expected identity");
  else require(identity.gitBlobSha1 === undefined, "Non-Git Cargo.lock identity must not claim a Git blob");
  require(Number.isSafeInteger(identity.packageCount) && identity.packageCount > 0, "Cargo.lock package count is invalid");
  require(Number.isSafeInteger(identity.registryPackageCount) && identity.registryPackageCount > 0, "Cargo.lock registry package count is invalid");
  require(identity.registryPackageCount <= identity.packageCount, "Cargo.lock registry package count exceeds the package count");
  require(identity.gitSourceCount === 0, "Cargo.lock must not contain Git sources");
}

function verifyDirectorySourceRecord(record) {
  requireRecord(record, "Cargo directory source record");
  require(record.layout === "versioned-directories", "Cargo directory source layout is invalid");
  require(record.directoryName === "vendor", "Cargo directory source name is invalid");
  require(record.checksumFilename === ".cargo-checksum.json", "Cargo directory source checksum filename is invalid");
  require(record.configFilename === "cargo-home/config.toml", "Cargo directory source config filename is invalid");
  require(record.configSha256 === sha256(Buffer.from(CARGO_SOURCE_CONFIG, "utf8")), "Cargo directory source config digest is invalid");
  require(record.materializer === "materialize-cargo-inputs.mjs --prepare-directory-source", "Cargo directory source materializer is invalid");
  require(record.sourceReplacement?.cratesIoReplaceWith === "vendored-sources", "Cargo directory source replacement name is invalid");
  require(record.sourceReplacement?.vendoredSourcesDirectory === "<cargo-input-cache>/vendor", "Cargo directory source replacement path is invalid");
  require(record.sourceReplacement?.cargoHome === "<cargo-input-cache>/cargo-home", "Cargo directory source Cargo home is invalid");
  require(record.verification?.date === "2026-09-03", "Cargo directory source verification date is invalid");
  require(record.verification?.cargoVersion === "cargo 1.99.0-nightly (3efb1f477 2026-07-17)", "Cargo directory source verification version is invalid");
  require(record.verification?.command === "cargo metadata --locked --offline --format-version 1", "Cargo directory source verification command is invalid");
  require(record.verification?.emptyCargoHome === true, "Cargo directory source was not verified with an empty Cargo home");
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`, { cause: error });
  }
}

function parseArguments(argv) {
  const values = Object.create(null);
  let offline = false;
  let resolveMode = false;
  let prepareDirectorySource = false;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--offline") {
      require(!offline, "Duplicate argument: --offline");
      offline = true;
      continue;
    }
    if (key === "--resolve") {
      require(!resolveMode, "Duplicate argument: --resolve");
      resolveMode = true;
      continue;
    }
    if (key === "--prepare-directory-source") {
      require(!prepareDirectorySource, "Duplicate argument: --prepare-directory-source");
      prepareDirectorySource = true;
      continue;
    }
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), "Arguments must be --name value pairs, plus optional --offline and --resolve");
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
    index += 1;
  }
  const allowed = new Set(["--output-directory", "--lock-path", "--bun-repository", "--rust-toolchain", "--resolved-lock-output"]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  require(values["--output-directory"], USAGE.trim());
  if (resolveMode) {
    require(values["--bun-repository"] && values["--rust-toolchain"] && values["--resolved-lock-output"], USAGE.trim());
    require(values["--lock-path"] === undefined, "--lock-path cannot be used with --resolve");
    require(!prepareDirectorySource, "--prepare-directory-source requires the checked-in Cargo input lock");
  } else {
    require(values["--bun-repository"] === undefined && values["--rust-toolchain"] === undefined && values["--resolved-lock-output"] === undefined, USAGE.trim());
  }
  return {
    outputDirectory: values["--output-directory"],
    lockPath: values["--lock-path"],
    bunRepository: values["--bun-repository"],
    rustToolchain: values["--rust-toolchain"],
    resolvedLockOutput: values["--resolved-lock-output"],
    offline,
    prepareDirectorySource,
    resolveMode,
  };
}

function requireRecord(value, label) {
  require(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const USAGE = `
Usage:
  node materialize-cargo-inputs.mjs --output-directory <dir> [--lock-path <file>] [--offline] [--prepare-directory-source]
  node materialize-cargo-inputs.mjs --resolve --bun-repository <dir> --rust-toolchain <dir> --output-directory <dir> --resolved-lock-output <file> [--offline]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.resolveMode) {
      const lock = await resolveCargoInputs({
        bunRepository: options.bunRepository,
        rustToolchain: options.rustToolchain,
        outputDirectory: options.outputDirectory,
        offline: options.offline,
        onProgress({ index, total, artifact, bytes, source }) {
          console.log(`OK ${index}/${total} ${artifact.id}: ${artifact.sha256} (${bytes} bytes, ${source})`);
        },
      });
      const target = writeResolvedLock(options.resolvedLockOutput, lock);
      console.log(`OK resolved ${lock.archiveCount} Cargo archives (${lock.totalArchiveBytes} bytes): ${target}`);
    } else {
      const result = await materializeCargoInputs(options);
      for (const artifact of result.artifacts) {
        console.log(`OK ${artifact.id}: ${artifact.sha256} (${artifact.bytes} bytes, ${artifact.source})`);
      }
      console.log(`OK ${result.artifacts.length} locked Cargo archives: ${result.outputRoot}`);
    }
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
