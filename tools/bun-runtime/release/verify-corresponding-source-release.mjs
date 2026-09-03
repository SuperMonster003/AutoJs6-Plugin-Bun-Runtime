import {
  createReadStream,
  createWriteStream,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve, win32 } from "node:path";
import { finished } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import { inspectApkRuntime } from "../verify-apk-runtime.mjs";
import { collectBunArtifacts } from "../experimental/api28/materialize-bun-inputs.mjs";
import { collectCargoArtifacts } from "../experimental/api28/materialize-cargo-inputs.mjs";
import {
  GITHUB_MAX_ASSET_BYTES,
  RELEASE_MANIFEST_SCHEMA_VERSION,
  SHA256_PATTERN,
  compareAscii,
  crc32File,
  inspectDeterministicTar,
  inspectRegularFile,
  parseSha256Sums,
  readGitArchiveCommit,
  requireCondition,
  requireSafeAssetName,
  verifyLogicalAssetParts,
  verifyRegularFile,
} from "./release-asset-common.mjs";
import { verifyApkSignature } from "./assemble-corresponding-source.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(toolDirectory, "../../..");
const experimentDirectory = resolve(toolDirectory, "../experimental/api28");
const EXPECTED_REPOSITORY = "SuperMonster003/AutoJs6-Plugin-Bun-Runtime";
const EXPECTED_COMPONENT_IDS = [
  "bun-base-source",
  "webkit-source",
  "native-source-archives",
  "cargo-source-archives",
  "npm-source-archives",
  "project-source-and-build-instructions",
];

