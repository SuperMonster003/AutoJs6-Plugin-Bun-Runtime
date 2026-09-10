import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const SYSCALL_MODES = {
  "syscall-trap-controls": "raw-controls", "syscall-copy-range-trap": "copy-range", "syscall-pidfd-trap": "pidfd",
};
export const COPY_BYTES = Buffer.from("syscall-copy-\u4e2d\u6587-\ud83d\ude80\n".repeat(4096));
export const COPY_SHA256 = createHash("sha256").update(COPY_BYTES).digest("hex");
export function syscallNumbers(abi) {
  assert(["arm64-v8a", "x86_64"].includes(abi));
  return { pidfd_open: 434, clone3: 435, epoll_pwait2: 441, copy_file_range: abi === "arm64-v8a" ? 285 : 326,
    openat2: 437, fchmodat2: 452 };
}
// Independent of the on-device fixture; tests execute this BPF model too.
export function syscallFilter(abi, mode, error = false) {
  const numbers = syscallNumbers(abi), arm = abi === "arm64-v8a";
  assert(Object.values(SYSCALL_MODES).includes(mode));
  assert(!(mode === "raw-controls" && error));
  const selected = mode === "raw-controls" ? Object.values(numbers) : [numbers[mode === "copy-range" ? "copy_file_range" : "pidfd_open"]];
  const action = error ? 0x00050005 : 0x00030000;
  const instructions = [[0x20, 0, 0, 4], [0x15, 1, 0, arm ? 0xc00000b7 : 0xc000003e],
    [0x06, 0, 0, 0x80000000], [0x20, 0, 0, 0],
    ...selected.flatMap(nr => [[0x15, 0, 1, nr], [0x06, 0, 0, action]]),
    [0x15, 0, 3, arm ? 167 : 157], [0x20, 0, 0, 16], [0x15, 0, 1, 0x41554a36],
    [0x06, 0, 0, action], [0x06, 0, 0, 0x7fff0000]];
  const bytes = Buffer.alloc(instructions.length * 8);
  instructions.forEach(([code, jt, jf, k], i) => {
    bytes.writeUInt16LE(code, i * 8); bytes[i * 8 + 2] = jt; bytes[i * 8 + 3] = jf; bytes.writeUInt32LE(k, i * 8 + 4);
  });
  return bytes;
}
export const syscallFilterSha256 = (abi, mode, error = false) =>
  createHash("sha256").update(syscallFilter(abi, mode, error)).digest("hex");

export function validateSyscallEvidence(proof, mode, abi) {
  const numbers = syscallNumbers(abi), callError = (call, errno) =>
    assert.deepEqual(call, { result: -1, errno }, "exact syscall errno required");
  const nativeError = call => {
    assert(call?.result === -1 && [1, 2, 9, 14, 22, 38, 95].includes(call.errno), "safe native invalid-argument control");
    assert.deepEqual(Object.keys(call).sort(), ["errno", "result"]);
  };
  assert(proof && Object.values(SYSCALL_MODES).includes(mode), "syscall evidence required");
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.mode, mode);
  assert.equal(proof.arch, abi === "arm64-v8a" ? "arm64" : "x64");
  assert.equal(proof.passed, true); assert(!proof.error && !proof.skipped, "cannot skip syscall controls");
  assert.equal(proof.filesRemoved, true);
  assert(typeof proof.kernel === "string" && proof.kernel.length <= 128);
  const kernel = proof.kernel.match(/^(\d+)\.(\d+)\.\d+(?:[-+._\w]*)$/); assert(kernel, "bounded kernel version");
  const policy = (p, error, before) => {
    assert.deepEqual(p, { installed: true, before: { result: -1, errno: before },
      after: { result: -1, errno: error ? 5 : 38 }, filterSha256: syscallFilterSha256(abi, mode, error) }, "exact filter/control proof");
  };
  policy(proof.trapPolicy, false, mode === "raw-controls" ? 22 : 5);
  if (mode === "raw-controls") {
    assert(!proof.errorPolicy && !proof.path, "raw calls do not prove high-level fallback");
    assert.deepEqual(proof.calls?.map(call => [call.name, call.nr]), Object.entries(numbers), "six ordered raw targets");
    for (const call of proof.calls) { nativeError(call.before); callError(call.after, 38); }
  } else {
    assert.equal(proof.target, mode === "copy-range" ? "copy_file_range" : "pidfd_open");
    assert.equal(proof.nr, numbers[proof.target]); nativeError(proof.native);
    policy(proof.errorPolicy, true, 22);
    assert([5, 38].includes(proof.injected?.errno)); callError(proof.injected, proof.injected.errno);
    callError(proof.trapped, 38);
    const kernelGated = mode === "copy-range" && (+kernel[1] < 4 || (+kernel[1] === 4 && +kernel[2] < 5));
    const path = proof.injected.errno === 38 ? "policy-gated" : kernelGated ? "kernel-gated" : "exercised";
    assert.equal(proof.path, path, "cannot claim an unobserved call path");
    assert.equal(proof.errorControl, path === "exercised" ? "EIO" : "not-observable", "EIO positive error control required");
    const operation = mode === "copy-range" ? { contentSha256: COPY_SHA256, bytes: COPY_BYTES.length, mode: 0o600 } :
      { exitCode: 17, stdout: "pidfd-child-ok\n", stderr: "", childGone: true };
    assert.deepEqual(proof.operations, [operation, operation], "first and cached fallback operations required");
    if (mode === "copy-range") {
      assert.equal(proof.contentSha256, COPY_SHA256); assert.equal(proof.contentBytes, COPY_BYTES.length);
      assert.equal(proof.sourceUnchanged, true); assert.equal(proof.fileDescriptorsClosed, true);
    }
  }
  return proof;
}
