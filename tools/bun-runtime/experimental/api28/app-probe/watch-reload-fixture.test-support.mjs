import { fdFilterSha256 } from "./probe-common.mjs";

export function watchReloadResult(mode, abi = "arm64-v8a", uid = 10001) {
  const marker = mode === "trap" ? [-1,38] : [-1,22];
  const proof = { schemaVersion: 1, mode, arch: abi === "arm64-v8a" ? "arm64" : "x64", uid,
    pid: 5100, childPid: 5200, beforeMarker: [-1,22],
    ...(mode === "trap" ? { filterSha256: fdFilterSha256(abi) } : {}),
    rows: [0,1,2].map(generation => ({ generation, pid: 5200, uid,
      inherited: [-1,false,-1], state: [0,0], stdio: ["pipe:[7100]", "pipe:[7200]"],
      rawClose: [-1,38], marker: [...marker], prepared: [0,1], delivery: [1,5200], afterRemoval: [...marker] })),
    reloads: 2, cleanup: { signal: "SIGKILL", gone: true, timedOut: false, overflow: false, bytes: 1100 }, passed: true };
  return { id: "watch-reload-" + mode, passed: true, exitCode: 0, termination: "exited", processReaped: true, forciblyTerminated: false,
    workspaceRemoved: true, elapsedMillis: 1200, capturedBytes: 1800, outputLimitBytes: 16384,
    stdout: "WATCH_RELOAD_RESULT=" + JSON.stringify(proof) + "\n", stderr: "", watchReloadEvidence: proof };
}
