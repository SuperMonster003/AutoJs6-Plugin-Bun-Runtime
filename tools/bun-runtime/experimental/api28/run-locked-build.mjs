import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, resolve, win32 } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { verifyExperiment } from "./verify-experiment.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const CONTAINER_PATHS = Object.freeze({
  experiment: "/work/api28",
  bunRepository: "/work/bun",
  bunInputs: "/inputs/bun",
  cargoInputs: "/inputs/cargo",
  sourcePrefetch: "/inputs/source",
  toolchainInputs: "/inputs/toolchain",
  toolchainInstall: "/opt/autojs6/toolchains",
  androidNdk: "/opt/autojs6/android-ndk-r27c",
});
const NODE = `${CONTAINER_PATHS.toolchainInstall}/node-v24.3.0-linux-x64/bin/node`;
const PATH = [
  `${CONTAINER_PATHS.toolchainInstall}/node-v24.3.0-linux-x64/bin`,
  `${CONTAINER_PATHS.toolchainInstall}/bun-linux-x64`,
  `${CONTAINER_PATHS.toolchainInstall}/cmake-3.30.5/bin`,
  `${CONTAINER_PATHS.toolchainInstall}/ninja-1.13.2`,
  `${CONTAINER_PATHS.toolchainInstall}/rust-nightly-2026-07-20/bin`,
  "/usr/lib/llvm-21/bin",
  "/usr/local/sbin",
  "/usr/local/bin",
  "/usr/sbin",
  "/usr/bin",
  "/sbin",
  "/bin",
].join(":");
const SHELL_LAUNCHER = 'umask 022\nmkdir -p "$HOME" "$XDG_CACHE_HOME"\nexec "$@"';
const ABI_VALUES = new Set(["arm64-v8a", "x86_64", "all"]);

export function createLockedContainerBuildPlan({
  experimentDirectory = toolDirectory,
  abi = "all",
  bunRepository,
  bunInputDirectory,
  cargoInputDirectory,
  sourcePrefetchDirectory,
  toolchainInputDirectory,
  toolchainInstallDirectory,
  androidNdkRoot,
  uid = typeof process.getuid === "function" ? process.getuid() : undefined,
  gid = typeof process.getgid === "function" ? process.getgid() : undefined,
  dockerExecutable = "docker",
} = {}) {
  require(ABI_VALUES.has(abi), `Unknown ABI selection: ${JSON.stringify(abi)}`);
  require(Number.isSafeInteger(uid) && uid >= 0, "A numeric Linux uid is required");
  require(Number.isSafeInteger(gid) && gid >= 0, "A numeric Linux gid is required");
  require(typeof dockerExecutable === "string" && dockerExecutable.length > 0, "A Docker executable is required");

  const experimentRoot = existingRealDirectory(experimentDirectory, "experiment directory");
  const verified = verifyExperiment(experimentRoot);
  const experiment = readJson(resolve(experimentRoot, "experiment.lock.json"));
  const imageDigest = experiment.toolchain?.host?.buildImageManifestDigest;
  require(/^sha256:[0-9a-f]{64}$/.test(imageDigest ?? ""), "The locked host image digest is invalid");
  require(verified.buildReady === true, "The experiment build-input gate is closed");

  const hostPaths = Object.freeze({
    experiment: experimentRoot,
    bunRepository: existingRealDirectory(bunRepository, "Bun repository"),
    bunInputs: existingRealDirectory(bunInputDirectory, "Bun input directory"),
    cargoInputs: existingRealDirectory(cargoInputDirectory, "Cargo input directory"),
    sourcePrefetch: existingRealDirectory(sourcePrefetchDirectory, "source prefetch directory"),
    toolchainInputs: existingRealDirectory(toolchainInputDirectory, "toolchain input directory"),
    toolchainInstall: existingRealDirectory(toolchainInstallDirectory, "toolchain install directory"),
    androidNdk: existingRealDirectory(androidNdkRoot, "Android NDK root"),
  });
  for (const [label, path] of Object.entries(hostPaths)) requireMountSafe(path, label);

  const image = `autojs6/bun-host-locked@${imageDigest}`;
  const innerCommand = Object.freeze([
    NODE,
    `${CONTAINER_PATHS.experiment}/build-experiment.mjs`,
    "--execute",
    "--abi",
    abi,
    "--bun-repository",
    CONTAINER_PATHS.bunRepository,
    "--bun-input-directory",
    CONTAINER_PATHS.bunInputs,
    "--cargo-input-directory",
    CONTAINER_PATHS.cargoInputs,
    "--source-prefetch-directory",
    CONTAINER_PATHS.sourcePrefetch,
    "--toolchain-directory",
    CONTAINER_PATHS.toolchainInputs,
    "--android-ndk-root",
    CONTAINER_PATHS.androidNdk,
  ]);
  const arguments_ = [
    "run",
    "--rm",
    "--pull=never",
    "--network=none",
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--hostname=autojs6-bun-build",
    "--user",
    `${uid}:${gid}`,
    "--workdir",
    CONTAINER_PATHS.bunRepository,
    "--tmpfs",
    "/tmp:rw,exec,nosuid,nodev,mode=1777",
    ...mountArguments(hostPaths.experiment, CONTAINER_PATHS.experiment, true),
    ...mountArguments(hostPaths.bunRepository, CONTAINER_PATHS.bunRepository, false),
    ...mountArguments(hostPaths.bunInputs, CONTAINER_PATHS.bunInputs, true),
    ...mountArguments(hostPaths.cargoInputs, CONTAINER_PATHS.cargoInputs, true),
    ...mountArguments(hostPaths.sourcePrefetch, CONTAINER_PATHS.sourcePrefetch, true),
    ...mountArguments(hostPaths.toolchainInputs, CONTAINER_PATHS.toolchainInputs, true),
    ...mountArguments(hostPaths.toolchainInstall, CONTAINER_PATHS.toolchainInstall, true),
    ...mountArguments(hostPaths.androidNdk, CONTAINER_PATHS.androidNdk, true),
    "--env",
    "HOME=/tmp/autojs6-home",
    "--env",
    "XDG_CACHE_HOME=/tmp/autojs6-cache",
    "--env",
    "CCACHE_DISABLE=1",
    "--env",
    "PYTHONDONTWRITEBYTECODE=1",
    "--env",
    `PATH=${PATH}`,
    image,
    "/bin/sh",
    "-eu",
    "-c",
    SHELL_LAUNCHER,
    "autojs6-build",
    ...innerCommand,
  ];
  return Object.freeze({
    abi,
    dockerExecutable,
    image,
    imageDigest,
    hostPaths,
    containerPaths: CONTAINER_PATHS,
    innerCommand,
    arguments: Object.freeze(arguments_),
  });
}

