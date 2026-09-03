import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyDistributionSource } from "../experimental/api28/verify-distribution-source.mjs";
import { createGitArchive } from "./assemble-corresponding-source.mjs";
import { inspectRegularFile, requireCondition, verifyRegularFile } from "./release-asset-common.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(toolDirectory, "../../..");
const distributionLockPath = resolve(toolDirectory, "../experimental/api28/distribution-source.lock.json");

export async function materializeWebKitSourceArchive({ outputDirectory, bunSourceArchive, webkitRepository } = {}) {
  const output = prepareEmptyDirectory(requireAbsolute(outputDirectory, "output directory"));
  const bunSource = requireAbsolute(bunSourceArchive, "Bun source archive");
  const webkit = requireAbsolute(webkitRepository, "WebKit repository");
  const lock = JSON.parse(readFileSync(distributionLockPath, "utf8"));
  const source = lock.webkitSource;
  const archive = source.releaseArchive;
  requireCondition(process.version === `v${archive.generator.node}`, `archive generation requires Node ${archive.generator.node}, found ${process.version}`);
  requireCondition(process.versions.zlib === archive.generator.zlib, `archive generation requires zlib ${archive.generator.zlib}, found ${process.versions.zlib}`);
  verifyDistributionSource({ repositoryRoot, bunSourceArchive: bunSource, webkitRepository: webkit });
  const filename = archive.filename;
  const path = join(output, filename);
  await createGitArchive({
    repository: webkit,
    commit: source.commit,
    prefix: archive.archivePrefix,
    target: path,
  });
  await verifyRegularFile(path, archive, "WebKit release source archive");
  return { filename, path, ...await inspectRegularFile(path) };
}

function prepareEmptyDirectory(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  const directory = realpathSync(path);
  const stat = lstatSync(directory);
  requireCondition(stat.isDirectory() && !stat.isSymbolicLink(), `output must be a real directory: ${directory}`);
  requireCondition(readdirSync(directory).length === 0, `output directory must be empty: ${directory}`);
  return directory;
}

function requireAbsolute(value, label) {
  requireCondition(typeof value === "string" && value.length > 0, `${label} is required`);
  requireCondition(isAbsolute(value) || win32.isAbsolute(value), `${label} must be absolute`);
  return resolve(value);
}

function parseArguments(argv) {
  const values = Object.create(null);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    requireCondition(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), USAGE.trim());
    requireCondition(values[key] === undefined, `duplicate argument: ${key}`);
    values[key] = value;
  }
  const allowed = new Set(["--output-directory", "--bun-source-archive", "--webkit-repository"]);
  for (const key of Object.keys(values)) requireCondition(allowed.has(key), `unknown argument: ${key}`);
  return {
    outputDirectory: values["--output-directory"],
    bunSourceArchive: values["--bun-source-archive"],
    webkitRepository: values["--webkit-repository"],
  };
}

const USAGE = `
Usage: node materialize-webkit-source-archive.mjs
  --output-directory <absolute-empty-dir>
  --bun-source-archive <absolute-tar.gz>
  --webkit-repository <absolute-clean-checkout>
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await materializeWebKitSourceArchive(parseArguments(process.argv.slice(2)));
    console.log(`OK ${result.filename}: ${result.bytes} bytes, SHA-256 ${result.sha256}`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
