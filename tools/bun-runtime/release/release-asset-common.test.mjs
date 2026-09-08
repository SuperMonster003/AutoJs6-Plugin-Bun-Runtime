import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  crc32File,
  formatSha256Sums,
  inspectDeterministicTar,
  parseSha256Sums,
  readGitArchiveCommit,
  sha256File,
  splitFileIntoAssets,
  verifyLogicalAssetParts,
  writeDeterministicTar,
} from "./release-asset-common.mjs";
import { createGitArchive, parseApkSignerOutput } from "./assemble-corresponding-source.mjs";
import { verifyWebKitSourceRecord } from "./verify-corresponding-source-release.mjs";

test("streaming CRC32 matches the canonical release-filename check vector", async () => {
  await withTemporaryDirectory(async (root) => {
    const fixture = join(root, "crc32.txt");
    writeFileSync(fixture, "123456789");
    assert.equal(await crc32File(fixture), "cbf43926");
  });
});

test("deterministic source packs ignore input order and preserve exact member digests", async () => {
  await withTemporaryDirectory(async (root) => {
    const one = join(root, "one.bin");
    const two = join(root, "two.bin");
    writeFileSync(one, "one\n");
    writeFileSync(two, Buffer.from([0, 1, 2, 3, 255]));
    const first = join(root, "first.tar");
    const second = join(root, "second.tar");
    await writeDeterministicTar(first, [
      { path: "archives/two.bin", file: two },
      { path: "INDEX.json", buffer: Buffer.from("{}\n") },
      { path: "archives/one.bin", file: one },
    ]);
    await writeDeterministicTar(second, [
      { path: "archives/one.bin", file: one },
      { path: "archives/two.bin", file: two },
      { path: "INDEX.json", buffer: Buffer.from("{}\n") },
    ]);
    assert.equal(await sha256File(first), await sha256File(second));
    assert.deepEqual(await inspectDeterministicTar(first), [
      { path: "INDEX.json", bytes: 3, sha256: "ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356" },
      { path: "archives/one.bin", bytes: 4, sha256: "2c8b08da5ce60398e1f19af0e5dccc744df274b826abe585eaba68c525434806" },
      { path: "archives/two.bin", bytes: 5, sha256: "ff5d8507b6a72bee2debce2c0054798deaccdc5d8a1b945b6280ce8aa9cba52e" },
    ]);
  });
});

test("logical assets split deterministically and detect a changed part", async () => {
  await withTemporaryDirectory(async (root) => {
    const source = join(root, "logical.bin");
    const output = join(root, "parts");
    mkdirSync(output);
    writeFileSync(source, "0123456789");
    const component = await splitFileIntoAssets({ source, logicalName: "logical.bin", outputDirectory: output, maxPartBytes: 4 });
    assert.deepEqual(component.parts.map(({ filename, bytes }) => ({ filename, bytes })), [
      { filename: "logical.bin.part001-of-003", bytes: 4 },
      { filename: "logical.bin.part002-of-003", bytes: 4 },
      { filename: "logical.bin.part003-of-003", bytes: 2 },
    ]);
    await verifyLogicalAssetParts(output, component);
    writeFileSync(join(output, component.parts[1].filename), "drift");
    await assert.rejects(verifyLogicalAssetParts(output, component), /expected 4 bytes, found 5/);
  });
});

test("SHA256SUMS is sorted, strict, and rejects path traversal", () => {
  const contents = formatSha256Sums([
    { filename: "z.apk", sha256: "f".repeat(64) },
    { filename: "a.tar", sha256: "0".repeat(64) },
  ]);
  assert.equal(contents, `${"0".repeat(64)}  a.tar\n${"f".repeat(64)}  z.apk\n`);
  assert.deepEqual(parseSha256Sums(contents).map((record) => record.filename), ["a.tar", "z.apk"]);
  assert.throws(() => parseSha256Sums(`${"0".repeat(64)}  ../escape\n`), /invalid SHA256SUMS line|unsafe/);
  assert.throws(() => parseSha256Sums(`${"f".repeat(64)}  z\n${"0".repeat(64)}  a\n`), /sorted/);
});

