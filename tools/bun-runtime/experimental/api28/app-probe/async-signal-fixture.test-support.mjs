import { hardLimitFilterSha256 } from "./hard-limit-evidence.mjs";
// Synthetic validator data only. Never device evidence or a replacement receipt.
export function asyncSignalFixture(mode, abi = "arm64-v8a", uid = 10001) {
  const enosys = { result: -1, errno: 38 }, before = [1003, "0000000000000000"], blocked = "0000000040000000";
  return structuredClone({ schemaVersion: 1, mode, arch: abi === "arm64-v8a" ? "arm64" : "x64",
    uid, pid: 1003, before, blocked, restored: before, fd: 256, nativeCloseRange: enosys,
    sentinelIdentity: true, parentFlags: 0, passed: true,
    ...(mode === "trap" ? { policy: { before: { result: -1, errno: 22 }, after: enosys, sha256: hardLimitFilterSha256(abi) },
      trap: enosys, postMarker: enosys } : {}),
    rows: ["positive", "sentinel", "status"].map((kind, i) => ({ kind, pid: 1004 + i,
      exitCode: kind === "sentinel" ? 1 : 0, immediate: [1003, blocked], after: [1003, blocked], gone: true,
      ...(kind === "positive" ? { stdoutTarget: "pipe:[1000]" } : kind === "sentinel" ? { sentinelAbsent: true } :
        { childMask: blocked, ppid: 1003, uid }) })),
  });
}
export function asyncSignalResult(mode, abi = "arm64-v8a", uid = 10001) {
  const asyncSignalEvidence = asyncSignalFixture(mode, abi, uid);
  const stdout = "ASYNC_SIGNAL_RESULT=" + JSON.stringify(asyncSignalEvidence) + "\n";
  return { id: "sigsys-blocked-async-" + mode, passed: true, termination: "exited", exitCode: 0, forciblyTerminated: false,
    outputLimitBytes: 16384, capturedBytes: Buffer.byteLength(stdout), elapsedMillis: 500,
    processReaped: true, workspaceRemoved: true, stdout, stderr: "", asyncSignalEvidence };
}