export function executeLockedContainerBuild(plan) {
  require(process.platform === "linux" && process.arch === "x64", "Locked container builds require a Linux x86_64 Docker client (for example, Ubuntu under WSL2)");
  const inspection = spawnSync(
    plan.dockerExecutable,
    ["image", "inspect", "--format={{.Id}}", plan.image],
    { encoding: "utf8" },
  );
  if (inspection.error) throw new Error(`Docker image inspection failed to start: ${inspection.error.message}`, { cause: inspection.error });
  require(inspection.status === 0, `The locked host image is not available locally: ${(inspection.stderr || inspection.stdout).trim()}`);
  require(inspection.stdout.trim() === plan.imageDigest, `The local host image ID does not match ${plan.imageDigest}`);

  const result = spawnSync(plan.dockerExecutable, plan.arguments, { stdio: "inherit" });
  if (result.error) throw new Error(`Docker build container failed to start: ${result.error.message}`, { cause: result.error });
  require(result.status === 0, `Locked container build failed with exit code ${result.status}`);
}

function mountArguments(source, destination, readonly) {
  return ["--mount", `type=bind,src=${source},dst=${destination}${readonly ? ",readonly" : ""}`];
}

function existingRealDirectory(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} is required`);
  require(isAbsolute(value) || win32.isAbsolute(value), `${label} must be absolute`);
  const path = realpathSync(resolve(value));
  const stat = lstatSync(path);
  require(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a real directory: ${path}`);
  return path;
}

function requireMountSafe(path, label) {
  require(!/[\0\r\n,]/.test(path), `${label} cannot be represented by a Docker bind mount: ${path}`);
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
  let execute = false;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--execute") {
      require(!execute, "Duplicate argument: --execute");
      execute = true;
      continue;
    }
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), USAGE.trim());
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
    index += 1;
  }
  const allowed = new Set([
    "--abi",
    "--bun-repository",
    "--bun-input-directory",
    "--cargo-input-directory",
    "--source-prefetch-directory",
    "--toolchain-input-directory",
    "--toolchain-install-directory",
    "--android-ndk-root",
  ]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  for (const key of [...allowed].filter((key) => key !== "--abi")) require(values[key], `${key} is required`);
  return {
    execute,
    abi: values["--abi"] ?? "all",
    bunRepository: values["--bun-repository"],
    bunInputDirectory: values["--bun-input-directory"],
    cargoInputDirectory: values["--cargo-input-directory"],
    sourcePrefetchDirectory: values["--source-prefetch-directory"],
    toolchainInputDirectory: values["--toolchain-input-directory"],
    toolchainInstallDirectory: values["--toolchain-install-directory"],
    androidNdkRoot: values["--android-ndk-root"],
  };
}

function formatCommand(executable, arguments_) {
  return [executable, ...arguments_].map((value) => JSON.stringify(value)).join(" ");
}

function printPlan(plan) {
  console.log(`OK locked ${plan.abi} container build plan; host ${plan.imageDigest}`);
  console.log("OK pull=never, network=none, read-only root, immutable inputs mounted read-only, ccache disabled");
  console.log(`PLAN ${formatCommand(plan.dockerExecutable, plan.arguments)}`);
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const USAGE = `
Usage:
  node run-locked-build.mjs [--execute] [--abi <arm64-v8a|x86_64|all>] \\
    --bun-repository <absolute-clean-checkout> \\
    --bun-input-directory <absolute-dir> \\
    --cargo-input-directory <absolute-dir> \\
    --source-prefetch-directory <absolute-dir> \\
    --toolchain-input-directory <absolute-dir> \\
    --toolchain-install-directory <absolute-dir> \\
    --android-ndk-root <absolute-dir>
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const plan = createLockedContainerBuildPlan(options);
    printPlan(plan);
    if (options.execute) executeLockedContainerBuild(plan);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
