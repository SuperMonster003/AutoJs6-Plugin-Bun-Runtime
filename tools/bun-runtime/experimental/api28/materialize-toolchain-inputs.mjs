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
const defaultLockPath = resolve(toolDirectory, "toolchain-inputs.lock.json");
const SHA256 = /^[0-9a-f]{64}$/;
const GROUPS = new Set(["bootstrap", "android-ndk", "build", "provenance", "all"]);
const ALLOWED_FINAL_HOSTS = new Set([
  "dl.google.com",
  "github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
  "github-releases.githubusercontent.com",
  "nodejs.org",
  "pub-5e11e972747a44bf9aaf9394f185a982.r2.dev",
  "static.rust-lang.org",
]);

export async function materializeToolchainInputs({
  outputDirectory,
  group,
  offline = false,
  lockPath = defaultLockPath,
} = {}) {
  require(typeof outputDirectory === "string" && outputDirectory.length > 0, "An output directory is required");
  require(GROUPS.has(group), `Unknown toolchain-input group: ${JSON.stringify(group)}`);
  const outputRoot = prepareOutputDirectory(outputDirectory);
  const downloadDirectory = prepareOutputDirectory(join(outputRoot, "downloads"));
  const lock = readJson(lockPath);
  const artifacts = collectToolchainArtifacts(lock, group);
  require(artifacts.length > 0, `No artifacts are selected by group ${group}`);

  const results = [];
  for (const artifact of artifacts) {
    const target = join(downloadDirectory, artifact.filename);
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
  return { group, outputRoot, artifacts: results };
}

export function collectToolchainArtifacts(lock, group) {
  require(lock?.schemaVersion === 1, "Unsupported toolchain-input lock schema");
  require(Array.isArray(lock.directDownloads), "toolchain-inputs.lock.json has no directDownloads array");
  require(GROUPS.has(group), `Unknown toolchain-input group: ${JSON.stringify(group)}`);
  const artifacts = lock.directDownloads
    .filter((artifact) => selected(group, artifact))
    .map(normalizeArtifact);
  const ids = new Set();
  const urls = new Set();
  const filenames = new Set();
  for (const artifact of artifacts) {
    require(!ids.has(artifact.id), `Duplicate toolchain-input artifact ID: ${artifact.id}`);
    require(!urls.has(artifact.url), `Duplicate toolchain-input URL: ${artifact.url}`);
    require(!filenames.has(artifact.filename), `Duplicate toolchain-input filename: ${artifact.filename}`);
    ids.add(artifact.id);
    urls.add(artifact.url);
    filenames.add(artifact.filename);
  }
  return artifacts;
}

function selected(group, artifact) {
  if (group === "all") return true;
  if (group === "build") return artifact.group === "build";
  if (group === "provenance") return artifact.group === "provenance";
  if (group === "android-ndk") return artifact.id === "android-ndk-r27c";
  if (group === "bootstrap") return artifact.group === "build" && artifact.id !== "android-ndk-r27c";
  return false;
}

function normalizeArtifact(artifact) {
  require(artifact && typeof artifact === "object" && !Array.isArray(artifact), "Toolchain artifact is invalid");
  require(typeof artifact.id === "string" && artifact.id.length > 0, "Toolchain artifact ID is missing");
  require(artifact.group === "build" || artifact.group === "provenance", `${artifact.id}: invalid group`);
  require(typeof artifact.role === "string" && artifact.role.length > 0, `${artifact.id}: role is missing`);
  require(
    typeof artifact.filename === "string" &&
      artifact.filename.length > 0 &&
      basename(artifact.filename) === artifact.filename &&
      !artifact.filename.includes("..") &&
      /^[A-Za-z0-9._-]+$/.test(artifact.filename),
    `${artifact.id}: filename is unsafe`,
  );
  requireHttpsUrl(artifact.url, `${artifact.id}: URL`);
  require(Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0, `${artifact.id}: byte count is invalid`);
  require(SHA256.test(artifact.sha256), `${artifact.id}: SHA-256 is invalid`);
  return Object.freeze({
    id: artifact.id,
    group: artifact.group,
    role: artifact.role,
    filename: artifact.filename,
    url: artifact.url,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
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
  const allowed = new Set(["--output-directory", "--group"]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  require(values["--output-directory"] && values["--group"], USAGE.trim());
  return {
    outputDirectory: values["--output-directory"],
    group: values["--group"],
    offline,
  };
}

function requireHttpsUrl(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} is missing`);
  const url = new URL(value);
  require(url.protocol === "https:" && url.username === "" && url.password === "", `${label} must be an HTTPS URL without credentials`);
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
Usage: node materialize-toolchain-inputs.mjs --output-directory <dir> --group <bootstrap|android-ndk|build|provenance|all> [--offline]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await materializeToolchainInputs(parseArguments(process.argv.slice(2)));
    for (const artifact of result.artifacts) {
      console.log(`OK ${artifact.id}: ${artifact.sha256} (${artifact.bytes} bytes, ${artifact.source})`);
    }
    console.log(`OK ${result.artifacts.length} locked toolchain inputs: ${result.outputRoot}`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
