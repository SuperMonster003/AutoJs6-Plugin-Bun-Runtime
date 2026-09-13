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

test("previous reproducible runtimes cannot be accepted for the reload-fd source", () => {
  for (const filename of ["2026-09-03-m2-runtime-evidence.json", "2026-09-10-m2-startup-runtime-evidence.json", "2026-09-10-m2-spawn-runtime-evidence.json", "2026-09-10-m2-scoped-open-runtime-evidence.json", "2026-09-13-m2-blocked-pidfd-runtime-evidence.json", "2026-09-13-m2-pending-mask-runtime-evidence.json", "2026-09-13-m2-pending-wait-runtime-evidence.json"]) {
    const previous = JSON.parse(readFileSync(resolve(repositoryRoot, "docs/compatibility", filename), "utf8"));
    assert.equal(previous.build.byteForByteIdentical, true);
    assert.throws(() => verifyRuntimeEvidenceManifest(previous), /unsupported runtime evidence schema|runtime evidence downstream commit drifted/);
  }
});

for (const [name, mutate] of [
  ["missing actual exits", e => e.build.bothRunsExitCode = null],
  ["partial driver exits", e => e.build.completion.originalDriverExitCodes = [0, null]],
  ["dry-run substitution", e => e.build.completion.method = "read-only-ninja-no-work"],
  ["recovery relabel", e => e.build.completionRecovery = {}],
  ["missing driver", e => e.build.completion.runs.pop()],
  ["duplicate run", e => e.build.completion.runs[1].run = 1],
  ["failed driver", e => e.build.completion.runs[0].exitCode = 1],
  ["unknown driver exit", e => e.build.completion.runs[0].exitCode = null],
  ["changed source", e => e.build.completion.runs[0].headAfter = "0".repeat(40)],
  ["changed source tree", e => e.build.completion.runs[0].treeAfter = "0".repeat(40)],
  ["reused checkout", e => e.build.completion.runs[0].freshCheckout = false],
  ["dirty source", e => e.build.completion.runs[0].cleanAfter = false],
  ["changed recipe", e => e.build.completion.runs[0].recipesUnchanged = false],
  ["planning without execution", e => e.build.completion.runs[0].execute = false],
  ["partial ABI build", e => e.build.completion.runs[0].abi = "x86_64"],
  ["invalid interval", e => e.build.completion.runs[0].buildFinishedAt = "2025-01-01"],
  ["missing receipt", e => e.build.completion.runs[0].receipt = {}],
  ["duplicate receipt", e => e.build.completion.runs[1].receipt = e.build.completion.runs[0].receipt],
  ["missing complete log", e => e.build.completion.runs[0].log = {}],
  ["missing recipe inputs", e => e.build.completion.runs[0].repositoryInputs = []],
  ["missing ABI output", e => e.build.completion.runs[0].artifacts.pop()],
  ["unbound output", e => e.build.completion.runs[0].artifacts[0].sha256 = "0".repeat(64)],
  ["missing Ninja log", e => e.build.completion.runs[0].artifacts[0].ninjaLog = {}],
  ["missing final edge", e => e.build.completion.runs[0].artifacts[0].finalEdges = []],
  ["old source relabel", e => e.source.downstreamHeadCommit = "a9c76a599bacb75c72d3c00fc6f99c5cc9483b47"],
]) test(`captured native build evidence rejects ${name}`, () => {
  const evidence = JSON.parse(readFileSync(resolve(toolDirectory, "runtime-evidence.json"), "utf8"));
  mutate(evidence);
  assert.throws(() => verifyRuntimeEvidenceManifest(evidence));
});