export async function verifyCorrespondingSourceRelease({
  assetDirectory,
  localRepository = repositoryRoot,
  javaExecutable,
  apksignerJar,
} = {}) {
  const directory = existingDirectory(assetDirectory, "release asset directory");
  const localRepo = existingDirectory(localRepository, "local project repository");
  const java = existingRegularFile(javaExecutable, "Java executable");
  const signerJar = existingRegularFile(apksignerJar, "apksigner jar");
  const entries = readdirSync(directory, { withFileTypes: true });
  requireCondition(entries.every((entry) => entry.isFile() && !entry.isSymbolicLink()), "release asset directory must contain regular files only");
  const filenames = entries.map((entry) => entry.name).sort();
  const manifestNames = filenames.filter((name) => name.endsWith("-corresponding-source-manifest.json"));
  const checksumNames = filenames.filter((name) => name.endsWith("-SHA256SUMS.txt"));
  requireCondition(manifestNames.length === 1, `expected one corresponding-source manifest, found ${manifestNames.length}`);
  requireCondition(checksumNames.length === 1, `expected one SHA256SUMS asset, found ${checksumNames.length}`);

  const manifestPath = join(directory, manifestNames[0]);
  const manifest = readJson(manifestPath);
  verifyManifestShape(manifest, manifestNames[0], checksumNames[0]);
  const expectedFiles = expectedAssetNames(manifest, manifestNames[0]);
  requireCondition(JSON.stringify(filenames) === JSON.stringify(expectedFiles), `release asset set differs: expected ${expectedFiles.join(", ")}; found ${filenames.join(", ")}`);

  const sums = parseSha256Sums(readFileSync(join(directory, checksumNames[0]), "utf8"));
  const expectedChecksummed = expectedFiles.filter((name) => name !== checksumNames[0]);
  requireCondition(
    JSON.stringify(sums.map((record) => record.filename)) === JSON.stringify(expectedChecksummed),
    "SHA256SUMS does not cover the exact release asset set (excluding itself)",
  );
  for (const record of sums) {
    const actual = await inspectRegularFile(join(directory, record.filename), record.filename);
    requireCondition(actual.sha256 === record.sha256, `${record.filename}: expected SHA-256 ${record.sha256}, found ${actual.sha256}`);
  }
  const manifestStat = await inspectRegularFile(manifestPath, manifestNames[0]);
  requireCondition(manifestStat.bytes < GITHUB_MAX_ASSET_BYTES, `${manifestNames[0]} exceeds GitHub's release-asset limit`);
  const checksumStat = await inspectRegularFile(join(directory, checksumNames[0]), checksumNames[0]);
  requireCondition(checksumStat.bytes < GITHUB_MAX_ASSET_BYTES, `${checksumNames[0]} exceeds GitHub's release-asset limit`);

  const runtimeArtifacts = verifyRuntimeBinding(manifest);
  const apkResults = [];
  for (const apk of manifest.apkAssets) {
    const apkPath = join(directory, apk.filename);
    await verifyRegularFile(apkPath, apk, apk.filename);
    requireCondition(await crc32File(apkPath) === apk.crc32, `${apk.filename}: CRC32 differs from release manifest`);
    const signing = verifyApkSignature(apkPath, java, signerJar);
    requireCondition(JSON.stringify(signing) === JSON.stringify(apk.signing), `${apk.filename}: signing identity differs from release manifest`);
    const expectedAbis = apk.runtimes.map((runtime) => runtime.abi);
    const inspected = inspectApkRuntime(apkPath, expectedAbis, runtimeArtifacts);
    requireCondition(JSON.stringify(inspected) === JSON.stringify(apk.runtimes), `${apk.filename}: runtime inspection differs from release manifest`);
    apkResults.push({ filename: apk.filename, runtimes: inspected.length });
  }

  const temporary = mkdtempSync(join(tmpdir(), "autojs6-bun-release-verify-"));
  try {
    for (const component of manifest.sourceComponents) {
      await verifyLogicalAssetParts(directory, component);
      for (const part of component.parts) {
        requireCondition(part.bytes < GITHUB_MAX_ASSET_BYTES, `${part.filename} exceeds GitHub's release-asset limit`);
        requireCondition(part.bytes <= manifest.technicalValidation.sourcePartMaximumBytes, `${part.filename} exceeds the manifest part limit`);
      }
      const logicalPath = await materializeLogicalAsset(directory, component, temporary);
      if (component.id === "bun-base-source") verifyBunSourceComponent(component);
      else if (component.id === "webkit-source") await verifyGitSourceComponent(logicalPath, component, "WebKit");
      else if (component.id === "project-source-and-build-instructions") {
        await verifyGitSourceComponent(logicalPath, component, "project", manifest.projectSource);
      }
      else await verifySourcePack(logicalPath, component);
    }
  } finally {
    rmSync(temporary, { force: true, recursive: true });
  }

  const localNotice = readFileSync(resolve(toolDirectory, "CORRESPONDING_SOURCE_NOTICE.md"));
  const publishedNotice = readFileSync(join(directory, manifest.notice.filename));
  requireCondition(localNotice.equals(publishedNotice), "published license/relinking notice differs from the checked-in notice");
  verifyProjectVersion(localRepo, manifest.identity.version, manifest.identity.releaseDate);

  return {
    repository: manifest.identity.repository,
    tag: manifest.identity.tag,
    profile: manifest.identity.profile,
    assetCount: filenames.length,
    apkCount: apkResults.length,
    sourceComponentCount: manifest.sourceComponents.length,
    checksumSha256: checksumStat.sha256,
    manifest,
  };
}

