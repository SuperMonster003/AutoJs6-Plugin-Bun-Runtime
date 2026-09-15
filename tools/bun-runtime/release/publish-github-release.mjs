import { spawnSync } from "node:child_process";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

import { requireCondition, requireSafeAssetName, sha256File } from "./release-asset-common.mjs";
import { verifyCorrespondingSourceRelease } from "./verify-corresponding-source-release.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(toolDirectory, "../../..");
const EXPECTED_REPOSITORY = "SuperMonster003/AutoJs6-Plugin-Bun-Runtime";

export async function publishGitHubRelease({
  assetDirectory,
  localRepository = repositoryRoot,
  javaExecutable,
  apksignerJar,
  publish = false,
} = {}) {
  const verified = await verifyCorrespondingSourceRelease({ assetDirectory, localRepository, javaExecutable, apksignerJar });
  const directory = resolve(assetDirectory);
  const manifest = verified.manifest;
  requireCondition(manifest.identity.repository === EXPECTED_REPOSITORY, `refusing unexpected repository ${manifest.identity.repository}`);
  verifyLocalReleaseCommit(localRepository, manifest.projectSource.commit);
  verifyRemoteRepositoryAndTag(manifest.identity.repository, manifest.identity.tag, manifest.projectSource.commit);
  const localAssets = await loadLocalAssets(directory);
  const notes = buildReleaseNotes(manifest);
  const title = manifest.identity.prerelease
    ? `${manifest.identity.version} API 28 experimental`
    : `${manifest.identity.version} @ ${manifest.identity.releaseDate}`;

  let release = getRelease(manifest.identity.repository, manifest.identity.tag, true);
  if (!publish) {
    if (release !== null) verifyRemoteAssetSet(release, localAssets);
    return {
      published: false,
      remoteVerified: release !== null,
      repository: manifest.identity.repository,
      tag: manifest.identity.tag,
      title,
      assetCount: localAssets.length,
      notes,
    };
  }

  if (release === null) {
    const arguments_ = [
      "release", "create", manifest.identity.tag,
      "--repo", manifest.identity.repository,
      "--verify-tag",
      "--draft",
      "--title", title,
      "--notes", notes,
    ];
    if (manifest.identity.prerelease) arguments_.push("--prerelease");
    runGh(arguments_, { label: "create draft release" });
    release = getRelease(manifest.identity.repository, manifest.identity.tag, false);
  }
  requireCondition(release.isDraft === true, `release ${manifest.identity.tag} already exists and is not a draft; refusing to mutate it`);
  requireCondition(release.isPrerelease === manifest.identity.prerelease, "existing draft prerelease state differs from manifest");

  let remoteAssets = mapRemoteAssets(release.assets);
  for (const local of localAssets) {
    const remote = remoteAssets.get(local.filename);
    if (remote !== undefined) {
      verifyRemoteAsset(remote, local);
      continue;
    }
    process.stdout.write(`UPLOAD ${local.filename} (${local.bytes} bytes)\n`);
    runGh([
      "release", "upload", manifest.identity.tag, join(directory, local.filename),
      "--repo", manifest.identity.repository,
    ], { label: `upload ${local.filename}`, maxBuffer: 16 * 1024 * 1024 });
    release = getRelease(manifest.identity.repository, manifest.identity.tag, false);
    remoteAssets = mapRemoteAssets(release.assets);
    verifyRemoteAsset(remoteAssets.get(local.filename), local);
  }

  verifyRemoteAssetSet(release, localAssets);

  runGh([
    "release", "edit", manifest.identity.tag,
    "--repo", manifest.identity.repository,
    "--verify-tag",
    "--title", title,
    "--notes", notes,
    "--draft=false",
    ...(manifest.identity.prerelease ? [] : ["--latest"]),
  ], { label: "publish verified release" });
  const publishedRelease = getRelease(manifest.identity.repository, manifest.identity.tag, false);
  requireCondition(publishedRelease.isDraft === false, "GitHub release remained a draft after publication");
  requireCondition(publishedRelease.isPrerelease === manifest.identity.prerelease, "published prerelease state differs from manifest");
  const publishedAssets = mapRemoteAssets(publishedRelease.assets);
  requireCondition(publishedAssets.size === localAssets.length, "published asset count differs from verified local set");
  for (const local of localAssets) verifyRemoteAsset(publishedAssets.get(local.filename), local);

  return {
    published: true,
    repository: manifest.identity.repository,
    tag: manifest.identity.tag,
    title,
    assetCount: localAssets.length,
    url: publishedRelease.url,
  };
}

