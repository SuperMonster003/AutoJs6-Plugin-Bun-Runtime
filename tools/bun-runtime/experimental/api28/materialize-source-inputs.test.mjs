import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  collectSourceArtifacts,
  materializeSourceInputs,
  prefetchKey,
  verifyLockedArtifact,
} from "./materialize-source-inputs.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));
const sourceLock = JSON.parse(readFileSync(resolve(experimentRoot, "source-inputs.lock.json"), "utf8"));

test("the source lock selects 19 archives and three prebuilts", () => {
  assert.equal(collectSourceArtifacts(sourceLock, "github-archives").length, 19);
  assert.equal(collectSourceArtifacts(sourceLock, "source-prebuilts").length, 3);
  assert.equal(collectSourceArtifacts(sourceLock, "all-source").length, 22);
});

test("the prefetch key matches Bun's first 32 URL SHA-256 digits", () => {
  const url = sourceLock.activeDependencies.find((dependency) => dependency.name === "zlib").url;
  assert.equal(prefetchKey(url), createHash("sha256").update(url).digest("hex").slice(0, 32));
});

test("a locked GitHub archive is accepted offline in Bun prefetch layout", async () => {
  await withFixture(async ({ archive, artifact, lockPath, output }) => {
    const targetDirectory = resolve(output, "by-url");
    mkdirSync(targetDirectory, { recursive: true });
    cpSync(archive, resolve(targetDirectory, prefetchKey(artifact.url)));
    const result = await materializeSourceInputs({
      outputDirectory: output,
      group: "github-archives",
      offline: true,
      lockPath,
    });
    assert.equal(result.artifacts.length, 1);
    assert.equal(result.artifacts[0].source, "existing");
  });
});

test("byte drift and archive-root drift are rejected", async () => {
  await withFixture(async ({ archive, artifact }) => {
    await verifyLockedArtifact(archive, artifact);
    await assert.rejects(
      verifyLockedArtifact(archive, { ...artifact, sha256: "0".repeat(64) }),
      /expected SHA-256/,
    );
    await assert.rejects(
      verifyLockedArtifact(archive, { ...artifact, archiveRoot: "wrong-root" }),
      /archive entry escapes/,
    );
  });
});

async function withFixture(callback) {
  const root = mkdtempSync(resolve(tmpdir(), "autojs6-source-input-test-"));
  try {
    const content = resolve(root, "content");
    const archiveRoot = "fixture-0123456789abcdef";
    const source = resolve(content, archiveRoot);
    mkdirSync(source, { recursive: true });
    writeFileSync(resolve(source, "README.txt"), "locked fixture\n");
    const archive = resolve(root, "fixture.tar.gz");
    const tarExecutable = process.platform === "win32" && process.env.SystemRoot
      ? resolve(process.env.SystemRoot, "System32", "tar.exe")
      : "tar";
    const tar = spawnSync(tarExecutable, ["-czf", archive, "-C", content, archiveRoot], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (tar.error) throw tar.error;
    assert.equal(tar.status, 0, tar.stderr);
    const bytes = readFileSync(archive);
    const artifact = {
      id: "github-archive:fixture",
      url: "https://github.com/example/fixture/archive/0123456789abcdef.tar.gz",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      archiveRoot,
    };
    const lockPath = resolve(root, "source-inputs.lock.json");
    writeFileSync(lockPath, `${JSON.stringify({
      schemaVersion: 1,
      activeDependencies: [{
        name: "fixture",
        kind: "github-archive",
        url: artifact.url,
        bytes: artifact.bytes,
        sha256: artifact.sha256,
        topLevelDirectory: archiveRoot,
      }],
    }, null, 2)}\n`);
    await callback({ archive, artifact, lockPath, output: resolve(root, "prefetch") });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}
