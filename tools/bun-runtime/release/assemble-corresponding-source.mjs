import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
  constants as fsConstants,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve, win32 } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";

import { inspectApkRuntime } from "../verify-apk-runtime.mjs";
import { collectBunArtifacts } from "../experimental/api28/materialize-bun-inputs.mjs";
import { collectCargoArtifacts } from "../experimental/api28/materialize-cargo-inputs.mjs";
import {
  collectSourceArtifacts,
  prefetchKey,
} from "../experimental/api28/materialize-source-inputs.mjs";
import { verifyDistributionSource } from "../experimental/api28/verify-distribution-source.mjs";
import {
  DEFAULT_MAX_PART_BYTES,
  RELEASE_MANIFEST_SCHEMA_VERSION,
  compareAscii,
  crc32File,
  formatSha256Sums,
  inspectRegularFile,
  readGitArchiveCommit,
  requireCondition,
  requireSafeAssetName,
  splitFileIntoAssets,
  verifyRegularFile,
  writeDeterministicTar,
} from "./release-asset-common.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(toolDirectory, "../../..");
const experimentDirectory = resolve(toolDirectory, "../experimental/api28");
const expectedRepository = "SuperMonster003/AutoJs6-Plugin-Bun-Runtime";
const projectAssetPrefix = "autojs6-plugin-bun-runtime";
const profiles = new Set(["official", "api28-patched-experimental"]);