function verifyRemoteAssetSet(release, localAssets) {
  const remoteAssets = mapRemoteAssets(release.assets);
  requireCondition(remoteAssets.size === localAssets.length, `GitHub release contains ${remoteAssets.size} assets, expected ${localAssets.length}`);
  for (const remoteName of remoteAssets.keys()) {
    requireCondition(localAssets.some((local) => local.filename === remoteName), `GitHub release contains unexpected asset ${remoteName}`);
  }
  for (const local of localAssets) verifyRemoteAsset(remoteAssets.get(local.filename), local);
}

async function loadLocalAssets(directory) {
  const names = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.isSymbolicLink())
    .map((entry) => entry.name)
    .sort();
  const manifestName = names.find((name) => name.endsWith("-corresponding-source-manifest.json"));
  const checksumName = names.find((name) => name.endsWith("-SHA256SUMS.txt"));
  const sums = new Map();
  for (const line of readFileSync(join(directory, checksumName), "utf8").trimEnd().split("\n")) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    requireCondition(match !== null, `invalid SHA256SUMS entry: ${line}`);
    sums.set(match[2], match[1]);
  }
  const checksumDigest = await sha256File(join(directory, checksumName));
  sums.set(checksumName, checksumDigest);
  requireCondition(manifestName && sums.has(manifestName), "release manifest is absent from SHA256SUMS");
  return names.map((filename) => {
    requireSafeAssetName(filename);
    const stat = lstatSync(join(directory, filename));
    requireCondition(stat.isFile() && !stat.isSymbolicLink(), `${filename} is not a regular file`);
    const sha256 = sums.get(filename);
    requireCondition(sha256 !== undefined, `${filename} has no local SHA-256 record`);
    return { filename, bytes: stat.size, sha256 };
  });
}

function getRelease(repository, tag, allowMissing) {
  const result = runGh([
    "release", "view", tag,
    "--repo", repository,
    "--json", "tagName,isDraft,isPrerelease,assets,url",
  ], { allowFailure: allowMissing, label: `inspect release ${tag}` });
  if (result.status !== 0) {
    requireCondition(/release not found/i.test(`${result.stdout}\n${result.stderr}`), `cannot inspect release ${tag}: ${result.stderr.trim()}`);
    return null;
  }
  const release = JSON.parse(result.stdout);
  requireCondition(release.tagName === tag, `GitHub returned release tag ${release.tagName}, expected ${tag}`);
  return release;
}

function mapRemoteAssets(assets) {
  requireCondition(Array.isArray(assets), "GitHub release asset list is missing");
  const result = new Map();
  for (const asset of assets) {
    requireSafeAssetName(asset.name, "remote asset name");
    requireCondition(!result.has(asset.name), `duplicate remote release asset ${asset.name}`);
    result.set(asset.name, asset);
  }
  return result;
}

function verifyRemoteAsset(remote, local) {
  requireCondition(remote !== undefined, `GitHub release is missing ${local.filename}`);
  requireCondition(remote.state === "uploaded", `${local.filename}: remote asset state is ${remote.state}`);
  requireCondition(remote.size === local.bytes, `${local.filename}: remote size ${remote.size} differs from ${local.bytes}`);
  requireCondition(remote.digest === `sha256:${local.sha256}`, `${local.filename}: remote digest ${remote.digest} differs from sha256:${local.sha256}`);
}

function verifyLocalReleaseCommit(repository, expectedCommit) {
  const root = existingDirectory(repository, "local project repository");
  requireCondition(runGit(root, ["status", "--porcelain=v1", "--untracked-files=all"]) === "", "local project repository must be clean for publication");
  requireCondition(runGit(root, ["rev-parse", "HEAD"]) === expectedCommit, "local HEAD differs from the source manifest project commit");
}

function verifyRemoteRepositoryAndTag(repository, tag, expectedCommit) {
  const repo = runGh(["repo", "view", repository, "--json", "nameWithOwner,isArchived"], { label: "inspect target repository" });
  const repoInfo = JSON.parse(repo.stdout);
  requireCondition(repoInfo.nameWithOwner === repository, `GitHub resolved unexpected repository ${repoInfo.nameWithOwner}`);
  requireCondition(repoInfo.isArchived === false, `target repository ${repository} is archived`);
  const commit = runGh(["api", `repos/${repository}/commits/${tag}`, "--jq", ".sha"], { label: `resolve remote tag ${tag}` }).stdout.trim();
  requireCondition(commit === expectedCommit, `remote tag ${tag} resolves to ${commit}, expected ${expectedCommit}`);
}

