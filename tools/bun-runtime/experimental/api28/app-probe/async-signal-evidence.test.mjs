import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { ASYNC_SIGNAL_MODES, validateAsyncSignalEvidence } from "./async-signal-evidence.mjs";
import { PENDING_SIGNAL_MODES } from "./pending-signal-evidence.mjs";
import { asyncSignalFixture } from "./async-signal-fixture.test-support.mjs";
import { materializeAsyncSignalSource, materializeProbes, validateProbes, inputFacts, hash } from "./probe-common.mjs";

const probes = JSON.parse(readFileSync(new URL("probes.json", import.meta.url), "utf8"));
test("async fixtures preserve the original 29 definitions and fixed source-only bindings", () => {
  const original = probes.filter(p => !Object.hasOwn(ASYNC_SIGNAL_MODES, p.id) && !Object.hasOwn(PENDING_SIGNAL_MODES, p.id))
    .map(p => p.id === "revision" ? { ...p, stdout: "1.4.0+7b9ac2668" } : p);
  assert.equal(original.length, 29);
  assert.equal(hash(JSON.stringify(original)), "3c1d33410d09c6ca15ba01f01cc43734275511b5078713cf7723c37ea1faee3f");
  for (const path of ["/async-signal-probes.mjs", "/async-signal-evidence.mjs"])
    assert(inputFacts().some(input => input.path.endsWith(path)));
  const materialized = materializeProbes(probes);
  for (const p of probes.filter(p => Object.hasOwn(ASYNC_SIGNAL_MODES, p.id))) {
    assert.deepEqual(materialized.find(row => row.id === p.id), { ...p, sourceAsset: "async-signal-" + p.mode + ".mjs" });
    const source = materializeAsyncSignalSource(p.mode);
    assert.equal(source, "const ASYNC_SIGNAL_MODE = " + JSON.stringify(p.mode) + ";\n" +
      readFileSync(new URL("async-signal-probes.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n"));
    assert(Buffer.byteLength(source) <= 12288);
  }
  for (const mode of ["", "../native", "native\n", "sync", "skip"]) assert.throws(() => materializeAsyncSignalSource(mode));
  for (const change of [p => { p.mode = "sync"; }, p => { p.source = "fake"; }, p => { p.sourceAsset = "fake.mjs"; },
    p => { p.sourceFile = "../async-signal-probes.mjs"; }, p => { p.arguments = ["--version"]; }, p => { p.stdout = ""; },
    p => { p.timeoutMillis = 15000; }, p => { p.outputBytes = 16384; }, p => { p.extension = "js"; }]) {
    const changed = structuredClone(probes); change(changed[28]); assert.throws(() => validateProbes(changed));
  }
});
test("both async modes require exact thread/mask, child identity, FD and filter evidence on both ABIs", () => {
  for (const abi of ["arm64-v8a", "x86_64"]) for (const mode of Object.values(ASYNC_SIGNAL_MODES)) {
    const proof = asyncSignalFixture(mode, abi);
    assert.equal(validateAsyncSignalEvidence(proof, mode, abi), proof);
    assert(Buffer.byteLength("ASYNC_SIGNAL_RESULT=" + JSON.stringify(proof)) < 2048);
    const alreadyMasked = structuredClone(proof);
    alreadyMasked.before[1] = alreadyMasked.restored[1] = "0000000080000000";
    alreadyMasked.blocked = "00000000c0000000";
    for (const row of alreadyMasked.rows) {
      row.immediate[1] = row.after[1] = alreadyMasked.blocked;
      if (row.kind === "status") row.childMask = alreadyMasked.blocked;
    }
    validateAsyncSignalEvidence(alreadyMasked, mode, abi);
    for (const control of [{ result: 0, errno: 0 }, { result: -1, errno: 22 }]) {
      proof.nativeCloseRange = control; validateAsyncSignalEvidence(proof, mode, abi);
    }
    for (const change of [p => { p.passed = false; }, p => { p.skipped = false; }, p => { p.error = ""; },
      p => { p.arch = "ia32"; }, p => { p.uid = 2000; }, p => { p.pid++; }, p => { p.before[1] = "0"; },
      p => { p.blocked = "0000000000000000"; }, p => { p.blocked = "00000000c0000000"; },
      p => { p.before[1] = p.blocked; p.restored[1] = p.blocked; }, p => { p.restored[0]++; },
      p => { p.restored[1] = p.blocked; }, p => { p.fd = 65536; }, p => { p.parentFlags = 1; },
      p => { p.sentinelIdentity = false; }, p => { p.nativeCloseRange = { result: -1, errno: 5 }; },
      p => { p.rows.pop(); }, p => { p.rows.reverse(); }, p => { p.rows[1].pid = p.rows[0].pid; },
      p => { p.rows[0].gone = false; }, p => { p.rows[0].exitCode = 137; }, p => { p.rows[0].immediate[1] = p.before[1]; },
      p => { p.rows[1].after[0]++; }, p => { p.rows[2].after[1] = p.before[1]; },
      p => { p.rows[0].stdoutTarget = "/private/sentinel"; }, p => { p.rows[1].sentinelAbsent = false; },
      p => { p.rows[1].exitCode = 0; }, p => { p.rows[2].childMask = p.before[1]; },
      p => { p.rows[2].uid++; }, p => { p.rows[2].ppid++; }]) {
      const changed = structuredClone(proof); change(changed); assert.throws(() => validateAsyncSignalEvidence(changed, mode, abi));
    }
    const changed = structuredClone(proof);
    if (mode === "trap") {
      for (const change of [p => { delete p.policy; }, p => { p.policy.sha256 = "0".repeat(64); },
        p => { p.policy.before.errno = 38; }, p => { p.trap.errno = 22; }, p => { p.postMarker.errno = 22; }]) {
        const bad = structuredClone(proof); change(bad); assert.throws(() => validateAsyncSignalEvidence(bad, mode, abi));
      }
    } else { changed.postMarker = { result: -1, errno: 38 }; assert.throws(() => validateAsyncSignalEvidence(changed, mode, abi)); }
  }
});
