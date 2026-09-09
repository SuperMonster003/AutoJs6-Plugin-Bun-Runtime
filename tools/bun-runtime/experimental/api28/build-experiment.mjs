import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep, win32 } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  materializeCargoInputs,
  verifyCargoDirectorySource,
  verifyCargoSourceConfig,
} from "./materialize-cargo-inputs.mjs";
import {
  materializeBunInputs,
  verifyBunCache,
} from "./materialize-bun-inputs.mjs";
import { materializeSourceInputs } from "./materialize-source-inputs.mjs";
import { materializeToolchainInputs } from "./materialize-toolchain-inputs.mjs";
import { verifyBuildInputs } from "./verify-experiment.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const ABI_VALUES = new Set(["arm64-v8a", "x86_64", "all"]);

export function createBuildPlan({
  experimentDirectory = toolDirectory,
  abi = "all",
  bunRepository = "<BUN_REPOSITORY>",
} = {}) {
  require(ABI_VALUES.has(abi), `Unknown ABI selection: ${JSON.stringify(abi)}`);
  const root = resolve(experimentDirectory);
  const verified = verifyBuildInputs(root);
  const lock = readJson(resolve(root, "experiment.lock.json"));
  const selectedAbis = lock.target.abis.filter((target) => abi === "all" || target.androidAbi === abi);
  require(selectedAbis.length > 0, `No build target selected for ${abi}`);
  const commands = selectedAbis.map((target) => {
    const configPath = resolveInside(root, target.config, `${target.androidAbi}: config`);
    return Object.freeze({
      abi: target.androidAbi,
      configPath,
      buildDirectory: targetBuildPath(bunRepository, lock.outputPolicy.bunCheckoutBuildRoot, target.androidAbi),
      configure: Object.freeze({
        executable: "node",
        arguments: Object.freeze([
          "--experimental-strip-types",
          "scripts/build.ts",
          `--config-file=${configPath}`,
        ]),
      }),
      build: Object.freeze({
        executable: "ninja",
        arguments: Object.freeze(["-C", `build/autojs6-api28/${target.androidAbi}`]),
      }),
    });
  });
  const openBlockers = lock.knownBlockers
    .filter((blocker) => !blocker.resolved)
    .map((blocker) => Object.freeze({ id: blocker.id, blocksBuild: blocker.blocksBuild, description: blocker.description }));
  const buildBlocking = openBlockers.filter((blocker) => blocker.blocksBuild);
  return Object.freeze({
    experimentDirectory: root,
    variant: verified.variant,
    upstreamCommit: verified.upstreamCommit,
    downstreamHeadCommit: readJson(resolve(root, lock.patchSeries)).downstreamBackport.headCommit,
    hostImageManifestDigest: lock.toolchain.host.buildImageManifestDigest,
    executionAllowed: lock.identity.buildReady === true && buildBlocking.length === 0,
    buildReady: lock.identity.buildReady,
    sourceDateEpoch: lock.reproducibility.sourceDateEpoch,
    timezone: lock.reproducibility.timezone,
    locale: lock.reproducibility.locale,
    commands: Object.freeze(commands),
    openBlockers: Object.freeze(openBlockers),
  });
}

export async function preflightBuildInputs(plan, {
  bunRepository,
  bunInputDirectory,
  cargoInputDirectory,
  sourcePrefetchDirectory,
  toolchainDirectory,
  androidNdkRoot,
  validateHostTools = false,
} = {}) {
  const bunRoot = existingRealDirectory(bunRepository, "Bun repository");
  const bunInputRoot = existingRealDirectory(bunInputDirectory, "Bun input directory");
  const cargoRoot = existingRealDirectory(cargoInputDirectory, "Cargo input directory");
  const sourceRoot = existingRealDirectory(sourcePrefetchDirectory, "source prefetch directory");
  const toolchainRoot = existingRealDirectory(toolchainDirectory, "toolchain directory");
  const ndkRoot = existingRealDirectory(androidNdkRoot, "Android NDK root");
  verifyBunCheckout(bunRoot, plan);
  verifyNdk(ndkRoot);

  const source = await materializeSourceInputs({
    outputDirectory: sourceRoot,
    group: "all-source",
    offline: true,
  });
  const toolchain = await materializeToolchainInputs({
    outputDirectory: toolchainRoot,
    group: "all",
    offline: true,
  });
  const cargo = await materializeCargoInputs({
    outputDirectory: cargoRoot,
    offline: true,
  });
  const cargoDirectorySource = await verifyCargoDirectorySource(
    resolveInside(cargoRoot, "vendor", "Cargo vendor directory"),
    cargo.artifacts,
  );
  const cargoConfigPath = verifyCargoSourceConfig(cargoRoot);
  const bunInputs = await materializeBunInputs({
    outputDirectory: bunInputRoot,
    offline: true,
  });
  const bunCache = await verifyBunCache(
    resolveInside(bunInputRoot, "cache", "Bun cache directory"),
    bunInputs.artifacts,
  );
  const environment = buildEnvironment(plan, sourceRoot, ndkRoot, cargoRoot, bunInputRoot);
  const toolVersions = validateHostTools
    ? verifyHostTools(plan.experimentDirectory, environment, ndkRoot)
    : null;
  return Object.freeze({
    bunRepository: bunRoot,
    bunInputDirectory: bunInputRoot,
    cargoInputDirectory: cargoRoot,
    sourcePrefetchDirectory: sourceRoot,
    toolchainDirectory: toolchainRoot,
    androidNdkRoot: ndkRoot,
    sourceInputCount: source.artifacts.length,
    toolchainInputCount: toolchain.artifacts.length,
    cargoArchiveCount: cargo.artifacts.length,
    bunArchiveCount: bunInputs.artifacts.length,
    bunCache,
    cargoDirectorySource,
    cargoConfigPath,
    environment,
    toolVersions,
  });
}

