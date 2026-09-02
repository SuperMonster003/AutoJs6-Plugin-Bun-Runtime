import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  collectToolchainArtifacts,
  materializeToolchainInputs,
} from "./materialize-toolchain-inputs.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));
const toolchainLock = JSON.parse(readFileSync(resolve(experimentRoot, "toolchain-inputs.lock.json"), "utf8"));

test("the toolchain lock selects the exact build and provenance closures", () => {
  assert.equal(collectToolchainArtifacts(toolchainLock, "bootstrap").length, 11);
  assert.equal(collectToolchainArtifacts(toolchainLock, "android-ndk").length, 1);
  assert.equal(collectToolchainArtifacts(toolchainLock, "build").length, 12);
  assert.equal(collectToolchainArtifacts(toolchainLock, "provenance").length, 5);
  assert.equal(collectToolchainArtifacts(toolchainLock, "all").length, 17);
});

test("a locked toolchain input is accepted offline by its safe filename", async () => {
  await withFixture(async ({ artifact, bytes, lockPath, output }) => {
    const downloads = resolve(output, "downloads");
    mkdirSync(downloads, { recursive: true });
    writeFileSync(resolve(downloads, artifact.filename), bytes);
    const result = await materializeToolchainInputs({
      outputDirectory: output,
      group: "bootstrap",
      offline: true,
      lockPath,
    });
    assert.equal(result.artifacts.length, 1);
    assert.equal(result.artifacts[0].source, "existing");
  });
});

test("a toolchain filename cannot escape the download directory", async () => {
  await withFixture(async ({ lockPath, output }) => {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.directDownloads[0].filename = "../outside";
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    await assert.rejects(
      materializeToolchainInputs({ outputDirectory: output, group: "bootstrap", offline: true, lockPath }),
      /filename is unsafe/,
    );
  });
});

test("toolchain byte drift is rejected before an existing file is reused", async () => {
  await withFixture(async ({ artifact, lockPath, output }) => {
    const downloads = resolve(output, "downloads");
    mkdirSync(downloads, { recursive: true });
    writeFileSync(resolve(downloads, artifact.filename), "drift\n");
    await assert.rejects(
      materializeToolchainInputs({ outputDirectory: output, group: "bootstrap", offline: true, lockPath }),
      /expected 23 bytes/,
    );
  });
});

async function withFixture(callback) {
  const root = mkdtempSync(resolve(tmpdir(), "autojs6-toolchain-input-test-"));
  try {
    const bytes = Buffer.from("locked toolchain input\n", "utf8");
    const artifact = {
      id: "fixture-bootstrap",
      group: "build",
      role: "fixture",
      version: "1",
      filename: "fixture.bin",
      url: "https://static.rust-lang.org/fixture.bin",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    const lockPath = resolve(root, "toolchain-inputs.lock.json");
    writeFileSync(lockPath, `${JSON.stringify({ schemaVersion: 1, directDownloads: [artifact] }, null, 2)}\n`);
    await callback({ artifact, bytes, lockPath, output: resolve(root, "materialized") });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}
