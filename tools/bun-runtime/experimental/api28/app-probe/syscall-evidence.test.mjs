import assert from "node:assert/strict";
import test from "node:test";
import { SYSCALL_MODES, syscallNumbers, syscallFilter, validateSyscallEvidence } from "./syscall-evidence.mjs";
import { syscallFixture } from "./syscall-fixture.test-support.mjs";

function evaluate(bytes, arch, nr, arg = 0) {
  let accumulator = 0;
  for (let pc = 0; pc < bytes.length / 8; pc++) {
    const code = bytes.readUInt16LE(pc * 8), jt = bytes[pc * 8 + 2], jf = bytes[pc * 8 + 3], k = bytes.readUInt32LE(pc * 8 + 4);
    if (code === 0x20) { assert([0, 4, 16].includes(k)); accumulator = { 0: nr, 4: arch, 16: arg }[k]; }
    else if (code === 0x15) pc += accumulator === k ? jt : jf;
    else { assert.equal(code, 0x06); return k; }
  }
  assert.fail("filter fell through");
}
test("BPF policies trap exactly the selected native numbers and marker, never unrelated calls", () => {
  for (const abi of ["arm64-v8a", "x86_64"]) for (const mode of Object.values(SYSCALL_MODES)) {
    const arm = abi === "arm64-v8a", arch = arm ? 0xc00000b7 : 0xc000003e, numbers = syscallNumbers(abi);
    for (const error of mode === "raw-controls" ? [false] : [false, true]) {
      const filter = syscallFilter(abi, mode, error), action = error ? 0x00050005 : 0x00030000;
      for (let nr = 0; nr <= 512; nr++) {
        const selected = mode === "raw-controls" ? Object.values(numbers) : [numbers[mode === "copy-range" ? "copy_file_range" : "pidfd_open"]];
        assert.equal(evaluate(filter, arch, nr), selected.includes(nr) ? action : 0x7fff0000, abi + "/" + mode + "/" + nr);
        assert.equal(evaluate(filter, 0x40000003, nr), 0x80000000, "wrong ABI must not execute another syscall");
      }
      assert.equal(evaluate(filter, arch, arm ? 167 : 157, 0x41554a36), action);
      assert.equal(evaluate(filter, arch, arm ? 167 : 157, 0x41554a37), 0x7fff0000);
    }
  }
});
test("six raw controls and two semantic controls validate independently on both ABIs", () => {
  for (const abi of ["arm64-v8a", "x86_64"]) for (const mode of Object.values(SYSCALL_MODES)) {
    const proof = syscallFixture(mode, abi); assert.equal(validateSyscallEvidence(proof, mode, abi), proof);
    assert(("SYSCALL_PROBE_RESULT=" + JSON.stringify(proof)).length <= 2048);
  }
});
test("old-kernel and higher-precedence-policy gates are explicit non-coverage, not semantic passes", () => {
  for (const mode of ["copy-range", "pidfd"]) for (const kernel of ["4.4.1", "4.5.0", "5.10.0"]) for (const errno of [5, 38]) {
    const proof = syscallFixture(mode, "arm64-v8a", kernel, errno);
    validateSyscallEvidence(proof, mode, "arm64-v8a");
    if (proof.path !== "exercised") {
      proof.path = "exercised"; proof.errorControl = "EIO";
      assert.throws(() => validateSyscallEvidence(proof, mode, "arm64-v8a"), /unobserved call path/);
    }
  }
});
test("raw controls reject missing targets, drifted ABI numbers, no-op filters and unsafe results", () => {
  for (const change of [p => p.calls.pop(), p => p.calls.reverse(), p => { p.calls[3].nr = 326; },
    p => { p.calls[0].before.result = 0; }, p => { p.calls[0].after.errno = 22; },
    p => { p.trapPolicy.before.errno = 38; }, p => { p.trapPolicy.after.errno = 5; },
    p => { p.trapPolicy.installed = false; }, p => { p.trapPolicy.filterSha256 = "0".repeat(64); },
    p => { p.skipped = true; }, p => { p.filesRemoved = false; }, p => { p.path = "exercised"; }]) {
    const proof = syscallFixture("raw-controls"); change(proof);
    assert.throws(() => validateSyscallEvidence(proof, "raw-controls", "arm64-v8a"));
  }
});
test("copy fallback requires EIO reachability, exact bytes/mode, source preservation and closed private FDs", () => {
  for (const change of [p => { p.errorControl = "not-observable"; }, p => { p.injected.errno = 1; },
    p => { p.errorPolicy.after.errno = 38; }, p => { p.trapped.errno = 5; }, p => p.operations.pop(),
    p => { p.operations[0].mode = 0o644; }, p => { p.operations[1].bytes++; },
    p => { p.sourceUnchanged = false; }, p => { p.fileDescriptorsClosed = false; },
    p => { p.contentSha256 = "0".repeat(64); }, p => { p.kernel = "unknown"; }]) {
    const proof = syscallFixture("copy-range"); change(proof);
    assert.throws(() => validateSyscallEvidence(proof, "copy-range", "arm64-v8a"));
  }
});
test("pidfd fallback requires two exact asynchronous child exits and reaping observations", () => {
  for (const change of [p => { p.operations[0].exitCode = 0; }, p => { p.operations[1].childGone = false; },
    p => { p.operations[0].stdout = ""; }, p => { p.operations[1].stderr = "leak"; },
    p => { p.errorControl = "not-observable"; }, p => { delete p.errorPolicy; }, p => { p.nr = 435; }]) {
    const proof = syscallFixture("pidfd"); change(proof);
    assert.throws(() => validateSyscallEvidence(proof, "pidfd", "arm64-v8a"));
  }
});