export async function executeBuildPlan(plan, options = {}) {
  require(plan.executionAllowed, "Build execution is locked because build inputs are not ready or a build-blocking gate remains open");
  require(process.platform === "linux" && process.arch === "x64", "Build execution requires a Linux x86_64 host");
  const preflight = await preflightBuildInputs(plan, { ...options, validateHostTools: true });
  for (const command of plan.commands) {
    runInherited(
      process.execPath,
      command.configure.arguments,
      preflight.bunRepository,
      preflight.environment,
      `${command.abi}: configure`,
    );
    runInherited(
      command.build.executable,
      command.build.arguments,
      preflight.bunRepository,
      preflight.environment,
      `${command.abi}: build`,
    );
  }
  return preflight;
}

function verifyBunCheckout(bunRoot, plan) {
  const topLevel = runCaptured("git", ["-C", bunRoot, "rev-parse", "--show-toplevel"], undefined, "Bun repository root");
  require(samePath(realpathSync(topLevel), bunRoot), `Bun repository resolves to a different Git root: ${topLevel}`);
  const head = runCaptured("git", ["-C", bunRoot, "rev-parse", "HEAD"], undefined, "Bun repository HEAD");
  require(head === plan.downstreamHeadCommit, `Bun repository HEAD must be ${plan.downstreamHeadCommit}, found ${head}`);
  const status = runCaptured(
    "git",
    ["-C", bunRoot, "status", "--porcelain=v1", "--untracked-files=all"],
    undefined,
    "Bun repository status",
  );
  require(status === "", "Bun repository must be clean before a clean build");
  const outputRoot = resolveInside(bunRoot, "build/autojs6-api28", "Bun build output root");
  require(!existsSync(outputRoot), `Clean-build output root already exists: ${outputRoot}`);
}

function verifyNdk(ndkRoot) {
  const propertiesPath = resolveInside(ndkRoot, "source.properties", "NDK source.properties");
  require(existsSync(propertiesPath), `NDK source.properties is missing: ${propertiesPath}`);
  const properties = readFileSync(propertiesPath, "utf8");
  require(/^Pkg\.Revision\s*=\s*27\.2\.12479018\s*$/m.test(properties), "Android NDK revision must be 27.2.12479018 (r27c)");
}

