import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  collectBunArtifacts,
  parseBunLock,
  verifyBunArchive,
} from "./materialize-bun-inputs.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));
const lockPath = resolve(experimentRoot, "bun-inputs.lock.json");
const SHA512_FIXTURE = `sha512-${Buffer.alloc(64, 0x2a).toString("base64")}`;

test("Bun text lock parsing handles trailing commas and selects only Linux x64 records", () => {
  const parsed = parseBunLock(`{
    "lockfileVersion": 1,
    "packages": {
      "@scope/linux": ["@scope/linux@1.2.3", "", { "os": "linux", "cpu": "x64" }, "${SHA512_FIXTURE}"],
      "@scope/arm": ["@scope/arm@1.2.3", "", { "os": "linux", "cpu": "arm64" }, "${SHA512_FIXTURE}"],
      "portable": ["portable@2.0.0", "", { "bin": { "portable": "value,}" } }, "${SHA512_FIXTURE}"],
      "workspace": ["workspace@workspace:packages/workspace"],
    },
  }`, "fixture.lock");

  assert.equal(parsed.packageEntryCount, 4);
  assert.equal(parsed.externalReferenceCount, 3);
  assert.equal(parsed.workspaceReferenceCount, 1);
  assert.deepEqual(
    parsed.entries.filter((entry) => entry.selected).map((entry) => `${entry.name}@${entry.version}`),
    ["@scope/linux@1.2.3", "portable@2.0.0"],
  );
});

test("Bun text lock parsing rejects missing or malformed SHA-512 integrity", () => {
  assert.throws(
    () => parseBunLock(`{"lockfileVersion":1,"packages":{"bad":["bad@1.0.0","",{}]}}`),
    /four fields/,
  );
  assert.throws(
    () => parseBunLock(`{"lockfileVersion":1,"packages":{"bad":["bad@1.0.0","",{},"sha512-YQ=="]}}`),
    /does not decode to 64 bytes/,
  );
});

test("the checked-in Bun registry lock is canonical and covers the resolved Linux x64 set", () => {
  const lock = readLock();
  const artifacts = collectBunArtifacts(lock);
  assert.equal(artifacts.length, 125);
  assert.equal(artifacts.reduce((total, artifact) => total + artifact.bytes, 0), 31_498_870);
  assert.equal(lock.selection.externalReferenceCount, 172);
  assert.equal(lock.selection.uniqueExternalPackageCount, 164);
  assert.equal(lock.selection.selectedReferenceCount, 133);
  assert.equal(lock.selection.excludedUniquePackageCount, 39);
  assert.deepEqual(
    artifacts.filter((artifact) => Object.keys(artifact.lifecycleScripts).length > 0).map((artifact) => artifact.id),
    ["npm:esbuild@0.21.5"],
  );
});

test("the locked cache captures npm archive and Bun semver-layout exceptions", () => {
  const artifacts = collectBunArtifacts(readLock());
  const nodeTypes = artifacts.find((artifact) => artifact.name === "@types/node");
  assert.equal(nodeTypes.archiveRoot, "node");
  const prerelease = artifacts.find((artifact) => artifact.name === "querystring-es3");
  assert.equal(prerelease.version, "1.0.0-0");
  assert.equal(prerelease.cacheDirectory, "querystring-es3@1.0.0-b8f8325b21a8a1e5@@@1");
});

test("noncanonical URLs, manifest drift, unsafe cache paths, and incomplete offline evidence are rejected", () => {
  const wrongUrl = readLock();
  wrongUrl.archives[0].url = "https://example.invalid/package.tgz";
  assert.throws(() => collectBunArtifacts(wrongUrl), /URL is not canonical/);

  const wrongManifestVersion = readLock();
  wrongManifestVersion.archives[0].manifestVersion = "0.0.0";
  assert.throws(() => collectBunArtifacts(wrongManifestVersion), /manifest version does not match/);

  const unsafeCache = readLock();
  unsafeCache.archives[0].cacheDirectory = "../escape";
  assert.throws(() => collectBunArtifacts(unsafeCache), /cache directory is unsafe|unsafe segments/);

  const duplicateReference = readLock();
  duplicateReference.archives[1].lockfileReferences = structuredClone(duplicateReference.archives[0].lockfileReferences);
  assert.throws(() => collectBunArtifacts(duplicateReference), /duplicate Bun lockfile reference/);

  const incompleteReplay = readLock();
  incompleteReplay.offlineReplay.passed = false;
  assert.throws(() => collectBunArtifacts(incompleteReplay), /offline replay did not pass/);

  const nonModePreservingReplay = readLock();
  nonModePreservingReplay.offlineReplay.cacheFilesystem = "DrvFS";
  assert.throws(() => collectBunArtifacts(nonModePreservingReplay), /cache filesystem is invalid/);
});

test("Bun archive verification checks bytes, lockfile SHA-512, and project SHA-256", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "autojs6-bun-input-test-"));
  try {
    const path = resolve(root, "fixture.tgz");
    const bytes = Buffer.from("locked npm archive fixture\n", "utf8");
    writeFileSync(path, bytes);
    const artifact = {
      id: "npm:fixture@1.0.0",
      bytes: bytes.length,
      sha512: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    await assert.doesNotReject(verifyBunArchive(path, artifact));
    writeFileSync(path, "drift\n");
    await assert.rejects(verifyBunArchive(path, artifact), /expected .* bytes/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function readLock() {
  return JSON.parse(readFileSync(lockPath, "utf8"));
}
