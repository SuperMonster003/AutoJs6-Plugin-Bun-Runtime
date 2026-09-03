import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  inspectBuiltRuntime,
  inspectElfBuffer,
  verifyRuntimeEvidenceManifest,
} from "./verify-built-runtime.mjs";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(toolDirectory, "../../../..");
const ELF_HEADER_BYTES_FOR_TEST = 64;

test("the ELF inspector rejects a non-ELF buffer before reading tables", () => {
  assert.throws(() => inspectElfBuffer(Buffer.alloc(ELF_HEADER_BYTES_FOR_TEST)), /not an ELF file/);
});

test("the ELF inspector audits the checked-in official ARM64 runtime independently", () => {
  const runtime = resolve(repositoryRoot, "app/src/main/jniLibs/arm64-v8a/libbun_exec.so");
  const inspected = inspectBuiltRuntime(runtime);
  const official = JSON.parse(readFileSync(resolve(repositoryRoot, "tools/bun-runtime/runtime.lock.json"), "utf8"))
    .artifacts.find((artifact) => artifact.abi === "arm64-v8a");

  assert.equal(inspected.bytes, official.binaryBytes);
  assert.equal(inspected.sha256, official.binarySha256);
  assert.equal(inspected.elf.class, "ELF64");
  assert.equal(inspected.elf.type, "ET_DYN");
  assert.equal(inspected.elf.machine, 183);
  assert.equal(inspected.elf.interpreter, "/system/bin/linker64");
  assert.equal(inspected.elf.androidIdent.api, 28);
  assert.deepEqual(inspected.elf.neededLibraries, ["libc.so", "libm.so", "libdl.so"]);
  assert.ok(inspected.elf.loadAlignments.every((alignment) => alignment >= 16384));
  assert.equal(inspected.elf.executableStack, false);
  assert.equal(inspected.elf.writableExecutableLoad, false);
});

test("the checked-in runtime evidence satisfies the non-distribution schema", () => {
  const evidence = JSON.parse(readFileSync(resolve(toolDirectory, "runtime-evidence.json"), "utf8"));
  assert.equal(verifyRuntimeEvidenceManifest(evidence), evidence);
});
