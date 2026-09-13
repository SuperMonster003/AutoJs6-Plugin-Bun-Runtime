import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const patchRoot = resolve(toolDirectory, "patches");
const seriesPath = resolve(patchRoot, "series.lock.json");
const sourceInputsPath = resolve(toolDirectory, "source-inputs.lock.json");
const temporaryRoot = realpathSync(tmpdir());
const SHA1 = /^[0-9a-f]{40}$/;

export function verifyBackport(bunRepository) {
  require(typeof bunRepository === "string" && bunRepository.length > 0, "A Bun repository path is required");
  const repository = realpathSync(resolve(bunRepository));
  const topLevel = realpathSync(git(repository, ["rev-parse", "--show-toplevel"]).stdout.trim());
  require(samePath(repository, topLevel), `Expected the Bun repository root, found ${topLevel}`);

  const series = readJson(seriesPath);
  const downstream = series.downstreamBackport;
  require(downstream?.status === "clean-replay-verified", "The downstream series is not marked clean-replay-verified");
  require(SHA1.test(downstream.baseCommit), "Invalid downstream base commit");
  require(SHA1.test(downstream.headCommit), "Invalid downstream head commit");
  require(SHA1.test(downstream.headTreeSha1), "Invalid downstream head tree");
  require(Array.isArray(downstream.patches) && downstream.patches.length > 0, "The downstream patch series is empty");
  const sourceInputs = readJson(sourceInputsPath);
  require(sourceInputs.bunBaseCommit === downstream.baseCommit, "Source inputs refer to a different Bun base");
  require(sourceInputs.downstreamHeadCommit === downstream.headCommit, "Source inputs refer to a different downstream head");

  git(repository, ["cat-file", "-e", `${downstream.baseCommit}^{commit}`]);
  const upstreamHead = downstream.upstreamEquivalence?.upstreamHeadCommit;
  require(SHA1.test(upstreamHead), "Invalid pinned upstream PR head commit");
  git(repository, ["cat-file", "-e", `${upstreamHead}^{commit}`]);

  const upstreamByCommit = new Map(series.upstreamReferencePatches.map((patch) => [patch.commit, patch]));
  const downstreamPatchPaths = [];
  let expectedParent = downstream.baseCommit;
  for (const patch of downstream.patches) {
    require(patch.parent === expectedParent, `${patch.commit}: unexpected parent ${patch.parent}`);
    const downstreamPath = resolveInside(patchRoot, patch.path, `${patch.commit}: downstream path`);
    require(existsSync(downstreamPath), `${patch.commit}: downstream patch is missing`);

    const downstreamPatchId = patchId(repository, downstreamPath);
    require(downstreamPatchId === patch.stablePatchId, `${patch.commit}: downstream stable patch ID mismatch`);
    if (patch.sourceCommit === null) {
      require(["autojs6-supply-chain", "autojs6-startup-cloexec", "autojs6-spawn-fd", "autojs6-scoped-open", "autojs6-blocked-pidfd", "autojs6-pending-spawn-mask", "autojs6-pending-epoll-mask", "autojs6-reload-fd"].includes(patch.origin), `${patch.commit}: unrecognized project-owned patch origin`);
    } else {
      const upstream = upstreamByCommit.get(patch.sourceCommit);
      require(upstream !== undefined, `${patch.commit}: unknown source commit ${patch.sourceCommit}`);
      const upstreamPath = resolveInside(patchRoot, upstream.materializedPath, `${patch.commit}: upstream path`);
      require(existsSync(upstreamPath), `${patch.commit}: materialized upstream patch is missing`);
      const upstreamPatchId = patchId(repository, upstreamPath);
      require(upstreamPatchId === upstream.stablePatchId, `${patch.commit}: upstream stable patch ID mismatch`);
      require(downstreamPatchId === upstreamPatchId, `${patch.commit}: downstream diff differs from its upstream source`);
    }

    downstreamPatchPaths.push(downstreamPath);
    expectedParent = patch.commit;
  }
  require(expectedParent === downstream.headCommit, "Downstream patch chain does not end at the locked head");

  const scratch = mkdtempSync(join(temporaryRoot, "autojs6-bun-backport-"));
  const scratchPrefix = `${temporaryRoot}${sep}`;
  require(scratch.startsWith(scratchPrefix), `Temporary path escaped the operating-system temp directory: ${scratch}`);
  const worktree = join(scratch, "checkout");
  let worktreeAdded = false;
  try {
    git(repository, ["worktree", "add", "--detach", worktree, downstream.baseCommit]);
    worktreeAdded = true;
    git(
      worktree,
      ["am", "--keep-cr", "--committer-date-is-author-date", ...downstreamPatchPaths],
      {
        env: {
          ...process.env,
          GIT_COMMITTER_NAME: "AutoJs6 Bun Backport",
          GIT_COMMITTER_EMAIL: "backport@invalid.local",
        },
      },
    );

    const replayedHead = git(worktree, ["rev-parse", "HEAD"]).stdout.trim();
    const replayedTree = git(worktree, ["rev-parse", "HEAD^{tree}"]).stdout.trim();
    const status = git(worktree, ["status", "--porcelain=v1"]).stdout;
    require(replayedHead === downstream.headCommit, `Replayed head mismatch: ${replayedHead}`);
    require(replayedTree === downstream.headTreeSha1, `Replayed tree mismatch: ${replayedTree}`);
    require(status.length === 0, "Replayed worktree is not clean");
    const sourceBlobCount = verifySourceBlobs(worktree, downstream, sourceInputs);

    const commits = git(worktree, ["rev-list", "--reverse", `${downstream.baseCommit}..HEAD`])
      .stdout.trim().split("\n").filter(Boolean);
    require(
      JSON.stringify(commits) === JSON.stringify(downstream.patches.map((patch) => patch.commit)),
      "Replayed commit chain differs from the lock",
    );
    for (const patch of downstream.patches) {
      const changedPaths = git(worktree, ["diff", "--name-only", patch.parent, patch.commit])
        .stdout.trim().split("\n").filter(Boolean).sort();
      require(JSON.stringify(changedPaths) === JSON.stringify([...patch.affectedPaths].sort()),
        `${patch.commit}: replayed changes differ from the declared affected paths`);
    }

    const comparisonPaths = downstream.upstreamEquivalence?.comparisonPaths;
    require(Array.isArray(comparisonPaths) && comparisonPaths.length > 0, "No upstream comparison paths are locked");
    const prefixHead = downstream.patches[series.upstreamReferencePatches.length - 1].commit;
    require(downstream.upstreamEquivalence.scope === "upstream-compatibility-prefix", "Invalid upstream equivalence scope");
    require(downstream.upstreamEquivalence.downstreamPrefixHeadCommit === prefixHead, "Invalid upstream equivalence prefix head");
    const expectedPaths = [...new Set(series.upstreamReferencePatches.flatMap((patch) => patch.affectedPaths))].sort();
    require(JSON.stringify([...comparisonPaths].sort()) === JSON.stringify(expectedPaths), "Incomplete upstream comparison paths");
    const comparison = git(
      worktree,
      ["diff", "--quiet", prefixHead, upstreamHead, "--", ...comparisonPaths],
      { allowExitCodes: [0, 1] },
    );
    if (comparison.status !== 0) {
      const changed = git(
        worktree,
        ["diff", "--name-status", prefixHead, upstreamHead, "--", ...comparisonPaths],
      ).stdout.trim();
      throw new Error(`Replayed affected paths differ from the pinned upstream head: ${changed}`);
    }

    return {
      baseCommit: downstream.baseCommit,
      headCommit: replayedHead,
      headTreeSha1: replayedTree,
      patchCount: downstream.patches.length,
      upstreamCompatibilityPatchCount: series.upstreamReferencePatches.length,
      upstreamHeadCommit: upstreamHead,
      upstreamEquivalentPrefixHead: prefixHead,
      affectedPathsMatchExactly: true,
      sourceBlobCount,
    };
  } finally {
    if (worktreeAdded) {
      git(repository, ["worktree", "remove", "--force", worktree], { allowExitCodes: [0] });
    }
    if (existsSync(scratch)) rmSync(scratch, { force: true, recursive: true });
  }
}

