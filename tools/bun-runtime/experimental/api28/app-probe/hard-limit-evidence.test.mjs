import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { HARD_LIMIT_MODES, hardLimitFilter, hardLimitFilterSha256, validateHardLimitEvidence } from "./hard-limit-evidence.mjs";
import { hardLimitFixture } from "./hard-limit-fixture.test-support.mjs";
import { fdFilterSha256 } from "./probe-common.mjs";

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
test("hard-limit policy bytes match the Android fixture and trap only close_range plus its marker", () => {
  const source = readFileSync(new URL("hard-limit-probes.mjs", import.meta.url), "utf8");
  const expression = source.match(/const instructions = (\[[\s\S]*?\n  \]);/)[1];
  for (const abi of ["arm64-v8a", "x86_64"]) {
    const arm = abi === "arm64-v8a", arch = arm ? 0xc00000b7 : 0xc000003e;
    const filter = hardLimitFilter(abi), rows = runInNewContext(expression, { process: { arch: arm ? "arm64" : "x64" } }, { timeout: 1000 });
    const actual = Buffer.alloc(rows.length * 8);
    rows.forEach(([code,jt,jf,k],i) => { actual.writeUInt16LE(code,i*8); actual[i*8+2]=jt; actual[i*8+3]=jf; actual.writeUInt32LE(k,i*8+4); });
    assert.deepEqual(actual, filter);
    assert.equal(hardLimitFilterSha256(abi), fdFilterSha256(abi));
    for (let nr = 0; nr <= 512; nr++) {
      assert.equal(evaluate(filter, arch, nr), nr === 436 ? 0x00030000 : 0x7fff0000);
      assert.equal(evaluate(filter, 0x40000003, nr), 0x80000000);
    }
    assert.equal(evaluate(filter, arch, arm ? 167 : 157, 0x41554a36), 0x00030000);
    assert.equal(evaluate(filter, arch, arm ? 167 : 157, 0x41554a37), 0x7fff0000);
  }
});
test("all four hard-limit modes accept complete bounded evidence on each ABI", () => {
  for (const abi of ["arm64-v8a", "x86_64"]) for (const mode of Object.values(HARD_LIMIT_MODES)) {
    const proof = hardLimitFixture(mode, abi);
    assert.equal(validateHardLimitEvidence(proof, mode, abi), proof);
    assert(("HARD_LIMIT_RESULT=" + JSON.stringify(proof)).length <= 2048);
    for (const call of [{result:0,errno:0},{result:-1,errno:22}]) {
      proof.nativeCloseRange = call; validateHardLimitEvidence(proof, mode, abi);
    }
  }
});
test("soft-only lowering, missing preconditions, restoration and parent limit changes cannot pass", () => {
  for (const mode of Object.values(HARD_LIMIT_MODES)) for (const change of [
    p => { p.passed = false; }, p => { p.uid = 2000; }, p => { p.pid = 1; }, p => { p.fd = 127; },
    p => { p.fd = 70000; }, p => { p.sentinelIdentity = false; }, p => { p.before.soft = 128; },
    p => { p.before.hard = 128; }, p => { p.before.openMax = 128; }, p => { p.before.soft = Infinity; },
    p => { p.during.hard = 32768; }, p => { p.during.openMax = 32768; }, p => { p.after.hard = 32768; },
    p => { p.raiseAttempt = {result:0,errno:0}; }, p => { p.raiseAttempt.errno = 22; },
    p => { p.supervisorBefore = [128,128]; }, p => { p.supervisorAfter = [128,128]; },
    p => { p.parentFlags = 3; }, p => { p.nativeCloseRange.errno = 1; },
    p => { p.error = "failure"; }, p => { p.skipped = true; }, p => { delete p.after; },
  ]) {
    const proof = hardLimitFixture(mode); change(proof);
    assert.throws(() => validateHardLimitEvidence(proof, mode, "arm64-v8a"));
  }
});
test("startup inheritance, both spawn APIs and exact TRAP controls are mandatory", () => {
  for (const [mode, change] of [
    ["startup-native", p => { p.startup.samePid = false; }], ["startup-trap", p => { p.startup.cloexec = false; }],
    ["startup-native", p => { p.startup.inheritedOpen = false; }], ["startup-trap", p => { delete p.startup; }],
    ["spawn-native", p => { p.sync.positive = false; }], ["spawn-trap", p => { p.async.sentinelAbsent = false; }],
    ["spawn-native", p => { p.sync.exitCode = 0; }], ["spawn-trap", p => { p.async.limits = [128,32768]; }],
    ["spawn-native", p => { delete p.async; }], ["spawn-trap", p => { delete p.policy; }],
    ["startup-trap", p => { p.policy.sha256 = hardLimitFilterSha256("x86_64"); }],
    ["spawn-trap", p => { p.trap.marker.errno = 22; }], ["startup-trap", p => { p.trap.closeRange.errno = 1; }],
    ["startup-native", p => { p.trap = {}; }], ["spawn-native", p => { p.policy = {}; }],
  ]) {
    const proof = hardLimitFixture(mode); change(proof);
    assert.throws(() => validateHardLimitEvidence(proof, mode, "arm64-v8a"));
  }
});