test("Git tar+gzip archives retain the exact source commit", async () => {
  await withTemporaryDirectory(async (root) => {
    const repository = join(root, "repository");
    mkdirSync(repository);
    execFileSync("git", ["init", "--quiet", repository]);
    execFileSync("git", ["-C", repository, "config", "core.autocrlf", "false"]);
    execFileSync("git", ["-C", repository, "config", "user.name", "Release Test"]);
    execFileSync("git", ["-C", repository, "config", "user.email", "release-test@example.invalid"]);
    writeFileSync(join(repository, "source.txt"), "source\n");
    execFileSync("git", ["-C", repository, "add", "source.txt"]);
    execFileSync("git", ["-C", repository, "commit", "--quiet", "-m", "fixture"]);
    const commit = execFileSync("git", ["-C", repository, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const archive = join(root, "source.tar.gz");
    const repeat = join(root, "source-repeat.tar.gz");
    await createGitArchive({ repository, commit, prefix: "fixture/", target: archive });
    await createGitArchive({ repository, commit, prefix: "fixture/", target: repeat });
    assert.equal(await sha256File(archive), await sha256File(repeat));
    assert.equal(await readGitArchiveCommit(archive), commit);
  });
});

test("apksigner output requires one signer and a modern verified scheme", () => {
  const digest = "a".repeat(64);
  const output = [
    "Verified using v2 scheme (APK Signature Scheme v2): true",
    "Verified using v3 scheme (APK Signature Scheme v3): false",
    "Number of signers: 1",
    `V2 Signer: certificate SHA-256 digest: ${digest}`,
  ].join("\n");
  assert.deepEqual(parseApkSignerOutput(output), {
    verifiedSchemes: ["v2"],
    signerCount: 1,
    certificateSha256: digest,
  });
  assert.throws(() => parseApkSignerOutput(output.replace("v2): true", "v2): false")), /neither APK Signature Scheme/);
  assert.throws(() => parseApkSignerOutput(output.replace("Number of signers: 1", "Number of signers: 2")), /exactly one/);
  assert.throws(() => parseApkSignerOutput(output.replace("Number of signers: 1", "Number of signers: 10")), /exactly one/);
  assert.deepEqual(parseApkSignerOutput(output.replace("V2 Signer:", "Signer #1")), parseApkSignerOutput(output));
});

test("a self-consistent release manifest cannot substitute an unlocked WebKit archive", () => {
  const { webkitSource: source } = JSON.parse(readFileSync(new URL("../experimental/api28/distribution-source.lock.json", import.meta.url), "utf8"));
  const component = {
    logicalBytes: source.releaseArchive.bytes,
    logicalSha256: source.releaseArchive.sha256,
    provenance: {
      repository: source.repository, tag: source.tag, commit: source.commit,
      treeSha1: source.treeSha1, trackedFileCount: source.trackedFileCount,
      gitArchivePrefix: source.releaseArchive.archivePrefix,
    },
  };
  verifyWebKitSourceRecord(component, source);
  assert.throws(() => verifyWebKitSourceRecord({ ...component, logicalSha256: "0".repeat(64) }, source), /SHA-256 differs from lock/);
  assert.throws(() => verifyWebKitSourceRecord({ ...component, logicalBytes: component.logicalBytes + 1 }, source), /byte count differs from lock/);
  assert.throws(() => verifyWebKitSourceRecord({ ...component, provenance: { ...component.provenance, commit: "0".repeat(40) } }, source), /commit differs from lock/);
});

async function withTemporaryDirectory(callback) {
  const root = mkdtempSync(resolve(tmpdir(), "autojs6-release-asset-test-"));
  try {
    await callback(root);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}