function verifyManifestShape(manifest, manifestName, checksumName) {
  requireCondition(manifest?.schemaVersion === RELEASE_MANIFEST_SCHEMA_VERSION, "unsupported corresponding-source release manifest schema");
  requireCondition(manifest.identity?.project === "AutoJs6 Plugin Bun Runtime", "release project identity drifted");
  requireCondition(manifest.identity?.repository === EXPECTED_REPOSITORY, "release repository identity drifted");
  requireCondition(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.identity?.version ?? ""), "release version is invalid");
  requireCondition(/^\d{4}\/\d{2}\/\d{2}$/.test(manifest.identity?.releaseDate ?? ""), "release date is invalid");
  requireCondition(["official", "api28-patched-experimental"].includes(manifest.identity?.profile), "release profile is invalid");
  requireCondition(typeof manifest.identity?.tag === "string" && manifest.identity.tag.length > 0, "release tag is missing");
  requireCondition(
    manifest.identity.prerelease === (manifest.identity.profile === "api28-patched-experimental"),
    "release prerelease policy disagrees with profile",
  );
  if (manifest.identity.profile === "official") {
    requireCondition(manifest.identity.tag === `v${manifest.identity.version}`, "official release tag disagrees with version");
  } else {
    requireCondition(
      new RegExp(`^v${escapeRegex(manifest.identity.version)}-api28-experimental(?:\\.[1-9][0-9]*)?$`).test(manifest.identity.tag),
      "patched experimental release tag does not identify the api28 experiment",
    );
  }
  requireCondition(/^[0-9a-f]{40}$/.test(manifest.projectSource?.commit), "project commit is invalid");
  requireCondition(/^[0-9a-f]{40}$/.test(manifest.projectSource?.treeSha1), "project tree is invalid");
  requireCondition(Number.isSafeInteger(manifest.projectSource?.sourceDateEpoch) && manifest.projectSource.sourceDateEpoch > 0, "project source epoch is invalid");
  requireCondition(Array.isArray(manifest.apkAssets) && manifest.apkAssets.length === 3, "release must contain exactly three APK assets");
  requireCondition(Array.isArray(manifest.sourceComponents), "source component list is missing");
  requireCondition(
    JSON.stringify(manifest.sourceComponents.map((component) => component.id)) === JSON.stringify(EXPECTED_COMPONENT_IDS),
    "source component identities or order drifted",
  );
  requireCondition(manifest.checksumAsset === checksumName, "checksum asset name disagrees with the directory");
  requireCondition(manifestName === `autojs6-plugin-bun-runtime-v${manifest.identity.version}-corresponding-source-manifest.json`, "manifest filename disagrees with release version");
  requireSafeAssetName(manifest.notice?.filename, "notice filename");
  requireCondition(manifest.notice?.role === "license-and-relinking-notice", "notice role drifted");
  requireCondition(Number.isSafeInteger(manifest.notice?.bytes) && manifest.notice.bytes > 0, "notice byte count is invalid");
  requireCondition(SHA256_PATTERN.test(manifest.notice?.sha256), "notice SHA-256 is invalid");
  requireCondition(manifest.technicalValidation?.automated === true, "automated technical verification is not enabled");
  requireCondition(manifest.technicalValidation?.sameReleaseRequired === true, "same-Release asset policy is not enabled");
  requireCondition(manifest.technicalValidation?.githubAssetDigestRequired === true, "GitHub asset digest policy is not enabled");
  requireCondition(manifest.technicalValidation?.legalConclusionClaimed === false, "technical manifest must not claim a legal conclusion");
  requireCondition(
    Number.isSafeInteger(manifest.technicalValidation?.sourcePartMaximumBytes) &&
      manifest.technicalValidation.sourcePartMaximumBytes > 0 &&
      manifest.technicalValidation.sourcePartMaximumBytes < GITHUB_MAX_ASSET_BYTES,
    "source part limit is invalid",
  );
  for (const asset of [...manifest.apkAssets, manifest.notice]) verifyAssetRecord(asset);
  const apkRuntimeSets = manifest.apkAssets.map((asset) => asset.runtimes?.map((runtime) => runtime.abi));
  requireCondition(
    JSON.stringify(apkRuntimeSets) === JSON.stringify([["arm64-v8a"], ["arm64-v8a", "x86_64"], ["x86_64"]]),
    "APK asset order or ABI coverage drifted",
  );
  const expectedApkVariants = [
    { role: "signed-arm64-v8a-apk", filenameVariant: "arm64-v8a" },
    { role: "signed-universal-apk", filenameVariant: "universal" },
    { role: "signed-x86_64-apk", filenameVariant: "x86_64" },
  ];
  requireCondition(
    new Set(manifest.apkAssets.map((asset) => asset.signing?.certificateSha256)).size === 1,
    "release APK signing certificate digests differ",
  );
  for (const [index, apk] of manifest.apkAssets.entries()) {
    const expected = expectedApkVariants[index];
    requireCondition(apk.role === expected.role, `${apk.filename}: APK role drifted`);
    requireCondition(/^[0-9a-f]{8}$/.test(apk.crc32), `${apk.filename}: APK CRC32 is invalid`);
    requireCondition(
      apk.filename === `autojs6-plugin-bun-runtime-v${manifest.identity.version}-${expected.filenameVariant}-${apk.crc32}.apk`,
      `${apk.filename}: APK filename does not bind its version, variant, and CRC32`,
    );
    requireCondition(Array.isArray(apk.signing?.verifiedSchemes) && apk.signing.verifiedSchemes.length > 0, `${apk.filename}: verified APK schemes are missing`);
    requireCondition(apk.signing.signerCount === 1, `${apk.filename}: signer count is invalid`);
    requireCondition(SHA256_PATTERN.test(apk.signing.certificateSha256), `${apk.filename}: signer certificate SHA-256 is invalid`);
  }
  for (const component of manifest.sourceComponents) verifyComponentRecord(component);
}

