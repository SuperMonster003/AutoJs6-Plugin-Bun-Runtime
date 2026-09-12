import { hardLimitFilterSha256 } from "./hard-limit-evidence.mjs";

// Synthetic validator input only, never an Android observation or build receipt.
export function hardLimitFixture(mode, abi = "arm64-v8a", uid = 10001) {
  const startup = mode.startsWith("startup-"), trap = mode.endsWith("-trap");
  const enosys = { result: -1, errno: 38 };
  return structuredClone({ schemaVersion: 1, mode, arch: abi === "arm64-v8a" ? "arm64" : "x64",
    uid, pid: 1003, passed: true, fd: 256, sentinelIdentity: true,
    before: { soft: 32768, hard: 32768, openMax: 32768 },
    during: { soft: 128, hard: 128, openMax: 128 }, after: { soft: 128, hard: 128, openMax: 128 },
    supervisorBefore: [32768, 32768], supervisorAfter: [32768, 32768],
    raiseAttempt: { result: -1, errno: 1 }, nativeCloseRange: enosys, parentFlags: startup ? 1 : 0,
    ...(trap ? { policy: { before: { result: -1, errno: 22 }, after: enosys, sha256: hardLimitFilterSha256(abi) },
      trap: { marker: enosys, closeRange: enosys } } : {}),
    ...(startup ? { startup: { samePid: true, inheritedOpen: true, cloexec: true } } : {
      sync: { positive: true, sentinelAbsent: true, exitCode: 1, limits: [128, 128] },
      async: { positive: true, sentinelAbsent: true, exitCode: 1, limits: [128, 128] } }),
  });
}
export function hardLimitResult(mode, abi = "arm64-v8a", uid = 10001) {
  const hardLimitEvidence = hardLimitFixture(mode, abi, uid);
  const stdout = "HARD_LIMIT_RESULT=" + JSON.stringify(hardLimitEvidence) + "\n";
  return { id: "fd-hard-" + mode, passed: true, termination: "exited", exitCode: 0, forciblyTerminated: false,
    outputLimitBytes: 16384, capturedBytes: Buffer.byteLength(stdout), elapsedMillis: 2000,
    processReaped: true, workspaceRemoved: true, stdout, stderr: "", hardLimitEvidence,
    hardLimitParentLimits: { before: [32768, 32768], after: [32768, 32768] } };
}
