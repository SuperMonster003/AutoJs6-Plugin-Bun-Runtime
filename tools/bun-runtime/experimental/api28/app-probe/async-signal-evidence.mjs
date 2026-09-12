import assert from "node:assert/strict";
import { hardLimitFilterSha256 } from "./hard-limit-evidence.mjs";
export const ASYNC_SIGNAL_MODES = Object.freeze({
  "sigsys-blocked-async-native": "native", "sigsys-blocked-async-trap": "trap",
});
const enosys = { result: -1, errno: 38 };
const signalMask = value => { assert(/^[a-f0-9]{16}$/.test(value), "exact 64-bit mask"); return BigInt("0x" + value); };
export function validateAsyncSignalEvidence(proof, mode, abi) {
  assert(Object.values(ASYNC_SIGNAL_MODES).includes(mode));
  assert(["arm64-v8a", "x86_64"].includes(abi));
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.mode, mode); assert.equal(proof.passed, true);
  for (const key of ["error", "skipped"]) assert(!Object.hasOwn(proof, key));
  assert.equal(proof.arch, abi === "arm64-v8a" ? "arm64" : "x64");
  assert(Number.isSafeInteger(proof.uid) && proof.uid % 100000 >= 10000);
  assert(Number.isSafeInteger(proof.pid) && proof.pid > 1);
  assert.equal(proof.before.length, 2); assert.equal(proof.before[0], proof.pid);
  const before = signalMask(proof.before[1]), blocked = signalMask(proof.blocked), bit = 1n << 30n;
  assert.equal(before & bit, 0n); assert.equal(blocked, before | bit);
  assert.deepEqual(proof.restored, proof.before, "same-thread exact restoration");
  assert(Number.isInteger(proof.fd) && proof.fd >= 256 && proof.fd < 512);
  assert.equal(proof.parentFlags, 0); assert.equal(proof.sentinelIdentity, true);
  assert(proof.nativeCloseRange.result === 0 ? proof.nativeCloseRange.errno === 0 :
    proof.nativeCloseRange.result === -1 && [22,38].includes(proof.nativeCloseRange.errno));
  if (mode === "trap") {
    assert.deepEqual(proof.policy, { before: { result: -1, errno: 22 }, after: enosys, sha256: hardLimitFilterSha256(abi) });
    assert.deepEqual(proof.trap, enosys); assert.deepEqual(proof.postMarker, enosys);
  } else for (const key of ["policy", "trap", "postMarker"]) assert(!Object.hasOwn(proof, key));
  assert.deepEqual(proof.rows.map(row => row.kind), ["positive", "sentinel", "status"]);
  assert.equal(new Set(proof.rows.map(row => row.pid)).size, 3, "distinct observed child PIDs");
  for (const row of proof.rows) {
    assert(Number.isSafeInteger(row.pid) && row.pid > 1 && row.pid !== proof.pid);
    assert.equal(row.gone, true);
    for (const field of ["immediate", "after"]) assert.deepEqual(row[field], [proof.pid, proof.blocked]);
    assert.equal(row.exitCode, row.kind === "sentinel" ? 1 : 0);
    if (row.kind === "positive") assert(/^(?:pipe|socket):\[\d+\]$/.test(row.stdoutTarget));
    if (row.kind === "sentinel") assert.equal(row.sentinelAbsent, true);
    if (row.kind === "status") {
      assert.equal(row.childMask, proof.blocked); assert.equal(row.ppid, proof.pid); assert.equal(row.uid, proof.uid);
    }
  }
  return proof;
}
