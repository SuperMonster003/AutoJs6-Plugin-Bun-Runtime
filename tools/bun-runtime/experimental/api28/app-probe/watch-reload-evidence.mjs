import assert from "node:assert/strict";
import { hardLimitFilterSha256 } from "./hard-limit-evidence.mjs";

export const WATCH_RELOAD_MODES = Object.freeze({ "watch-reload-native": "native", "watch-reload-trap": "trap" });

export function validateWatchReloadEvidence(proof, mode, abi) {
  validateWatchFacts(proof, mode, abi);
  assert.equal(proof.passed, true, "watch/reload semantics failed");
  assert(!proof.error && !proof.diagnostic, "watch diagnostic cannot pass");
  for (const row of proof.rows) assert.deepEqual(row.inherited, [-1,false,-1], "neither sentinel may survive exec");
  return proof;
}

// Exact failed FD shape, never accepted by the passing validator above.
export function validateWatchReloadFailureEvidence(proof, mode, abi) {
  validateWatchFacts(proof, mode, abi);
  assert.equal(proof.passed, false);
  assert.equal(proof.error, "watch image FD/signal/stdio semantics failed");
  assert(!proof.diagnostic);
  for (const [generation, row] of proof.rows.entries()) {
    assert.deepEqual(row.inherited, generation === 0 ? [-1,false,-1] : [1,true,-1], "observed inherited sentinel, then startup CLOEXEC");
    assert.equal(row.rawClose[0], -1, "raw close_range unavailable in each image");
    assert([22,38].includes(row.rawClose[1]), "unsupported CLOEXEC or unavailable syscall");
  }
  return proof;
}

function validateWatchFacts(proof, mode, abi) {
  assert(Object.values(WATCH_RELOAD_MODES).includes(mode), "fixed watch mode");
  assert(["arm64-v8a", "x86_64"].includes(abi));
  assert.equal(proof?.schemaVersion, 1);
  assert.equal(proof.mode, mode);
  assert.equal(proof.arch, abi === "arm64-v8a" ? "arm64" : "x64");
  assert(!Object.hasOwn(proof, "skipped") && !proof.streamError, "no skip or stream error");
  assert(Number.isSafeInteger(proof.uid) && proof.uid % 100000 >= 10000, "application UID");
  for (const pid of [proof.pid, proof.childPid]) assert(Number.isInteger(pid) && pid > 1);
  assert.notEqual(proof.pid, proof.childPid, "distinct owned watched process");
  assert.deepEqual(proof.beforeMarker, [-1,22]);
  if (mode === "trap") assert.equal(proof.filterSha256, hardLimitFilterSha256(abi), "exact inherited TRAP filter");
  else assert(!Object.hasOwn(proof, "filterSha256"), "native mode cannot install a filter");
  assert.equal(proof.reloads, 2, "two actual reloads required");
  assert.equal(proof.rows?.length, 3, "initial image plus two reloads required");
  const marker = mode === "trap" ? [-1,38] : [-1,22];
  for (const [generation, row] of proof.rows.entries()) {
    assert.equal(row.generation, generation);
    assert.equal(row.pid, proof.childPid, "reload must exec the same PID");
    assert.equal(row.uid, proof.uid, "application UID retained");
    assert.deepEqual(row.prepared, [0,1], "non-CLOEXEC versus explicit CLOEXEC control");
    assert.deepEqual(row.state, [0,0], "unblocked, non-pending SIGSYS precondition");
    assert.deepEqual(row.delivery, [1,proof.childPid], "fresh ordinary signal delivery in each image");
    assert.deepEqual(row.marker, marker);
    assert.deepEqual(row.afterRemoval, marker, "TRAP handler survives listener removal");
    if (mode === "trap") assert.deepEqual(row.rawClose, [-1,38]);
    else assert([[0,0],[-1,22],[-1,38]].some(value => JSON.stringify(value) === JSON.stringify(row.rawClose)));
    assert.equal(row.stdio?.length, 2);
    for (const target of row.stdio) assert(typeof target === "string" && /^(?:pipe|socket):\[\d+\]$/.test(target), "real bounded stdio pipe/socketpair");
    assert.deepEqual(row.stdio, proof.rows[0].stdio, "stdio survives both execs");
  }
  assert.equal(proof.cleanup?.signal, "SIGKILL", "owned child forcibly stopped");
  assert.equal(proof.cleanup.gone, true, "owned child reaped");
  assert.equal(proof.cleanup.timedOut, false, "timeout cannot pass");
  assert.equal(proof.cleanup.overflow, false, "overflow cannot pass");
  assert(Number.isInteger(proof.cleanup.bytes) && proof.cleanup.bytes > 0 && proof.cleanup.bytes <= 8192);
  return proof;
}