function verifyHostTools(experimentDirectory, environment, ndkRoot) {
  const hostLock = readJson(resolveInside(experimentDirectory, "host-package-inputs.lock.json", "host-package lock"));
  const versions = {
    node: runCaptured(process.execPath, ["--version"], environment, "Node.js version"),
    bun: runCaptured("bun", ["--version"], environment, "bootstrap Bun version"),
    cmake: runCaptured("cmake", ["--version"], environment, "CMake version").split(/\r?\n/, 1)[0],
    ninja: runCaptured("ninja", ["--version"], environment, "Ninja version"),
    clang: runCaptured("clang", ["--version"], environment, "Clang version").split(/\r?\n/, 1)[0],
    rustc: runCaptured("rustc", ["--version"], environment, "Rust version"),
    cargo: runCaptured("cargo", ["--version"], environment, "Cargo version"),
    gcc: runCaptured("gcc-13", ["--version"], environment, "GCC version").split(/\r?\n/, 1)[0],
  };
  require(versions.node === "v24.3.0", `Node.js must be v24.3.0, found ${versions.node}`);
  require(versions.bun === "1.3.13", `bootstrap Bun must be 1.3.13, found ${versions.bun}`);
  require(versions.cmake === "cmake version 3.30.5", `CMake must be 3.30.5, found ${versions.cmake}`);
  require(versions.ninja === "1.13.2", `Ninja must be 1.13.2, found ${versions.ninja}`);
  require(versions.clang === hostLock.resolutionEnvironment.toolVersions.clang, `Clang does not match the locked host image: ${versions.clang}`);
  require(versions.gcc === hostLock.resolutionEnvironment.toolVersions.gcc, `GCC does not match the locked host image: ${versions.gcc}`);
  require(
    versions.rustc === "rustc 1.99.0-nightly (9f36de775 2026-07-19)",
    `Rust must be the pinned nightly, found ${versions.rustc}`,
  );
  require(versions.cargo.startsWith("cargo 1.99.0-nightly "), `Cargo must be the pinned nightly, found ${versions.cargo}`);
  const installedPackages = normalizePackageManifest(
    runCaptured("dpkg-query", ["-W"], environment, "installed package manifest"),
  );
  const packageManifestSha256 = createHash("sha256").update(installedPackages).digest("hex");
  const packageCount = installedPackages.split("\n").filter(Boolean).length;
  require(packageCount === hostLock.resolutionEnvironment.provisionedManifest.packageCount, `Locked host image must contain ${hostLock.resolutionEnvironment.provisionedManifest.packageCount} packages, found ${packageCount}`);
  require(packageManifestSha256 === hostLock.resolutionEnvironment.provisionedManifest.sha256, `Host package manifest does not match ${hostLock.resolutionEnvironment.provisionedManifest.sha256}`);
  require(samePath(ndkRoot, hostLock.containerLayout.androidNdkRoot), `Android NDK must be mounted at ${hostLock.containerLayout.androidNdkRoot}`);
  for (const link of hostLock.containerLayout.compilerRuntimeLinks) {
    const stat = lstatSync(link.path);
    require(stat.isSymbolicLink(), `Compiler runtime path must be a symbolic link: ${link.path}`);
    require(readlinkSync(link.path) === link.target, `Compiler runtime link target drifted: ${link.path}`);
    require(existsSync(link.target), `Compiler runtime link target is absent: ${link.target}`);
  }
  return Object.freeze({ ...versions, packageCount, packageManifestSha256 });
}

function normalizePackageManifest(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (const [index, line] of lines.entries()) require(/^\S+\t\S+$/.test(line), `Invalid installed package manifest line ${index + 1}`);
  lines.sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
  return `${lines.join("\n")}\n`;
}

function buildEnvironment(plan, sourceRoot, ndkRoot, cargoRoot, bunInputRoot) {
  return Object.freeze({
    ...process.env,
    ANDROID_NDK_ROOT: ndkRoot,
    BUN_BUILD_PREFETCH_DIR: sourceRoot,
    BUN_INSTALL_CACHE_DIR: resolveInside(bunInputRoot, "cache", "Bun cache directory"),
    CARGO_HOME: resolveInside(cargoRoot, "cargo-home", "Cargo home directory"),
    CARGO_NET_OFFLINE: "true",
    LANG: plan.locale,
    LC_ALL: plan.locale,
    PYTHONHASHSEED: "0",
    RUSTUP_TOOLCHAIN: "nightly-2026-07-20",
    SOURCE_DATE_EPOCH: String(plan.sourceDateEpoch),
    TZ: plan.timezone,
  });
}

