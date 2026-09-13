import assert from "node:assert/strict";
import test from "node:test";
import { WATCH_RELOAD_MODES, validateWatchReloadEvidence, validateWatchReloadFailureEvidence } from "./watch-reload-evidence.mjs";
import { watchReloadResult } from "./watch-reload-fixture.test-support.mjs";
import { materializeWatchReloadSource } from "./probe-common.mjs";

test("watch proof requires two actual same-PID reloads, two FD controls, signals and owned cleanup", () => {
  for (const abi of ["arm64-v8a", "x86_64"]) for (const mode of Object.values(WATCH_RELOAD_MODES)) {
    const result = watchReloadResult(mode, abi);
    assert(Buffer.byteLength(result.stdout) <= 2048);
    const proof = result.watchReloadEvidence;
    assert.equal(validateWatchReloadEvidence(proof, mode, abi), proof);
    for (const row of proof.rows) row.stdio = ["socket:[7100]", "socket:[7200]"];
    validateWatchReloadEvidence(proof, mode, abi);
    if (mode === "native") {
      for (const row of proof.rows) row.rawClose = [0,0];
      validateWatchReloadEvidence(proof, mode, abi);
    }
  }
});

test("failure validator requires the observed two-reload FD leak and cannot grant acceptance", () => {
  for (const mode of ["native", "trap"]) {
    const proof = watchReloadResult(mode).watchReloadEvidence;
    proof.passed = false; proof.error = "watch image FD/signal/stdio semantics failed";
    for (const row of proof.rows.slice(1)) row.inherited = [1,true,-1];
    validateWatchReloadFailureEvidence(proof, mode, "arm64-v8a");
    if (mode === "native") {
      for (const row of proof.rows) row.rawClose = [-1,22];
      validateWatchReloadFailureEvidence(proof, mode, "arm64-v8a");
    }
    assert.throws(() => validateWatchReloadEvidence(proof, mode, "arm64-v8a"));
    for (const mutate of [p => { p.rows[1].inherited = [-1,false,-1]; },
      p => { p.rows[2].rawClose = [0,0]; }, p => { p.rows[0].inherited = [1,true,-1]; },
      p => { p.error = "timeout"; }, p => { p.passed = true; }, p => { p.cleanup.gone = false; },
      p => { p.rows[1].delivery = [0,-1]; }, p => { p.rows.pop(); }]) {
      const changed = structuredClone(proof); mutate(changed);
      assert.throws(() => validateWatchReloadFailureEvidence(changed, mode, "arm64-v8a"));
    }
  }
});
test("watch proof rejects inherited FDs, changed PIDs, missing reloads, early signals and timeouts", () => {
  for (const mutate of [
    p => { p.passed = false; }, p => { p.reloads = 1; }, p => { p.rows.pop(); },
    p => { p.rows.reverse(); }, p => { p.rows[1].pid++; }, p => { p.rows[1].uid++; },
    p => { p.rows[1].inherited = [1,true,-1]; }, p => { p.rows[2].inherited[2] = 0; },
    p => { p.rows[0].prepared[0] = 1; }, p => { p.rows[1].prepared[1] = 0; },
    p => { p.rows[2].state = [1,1]; }, p => { p.rows[1].delivery[0] = 0; },
    p => { p.rows[1].delivery[1]++; }, p => { p.rows[1].stdio[0] = "pipe:[9999]"; },
    p => { p.rows[0].stdio = ["fake", "fake"]; }, p => { p.rows[2].afterRemoval = [-1,22]; },
    p => { p.filterSha256 = "0".repeat(64); }, p => { p.rows[2].rawClose = [-1,5]; },
    p => { p.rows[1].marker = [-1,22]; }, p => { p.beforeMarker = [-1,38]; },
    p => { p.cleanup.timedOut = true; }, p => { p.cleanup.overflow = true; },
    p => { p.cleanup.gone = false; }, p => { p.cleanup.signal = "SIGTERM"; },
    p => { p.cleanup.bytes = 8193; }, p => { p.diagnostic = "skipped"; },
  ]) {
    const proof = watchReloadResult("trap").watchReloadEvidence;
    mutate(proof); assert.throws(() => validateWatchReloadEvidence(proof, "trap", "arm64-v8a"));
  }
});
test("only two fixed bounded watch assets can be materialized", () => {
  for (const mode of ["native", "trap"]) {
    const source = materializeWatchReloadSource(mode);
    assert(source.startsWith("const WATCH_RELOAD_MODE = " + JSON.stringify(mode) + ";\n"));
    assert(Buffer.byteLength(source) <= 12288);
  }
  for (const mode of ["../native", "skip", "", "native\n"]) assert.throws(() => materializeWatchReloadSource(mode));
});
