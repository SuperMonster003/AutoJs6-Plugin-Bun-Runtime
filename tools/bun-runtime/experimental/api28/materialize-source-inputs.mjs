import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const defaultLockPath = resolve(toolDirectory, "source-inputs.lock.json");
const SHA256 = /^[0-9a-f]{64}$/;
const GROUPS = new Set(["github-archives", "source-prebuilts", "all-source"]);
const ALLOWED_FINAL_HOSTS = new Set([
  "github.com",
  "codeload.github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
  "github-releases.githubusercontent.com",
  "nodejs.org",
]);

export async function materializeSourceInputs({
  outputDirectory,
  group,
  offline = false,
  lockPath = defaultLockPath,
} = {}) {
  require(typeof outputDirectory === "string" && outputDirectory.length > 0, "An output directory is required");
  require(GROUPS.has(group), `Unknown source-input group: ${JSON.stringify(group)}`);
  const outputRoot = prepareOutputDirectory(outputDirectory);
  const byUrlDirectory = prepareOutputDirectory(join(outputRoot, "by-url"));
  const lock = readJson(lockPath);
  const artifacts = collectSourceArtifacts(lock, group);
  require(artifacts.length > 0, `No artifacts are selected by group ${group}`);

  const results = [];
  for (const artifact of artifacts) {
    const target = join(byUrlDirectory, prefetchKey(artifact.url));
    if (existsSync(target)) {
      verifyRegularFile(target, `${artifact.id}: prefetched file`);
      await verifyLockedArtifact(target, artifact);
      results.push({ ...artifact, path: target, source: "existing" });
      continue;
    }
    require(!offline, `${artifact.id}: locked input is absent in offline mode`);
    await downloadLockedArtifact(target, artifact);
    results.push({ ...artifact, path: target, source: "downloaded" });
  }
  return { group, outputRoot, artifacts: results };
}

export function collectSourceArtifacts(lock, group) {
  require(lock?.schemaVersion === 1, "Unsupported source-input lock schema");
  require(Array.isArray(lock.activeDependencies), "source-inputs.lock.json has no activeDependencies array");
  require(GROUPS.has(group), `Unknown source-input group: ${JSON.stringify(group)}`);
  const includeArchives = group === "github-archives" || group === "all-source";
  const includePrebuilts = group === "source-prebuilts" || group === "all-source";
  const artifacts = [];
  for (const dependency of lock.activeDependencies) {
    if (dependency.kind === "github-archive" && includeArchives) {
      artifacts.push(normalizeArtifact({
        id: `github-archive:${dependency.name}`,
        url: dependency.url,
        bytes: dependency.bytes,
        sha256: dependency.sha256,
        archiveRoot: dependency.topLevelDirectory,
      }));
    } else if (dependency.kind === "prebuilt" && includePrebuilts) {
      artifacts.push(normalizeArtifact({
        id: `prebuilt:${dependency.name}`,
        url: dependency.url,
        bytes: dependency.bytes,
        sha256: dependency.sha256,
      }));
    } else if (dependency.kind === "prebuilt-matrix" && includePrebuilts) {
      require(Array.isArray(dependency.variants), `${dependency.name}: variants are missing`);
      for (const variant of dependency.variants) {
        artifacts.push(normalizeArtifact({
          id: `prebuilt:${dependency.name}:${variant.abi}`,
          url: variant.url,
          bytes: variant.bytes,
          sha256: variant.sha256,
        }));
      }
    }
  }
  const ids = new Set();
  const urls = new Set();
  for (const artifact of artifacts) {
    require(!ids.has(artifact.id), `Duplicate source-input artifact ID: ${artifact.id}`);
    require(!urls.has(artifact.url), `Duplicate source-input URL: ${artifact.url}`);
    ids.add(artifact.id);
    urls.add(artifact.url);
  }
  return artifacts;
}

export function prefetchKey(url) {
  requireHttpsUrl(url, "source-input URL");
  return createHash("sha256").update(url).digest("hex").slice(0, 32);
}

export async function verifyLockedArtifact(path, artifact) {
  verifyRegularFile(path, `${artifact.id}: input`);
  const stat = lstatSync(path);
  require(stat.size === artifact.bytes, `${artifact.id}: expected ${artifact.bytes} bytes, found ${stat.size}`);
  const digest = await sha256File(path);
  require(digest === artifact.sha256, `${artifact.id}: expected SHA-256 ${artifact.sha256}, found ${digest}`);
  if (artifact.archiveRoot !== undefined) verifyArchiveRoot(path, artifact);
  return { bytes: stat.size, sha256: digest };
}

