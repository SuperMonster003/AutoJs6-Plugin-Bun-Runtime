import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { PENDING_SIGNAL_MODES, validatePendingSignalEvidence } from "./pending-signal-evidence.mjs";
import { WATCH_RELOAD_MODES } from "./watch-reload-evidence.mjs";
import { pendingSignalFixture } from "./pending-signal-fixture.test-support.mjs";
import { hardLimitFilter } from "./hard-limit-evidence.mjs";
import { materializePendingSignalSource, materializeProbes, validateProbes, validateFdEvidence, inputFacts, hash } from "./probe-common.mjs";

const probes = JSON.parse(readFileSync(new URL("probes.json", import.meta.url), "utf8"));
test("pending-signal additions preserve all 31 definitions and every old fixture/validator byte", () => {
  const baseline = JSON.parse(readFileSync(new URL("../../../../../docs/compatibility/2026-09-13-m3-blocked-pidfd-fix.json", import.meta.url), "utf8"));
  const original = probes.filter(p => !Object.hasOwn(PENDING_SIGNAL_MODES, p.id) && !Object.hasOwn(WATCH_RELOAD_MODES, p.id));
  assert.equal(original.length, 31);
  assert.deepEqual(original, baseline.probes.map(p => p.id === "revision"
    ? { ...p, stdout: "1.4.0+e8b129616" } : p));
  const protectedInputs = inputFacts().filter(p => /\/(?:fd|syscall|openat2|lchmod|hard-limit|async-signal)-(?:probes|evidence)\.mjs$/.test(p.path));
  assert.equal(protectedInputs.length, 11);
  for (const input of protectedInputs) assert.deepEqual(input, baseline.inputs.find(p => p.path === input.path));
  // The FD validator lives in the extended integration module; pin its unchanged function separately.
  assert.equal(hash(validateFdEvidence.toString().replace(/\r\n/g, "\n")), "15537ca9aecd6be7c238ec9f6e80664149033900983ea9a76d4bdfe6398ffe03");
  const materialized = materializeProbes(probes);
  for (const p of probes.filter(p => Object.hasOwn(PENDING_SIGNAL_MODES, p.id))) {
    assert.deepEqual(materialized.find(row => row.id === p.id), { ...p, sourceAsset: "pending-signal-" + p.mode + ".mjs" });
    assert.equal(materializePendingSignalSource(p.mode), "const PENDING_SIGNAL_MODE = " + JSON.stringify(p.mode) + ";\n" +
      readFileSync(new URL("pending-signal-probes.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n"));
    assert(Buffer.byteLength(materializePendingSignalSource(p.mode)) <= 12288);
  }
  for (const mode of ["", "../native", "native\n", "sync", "skip"]) assert.throws(() => materializePendingSignalSource(mode));
  for (const change of [p => { p.mode = "sync"; }, p => { p.source = "fake"; }, p => { p.sourceAsset = "fake.mjs"; },
    p => { p.sourceFile = "../pending-signal-probes.mjs"; }, p => { p.arguments = ["--version"]; }, p => { p.stdout = ""; },
    p => { p.timeoutMillis = 15000; }, p => { p.outputBytes = 16384; }, p => { p.extension = "js"; }]) {
    const changed = structuredClone(probes); change(changed[30]); assert.throws(() => validateProbes(changed));
  }
});

test("pending signal validation rejects early delivery, lost signals, wrong threads and incomplete children", () => {
  for (const abi of ["arm64-v8a", "x86_64"]) for (const mode of Object.values(PENDING_SIGNAL_MODES)) {
    const proof = pendingSignalFixture(mode, abi);
    assert.equal(validatePendingSignalEvidence(proof, mode, abi), proof);
    assert(Buffer.byteLength("PENDING_SIGNAL_RESULT=" + JSON.stringify(proof)) < 2048);
    const anotherPending = structuredClone(proof);
    anotherPending.pending.before = anotherPending.pending.after = "0000000080000000";
    anotherPending.pending.queued = "00000000c0000000";
    validatePendingSignalEvidence(anotherPending, mode, abi);
    for (const change of [p => { delete p.pending; }, p => { p.pending.before = "0"; },
      p => { p.pending.before = p.pending.queued; }, p => { p.pending.queued = p.pending.before; },
      p => { p.pending.queued = "00000000c0000000"; }, p => { p.pending.queueResult = { result: -1, errno: 22 }; },
      p => { p.pending.checks.pop(); }, p => { p.pending.checks[3][0] = 0; }, p => { p.pending.checks[6][1] = 1; },
      p => { p.pending.after = p.pending.queued; }, p => { p.pending.deliveryTids = []; },
      p => { p.pending.deliveryTids.push(p.pid); }, p => { p.pending.deliveryTids[0]++; },
      p => { p.pending.listenerCount = 1; }, p => { p.pending.afterRemoval.errno = 5; },
      p => { p.rows[2].childPending[0] = "0000000040000000"; }, p => { p.rows[2].childPending[1] = "0000000040000000"; },
      p => { p.restored[1] = p.blocked; }, p => { p.rows[0].immediate[1] = p.before[1]; },
      p => { p.rows[1].sentinelAbsent = false; }, p => { p.rows[2].gone = false; }, p => { p.passed = false; },
      p => { p.skipped = false; }, p => { p.error = ""; }]) {
      const changed = structuredClone(proof); change(changed);
      assert.throws(() => validatePendingSignalEvidence(changed, mode, abi));
    }
  }
});

test("pending fixture uses the exact bounded ABI-specific close_range/marker policy", () => {
  const source = readFileSync(new URL("pending-signal-probes.mjs", import.meta.url), "utf8");
  const expression = source.match(/const instructions = (\[[\s\S]*?\n  \]);/)[1];
  for (const abi of ["arm64-v8a", "x86_64"]) {
    const rows = runInNewContext(expression, { process: { arch: abi === "arm64-v8a" ? "arm64" : "x64" } }, { timeout: 1000 });
    const actual = Buffer.alloc(rows.length * 8);
    rows.forEach(([code,jt,jf,k],i) => { actual.writeUInt16LE(code,i*8); actual[i*8+2]=jt; actual[i*8+3]=jf; actual.writeUInt32LE(k,i*8+4); });
    assert.deepEqual(actual, hardLimitFilter(abi));
  }
});
