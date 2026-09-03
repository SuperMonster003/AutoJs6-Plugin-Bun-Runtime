import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { materializeHostPackageInputs } from "./materialize-host-package-inputs.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const defaultLockPath = resolve(toolDirectory, "host-package-inputs.lock.json");
const defaultDockerfile = resolve(toolDirectory, "host-package.Dockerfile");
const SHA256 = /^[0-9a-f]{64}$/;

export async function buildHostImage({
  repositoryRoot,
  hostPackageDirectory,
  imageTag,
  evidenceOutput,
  noCache = false,
  lockPath = defaultLockPath,
  dockerfile = defaultDockerfile,
} = {}) {
  require(process.platform === "linux" && process.arch === "x64", "Host image construction requires a Linux x86_64 Docker client");
  require(typeof repositoryRoot === "string" && repositoryRoot.length > 0, "A repository root is required");
  require(typeof hostPackageDirectory === "string" && hostPackageDirectory.length > 0, "A host-package directory is required");
  require(typeof imageTag === "string" && /^[a-z0-9][a-z0-9./:_-]*$/.test(imageTag), "A safe Docker image tag is required");

  const root = resolve(repositoryRoot);
  const lockBytes = readFileSync(lockPath);
  const lock = JSON.parse(lockBytes.toString("utf8"));
  const materialized = await materializeHostPackageInputs({
    outputDirectory: hostPackageDirectory,
    offline: true,
    lockPath,
  });
  const expectedCount = lock.resolutionEnvironment?.provisionedManifest?.packageCount;
  const expectedManifestSha256 = lock.resolutionEnvironment?.provisionedManifest?.sha256;
  require(Number.isSafeInteger(expectedCount) && expectedCount > 0, "Locked provisioned package count is invalid");
  require(SHA256.test(expectedManifestSha256), "Locked provisioned package manifest SHA-256 is invalid");
  const lockSha256 = createHash("sha256").update(lockBytes).digest("hex");

  const buildArguments = [
    "build",
    "--network=none",
    "--pull=false",
    "--provenance=false",
    "--output=type=image,push=false,unpack=false,rewrite-timestamp=true",
    "--progress=plain",
    "--build-context",
    `host_packages=${materialized.archiveDirectory}`,
    "--build-arg",
    `EXPECTED_PACKAGE_COUNT=${expectedCount}`,
    "--build-arg",
    `EXPECTED_PACKAGE_MANIFEST_SHA256=${expectedManifestSha256}`,
    "--build-arg",
    `HOST_PACKAGE_LOCK_SHA256=${lockSha256}`,
    "--build-arg",
    "SOURCE_DATE_EPOCH=1788278400",
    "--tag",
    imageTag,
    "--file",
    resolve(dockerfile),
    root,
  ];
  if (noCache) buildArguments.splice(1, 0, "--no-cache");
  runInherited("docker", buildArguments, root, "offline host image build");

  const manifest = normalizePackageManifest(runDocker(imageTag, ["dpkg-query", "-W"], "installed package manifest"));
  const manifestBytes = Buffer.from(manifest, "utf8");
  const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
  const packageCount = manifest.split("\n").filter(Boolean).length;
  require(packageCount === expectedCount, `Expected ${expectedCount} installed packages, found ${packageCount}`);
  require(manifestSha256 === expectedManifestSha256, `Expected package manifest ${expectedManifestSha256}, found ${manifestSha256}`);

  const audit = runDocker(imageTag, ["dpkg", "--audit"], "dpkg audit");
  require(audit === "", `Built host image has dpkg audit findings: ${audit}`);
  const clang = runDocker(imageTag, ["clang", "--version"], "Clang version").split(/\r?\n/, 1)[0];
  const gcc = runDocker(imageTag, ["gcc-13", "--version"], "GCC version").split(/\r?\n/, 1)[0];
  require(clang === lock.resolutionEnvironment.toolVersions.clang, `Unexpected Clang version: ${clang}`);
  require(gcc === lock.resolutionEnvironment.toolVersions.gcc, `Unexpected GCC version: ${gcc}`);

  const compilerRuntimeLinks = lock.containerLayout?.compilerRuntimeLinks;
  require(Array.isArray(compilerRuntimeLinks) && compilerRuntimeLinks.length === 8, "Expected eight compiler runtime links");
  for (const link of compilerRuntimeLinks) {
    const target = runDocker(imageTag, ["readlink", link.path], `compiler runtime link ${link.path}`);
    require(target === link.target, `${link.path}: expected link target ${link.target}, found ${target}`);
  }

  const imageId = runCaptured("docker", ["image", "inspect", "--format={{.Id}}", imageTag], undefined, "Docker image identity");
  require(/^sha256:[0-9a-f]{64}$/.test(imageId), `Unexpected Docker image ID: ${imageId}`);
  const evidence = {
    schemaVersion: 1,
    imageTag,
    imageId,
    baseImage: lock.baseImage,
    hostPackageLockSha256: lockSha256,
    packageCount,
    packageManifestSha256: manifestSha256,
    packageArchiveCount: materialized.artifacts.length,
    packageArchiveBytes: lock.readiness.archiveBytes,
    networkPolicy: {
      runNetwork: "none",
      basePullAllowed: false,
      externalDockerfileFrontend: false,
    },
    cacheDisabled: noCache,
    toolVersions: { clang, gcc },
    compilerRuntimeLinks,
  };
  if (evidenceOutput !== undefined) {
    writeFileSync(resolve(evidenceOutput), `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
  }
  return evidence;
}

export function normalizePackageManifest(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (const [index, line] of lines.entries()) {
    require(/^\S+\t\S+$/.test(line), `Invalid installed-package manifest line ${index + 1}`);
  }
  lines.sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
  return `${lines.join("\n")}\n`;
}

function runDocker(imageTag, arguments_, label) {
  return runCaptured("docker", ["run", "--rm", "--network=none", imageTag, ...arguments_], undefined, label);
}

function runCaptured(executable, arguments_, cwd, label) {
  const result = spawnSync(executable, arguments_, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error(`${label} failed to start: ${result.error.message}`, { cause: result.error });
  require(result.status === 0, `${label} failed (${result.status}): ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

function runInherited(executable, arguments_, cwd, label) {
  const result = spawnSync(executable, arguments_, { cwd, stdio: "inherit" });
  if (result.error) throw new Error(`${label} failed to start: ${result.error.message}`, { cause: result.error });
  require(result.status === 0, `${label} failed with exit code ${result.status}`);
}

function parseArguments(argv) {
  const values = Object.create(null);
  let noCache = false;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--no-cache") {
      require(!noCache, "Duplicate argument: --no-cache");
      noCache = true;
      continue;
    }
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), "Arguments must be --name value pairs");
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
    index += 1;
  }
  const allowed = new Set(["--repository-root", "--host-package-directory", "--image-tag", "--evidence-output"]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  require(values["--repository-root"] && values["--host-package-directory"] && values["--image-tag"], USAGE.trim());
  return {
    repositoryRoot: values["--repository-root"],
    hostPackageDirectory: values["--host-package-directory"],
    imageTag: values["--image-tag"],
    evidenceOutput: values["--evidence-output"],
    noCache,
  };
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const USAGE = `
Usage: node build-host-image.mjs --repository-root <dir> --host-package-directory <dir> --image-tag <tag> [--evidence-output <json>] [--no-cache]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const evidence = await buildHostImage(parseArguments(process.argv.slice(2)));
    console.log(`OK ${evidence.imageId}: ${evidence.packageCount} packages, RUN network disabled`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
