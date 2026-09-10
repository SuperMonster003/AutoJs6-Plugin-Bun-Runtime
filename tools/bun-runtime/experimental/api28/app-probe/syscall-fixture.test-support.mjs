import { COPY_BYTES, COPY_SHA256, syscallNumbers, syscallFilterSha256 } from "./syscall-evidence.mjs";

// Synthetic verifier inputs, never device evidence.
export function syscallFixture(mode, abi = "arm64-v8a", kernel = "5.10.0-test", injectedErrno = 5) {
  const error = errno => ({ result: -1, errno }), numbers = syscallNumbers(abi);
  const policy = (isError, before) => ({ installed: true, before: error(before), after: error(isError ? 5 : 38),
    filterSha256: syscallFilterSha256(abi, mode, isError) });
  const base = { schemaVersion: 1, mode, arch: abi === "arm64-v8a" ? "arm64" : "x64", kernel, passed: true,
    filesRemoved: true, trapPolicy: policy(false, mode === "raw-controls" ? 22 : 5) };
  if (mode === "raw-controls") return { ...base,
    calls: Object.entries(numbers).map(([name, nr]) => ({ name, nr, before: error(22), after: error(38) })) };
  const target = mode === "copy-range" ? "copy_file_range" : "pidfd_open";
  const [major, minor] = kernel.split(".").map(Number);
  const path = injectedErrno === 38 ? "policy-gated" :
    mode === "copy-range" && (major < 4 || (major === 4 && minor < 5)) ? "kernel-gated" : "exercised";
  const operation = mode === "copy-range" ? { contentSha256: COPY_SHA256, bytes: COPY_BYTES.length, mode: 0o600 } :
    { exitCode: 17, stdout: "pidfd-child-ok\n", stderr: "", childGone: true };
  return { ...base, target, nr: numbers[target], native: error(22), errorPolicy: policy(true, 22),
    injected: error(injectedErrno), trapped: error(38), path, errorControl: path === "exercised" ? "EIO" : "not-observable",
    operations: structuredClone([operation, operation]), ...(mode === "copy-range" ? {
      contentSha256: COPY_SHA256, contentBytes: COPY_BYTES.length, sourceUnchanged: true, fileDescriptorsClosed: true,
    } : {}) };
}
