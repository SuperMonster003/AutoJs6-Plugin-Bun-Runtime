import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyElfBuffer } from "../verify-runtime.mjs";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const supervisorLock = JSON.parse(readFileSync(resolve(root, "tools/bun-runtime/supervisor/supervisor.lock.json"), "utf8"));
export const supervisorArtifacts = new Map(supervisorLock.artifacts.map((artifact) => [artifact.abi, artifact]));
export const digest = (data) => createHash("sha256").update(data).digest("hex");

export function verifySupervisorSource(lock = supervisorLock) {
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.ndkVersion, "29.0.14206865");
  assert.equal(lock.androidApi, 28);
  assert.equal(lock.source, "tools/bun-runtime/supervisor/supervisor.c");
  assert.equal(digest(readFileSync(resolve(root, lock.source))), lock.sourceSha256, "supervisor source SHA-256 drifted");
  assert.deepEqual(lock.artifacts.map((entry) => entry.abi), ["arm64-v8a", "x86_64"]);
  for (const artifact of lock.artifacts) {
    assert.equal(artifact.target, artifact.abi === "arm64-v8a" ? "aarch64-linux-android" : "x86_64-linux-android");
    assert.equal(artifact.elfMachine, artifact.abi === "arm64-v8a" ? 183 : 62);
    assert.equal(artifact.binaryPath, `app/src/main/jniLibs/${artifact.abi}/libbun_supervisor.so`);
    assert.match(artifact.binarySha256, /^[0-9a-f]{64}$/);
    assert.ok(Number.isSafeInteger(artifact.binaryBytes) && artifact.binaryBytes > 0);
  }
}

export function verifySupervisorBytes(data, artifact, checkDigest = true) {
  const sha256 = digest(data);
  if (checkDigest) {
    assert.equal(data.length, artifact.binaryBytes, `${artifact.abi}: supervisor byte count`);
    assert.equal(sha256, artifact.binarySha256, `${artifact.abi}: supervisor SHA-256`);
  }
  verifyElfBuffer(data, { ...artifact, minimumLoadAlignment: 16384,
    interpreter: "/system/bin/linker64", androidIdentApi: supervisorLock.androidApi, neededLibraries: ["libdl.so", "libc.so"] });
  return { bytes: data.length, sha256 };
}