function normalizeArtifact(artifact) {
  require(typeof artifact.id === "string" && artifact.id.length > 0, "Artifact ID is missing");
  requireHttpsUrl(artifact.url, `${artifact.id}: URL`);
  require(Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0, `${artifact.id}: byte count is invalid`);
  require(SHA256.test(artifact.sha256), `${artifact.id}: SHA-256 is invalid`);
  if (artifact.archiveRoot !== undefined) {
    require(
      typeof artifact.archiveRoot === "string" &&
        artifact.archiveRoot.length > 0 &&
        !/[\\/\0\r\n]/.test(artifact.archiveRoot),
      `${artifact.id}: archive root is invalid`,
    );
  }
  return Object.freeze({ ...artifact });
}

export async function downloadLockedArtifact(target, artifact, allowedFinalHosts = ALLOWED_FINAL_HOSTS) {
  const partial = `${target}.partial-${process.pid}`;
  require(!existsSync(partial), `${artifact.id}: temporary path already exists`);
  try {
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const response = await fetch(artifact.url, { redirect: "follow", signal: AbortSignal.timeout(120_000) });
        require(response.ok && response.body !== null, `${artifact.id}: HTTP ${response.status}`);
        const finalUrl = new URL(response.url);
        require(
          finalUrl.protocol === "https:" && finalUrl.username === "" && finalUrl.password === "",
          `${artifact.id}: final download URL is not credential-free HTTPS`,
        );
        require(allowedFinalHosts.has(finalUrl.hostname), `${artifact.id}: unexpected final host ${finalUrl.hostname}`);
        const contentLength = response.headers.get("content-length");
        if (contentLength !== null && /^\d+$/.test(contentLength)) {
          require(Number(contentLength) === artifact.bytes, `${artifact.id}: HTTP Content-Length ${contentLength} does not match ${artifact.bytes}`);
        }
        let received = 0;
        const byteLimit = new Transform({
          transform(chunk, _encoding, callback) {
            received += chunk.length;
            if (received > artifact.bytes) callback(new Error(`${artifact.id}: response exceeds locked byte count ${artifact.bytes}`));
            else callback(null, chunk);
          },
        });
        await pipeline(Readable.fromWeb(response.body), byteLimit, createWriteStream(partial, { flags: "wx" }));
        await verifyLockedArtifact(partial, artifact);
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

function verifyArchiveRoot(path, artifact) {
  const tarExecutable = process.platform === "win32" && process.env.SystemRoot
    ? resolve(process.env.SystemRoot, "System32", "tar.exe")
    : "tar";
  const result = spawnSync(tarExecutable, ["-tzf", path], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  require(result.status === 0, `${artifact.id}: tar listing failed: ${result.stderr.trim()}`);
  const entries = result.stdout.split(/\r?\n/).filter(Boolean);
  require(entries.length > 0, `${artifact.id}: archive is empty`);
  const prefix = `${artifact.archiveRoot}/`;
  for (const rawEntry of entries) {
    const entry = rawEntry.replace(/^\.\//, "");
    require(!entry.startsWith("/") && !entry.includes("\0"), `${artifact.id}: unsafe archive entry ${entry}`);
    require(!entry.split("/").includes(".."), `${artifact.id}: parent traversal in archive entry ${entry}`);
    require(
      entry === artifact.archiveRoot || entry.startsWith(prefix),
      `${artifact.id}: archive entry escapes ${artifact.archiveRoot}: ${entry}`,
    );
  }
}

export function prepareOutputDirectory(path) {
  const requested = resolve(path);
  mkdirSync(requested, { recursive: true });
  const stat = lstatSync(requested);
  require(stat.isDirectory() && !stat.isSymbolicLink(), `Output path must be a real directory: ${requested}`);
  return realpathSync(requested);
}

export function verifyRegularFile(path, label) {
  const stat = lstatSync(path);
  require(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular file`);
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
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

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const USAGE = `
Usage: node materialize-source-inputs.mjs --output-directory <dir> --group <github-archives|source-prebuilts|all-source> [--offline]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await materializeSourceInputs(parseArguments(process.argv.slice(2)));
    for (const artifact of result.artifacts) {
      console.log(`OK ${artifact.id}: ${artifact.sha256} (${artifact.bytes} bytes, ${artifact.source})`);
    }
    console.log(`OK ${result.artifacts.length} locked inputs in Bun prefetch layout: ${result.outputRoot}`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