function verifyRuntimeBinding(manifest) {
  const runtimeLock = readJson(resolve(repositoryRoot, "tools/bun-runtime/runtime.lock.json"));
  const distributionLock = readJson(resolve(experimentDirectory, "distribution-source.lock.json"));
  const expected = manifest.identity.profile === "official"
    ? {
        variant: "bun-1.4.0-android",
        upstreamCommit: runtimeLock.upstream.commit,
        sourceTransformation: "none",
        artifacts: runtimeLock.artifacts.map((artifact) => ({ abi: artifact.abi, bytes: artifact.binaryBytes, sha256: artifact.binarySha256 })),
      }
    : {
        variant: distributionLock.identity.variant,
        upstreamCommit: distributionLock.bunSource.baseCommit,
        sourceTransformation: "ordered-downstream-patch-series",
        downstreamCommit: distributionLock.bunSource.downstreamCommit,
        downstreamTreeSha1: distributionLock.bunSource.downstreamTreeSha1,
        patchCount: distributionLock.bunSource.downstreamPatchCount,
        artifacts: distributionLock.artifacts,
      };
  requireCondition(JSON.stringify(manifest.runtime) === JSON.stringify(expected), "runtime/source profile binding differs from the repository locks");
  return new Map(expected.artifacts.map((artifact) => [artifact.abi, {
    binaryBytes: artifact.bytes,
    binarySha256: artifact.sha256,
  }]));
}

function verifyBunSourceComponent(component) {
  const lock = readJson(resolve(experimentDirectory, "distribution-source.lock.json"));
  requireCondition(component.logicalBytes === lock.bunSource.archive.bytes, "Bun source archive byte count differs from lock");
  requireCondition(component.logicalSha256 === lock.bunSource.archive.sha256, "Bun source archive SHA-256 differs from lock");
}

async function verifyGitSourceComponent(path, component, label, expectedProjectSource) {
  requireCondition(component.format === "tar+gzip", `${label} source component must be tar+gzip`);
  requireCondition(component.provenance && /^[0-9a-f]{40}$/.test(component.provenance.commit), `${label} source commit is invalid`);
  const commit = await readGitArchiveCommit(path);
  requireCondition(commit === component.provenance.commit, `${label} Git archive commit: expected ${component.provenance.commit}, found ${commit}`);
  if (component.id === "webkit-source") {
    const lock = readJson(resolve(experimentDirectory, "distribution-source.lock.json"));
    requireCondition(component.provenance.tag === lock.webkitSource.tag, "WebKit tag differs from lock");
    requireCondition(component.provenance.treeSha1 === lock.webkitSource.treeSha1, "WebKit tree differs from lock");
    requireCondition(component.provenance.trackedFileCount === lock.webkitSource.trackedFileCount, "WebKit file count differs from lock");
  } else {
    requireCondition(component.provenance.commit === expectedProjectSource.commit, "project source commit differs from manifest");
    requireCondition(component.provenance.treeSha1 === expectedProjectSource.treeSha1, "project source tree differs from manifest");
  }
}