function verifySourceBlobs(repository, downstream, sourceInputs) {
  require(sourceInputs.resolution?.submodulesPresent === false, "Source inputs must record that Bun has no submodules");
  for (const commit of [downstream.baseCommit, downstream.headCommit]) {
    const gitmodules = git(repository, ["ls-tree", "--name-only", commit, "--", ".gitmodules"]).stdout.trim();
    require(gitmodules.length === 0, `${commit}: unexpected .gitmodules entry`);
  }

  const records = [
    ...sourceInputs.sourceMachinery.map((record) => ({
      path: record.path,
      blob: record.gitBlobSha1,
    })),
    ...sourceInputs.activeDependencies.map((record) => ({
      path: record.definitionPath,
      blob: record.definitionBlobSha1,
    })),
    ...sourceInputs.excludedDependencies.map((record) => ({
      path: record.definitionPath,
      blob: record.definitionBlobSha1,
    })),
  ];
  const seen = new Set();
  for (const record of records) {
    requireGitPath(record.path, "locked source path");
    require(SHA1.test(record.blob), `${record.path}: invalid locked Git blob`);
    require(!seen.has(record.path), `${record.path}: duplicate locked source path`);
    seen.add(record.path);
    const actual = git(repository, ["rev-parse", `${downstream.headCommit}:${record.path}`]).stdout.trim();
    require(actual === record.blob, `${record.path}: expected blob ${record.blob}, found ${actual}`);
  }

  const brotli = sourceInputs.activeDependencies.find((record) => record.name === "brotli");
  require(brotli !== undefined && SHA1.test(brotli.baseDefinitionBlobSha1), "Brotli base definition blob is missing");
  const baseBrotli = git(
    repository,
    ["rev-parse", `${downstream.baseCommit}:${brotli.definitionPath}`],
  ).stdout.trim();
  require(
    baseBrotli === brotli.baseDefinitionBlobSha1,
    `${brotli.definitionPath}: expected base blob ${brotli.baseDefinitionBlobSha1}, found ${baseBrotli}`,
  );
  return records.length;
}

