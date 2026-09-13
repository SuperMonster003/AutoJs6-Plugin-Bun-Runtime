import assert from "node:assert/strict";
import { validateAsyncSignalEvidence } from "./async-signal-evidence.mjs";

export const PENDING_SIGNAL_MODES = Object.freeze({
  "sigsys-pending-async-native": "native", "sigsys-pending-async-trap": "trap",
});
const bits = text => { assert(/^[a-f0-9]{16}$/.test(text)); return BigInt("0x" + text); };

export function validatePendingSignalEvidence(proof, mode, abi) {
  // The original mask/FD/child/filter requirements remain mandatory.
  validateAsyncSignalEvidence(proof, mode, abi);
  const p = proof.pending, bit = 1n << 30n;
  assert.equal(bits(p.before) & bit, 0n, "SIGSYS must not already be pending");
  assert.equal(bits(p.queued), bits(p.before) | bit, "tgkill must queue SIGSYS on the calling thread");
  assert.deepEqual(p.queueResult, { result: 0, errno: 0 });
  assert.deepEqual(p.checks, Array.from({ length: 10 }, () => [1, 0]),
    "pending SIGSYS and zero JS deliveries before and across all three asynchronous children");
  assert.equal(p.after, p.before, "pending state must be restored after delivery");
  assert.deepEqual(p.deliveryTids, [proof.pid], "exactly one JS delivery on the original main thread");
  assert.equal(p.listenerCount, 0, "the last listener must be removed");
  assert.equal(proof.rows[2].childPending.length, 2);
  for (const value of proof.rows[2].childPending) assert.equal(bits(value) & bit, 0n, "child must not inherit pending SIGSYS");
  assert.deepEqual(p.afterRemoval, { result: -1, errno: mode === "trap" ? 38 : 22 },
    "removing the listener must preserve the seccomp handler");
  return proof;
}
