import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

import {
  downloadLockedArtifact,
  prepareOutputDirectory,
  verifyLockedArtifact,
  verifyRegularFile,
} from "./materialize-source-inputs.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const defaultLockPath = resolve(toolDirectory, "distribution-source.lock.json");
const ALLOWED_INITIAL_HOSTS = new Set(["github.com"]);

export async function materializeDistributionSource({
  outputDirectory,
  offline = false,
  lockPath = defaultLockPath,
} = {}) {
  require(typeof outputDirectory === "string" && outputDirectory.length > 0, "An output directory is required");
  require(isAbsolute(outputDirectory) || win32.isAbsolute(outputDirectory), "Output directory must be absolute");
  const lock = readJson(lockPath);
  require(lock?.schemaVersion === 2, "Unsupported distribution-source lock schema");
  const artifact = normalizeArtifact(lock.bunSource?.archive);
  const output = prepareOutputDirectory(outputDirectory);
  const target = join(output, artifact.filename);
  if (existsSync(target)) {
    verifyRegularFile(target, `${artifact.id}: existing archive`);
    await verifyLockedArtifact(target, artifact);
    return { artifact, path: target, source: "existing" };
  }
  require(!offline, `${artifact.id}: missing locked source archive in offline mode: ${target}`);
  await downloadLockedArtifact(target, artifact);
  return { artifact, path: target, source: "downloaded" };
}

function normalizeArtifact(archive) {
  require(archive && typeof archive === "object" && !Array.isArray(archive), "Bun source archive lock is missing");
  require(typeof archive.id === "string" && archive.id.length > 0, "Bun source archive id is missing");
  require(
    typeof archive.filename === "string" &&
      archive.filename.length > 0 &&
      basename(archive.filename) === archive.filename &&
      !/[\0\r\n]/.test(archive.filename),
    "Bun source archive filename is unsafe",
  );
  require(typeof archive.url === "string" && archive.url.length > 0, "Bun source archive URL is missing");
  const url = new URL(archive.url);
  require(
    url.protocol === "https:" && url.username === "" && url.password === "",
    "Bun source archive URL must be credential-free HTTPS",
  );
  require(ALLOWED_INITIAL_HOSTS.has(url.hostname), `Bun source archive URL has an unexpected host: ${url.hostname}`);
  require(Number.isSafeInteger(archive.bytes) && archive.bytes > 0, "Bun source archive byte count is invalid");
  require(/^[0-9a-f]{64}$/.test(archive.sha256), "Bun source archive SHA-256 is invalid");
  require(
    typeof archive.archiveRoot === "string" &&
      archive.archiveRoot.length > 0 &&
      !/[\\/\0\r\n]/.test(archive.archiveRoot),
    "Bun source archive root is invalid",
  );
  return Object.freeze({ ...archive });
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
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--offline") {
      require(!offline, "Duplicate argument: --offline");
      offline = true;
      continue;
    }
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), USAGE.trim());
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
    index += 1;
  }
  for (const key of Object.keys(values)) require(key === "--output-directory", `Unknown argument: ${key}`);
  require(values["--output-directory"], USAGE.trim());
  return { outputDirectory: values["--output-directory"], offline };
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const USAGE = `
Usage: node materialize-distribution-source.mjs --output-directory <absolute-dir> [--offline]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await materializeDistributionSource(parseArguments(process.argv.slice(2)));
    console.log(`OK ${result.artifact.id}: ${result.artifact.sha256} (${result.artifact.bytes} bytes, ${result.source})`);
    console.log(`OK exact Bun base source: ${result.path}`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