function patchId(repository, path) {
  const result = git(repository, ["patch-id", "--stable"], { input: readFileSync(path) });
  const id = result.stdout.trim().split(/\s+/)[0];
  require(SHA1.test(id), `Cannot calculate a stable patch ID for ${path}`);
  return id;
}

function git(cwd, args, options = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    input: options.input,
    env: options.env ?? process.env,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  const allowed = options.allowExitCodes ?? [0];
  if (!allowed.includes(result.status)) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`git ${args.join(" ")} failed with exit ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  return result;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`, { cause: error });
  }
}

function resolveInside(root, value, label) {
  require(typeof value === "string" && value.length > 0, `${label} must be a non-empty path`);
  require(!isAbsolute(value) && !win32.isAbsolute(value), `${label} must be relative`);
  const result = resolve(root, value);
  const fromRoot = relative(root, result);
  require(fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot), `${label} escapes its root`);
  return result;
}

function requireGitPath(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} must be a non-empty path`);
  require(!isAbsolute(value) && !win32.isAbsolute(value), `${label} must be relative`);
  require(!value.includes("\\") && !/[\0\r\n:]/.test(value), `${label} contains unsupported characters`);
  require(
    value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== ".."),
    `${label} contains an unsafe segment`,
  );
}

function samePath(left, right) {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

function parseRepositoryArgument(argv) {
  if (argv.length !== 2 || argv[0] !== "--bun-repository" || argv[1].length === 0) {
    throw new Error("Usage: node verify-backport.mjs --bun-repository <path-to-pinned-bun-repository>");
  }
  return argv[1];
}

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const repository = parseRepositoryArgument(process.argv.slice(2));
    const result = verifyBackport(repository);
    console.log(
      `OK ${result.patchCount} downstream patches replayed from ${result.baseCommit} ` +
        `(${result.upstreamCompatibilityPatchCount} upstream compatibility patches)`,
    );
    console.log(`OK deterministic head ${result.headCommit}; tree ${result.headTreeSha1}`);
    console.log(`OK affected paths at prefix ${result.upstreamEquivalentPrefixHead} are byte-identical to upstream ${result.upstreamHeadCommit}`);
    console.log(`OK ${result.sourceBlobCount} locked source-definition blobs match the replayed tree`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