function buildReleaseNotes(manifest) {
  const notice = manifest.notice.filename;
  return [
    `Bun Runtime ${manifest.identity.version}${manifest.identity.prerelease ? " (API 28 patched experimental)" : ""}.`,
    "",
    ...(manifest.identity.profile === "official" ? [
      "Requires Android 13 (API 33) or later and AutoJs6 build 5278 or later. Bundles the unmodified official Bun 1.4.0 runtime for arm64-v8a and baseline x86_64 plus a small read-only supervisor helper per ABI; Android API 28-32 remains unsupported.",
      "Run one JavaScript or TypeScript source snapshot with the standalone `\"bun\";` directive. Execution uses `bun run --no-install`; AutoJs6 globals and a Java bridge are not available. stdout/stderr use bounded Binder callback chunks. Timeouts, cancellation and output limits terminate the Bun child through the supervisor, and runtime error summaries are localized in ten languages.",
      "Multi-file projects: the shared contract now accepts a bounded ZIP workspace archive (`workspaceArchiveVersion`, `workspaceEntryPoint`, capability `SUPPORTS_WORKSPACE_ARCHIVE`) and the plugin expands it into the private per-run workspace so relative imports resolve. The AutoJs6 side that packs a `project.json`/`package.json` directory is not part of a released AutoJs6 yet, so released hosts still send single files.",
      "All APKs pass 16 KB ZIP alignment and every ELF payload meets at least 16 KB PT_LOAD alignment. Native arm64 16 KB execution passed the Binder suite on a Samsung SM-A566B (Android 16) with a development build of this plugin; signed-APK acceptance on 16 KB hardware was not repeated for this Release. The official native x86_64 runtime is still rejected on pages larger than 4 KiB.",
      "",
    ] : []),
    "The three signed APKs and their complete corresponding-source asset set are published separately in this same Release.",
    `Verify every asset with \`${manifest.checksumAsset}\`; the machine-readable source/APK binding is in the corresponding-source manifest.`,
    "Bun is MIT-licensed; the executable statically links JavaScriptCore/WebKit components covered by LGPL-2-family terms and contains other third-party components under their respective licenses.",
    `License disclosures and relinking information are in \`${notice}\` and in the project-source asset.`,
    "",
    "The repository's release verifier performed automated technical checks over APK-contained runtime hashes, source closure, archive identities, and GitHub's returned SHA-256 asset digests. This statement records technical verification and does not claim a legal opinion or approval.",
  ].join("\n");
}

function runGit(repository, args) {
  const result = spawnSync("git", ["-C", repository, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  requireCondition(result.status === 0, `git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function runGh(args, { allowFailure = false, label, maxBuffer = 8 * 1024 * 1024 } = {}) {
  const result = spawnSync("gh", args, { encoding: "utf8", maxBuffer, windowsHide: true });
  if (result.error) throw result.error;
  if (!allowFailure) requireCondition(result.status === 0, `${label ?? "gh"} failed: ${result.stderr.trim()}`);
  return result;
}

function existingDirectory(value, label) {
  requireCondition(typeof value === "string" && value.length > 0, `${label} is required`);
  requireCondition(isAbsolute(value) || win32.isAbsolute(value), `${label} must be absolute`);
  const path = resolve(value);
  const stat = lstatSync(path);
  requireCondition(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a real directory: ${path}`);
  return path;
}

function parseArguments(argv) {
  const values = Object.create(null);
  let publish = false;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--publish") {
      requireCondition(!publish, "duplicate argument: --publish");
      publish = true;
      continue;
    }
    const value = argv[index + 1];
    requireCondition(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), USAGE.trim());
    requireCondition(values[key] === undefined, `duplicate argument: ${key}`);
    values[key] = value;
    index += 1;
  }
  const allowed = new Set(["--asset-directory", "--local-repository", "--java-executable", "--apksigner-jar"]);
  for (const key of Object.keys(values)) requireCondition(allowed.has(key), `unknown argument: ${key}`);
  requireCondition(values["--asset-directory"], USAGE.trim());
  return {
    assetDirectory: values["--asset-directory"],
    localRepository: values["--local-repository"],
    javaExecutable: values["--java-executable"],
    apksignerJar: values["--apksigner-jar"],
    publish,
  };
}

const USAGE = `
Usage: node publish-github-release.mjs
  --asset-directory <absolute-verified-dir>
  --java-executable <absolute-java-path>
  --apksigner-jar <absolute-apksigner.jar>
  [--local-repository <absolute-dir>]
  [--publish]

Without --publish, the command performs a read-only publication preflight.
With --publish, it creates/resumes a draft, uploads only missing exact assets,
verifies GitHub's SHA-256 digests, and publishes the draft.
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await publishGitHubRelease(parseArguments(process.argv.slice(2)));
    if (result.published) console.log(`OK published ${result.assetCount} verified assets: ${result.url}`);
    else if (result.remoteVerified) console.log(`OK local and GitHub Release digests match: ${result.repository} ${result.tag}, ${result.assetCount} assets`);
    else console.log(`OK publication preflight: ${result.repository} ${result.tag}, ${result.assetCount} assets; pass --publish to create/upload/publish`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
