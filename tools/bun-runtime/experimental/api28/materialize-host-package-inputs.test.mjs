import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  collectHostPackageArtifacts,
  materializeHostPackageInputs,
} from "./materialize-host-package-inputs.mjs";
import {
  computePackageDelta,
  parseDeb822,
  parsePackageManifest,
  parsePrintUris,
} from "./resolve-host-package-inputs.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));

test("the checked-in host package lock is an exact nonempty closure", () => {
  const lockPath = resolve(experimentRoot, "host-package-inputs.lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const artifacts = collectHostPackageArtifacts(lock);
  assert.equal(artifacts.length, 155);
  assert.equal(lock.readiness.repositoryCounts["apt-llvm-focal-21"] > 0, true);
  assert.equal(lock.readiness.repositoryCounts["ubuntu-toolchain-r-test"] > 0, true);
  assert.equal(lock.readiness.repositoryCounts["ubuntu-focal-snapshot"] > 0, true);
});

test("an existing exact deb is accepted in offline mode", async () => {
  await withFixture(async ({ artifact, bytes, lockPath, output }) => {
    const archives = resolve(output, "archives");
    mkdirSync(archives, { recursive: true });
    writeFileSync(resolve(archives, artifact.filename), bytes);
    const result = await materializeHostPackageInputs({ outputDirectory: output, offline: true, lockPath });
    assert.equal(result.artifacts.length, 1);
    assert.equal(result.artifacts[0].source, "existing");
  });
});

test("host-package path traversal and byte drift are rejected", async () => {
  await withFixture(async ({ lockPath, output }) => {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.packages[0].filename = "../escape.deb";
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    await assert.rejects(materializeHostPackageInputs({ outputDirectory: output, offline: true, lockPath }), /unsafe archive filename/);
  });
  await withFixture(async ({ artifact, lockPath, output }) => {
    const archives = resolve(output, "archives");
    mkdirSync(archives, { recursive: true });
    writeFileSync(resolve(archives, artifact.filename), "drift");
    await assert.rejects(materializeHostPackageInputs({ outputDirectory: output, offline: true, lockPath }), /expected 19 bytes/);
  });
});

test("package manifests preserve version upgrades in the provisioned delta", () => {
  const base = parsePackageManifest("base\t1\nupgrade\t1\n");
  const provisioned = parsePackageManifest("base\t1\nnew\t2\nupgrade\t2\n");
  assert.deepEqual(computePackageDelta(base, provisioned).map(({ identity }) => identity), ["new\t2", "upgrade\t2"]);
});

test("Deb822 metadata and apt print-uris records are parsed without trusting descriptions", () => {
  const metadata = parseDeb822([
    "Package: fixture",
    "Version: 1:2.0-1",
    "Architecture: amd64",
    "Description: first line",
    " continuation",
    "Filename: pool/main/f/fixture/fixture_2.0-1_amd64.deb",
    "Size: 19",
    `SHA256: ${"a".repeat(64)}`,
    "",
  ].join("\n"));
  assert.equal(metadata.length, 1);
  assert.equal(metadata[0].Description, "first line\n continuation");
  const uris = parsePrintUris(`'https://snapshot.ubuntu.com/ubuntu/20260902T000000Z/pool/main/f/fixture/fixture_2.0-1_amd64.deb' fixture_1%3a2.0-1_amd64.deb 19 SHA256:${"a".repeat(64)}\n`);
  assert.equal(uris[0].bytes, 19);
  assert.equal(uris[0].digestAlgorithm, "SHA256");
});

async function withFixture(callback) {
  const root = mkdtempSync(resolve(tmpdir(), "autojs6-host-package-input-test-"));
  try {
    const bytes = Buffer.from("locked deb fixture\n", "utf8");
    const artifact = {
      name: "fixture",
      version: "1.0-1",
      architecture: "amd64",
      sourcePackage: "fixture-source",
      repository: "ubuntu-focal-snapshot",
      filename: "fixture_1.0-1_amd64.deb",
      url: "https://snapshot.ubuntu.com/ubuntu/20260902T000000Z/pool/main/f/fixture/fixture_1.0-1_amd64.deb",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    const lock = {
      schemaVersion: 1,
      identity: { status: "locked" },
      packages: [artifact],
      readiness: {
        packageCount: 1,
        sha256Count: 1,
        archiveBytes: bytes.length,
        packageClosureComplete: true,
        archiveIdentitiesLocked: true,
        offlineInstallReady: true,
      },
    };
    const lockPath = resolve(root, "host-package-inputs.lock.json");
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    await callback({ artifact, bytes, lockPath, output: resolve(root, "materialized") });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}
