import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  downloadLockedArtifact,
  prepareOutputDirectory,
  verifyLockedArtifact,
  verifyRegularFile,
} from "./materialize-source-inputs.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const defaultLockPath = resolve(toolDirectory, "host-package-inputs.lock.json");
const SHA256 = /^[0-9a-f]{64}$/;
const PACKAGE_NAME = /^[a-z0-9][a-z0-9+.-]*$/;
const ARCHITECTURES = new Set(["all", "amd64"]);
const REPOSITORIES = new Set([
  "ubuntu-focal-snapshot",
  "ubuntu-toolchain-r-test",
  "apt-llvm-focal-21",
]);
const ALLOWED_FINAL_HOSTS = new Set([
  "snapshot.ubuntu.com",
  "ppa.launchpadcontent.net",
  "apt.llvm.org",
]);

export async function materializeHostPackageInputs({
  outputDirectory,
  offline = false,
  lockPath = defaultLockPath,
} = {}) {
  require(typeof outputDirectory === "string" && outputDirectory.length > 0, "An output directory is required");
  const outputRoot = prepareOutputDirectory(outputDirectory);
  const archiveDirectory = prepareOutputDirectory(join(outputRoot, "archives"));
  const lock = readJson(lockPath);
  const artifacts = collectHostPackageArtifacts(lock);

  const results = [];
  for (const artifact of artifacts) {
    const target = join(archiveDirectory, artifact.filename);
    if (existsSync(target)) {
      verifyRegularFile(target, `${artifact.id}: downloaded file`);
      await verifyLockedArtifact(target, artifact);
      results.push({ ...artifact, path: target, source: "existing" });
      continue;
    }
    require(!offline, `${artifact.id}: locked input is absent in offline mode`);
    await downloadLockedArtifact(target, artifact, ALLOWED_FINAL_HOSTS);
    results.push({ ...artifact, path: target, source: "downloaded" });
  }
  return { outputRoot, archiveDirectory, artifacts: results };
}

export function collectHostPackageArtifacts(lock) {
  require(lock?.schemaVersion === 1, "Unsupported host-package lock schema");
  require(lock?.identity?.status === "locked", "Host-package identity is not locked");
  require(Array.isArray(lock.packages) && lock.packages.length > 0, "Host-package lock has no packages");

  const artifacts = lock.packages.map(normalizePackage);
  const ids = new Set();
  const urls = new Set();
  const filenames = new Set();
  for (const artifact of artifacts) {
    require(!ids.has(artifact.id), `Duplicate host-package identity: ${artifact.id}`);
    require(!urls.has(artifact.url), `Duplicate host-package URL: ${artifact.url}`);
    require(!filenames.has(artifact.filename), `Duplicate host-package filename: ${artifact.filename}`);
    ids.add(artifact.id);
    urls.add(artifact.url);
    filenames.add(artifact.filename);
  }

  const archiveBytes = artifacts.reduce((total, artifact) => total + artifact.bytes, 0);
  require(lock.readiness?.packageCount === artifacts.length, "Host-package count does not match readiness metadata");
  require(lock.readiness?.sha256Count === artifacts.length, "Host-package SHA-256 count does not match package count");
  require(lock.readiness?.archiveBytes === archiveBytes, "Host-package byte total does not match readiness metadata");
  require(lock.readiness?.packageClosureComplete === true, "Host-package closure is not complete");
  require(lock.readiness?.archiveIdentitiesLocked === true, "Host-package archive identities are not locked");
  require(lock.readiness?.offlineInstallReady === true, "Host-package offline install is not ready");
  return artifacts;
}

function normalizePackage(package_) {
  require(package_ && typeof package_ === "object" && !Array.isArray(package_), "Host package is invalid");
  require(PACKAGE_NAME.test(package_.name), `Invalid host-package name: ${JSON.stringify(package_.name)}`);
  require(
    typeof package_.version === "string" && package_.version.length > 0 && !/[\0\r\n\t]/.test(package_.version),
    `${package_.name}: invalid version`,
  );
  require(ARCHITECTURES.has(package_.architecture), `${package_.name}: unsupported architecture`);
  require(REPOSITORIES.has(package_.repository), `${package_.name}: unknown repository`);
  require(
    typeof package_.filename === "string" &&
      basename(package_.filename) === package_.filename &&
      /^[A-Za-z0-9][A-Za-z0-9.+_~-]*\.deb$/.test(package_.filename),
    `${package_.name}: unsafe archive filename`,
  );
  requireHttpsUrl(package_.url, `${package_.name}: URL`);
  const url = new URL(package_.url);
  require(ALLOWED_FINAL_HOSTS.has(url.hostname), `${package_.name}: unexpected URL host ${url.hostname}`);
  require(decodeURIComponent(basename(url.pathname)) === package_.filename, `${package_.name}: URL filename mismatch`);
  require(Number.isSafeInteger(package_.bytes) && package_.bytes > 0, `${package_.name}: invalid byte count`);
  require(SHA256.test(package_.sha256), `${package_.name}: invalid SHA-256`);
  const id = `${package_.name}:${package_.architecture}=${package_.version}`;
  return Object.freeze({
    id,
    name: package_.name,
    version: package_.version,
    architecture: package_.architecture,
    repository: package_.repository,
    sourcePackage: package_.sourcePackage,
    filename: package_.filename,
    url: package_.url,
    bytes: package_.bytes,
    sha256: package_.sha256,
  });
}

function parseArguments(argv) {
  const values = Object.create(null);
  let offline = false;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--offline") {
      require(!offline, "Duplicate argument: --offline");
      offline = true;
      continue;
    }
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), "Arguments must be --name value pairs, plus optional --offline");
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
    index += 1;
  }
  const allowed = new Set(["--output-directory"]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  require(values["--output-directory"], USAGE.trim());
  return { outputDirectory: values["--output-directory"], offline };
}

function requireHttpsUrl(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} is missing`);
  const url = new URL(value);
  require(url.protocol === "https:" && url.username === "" && url.password === "", `${label} must be credential-free HTTPS`);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`, { cause: error });
  }
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const USAGE = `
Usage: node materialize-host-package-inputs.mjs --output-directory <dir> [--offline]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await materializeHostPackageInputs(parseArguments(process.argv.slice(2)));
    for (const artifact of result.artifacts) {
      console.log(`OK ${artifact.id}: ${artifact.sha256} (${artifact.bytes} bytes, ${artifact.source})`);
    }
    console.log(`OK ${result.artifacts.length} locked host packages: ${result.archiveDirectory}`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