export async function assembleCorrespondingSourceRelease(options = {}) {
  const normalized = normalizeOptions(options);
  const outputDirectory = prepareEmptyDirectory(normalized.outputDirectory);
  const workDirectory = mkdtempSync(join(tmpdir(), "autojs6-bun-release-source-"));
  try {
    const project = inspectProjectRepository(normalized.projectRepository);
    requireCondition(project.version === normalized.version, `version.properties is ${project.version}, not ${normalized.version}`);
    verifyReleaseTag(normalized.profile, normalized.version, normalized.tag);

    const distributionLockPath = resolve(experimentDirectory, "distribution-source.lock.json");
    const distributionLock = readJson(distributionLockPath);
    const runtimeLock = readJson(resolve(repositoryRoot, "tools/bun-runtime/runtime.lock.json"));
    verifyDistributionSource({
      repositoryRoot: normalized.projectRepository,
      bunSourceArchive: normalized.bunSourceArchive,
      ...(normalized.webkitRepository === undefined ? {} : { webkitRepository: normalized.webkitRepository }),
    });

    const runtimeIdentity = selectRuntimeIdentity(normalized.profile, runtimeLock, distributionLock);
    const apkRecords = await collectApks({
      apkDirectory: normalized.apkDirectory,
      outputDirectory,
      runtimeIdentity,
      version: normalized.version,
      javaExecutable: normalized.javaExecutable,
      apksignerJar: normalized.apksignerJar,
    });

    const componentPrefix = `${projectAssetPrefix}-v${normalized.version}-corresponding-source`;
    const components = [];

    components.push(await addExistingLogicalComponent({
      id: "bun-base-source",
      role: "exact-bun-base-source",
      source: normalized.bunSourceArchive,
      logicalName: `${componentPrefix}-bun-${distributionLock.bunSource.baseCommit}.tar.gz`,
      outputDirectory,
      maxPartBytes: normalized.maxPartBytes,
      expected: distributionLock.bunSource.archive,
    }));

    await verifyRegularFile(
      normalized.webkitSourceArchive,
      distributionLock.webkitSource.releaseArchive,
      "WebKit release source archive",
    );
    requireCondition(
      await readGitArchiveCommit(normalized.webkitSourceArchive) === distributionLock.webkitSource.commit,
      "WebKit release source archive commit differs from the lock",
    );
    components.push(await addExistingLogicalComponent({
      id: "webkit-source",
      role: "exact-webkit-javascriptcore-source",
      source: normalized.webkitSourceArchive,
      logicalName: `${componentPrefix}-webkit-${distributionLock.webkitSource.commit}.tar.gz`,
      outputDirectory,
      maxPartBytes: normalized.maxPartBytes,
      expected: distributionLock.webkitSource.releaseArchive,
      provenance: {
        repository: distributionLock.webkitSource.repository,
        tag: distributionLock.webkitSource.tag,
        commit: distributionLock.webkitSource.commit,
        treeSha1: distributionLock.webkitSource.treeSha1,
        trackedFileCount: distributionLock.webkitSource.trackedFileCount,
        gitArchivePrefix: distributionLock.webkitSource.releaseArchive.archivePrefix,
      },
    }));

    const nativePack = await createNativeSourcePack({
      cacheDirectory: normalized.nativeSourceCache,
      target: join(workDirectory, `${componentPrefix}-native-archives.tar`),
    });
    components.push(await addGeneratedLogicalComponent({
      id: "native-source-archives",
      role: "locked-native-dependency-source-archives",
      source: nativePack.path,
      logicalName: basename(nativePack.path),
      outputDirectory,
      maxPartBytes: normalized.maxPartBytes,
      content: nativePack.content,
    }));

    const cargoPack = await createRegistrySourcePack({
      id: "cargo",
      cacheDirectory: normalized.cargoSourceCache,
      lockPath: resolve(experimentDirectory, "cargo-inputs.lock.json"),
      collectArtifacts: collectCargoArtifacts,
      target: join(workDirectory, `${componentPrefix}-cargo-archives.tar`),
    });
    components.push(await addGeneratedLogicalComponent({
      id: "cargo-source-archives",
      role: "locked-crates-io-source-archives",
      source: cargoPack.path,
      logicalName: basename(cargoPack.path),
      outputDirectory,
      maxPartBytes: normalized.maxPartBytes,
      content: cargoPack.content,
    }));

    const bunRegistryPack = await createRegistrySourcePack({
      id: "npm",
      cacheDirectory: normalized.bunRegistrySourceCache,
      lockPath: resolve(experimentDirectory, "bun-inputs.lock.json"),
      collectArtifacts: collectBunArtifacts,
      target: join(workDirectory, `${componentPrefix}-npm-archives.tar`),
    });
    components.push(await addGeneratedLogicalComponent({
      id: "npm-source-archives",
      role: "locked-npm-source-archives",
      source: bunRegistryPack.path,
      logicalName: basename(bunRegistryPack.path),
      outputDirectory,
      maxPartBytes: normalized.maxPartBytes,
      content: bunRegistryPack.content,
    }));

    const projectArchive = join(workDirectory, `${componentPrefix}-project-${project.commit}.tar.gz`);
    await createGitArchive({
      repository: normalized.projectRepository,
      commit: project.commit,
      prefix: `${projectAssetPrefix}-${project.commit}/`,
      target: projectArchive,
    });
    components.push(await addGeneratedLogicalComponent({
      id: "project-source-and-build-instructions",
      role: "project-source-patches-locks-notices-and-relink-instructions",
      source: projectArchive,
      logicalName: basename(projectArchive),
      outputDirectory,
      maxPartBytes: normalized.maxPartBytes,
      provenance: {
        repository: `https://github.com/${normalized.repository}`,
        commit: project.commit,
        treeSha1: project.tree,
        gitArchivePrefix: `${projectAssetPrefix}-${project.commit}/`,
      },
    }));

    const noticeName = `${componentPrefix}-LICENSES-AND-RELINKING.md`;
    const noticeSource = resolve(toolDirectory, "CORRESPONDING_SOURCE_NOTICE.md");
    const noticePath = join(outputDirectory, noticeName);
    copyFileSync(noticeSource, noticePath, fsConstants.COPYFILE_EXCL);
    const notice = { filename: noticeName, role: "license-and-relinking-notice", ...await inspectRegularFile(noticePath) };

    const manifestName = `${componentPrefix}-manifest.json`;
    const checksumName = `${projectAssetPrefix}-v${normalized.version}-SHA256SUMS.txt`;
    const manifest = {
      schemaVersion: RELEASE_MANIFEST_SCHEMA_VERSION,
      identity: {
        project: "AutoJs6 Plugin Bun Runtime",
        repository: normalized.repository,
        version: normalized.version,
        releaseDate: project.releaseDate,
        tag: normalized.tag,
        profile: normalized.profile,
        prerelease: normalized.profile === "api28-patched-experimental",
      },
      projectSource: {
        commit: project.commit,
        treeSha1: project.tree,
        sourceDateEpoch: project.sourceDateEpoch,
      },
      runtime: runtimeIdentity,
      apkAssets: apkRecords,
      sourceComponents: components,
      notice,
      checksumAsset: checksumName,
      technicalValidation: {
        automated: true,
        sameReleaseRequired: true,
        githubAssetDigestRequired: true,
        sourcePartMaximumBytes: normalized.maxPartBytes,
        checks: [
          "APK file SHA-256 and contained runtime SHA-256",
          "source component and per-part SHA-256",
          "exact Bun archive identity",
          "WebKit Git archive commit identity",
          "native, Cargo, and npm archive closure",
          "public license and relinking notice",
        ],
        legalConclusionClaimed: false,
        statement: "Automated technical verification; not a legal opinion or approval.",
      },
    };
    const manifestPath = join(outputDirectory, manifestName);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    const manifestRecord = { filename: manifestName, role: "machine-readable-release-manifest", ...await inspectRegularFile(manifestPath) };

    const checksummed = [
      ...apkRecords.map(({ filename, bytes, sha256 }) => ({ filename, bytes, sha256 })),
      ...components.flatMap((component) => component.parts.map(({ filename, bytes, sha256 }) => ({ filename, bytes, sha256 }))),
      notice,
      manifestRecord,
    ];
    const checksumPath = join(outputDirectory, checksumName);
    writeFileSync(checksumPath, formatSha256Sums(checksummed), { encoding: "utf8", flag: "wx" });
    const checksumRecord = { filename: checksumName, role: "sha256-manifest", ...await inspectRegularFile(checksumPath) };

    return {
      outputDirectory,
      manifest,
      manifestRecord,
      checksumRecord,
      assetCount: checksummed.length + 1,
    };
  } finally {
    rmSync(workDirectory, { force: true, recursive: true });
  }
}

