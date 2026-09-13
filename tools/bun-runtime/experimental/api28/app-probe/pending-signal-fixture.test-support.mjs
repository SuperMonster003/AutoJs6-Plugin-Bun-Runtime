import { asyncSignalFixture } from "./async-signal-fixture.test-support.mjs";

// Synthetic validator inputs only; never a device record.
export function pendingSignalFixture(mode, abi = "arm64-v8a", uid = 10001) {
  const proof = asyncSignalFixture(mode, abi, uid);
  proof.rows[2].childPending = ["0000000000000000", "0000000000000000"];
  proof.pending = {
    before: "0000000000000000", queued: "0000000040000000", queueResult: { result: 0, errno: 0 },
    checks: Array.from({ length: 10 }, () => [1, 0]), after: "0000000000000000",
    deliveryTids: [proof.pid], listenerCount: 0, afterRemoval: { result: -1, errno: mode === "trap" ? 38 : 22 },
  };
  return proof;
}
export function pendingSignalResult(mode, abi = "arm64-v8a", uid = 10001) {
  const pendingSignalEvidence = pendingSignalFixture(mode, abi, uid);
  const stdout = "PENDING_SIGNAL_RESULT=" + JSON.stringify(pendingSignalEvidence) + "\n";
  return { id: "sigsys-pending-async-" + mode, passed: true, termination: "exited", exitCode: 0, forciblyTerminated: false,
    outputLimitBytes: 16384, capturedBytes: Buffer.byteLength(stdout), elapsedMillis: 500,
    processReaped: true, workspaceRemoved: true, stdout, stderr: "", pendingSignalEvidence };
}