async function verifySourcePack(path, component) {
  requireCondition(component.format === "tar", `${component.id}: source pack must be an uncompressed tar`);
  requireCondition(component.content?.format === "deterministic-ustar-files-only-v1", `${component.id}: source-pack format drifted`);
  requireCondition(Array.isArray(component.content?.artifacts), `${component.id}: source-pack index is missing`);
  const expectedArtifacts = expectedSourcePackArtifacts(component.id);
  requireCondition(
    JSON.stringify(component.content.artifacts) === JSON.stringify(expectedArtifacts),
    `${component.id}: source-pack closure differs from repository locks`,
  );
  requireCondition(component.content.artifactCount === component.content.artifacts.length, `${component.id}: artifact count disagrees`);
  const expectedIndex = Buffer.from(`${JSON.stringify({
    schemaVersion: 1,
    id: component.id === "native-source-archives" ? "native" : component.id === "cargo-source-archives" ? "cargo" : "npm",
    artifacts: expectedArtifacts,
  }, null, 2)}\n`);
  requireCondition(component.content.indexBytes === expectedIndex.length, `${component.id}: INDEX.json byte count differs`);
  const expectedIndexSha256 = createHash("sha256").update(expectedIndex).digest("hex");
  requireCondition(component.content.indexSha256 === expectedIndexSha256, `${component.id}: INDEX.json SHA-256 differs`);
  const entries = await inspectDeterministicTar(path);
  const expected = [
    { path: "INDEX.json", bytes: component.content.indexBytes, sha256: component.content.indexSha256 },
    ...component.content.artifacts.map((artifact) => ({ path: artifact.archivePath, bytes: artifact.bytes, sha256: artifact.sha256 })),
  ].sort((left, right) => compareAscii(left.path, right.path));
  requireCondition(JSON.stringify(entries) === JSON.stringify(expected), `${component.id}: tar entries differ from the locked source-pack index`);
}

function expectedSourcePackArtifacts(componentId) {
  let records;
  if (componentId === "native-source-archives") {
    const lock = readJson(resolve(experimentDirectory, "source-inputs.lock.json"));
    records = lock.activeDependencies
      .filter((dependency) => dependency.kind === "github-archive" || (dependency.kind === "prebuilt" && dependency.name === "nodejs"))
      .map((dependency) => ({
        id: dependency.kind === "github-archive" ? `github-archive:${dependency.name}` : "prebuilt:nodejs",
        archivePath: dependency.kind === "github-archive"
          ? `archives/${dependency.name}-${dependency.revision}.tar.gz`
          : `archives/nodejs-${dependency.version}-headers.tar.gz`,
        url: dependency.url,
        bytes: dependency.bytes,
        sha256: dependency.sha256,
      }));
  } else if (componentId === "cargo-source-archives") {
    const artifacts = collectCargoArtifacts(readJson(resolve(experimentDirectory, "cargo-inputs.lock.json")));
    records = artifacts.map((artifact) => ({
      id: artifact.id,
      archivePath: `archives/${artifact.filename}`,
      url: artifact.url,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
    }));
  } else if (componentId === "npm-source-archives") {
    const artifacts = collectBunArtifacts(readJson(resolve(experimentDirectory, "bun-inputs.lock.json")));
    records = artifacts.map((artifact) => ({
      id: artifact.id,
      archivePath: `archives/${artifact.filename}`,
      url: artifact.url,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
    }));
  } else {
    throw new Error(`unexpected deterministic source pack: ${componentId}`);
  }
  return records.sort((left, right) => compareAscii(left.archivePath, right.archivePath));
}

async function materializeLogicalAsset(directory, component, temporary) {
  if (component.parts.length === 1) return join(directory, component.parts[0].filename);
  const target = join(temporary, component.logicalFilename);
  const output = createWriteStream(target, { flags: "wx", mode: 0o644 });
  const completion = finished(output);
  try {
    for (const part of component.parts) {
      for await (const chunk of createReadStream(join(directory, part.filename))) {
        if (!output.write(chunk)) await new Promise((resolveDrain) => output.once("drain", resolveDrain));
      }
    }
    output.end();
    await completion;
    return target;
  } catch (error) {
    output.destroy();
    throw error;
  }
}