async function collectApks({ apkDirectory, outputDirectory, runtimeIdentity, version, javaExecutable, apksignerJar }) {
  const directory = existingDirectory(apkDirectory, "APK directory");
  const names = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".apk"))
    .map((entry) => entry.name)
    .sort();
  requireCondition(names.length === 3, `expected exactly three release APKs, found ${names.length}: ${names.join(", ")}`);
  const classified = names.map((filename) => ({ filename, abis: classifyApk(filename, version) }));
  requireCondition(
    JSON.stringify(classified.map(({ abis }) => abis)) === JSON.stringify([["arm64-v8a"], ["arm64-v8a", "x86_64"], ["x86_64"]]),
    "APK filenames must sort as arm64-v8a, universal, and x86_64",
  );
  const artifacts = new Map(runtimeIdentity.artifacts.map((artifact) => [artifact.abi, {
    binaryBytes: artifact.bytes,
    binarySha256: artifact.sha256,
  }]));
  const results = [];
  for (const { filename, abis } of classified) {
    requireSafeAssetName(filename, "APK filename");
    const source = join(directory, filename);
    const variant = abis.length === 2 ? "universal" : abis[0];
    const crc32 = await crc32File(source);
    requireCondition(
      filename === `${projectAssetPrefix}-v${version}-${variant}-${crc32}.apk`,
      `${filename}: release filename does not contain its exact CRC32 ${crc32}`,
    );
    const runtimes = inspectApkRuntime(source, abis, artifacts);
    const signing = verifyApkSignature(source, javaExecutable, apksignerJar);
    const target = join(outputDirectory, filename);
    copyFileSync(source, target, fsConstants.COPYFILE_EXCL);
    results.push({ filename, role: `signed-${variant}-apk`, crc32, ...await inspectRegularFile(target), signing, runtimes });
  }
  requireCondition(new Set(results.map((apk) => apk.signing.certificateSha256)).size === 1, "release APKs are not signed by the same certificate");
  return results;
}