function runCaptured(executable, arguments_, environment, label) {
  const result = spawnSync(executable, arguments_, {
    encoding: "utf8",
    env: environment,
    windowsHide: true,
  });
  if (result.error) throw new Error(`${label} failed to start: ${result.error.message}`, { cause: result.error });
  require(result.status === 0, `${label} failed (${result.status}): ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

function runInherited(executable, arguments_, cwd, environment, label) {
  const result = spawnSync(executable, arguments_, {
    cwd,
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw new Error(`${label} failed to start: ${result.error.message}`, { cause: result.error });
  require(result.status === 0, `${label} failed with exit code ${result.status}`);
}

function existingRealDirectory(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} is required`);
  require(isAbsolute(value) || win32.isAbsolute(value), `${label} must be an absolute path`);
  const requested = resolve(value);
  require(existsSync(requested), `${label} does not exist: ${requested}`);
  const stat = lstatSync(requested);
  require(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a real directory: ${requested}`);
  return realpathSync(requested);
}

function targetBuildPath(bunRepository, buildRoot, abi) {
  if (bunRepository === "<BUN_REPOSITORY>") return `<BUN_REPOSITORY>/${buildRoot}/${abi}`;
  return resolve(bunRepository, buildRoot, abi);
}

function samePath(left, right) {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function resolveInside(root, value, label) {
  require(typeof value === "string" && value.length > 0, `${label} is missing`);
  require(!isAbsolute(value) && !win32.isAbsolute(value), `${label} must be relative`);
  const result = resolve(root, value);
  const fromRoot = relative(root, result);
  require(fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot), `${label} escapes its root`);
  return result;
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
  let preflight = false;
  let execute = false;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--preflight" || key === "--execute") {
      if (key === "--preflight") require(!preflight, "Duplicate argument: --preflight");
      if (key === "--execute") require(!execute, "Duplicate argument: --execute");
      preflight = preflight || key === "--preflight";
      execute = execute || key === "--execute";
      continue;
    }
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), USAGE.trim());
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
    index += 1;
  }
  require(!(preflight && execute), "Choose only one of --preflight or --execute");
  const allowed = new Set([
    "--abi",
    "--bun-repository",
    "--bun-input-directory",
    "--cargo-input-directory",
    "--source-prefetch-directory",
    "--toolchain-directory",
    "--android-ndk-root",
  ]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  const mode = execute ? "execute" : preflight ? "preflight" : "plan";
  if (mode !== "plan") {
    for (const required of ["--bun-repository", "--bun-input-directory", "--cargo-input-directory", "--source-prefetch-directory", "--toolchain-directory", "--android-ndk-root"]) {
      require(values[required], `${required} is required in ${mode} mode`);
    }
  }
  return {
    mode,
    abi: values["--abi"] ?? "all",
    bunRepository: values["--bun-repository"],
    bunInputDirectory: values["--bun-input-directory"],
    cargoInputDirectory: values["--cargo-input-directory"],
    sourcePrefetchDirectory: values["--source-prefetch-directory"],
    toolchainDirectory: values["--toolchain-directory"],
    androidNdkRoot: values["--android-ndk-root"],
  };
}

function printPlan(plan) {
  console.log(`OK build plan ${plan.variant}; source ${plan.upstreamCommit}; patched head ${plan.downstreamHeadCommit}; host ${plan.hostImageManifestDigest}`);
  for (const command of plan.commands) {
    console.log(`PLAN ${command.abi}: ${formatCommand(command.configure)}`);
    console.log(`PLAN ${command.abi}: ${formatCommand(command.build)}`);
  }
  for (const blocker of plan.openBlockers) {
    console.log(`${blocker.blocksBuild ? "BLOCKED" : "OPEN EVIDENCE GATE"} ${blocker.id}: ${blocker.description}`);
  }
  if (!plan.executionAllowed) {
    console.log("NOT BUILD READY: plan generation is read-only; --execute remains locked");
  } else {
    console.log("BUILD READY: all immutable input gates are closed; open evidence gates do not block a clean experimental build");
  }
}

function formatCommand(command) {
  return [command.executable, ...command.arguments].map((part) => JSON.stringify(part)).join(" ");
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const USAGE = `
Usage:
  node build-experiment.mjs [--abi <arm64-v8a|x86_64|all>]
  node build-experiment.mjs --preflight --bun-repository <absolute-dir> --bun-input-directory <absolute-dir> --cargo-input-directory <absolute-dir> --source-prefetch-directory <absolute-dir> --toolchain-directory <absolute-dir> --android-ndk-root <absolute-dir> [--abi <...>]
  node build-experiment.mjs --execute --bun-repository <absolute-dir> --bun-input-directory <absolute-dir> --cargo-input-directory <absolute-dir> --source-prefetch-directory <absolute-dir> --toolchain-directory <absolute-dir> --android-ndk-root <absolute-dir> [--abi <...>]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const plan = createBuildPlan({ abi: options.abi, bunRepository: options.bunRepository });
    printPlan(plan);
    if (options.mode === "preflight") {
      const result = await preflightBuildInputs(plan, options);
      console.log(
        `OK ${result.sourceInputCount} source inputs, ${result.toolchainInputCount} toolchain inputs, ` +
          `${result.cargoArchiveCount} Cargo archives plus their offline directory source, and ` +
          `${result.bunArchiveCount} Bun registry archives plus their offline cache are present and locked`,
      );
      console.log("OK BUILD PREFLIGHT: immutable inputs are complete; --execute remains an explicit operation");
    } else if (options.mode === "execute") {
      await executeBuildPlan(plan, options);
    }
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