function expectedAssetNames(manifest, manifestName) {
  const names = [
    ...manifest.apkAssets.map((asset) => asset.filename),
    ...manifest.sourceComponents.flatMap((component) => component.parts.map((part) => part.filename)),
    manifest.notice.filename,
    manifestName,
    manifest.checksumAsset,
  ].sort();
  requireCondition(new Set(names).size === names.length, "release manifest contains duplicate asset names");
  return names;
}

function verifyAssetRecord(asset) {
  requireSafeAssetName(asset?.filename);
  requireCondition(Number.isSafeInteger(asset?.bytes) && asset.bytes > 0, `${asset.filename}: invalid byte count`);
  requireCondition(asset.bytes < GITHUB_MAX_ASSET_BYTES, `${asset.filename}: exceeds GitHub's release-asset limit`);
  requireCondition(SHA256_PATTERN.test(asset?.sha256), `${asset.filename}: invalid SHA-256`);
}

function verifyComponentRecord(component) {
  requireCondition(typeof component?.id === "string" && component.id.length > 0, "source component id is missing");
  requireSafeAssetName(component.logicalFilename, `${component.id} logical filename`);
  requireCondition(Number.isSafeInteger(component.logicalBytes) && component.logicalBytes > 0, `${component.id}: invalid logical byte count`);
  requireCondition(SHA256_PATTERN.test(component.logicalSha256), `${component.id}: invalid logical SHA-256`);
  requireCondition(Array.isArray(component.parts) && component.parts.length > 0, `${component.id}: no asset parts`);
  for (const part of component.parts) verifyAssetRecord(part);
}

function verifyProjectVersion(repository, version, releaseDate) {
  const properties = readFileSync(join(repository, "version.properties"), "utf8");
  requireCondition(new RegExp(`^VERSION_NAME=${escapeRegex(version)}$`, "m").test(properties), `local version.properties does not contain VERSION_NAME=${version}`);
  const changelog = readJson(join(repository, ".changelog/lang_en.json"));
  requireCondition(changelog?.$data?.[`v${version}`]?.released_date === releaseDate, `local changelog release date differs from ${releaseDate}`);
}

function existingDirectory(value, label) {
  requireCondition(typeof value === "string" && value.length > 0, `${label} is required`);
  requireCondition(isAbsolute(value) || win32.isAbsolute(value), `${label} must be absolute`);
  const path = resolve(value);
  const stat = lstatSync(path);
  requireCondition(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a real directory: ${path}`);
  return path;
}

function existingRegularFile(value, label) {
  requireCondition(typeof value === "string" && value.length > 0, `${label} is required`);
  requireCondition(isAbsolute(value) || win32.isAbsolute(value), `${label} must be absolute`);
  const path = resolve(value);
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
  const allowed = new Set(["--asset-directory", "--local-repository", "--java-executable", "--apksigner-jar"]);
  for (const key of Object.keys(values)) requireCondition(allowed.has(key), `unknown argument: ${key}`);
  requireCondition(values["--asset-directory"], USAGE.trim());
  return {
    assetDirectory: values["--asset-directory"],
    localRepository: values["--local-repository"],
    javaExecutable: values["--java-executable"],
    apksignerJar: values["--apksigner-jar"],
  };
}

const USAGE = `
Usage: node verify-corresponding-source-release.mjs
  --asset-directory <absolute-dir>
  --java-executable <absolute-java-path>
  --apksigner-jar <absolute-apksigner.jar>
  [--local-repository <absolute-dir>]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifyCorrespondingSourceRelease(parseArguments(process.argv.slice(2)));
    console.log(`OK ${result.apkCount} APKs and ${result.sourceComponentCount} source components are bound by SHA-256`);
    console.log(`OK ${result.assetCount} exact same-Release assets for ${result.repository} ${result.tag}`);
    console.log(`OK automated technical validation; no legal conclusion claimed`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