export function verifyApkSignature(apkPath, javaExecutable, apksignerJar) {
  const result = spawnSync(javaExecutable, ["-jar", apksignerJar, "verify", "--verbose", "--print-certs", apkPath], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  requireCondition(result.status === 0, `${basename(apkPath)}: apksigner verification failed: ${result.stderr.trim()}`);
  return parseApkSignerOutput(`${result.stdout}\n${result.stderr}`, basename(apkPath));
}

export function parseApkSignerOutput(output, label = "APK") {
  requireCondition(typeof output === "string", `${label}: apksigner output is invalid`);
  const v2 = /Verified using v2 scheme \(APK Signature Scheme v2\): true/.test(output);
  const v3 = /Verified using v3(?:\.1|\.2)? scheme \(APK Signature Scheme v3(?:\.1|\.2)?\): true/.test(output);
  requireCondition(v2 || v3, `${label}: neither APK Signature Scheme v2 nor v3 verified`);
  requireCondition(/^Number of signers: 1\r?$/m.test(output), `${label}: expected exactly one APK signer`);
  const certificates = [...output.matchAll(/^(?:V[23](?:\.1|\.2)? Signer:|Signer #1) certificate SHA-256 digest: ([0-9a-f]{64})\r?$/gm)]
    .map((match) => match[1]);
  requireCondition(certificates.length > 0, `${label}: signer certificate SHA-256 is missing`);
  requireCondition(new Set(certificates).size === 1, `${label}: APK schemes report different signing certificates`);
  return { verifiedSchemes: [...(v2 ? ["v2"] : []), ...(v3 ? ["v3"] : [])], signerCount: 1, certificateSha256: certificates[0] };
}

function classifyApk(filename, version) {
  requireCondition(filename.startsWith(`${projectAssetPrefix}-v${version}-`) && filename.endsWith(".apk"), `unexpected release APK filename: ${filename}`);
  if (filename.includes("-arm64-v8a-")) return ["arm64-v8a"];
  if (filename.includes("-universal-")) return ["arm64-v8a", "x86_64"];
  if (filename.includes("-x86_64-")) return ["x86_64"];
  throw new Error(`cannot classify release APK ABI from filename: ${filename}`);
}

async function createNativeSourcePack({ cacheDirectory, target }) {
  const lock = readJson(resolve(experimentDirectory, "source-inputs.lock.json"));
  const artifacts = [
    ...collectSourceArtifacts(lock, "github-archives"),
    ...collectSourceArtifacts(lock, "source-prebuilts").filter((artifact) => artifact.id === "prebuilt:nodejs"),
  ];
  const dependencies = new Map(lock.activeDependencies.map((dependency) => [dependency.name, dependency]));
  const cacheRoot = existingDirectory(cacheDirectory, "native source cache");
  const records = [];
  const entries = [];
  for (const artifact of artifacts) {
    const name = artifact.id === "prebuilt:nodejs"
      ? "nodejs"
      : artifact.id.slice("github-archive:".length);
    const dependency = dependencies.get(name);
    requireCondition(dependency !== undefined, `${artifact.id}: source dependency metadata is missing`);
    const source = join(cacheRoot, "by-url", prefetchKey(artifact.url));
    await verifyRegularFile(source, artifact, artifact.id);
    const archivePath = dependency.kind === "github-archive"
      ? `archives/${safeToken(name)}-${dependency.revision}.tar.gz`
      : `archives/nodejs-${safeToken(dependency.version)}-headers.tar.gz`;
    records.push(sourceRecord(artifact, archivePath));
    entries.push({ path: archivePath, file: source });
  }
  return finishSourcePack({ id: "native", target, records, entries });
}

async function createRegistrySourcePack({ id, cacheDirectory, lockPath, collectArtifacts, target }) {
  const lock = readJson(lockPath);
  const artifacts = collectArtifacts(lock);
  const archiveDirectory = resolve(existingDirectory(cacheDirectory, `${id} source cache`), "archives");
  const records = [];
  const entries = [];
  for (const artifact of artifacts) {
    requireSafeAssetName(artifact.filename, `${artifact.id} filename`);
    const source = join(archiveDirectory, artifact.filename);
    await verifyRegularFile(source, artifact, artifact.id);
    const archivePath = `archives/${artifact.filename}`;
    records.push(sourceRecord(artifact, archivePath));
    entries.push({ path: archivePath, file: source });
  }
  return finishSourcePack({ id, target, records, entries });
}

async function finishSourcePack({ id, target, records, entries }) {
  records.sort((left, right) => compareAscii(left.archivePath, right.archivePath));
  const index = Buffer.from(`${JSON.stringify({ schemaVersion: 1, id, artifacts: records }, null, 2)}\n`);
  await writeDeterministicTar(target, [{ path: "INDEX.json", buffer: index }, ...entries]);
  return {
    path: target,
    content: {
      format: "deterministic-ustar-files-only-v1",
      artifactCount: records.length,
      indexBytes: index.length,
      indexSha256: createHash("sha256").update(index).digest("hex"),
      artifacts: records,
    },
  };
}

function sourceRecord(artifact, archivePath) {
  return {
    id: artifact.id,
    archivePath,
    url: artifact.url,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
  };
}

async function addExistingLogicalComponent({ expected, ...options }) {
  await verifyRegularFile(options.source, expected, options.id);
  const component = await addGeneratedLogicalComponent(options);
  requireCondition(component.logicalBytes === expected.bytes, `${options.id}: locked byte count drifted`);
  requireCondition(component.logicalSha256 === expected.sha256, `${options.id}: locked SHA-256 drifted`);
  return component;
}

async function addGeneratedLogicalComponent({ id, role, source, logicalName, outputDirectory, maxPartBytes, provenance, content }) {
  const split = await splitFileIntoAssets({ source, logicalName, outputDirectory, maxPartBytes });
  return {
    id,
    role,
    format: logicalName.endsWith(".tar.gz") ? "tar+gzip" : "tar",
    ...split,
    ...(provenance === undefined ? {} : { provenance }),
    ...(content === undefined ? {} : { content }),
  };
}

export async function createGitArchive({ repository, commit, prefix, target }) {
  requireCondition(prefix.endsWith("/") && !prefix.startsWith("/") && !prefix.includes(".."), `unsafe Git archive prefix: ${prefix}`);
  const child = spawn("git", ["-C", repository, "archive", "--format=tar", `--prefix=${prefix}`, commit], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const closed = new Promise((resolveClose, rejectClose) => {
    child.once("error", rejectClose);
    child.once("close", (code, signal) => {
      if (code === 0 && signal === null) resolveClose();
      else rejectClose(new Error(`git archive failed with ${signal === null ? `exit ${code}` : `signal ${signal}`}: ${stderr.trim()}`));
    });
  });
  await Promise.all([
    pipeline(child.stdout, createGzip({ level: 9, mtime: 0 }), createWriteStream(target, { flags: "wx", mode: 0o644 })),
    closed,
  ]);
}

function selectRuntimeIdentity(profile, runtimeLock, distributionLock) {
  if (profile === "official") {
    return {
      variant: "bun-1.4.0-android",
      upstreamCommit: runtimeLock.upstream.commit,
      sourceTransformation: "none",
      artifacts: runtimeLock.artifacts.map((artifact) => ({
        abi: artifact.abi,
        bytes: artifact.binaryBytes,
        sha256: artifact.binarySha256,
      })),
    };
  }
  return {
    variant: distributionLock.identity.variant,
    upstreamCommit: distributionLock.bunSource.baseCommit,
    sourceTransformation: "ordered-downstream-patch-series",
    downstreamCommit: distributionLock.bunSource.downstreamCommit,
    downstreamTreeSha1: distributionLock.bunSource.downstreamTreeSha1,
    patchCount: distributionLock.bunSource.downstreamPatchCount,
    artifacts: distributionLock.artifacts,
  };
}

function inspectProjectRepository(path) {
  const repository = existingDirectory(path, "project repository");
  requireCondition(runGit(repository, ["status", "--porcelain=v1", "--untracked-files=all"]) === "", "project repository must be clean before release assets are assembled");
  const commit = runGit(repository, ["rev-parse", "HEAD"]);
  const tree = runGit(repository, ["rev-parse", "HEAD^{tree}"]);
  const sourceDateEpoch = Number(runGit(repository, ["show", "-s", "--format=%ct", "HEAD"]));
  requireCondition(/^[0-9a-f]{40}$/.test(commit) && /^[0-9a-f]{40}$/.test(tree), "project Git identity is invalid");
  requireCondition(Number.isSafeInteger(sourceDateEpoch) && sourceDateEpoch > 0, "project commit time is invalid");
  const properties = readFileSync(join(repository, "version.properties"), "utf8");
  const match = /^VERSION_NAME=(.+)$/m.exec(properties);
  requireCondition(match !== null, "VERSION_NAME is missing from version.properties");
  const version = match[1].trim();
  const changelog = readJson(join(repository, ".changelog/lang_en.json"));
  const releaseDate = changelog?.$data?.[`v${version}`]?.released_date;
  requireCondition(/^\d{4}\/\d{2}\/\d{2}$/.test(releaseDate ?? ""), `release date is missing for v${version}`);
  return { repository, commit, tree, sourceDateEpoch, version, releaseDate };
}

function runGit(repository, args) {
  const child = spawnSync("git", ["-C", repository, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (child.error) throw child.error;
  requireCondition(child.status === 0, `git ${args.join(" ")} failed: ${child.stderr.trim()}`);
  return child.stdout.trim();
}

function normalizeOptions(options) {
  requireCondition(profiles.has(options.profile), `unknown release profile: ${JSON.stringify(options.profile)}`);
  requireCondition(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(options.version ?? ""), "release version is invalid");
  requireCondition(options.repository === expectedRepository, `release repository must be ${expectedRepository}`);
  const maxPartBytes = options.maxPartBytes === undefined ? DEFAULT_MAX_PART_BYTES : Number(options.maxPartBytes);
  requireCondition(Number.isSafeInteger(maxPartBytes) && maxPartBytes > 0, "max part bytes is invalid");
  return {
    ...options,
    maxPartBytes,
    outputDirectory: requireAbsolute(options.outputDirectory, "output directory"),
    apkDirectory: requireAbsolute(options.apkDirectory, "APK directory"),
    bunSourceArchive: requireAbsolute(options.bunSourceArchive, "Bun source archive"),
    webkitSourceArchive: requireAbsolute(options.webkitSourceArchive, "WebKit source archive"),
    webkitRepository: options.webkitRepository === undefined
      ? undefined
      : requireAbsolute(options.webkitRepository, "WebKit repository"),
    nativeSourceCache: requireAbsolute(options.nativeSourceCache, "native source cache"),
    cargoSourceCache: requireAbsolute(options.cargoSourceCache, "Cargo source cache"),
    bunRegistrySourceCache: requireAbsolute(options.bunRegistrySourceCache, "Bun registry source cache"),
    javaExecutable: requireAbsoluteFile(options.javaExecutable, "Java executable"),
    apksignerJar: requireAbsoluteFile(options.apksignerJar, "apksigner jar"),
    projectRepository: options.projectRepository === undefined
      ? repositoryRoot
      : requireAbsolute(options.projectRepository, "project repository"),
  };
}

function verifyReleaseTag(profile, version, tag) {
  requireCondition(typeof tag === "string" && !/[\0\r\n\s]/.test(tag), "release tag is invalid");
  if (profile === "official") requireCondition(tag === `v${version}`, `official release tag must be v${version}`);
  else requireCondition(new RegExp(`^v${escapeRegex(version)}-api28-experimental(?:\\.[1-9][0-9]*)?$`).test(tag), "patched experimental release tag must identify the api28 experiment");
}

function prepareEmptyDirectory(path) {
  const requested = resolve(path);
  if (!existsSync(requested)) mkdirSync(requested, { recursive: true });
  const directory = realpathSync(requested);
  const stat = lstatSync(directory);
  requireCondition(stat.isDirectory() && !stat.isSymbolicLink(), `output must be a real directory: ${directory}`);
  requireCondition(readdirSync(directory).length === 0, `output directory must be empty: ${directory}`);
  return directory;
}

function existingDirectory(path, label) {
  const directory = realpathSync(path);
  const stat = lstatSync(directory);
  requireCondition(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a real directory: ${directory}`);
  return directory;
}

function requireAbsolute(value, label) {
  requireCondition(typeof value === "string" && value.length > 0, `${label} is required`);
  requireCondition(isAbsolute(value) || win32.isAbsolute(value), `${label} must be absolute`);
  return resolve(value);
}

function requireAbsoluteFile(value, label) {
  const path = requireAbsolute(value, label);
  const stat = lstatSync(path);
  requireCondition(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular non-symlink file: ${path}`);
  return path;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`cannot parse ${path}: ${error.message}`, { cause: error });
  }
}

function safeToken(value) {
  requireCondition(typeof value === "string" && /^[A-Za-z0-9._+-]+$/.test(value), `unsafe source archive token: ${value}`);
  return value;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  const allowed = new Set([
    "--profile", "--version", "--tag", "--repository", "--apk-directory", "--bun-source-archive",
    "--webkit-source-archive", "--webkit-repository", "--native-source-cache", "--cargo-source-cache", "--bun-registry-source-cache",
    "--output-directory", "--project-repository", "--max-part-bytes", "--java-executable", "--apksigner-jar",
  ]);
  for (const key of Object.keys(values)) requireCondition(allowed.has(key), `unknown argument: ${key}`);
  return {
    profile: values["--profile"],
    version: values["--version"],
    tag: values["--tag"],
    repository: values["--repository"],
    apkDirectory: values["--apk-directory"],
    bunSourceArchive: values["--bun-source-archive"],
    webkitSourceArchive: values["--webkit-source-archive"],
    webkitRepository: values["--webkit-repository"],
    nativeSourceCache: values["--native-source-cache"],
    cargoSourceCache: values["--cargo-source-cache"],
    bunRegistrySourceCache: values["--bun-registry-source-cache"],
    outputDirectory: values["--output-directory"],
    projectRepository: values["--project-repository"],
    maxPartBytes: values["--max-part-bytes"],
    javaExecutable: values["--java-executable"],
    apksignerJar: values["--apksigner-jar"],
  };
}

const USAGE = `
Usage: node assemble-corresponding-source.mjs
  --profile <official|api28-patched-experimental>
  --version <version> --tag <tag>
  --repository SuperMonster003/AutoJs6-Plugin-Bun-Runtime
  --apk-directory <absolute-dir>
  --bun-source-archive <absolute-tar.gz>
  --webkit-source-archive <absolute-locked-tar.gz>
  --native-source-cache <absolute-dir>
  --cargo-source-cache <absolute-dir>
  --bun-registry-source-cache <absolute-dir>
  --output-directory <absolute-empty-dir>
  --java-executable <absolute-java-path>
  --apksigner-jar <absolute-apksigner.jar>
  [--webkit-repository <absolute-clean-checkout>]
  [--project-repository <absolute-clean-dir>]
  [--max-part-bytes <bytes>]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await assembleCorrespondingSourceRelease(parseArguments(process.argv.slice(2)));
    console.log(`OK assembled ${result.assetCount} release assets in ${result.outputDirectory}`);
    console.log(`OK manifest ${result.manifestRecord.filename} ${result.manifestRecord.sha256}`);
    console.log(`OK SHA-256 manifest ${result.checksumRecord.filename} ${result.checksumRecord.sha256}`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
