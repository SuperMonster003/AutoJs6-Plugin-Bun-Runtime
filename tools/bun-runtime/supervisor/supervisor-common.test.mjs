import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { root, supervisorLock, verifySupervisorBytes, verifySupervisorSource } from "./supervisor-common.mjs";

test("locked helper source and both ELF payloads verify", () => {
  verifySupervisorSource();
  for (const artifact of supervisorLock.artifacts) {
    const payload = readFileSync(resolve(root, artifact.binaryPath));
    assert.equal(verifySupervisorBytes(payload, artifact).sha256, artifact.binarySha256);
  }
});

test("source, toolchain, ABI and target-path drift fail before building", () => {
  for (const mutate of [
    (lock) => { lock.sourceSha256 = "0".repeat(64); },
    (lock) => { lock.ndkVersion = "0.0.0"; },
    (lock) => { lock.artifacts[0].elfMachine = 62; },
    (lock) => { lock.artifacts[0].binaryPath = "../outside.so"; },
    (lock) => { lock.artifacts.push(lock.artifacts[0]); },
  ]) {
    const lock = structuredClone(supervisorLock);
    mutate(lock);
    assert.throws(() => verifySupervisorSource(lock));
  }
});

test("helper ELF corruption and insufficient load alignment fail even in candidate mode", () => {
  const artifact = supervisorLock.artifacts[0];
  const payload = readFileSync(resolve(root, artifact.binaryPath));
  const corrupt = Buffer.from(payload);
  corrupt[0] = 0;
  assert.throws(() => verifySupervisorBytes(corrupt, artifact, false), /ELF/);
  const misaligned = Buffer.from(payload);
  const offset = Number(misaligned.readBigUInt64LE(32));
  const size = misaligned.readUInt16LE(54);
  for (let index = 0; index < misaligned.readUInt16LE(56); index += 1) {
    const header = offset + index * size;
    if (misaligned.readUInt32LE(header) === 1) misaligned.writeBigUInt64LE(4096n, header + 48);
  }
  assert.throws(() => verifySupervisorBytes(misaligned, artifact, false), /alignment/);
});
