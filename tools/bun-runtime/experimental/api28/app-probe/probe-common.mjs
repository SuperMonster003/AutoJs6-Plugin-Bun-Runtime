import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectElfBuffer, verifyRuntimeEvidenceManifest } from "../verify-built-runtime.mjs";
import { inspectApkRuntime } from "../../../verify-apk-runtime.mjs";
import { supervisorArtifacts, supervisorLock, verifySupervisorSource } from "../../../supervisor/supervisor-common.mjs";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "../../../../..");
export const PACKAGE = "io.github.supermonster003.autojs6.plugin.bun.runtime.api28probe";
export const RUNNER = PACKAGE + "/" + PACKAGE + ".ProbeInstrumentation";
export const ABIS = ["arm64-v8a", "x86_64"];
export const SHA256 = /^[a-f0-9]{64}$/;
export const SHARED_PROCESS = "app/src/main/java/io/github/supermonster003/autojs6/plugin/bun/runtime/SupervisedProcess.java";
export const INPUTS = [
  ...["AndroidManifest.xml", "ProbeInstrumentation.java", "probes.json", "fd-probes.mjs", "probe-common.mjs", "build-probe.mjs", "run-probe.mjs"]
    .map(path => "tools/bun-runtime/experimental/api28/app-probe/" + path),
  SHARED_PROCESS,
  ...["supervisor.c", "supervisor.lock.json", "build-supervisor.mjs", "supervisor-common.mjs", "verify-supervisor.mjs", "README.md"]
    .map(path => "tools/bun-runtime/supervisor/" + path),
  "tools/bun-runtime/verify-runtime.mjs", "tools/bun-runtime/verify-apk-runtime.mjs",
  "tools/bun-runtime/experimental/api28/runtime-evidence.json",
  "tools/bun-runtime/experimental/api28/verify-built-runtime.mjs",
];
export const FD_MODES = {
  "fd-spawn-native": "spawn-native", "fd-spawn-trap": "spawn-trap", "fd-spawn-blocked-sigsys": "blocked-sigsys",
  "fd-startup-trap": "startup-trap", "sigsys-listener-trap": "sigsys-listener",
};
export const PROBE_IDS = ["version", "revision", "application-domain", "javascript-unicode-streams", "typescript",
  "spawn-and-spawn-sync", "file-io", "fetch-loopback", "user-sigsys-handler", "timeout-forcible-cleanup",
  "bounded-output", "cancel-after-ready", ...Object.keys(FD_MODES), "recovery-after-termination"];
export const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const json = (path) => JSON.parse(readFileSync(path, "utf8"));
export const fileFacts = (path) => {
  const bytes = readFileSync(path);
  return { bytes: bytes.length, sha256: hash(bytes) };
};
// Git-canonical text bytes keep source receipts comparable across Windows/Linux.
export const inputFacts = () => INPUTS.map((path) => {
  const bytes = Buffer.from(readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n"));
  return { path, bytes: bytes.length, sha256: hash(bytes) };
});

export function requireFile(path) {
  assert(typeof path === "string" && isAbsolute(path), "an absolute regular-file path is required");
  assert(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), "input must be a regular file, not a symlink");
  return realpathSync(path);
}

export function outsideRepository(path) {
  const normalized = resolve(path);
  const inside = (child, parent) => {
    const rel = relative(parent, child);
    return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(".." + sep));
  };
  const root = realpathSync(ROOT);
  assert(!inside(normalized, root) && !inside(root, normalized), "output must be outside the repository and its ancestors");
  return normalized;
}

export function newOutputDirectory(path) {
  assert(typeof path === "string" && isAbsolute(path), "output directory must be absolute");
  const normalized = outsideRepository(join(realpathSync(dirname(path)), basename(path)));
  assert(!existsSync(normalized), "refusing to overwrite an existing output directory");
  return normalized;
}

export function parseOptions(argv, allowed) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i], value = argv[i + 1];
    assert(allowed.includes(name) && !Object.hasOwn(result, name), "unknown or repeated option: " + name);
    assert(value && !value.startsWith("--"), "missing value for " + name);
    result[name] = value;
  }
  for (const name of allowed) assert(result[name], "required option: " + name);
  return result;
}

export function lockedEvidence() {
  const evidence = json(join(HERE, "../runtime-evidence.json"));
  verifyRuntimeEvidenceManifest(evidence);
  return evidence;
}

// Windows/WSL mounts do not preserve a useful POSIX mode. Recheck exact ELF
// bytes here; actual read-only/executable permissions are asserted after install.
export function verifyRuntimePair(primaryPath, repeatPath, artifact) {
  const primary = requireFile(primaryPath), repeat = requireFile(repeatPath);
  assert(primary !== repeat, "two distinct clean-build input files are required");
  assert.equal(basename(primary), artifact.filename);
  assert.equal(basename(repeat), artifact.filename);
  const data = readFileSync(primary);
  assert(data.equals(readFileSync(repeat)), "clean-build runtime bytes differ");
  assert.equal(data.length, artifact.bytes, "runtime byte count");
  assert.equal(hash(data), artifact.sha256, "runtime SHA-256");
  assert.deepEqual(inspectElfBuffer(data), artifact.elf, "runtime ELF audit");
  return primary;
}

export function validateProbes(probes) {
  assert(Array.isArray(probes), "probe array required");
  assert.deepEqual(probes.map(probe => probe.id), PROBE_IDS, "exact ordered 18-probe inventory required");
  const ids = new Set();
  for (const probe of probes) {
    assert(/^[a-z][a-z0-9-]{0,63}$/.test(probe.id) && !ids.has(probe.id), "unsafe or duplicate probe ID");
    ids.add(probe.id);
    assert(["exited", "timeout", "output-limit", "cancelled"].includes(probe.termination), "invalid termination");
    const expectedTermination = { "timeout-forcible-cleanup": "timeout", "bounded-output": "output-limit",
      "cancel-after-ready": "cancelled" }[probe.id] ?? "exited";
    assert.equal(probe.termination, expectedTermination, "lifecycle fixture cannot be weakened");
    if (probe.termination !== "exited") {
      assert.equal(probe.requiresReady, true, "SIGTERM-handler readiness required");
      assert(probe.source.includes("process.on('SIGTERM',()=>{});") &&
        probe.source.includes("console.log('PROBE_READY='+process.pid);"), "fixed signal/readiness fixture required");
      assert.equal(probe.stdout, "PROBE_READY=");
    } else assert.equal(probe.requiresReady, undefined);
    assert.equal(probe.cancelAfterReadyMillis, probe.termination === "cancelled" ? 100 : undefined);
    assert.equal(probe.timeoutMillis, probe.id === "timeout-forcible-cleanup" ? 1500 : undefined, "fixed timeout budget required");
    assert.equal(probe.outputBytes, probe.id === "bounded-output" ? 1024 : undefined, "fixed output budget required");
    assert(Number.isInteger(probe.timeoutMillis ?? 15000) && (probe.timeoutMillis ?? 15000) >= 500 &&
      (probe.timeoutMillis ?? 15000) <= 15000, "invalid timeout");
    assert(Number.isInteger(probe.outputBytes ?? 16384) && (probe.outputBytes ?? 16384) >= 1024 &&
      (probe.outputBytes ?? 16384) <= 16384, "invalid output bound");
    if (Object.hasOwn(FD_MODES, probe.id)) {
      assert.equal(probe.sourceFile, "fd-probes.mjs", "only the fixed FD fixture is allowed");
      assert.equal(probe.mode, FD_MODES[probe.id], "fixed FD mode required");
      assert.equal(probe.stdout, "FD_PROBE_RESULT=");
      for (const key of ["source", "arguments", "extension"])
        assert(!Object.hasOwn(probe, key), "ambiguous FD fixture: " + key);
    } else if (probe.arguments) {
      assert(!Object.hasOwn(probe, "source"), "ambiguous command");
      assert.deepEqual(probe.arguments, [probe.id === "version" ? "--version" : "--revision"]);
      assert(["version", "revision"].includes(probe.id), "only metadata argument probes are allowed");
    } else {
      assert(typeof probe.source === "string" && Buffer.byteLength(probe.source) <= 8192, "invalid source");
      assert(["js", "ts"].includes(probe.extension ?? "js"), "invalid source extension");
    }
    if (!Object.hasOwn(FD_MODES, probe.id)) {
      assert(!Object.hasOwn(probe, "sourceFile") && !Object.hasOwn(probe, "mode"), "unexpected source fixture");
    }
  }
  return probes;
}

export function materializeProbes(probes) {
  validateProbes(probes);
  const source = readFileSync(requireFile(join(HERE, "fd-probes.mjs")), "utf8").replace(/\r\n/g, "\n");
  const result = probes.map(probe => {
    if (!probe.sourceFile) return { ...probe };
    const inline = "const FD_MODE = " + JSON.stringify(probe.mode) + ";\n" + source;
    // Only this checked-in, source-bound fixture gets 16 KiB. Existing inline
    // probes retain 8 KiB; execution time and output limits are unchanged.
    assert(Buffer.byteLength(inline) <= 16384, "fixed FD fixture exceeds 16 KiB");
    return { ...probe, source: inline };
  });
  assert(Buffer.byteLength(JSON.stringify(result)) <= 131072, "probe asset exceeds reader limit");
  return result;
}

// Independent expected bytecode digest: runtime evidence must identify the
// exact ABI-specific policy, not merely claim that some filter was installed.
export function fdFilterSha256(abi) {
  assert(ABIS.includes(abi));
  const arm = abi === "arm64-v8a";
  const instructions = [
    [0x20, 0, 0, 4], [0x15, 1, 0, arm ? 0xc00000b7 : 0xc000003e], [0x06, 0, 0, 0x80000000],
    [0x20, 0, 0, 0], [0x15, 4, 0, 436], [0x15, 0, 4, arm ? 167 : 157],
    [0x20, 0, 0, 16], [0x15, 1, 0, 0x41554a36], [0x06, 0, 0, 0x7fff0000],
    [0x06, 0, 0, 0x00030000], [0x06, 0, 0, 0x7fff0000],
  ];
  const bytes = Buffer.alloc(instructions.length * 8);
  instructions.forEach(([code, jt, jf, k], i) => {
    bytes.writeUInt16LE(code, i * 8); bytes[i * 8 + 2] = jt; bytes[i * 8 + 3] = jf;
    bytes.writeUInt32LE(k, i * 8 + 4);
  });
  return hash(bytes);
}

export function validateFdEvidence(proof, mode, abi) {
  assert(proof && Object.values(FD_MODES).includes(mode), "FD evidence required");
  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.mode, mode);
  assert.equal(proof.arch, abi === "arm64-v8a" ? "arm64" : "x64");
  assert.equal(proof.passed, true, "FD semantics failed");
  assert(!proof.error, "FD probe error");
  const enosys = call => assert.deepEqual(call, { result: -1, errno: 38 }, "TRAP must become ENOSYS");
  const trapped = trap => { assert(trap, "TRAP proof required"); enosys(trap.marker); enosys(trap.closeRange); };
  assert(Number.isInteger(proof.before?.fd) && proof.before.fd >= 256 && proof.before.fd < 512, "bounded sentinel FD");
  assert.equal(proof.before.open, true);
  assert.equal(proof.before.cloexec, false);
  const call = proof.nativeCloseRange;
  assert(call && ((call.result === 0 && call.errno === 0) ||
    (call.result === -1 && [22, 38].includes(call.errno))), "raw close_range evidence");
  assert.equal(proof.nativeStillOpen, true, "CLOEXEC must not close immediately");
  assert.equal(proof.nativeCloexec, call.result === 0);
  if (mode !== "spawn-native") {
    assert.equal(proof.policy?.installed, true);
    assert.equal(proof.policy.filterSha256, fdFilterSha256(abi), "exact ABI-specific TRAP policy");
    assert.deepEqual(proof.policy.before, { result: -1, errno: 22 }, "pre-filter control must be EINVAL");
    enosys(proof.policy.after);
    trapped(proof.trap);
  } else assert(!proof.policy && !proof.trap, "native control cannot install a test filter");
  if (mode === "startup-trap") {
    assert.deepEqual(proof.startup, { samePid: true, inheritedOpen: true, cloexec: true, sentinelIdentity: true });
    return proof;
  }
  assert.deepEqual(proof.after, { parentOpen: true, parentCloexec: false, sentinelIdentity: true });
  if (mode === "sigsys-listener") {
    assert.equal(proof.listener?.delivered, 1, "ordinary SIGSYS must reach JS exactly once");
    trapped(proof.listener.during); trapped(proof.listener.after);
  } else {
    assert.equal(proof.control?.exitCode, 0, "readlink positive control required");
    assert.equal(proof.control.stderrEmpty, true);
    assert(typeof proof.control.stdoutTarget === "string" && proof.control.stdoutTarget.length <= 128 &&
      /^(?:(?:pipe|socket):\[\d+\]|\/memfd:spawn_stdio_stdout \(deleted\))$/.test(proof.control.stdoutTarget),
    "readlink must observe a real child stdout FD");
    for (const name of ["sync", "async"])
      assert.deepEqual(proof[name], { sentinelAbsent: true, exitCode: 1 }, name + " child inherited sentinel");
    assert.equal(proof.maskRestored, true);
    if (mode === "blocked-sigsys") assert.deepEqual(proof.mask, { childBlocked: true, callerStillBlocked: true });
  }
  return proof;
}

export function validateReceipt(receipt) {
  const evidence = lockedEvidence();
  assert.equal(receipt.schemaVersion, 2);
  assert.equal(receipt.kind, "test-only-application-process-probe");
  assert.equal(receipt.packageName, PACKAGE);
  assert.equal(receipt.runner, RUNNER);
  assert.equal(receipt.testOnly, true);
  assert.equal(receipt.minSdk, 28);
  assert.equal(receipt.targetSdk, 36);
  assert.equal(receipt.variant, evidence.identity.variant);
  assert.equal(receipt.inputEncoding, "utf8-lf");
  assert.deepEqual(receipt.inputs, inputFacts(), "probe source inputs changed; rebuild before running");
  verifySupervisorSource();
  assert.deepEqual(receipt.supervisor, supervisorLock, "supervisor source/toolchain/payload receipt drift");
  assert.deepEqual(receipt.runtimes, Object.fromEntries(evidence.artifacts.map(a =>
    [a.abi, { bytes: a.bytes, sha256: a.sha256 }])), "runtime receipt drift");
  assert.deepEqual(receipt.apks.map(a => a.abi), ABIS, "exact ordered APK inventory required");
  for (const apk of receipt.apks) {
    assert.equal(apk.filename, "bun-api28-probe-" + apk.abi + ".apk", "unsafe APK filename");
    assert(SHA256.test(apk.sha256) && SHA256.test(apk.signing.certificateSha256), "invalid APK digest");
    assert(Number.isSafeInteger(apk.bytes) && apk.bytes > 0, "invalid APK byte count");
    assert.equal(apk.signing.certificateSha256, receipt.apks[0].signing.certificateSha256, "signers differ");
    assert.deepEqual(apk.signing.verifiedSchemes, ["v2"]);
    assert.equal(apk.signing.signerCount, 1);
  }
  return receipt;
}

export function verifyProbeApk(path, apk, runtimes, supervisor) {
  verifySupervisorSource();
  assert.deepEqual(supervisor, supervisorLock, "supervisor binding is required");
  assert.deepEqual(fileFacts(requireFile(path)), { bytes: apk.bytes, sha256: apk.sha256 }, "APK bytes drifted");
  return inspectApkRuntime(path, [apk.abi], new Map(ABIS.map(abi => [abi, {
    binaryBytes: runtimes[abi].bytes, binarySha256: runtimes[abi].sha256,
  }])), supervisorArtifacts);
}

export function validateManifestDump(output) {
  const elements = [], attributes = {};
  let current;
  for (const line of output.split(/\r?\n/)) {
    const element = line.match(/^\s*E: ([\w-]+) /);
    if (element) {
      current = element[1]; elements.push(current);
      assert(!attributes[current], "duplicate manifest element");
      attributes[current] = {};
    } else if (/^\s*A: /.test(line)) {
      const attribute = line.match(/^\s*A: (?:http:\/\/schemas\.android\.com\/apk\/res\/android:)?(\w+)(?:\(0x[0-9a-f]+\))?=(.*)$/);
      assert(attribute && current, "unsupported manifest attribute");
      const [, name, raw] = attribute, value = raw.startsWith('"') ? raw.match(/^"([^"]*)"/)?.[1] : raw;
      assert(!Object.hasOwn(attributes[current], name), "duplicate manifest attribute");
      attributes[current][name] = value;
    }
  }
  assert.deepEqual(elements, ["manifest", "uses-sdk", "uses-permission", "application", "instrumentation"],
    "probe must have no plugin/activity/service/receiver/provider components");
  const allowed = {
    manifest: ["package", "versionCode", "versionName", "compileSdkVersion", "compileSdkVersionCodename",
      "platformBuildVersionCode", "platformBuildVersionName"],
    "uses-sdk": ["minSdkVersion", "targetSdkVersion"], "uses-permission": ["name"],
    application: ["label", "debuggable", "testOnly", "allowBackup", "extractNativeLibs", "usesCleartextTraffic"],
    instrumentation: ["label", "name", "targetPackage"],
  };
  for (const [element, values] of Object.entries(attributes))
    for (const name of Object.keys(values)) assert(allowed[element].includes(name), "unexpected manifest attribute: " + name);
  assert.equal(attributes.manifest.package, PACKAGE);
  assert.equal(attributes.manifest.versionCode, "1");
  assert.equal(attributes.manifest.versionName, "0.0.0-api28-probe");
  assert.deepEqual(attributes["uses-sdk"], { minSdkVersion: "28", targetSdkVersion: "36" });
  assert.deepEqual(attributes["uses-permission"], { name: "android.permission.INTERNET" });
  for (const [name, value] of Object.entries({ debuggable: "false", testOnly: "true", allowBackup: "false",
    extractNativeLibs: "true", usesCleartextTraffic: "true" })) assert.equal(attributes.application[name], value);
  assert.equal(attributes.instrumentation.name, PACKAGE + ".ProbeInstrumentation");
  assert.equal(attributes.instrumentation.targetPackage, PACKAGE);
  return true;
}

export function validateReport(report, { abi, api, pageSize, apk, runtime, supervisor, variant, probes }) {
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.kind, "test-only-application-process-probe");
  assert.equal(report.pluginBinderExercised, false);
  assert.equal(report.variant, variant);
  assert.equal(report.installedApkSha256, apk.sha256);
  assert.equal(report.runtimeSha256, runtime.sha256);
  assert.equal(report.runtimeBytes, runtime.bytes);
  assert.equal(report.installedPayloadVerified, true);
  assert.equal(report.supervisorSha256, supervisor.binarySha256);
  assert.equal(report.supervisorBytes, supervisor.binaryBytes);
  assert.equal(report.installedSupervisorVerified, true);
  assert.equal(report.privateJobRemoved, true);
  assert(!report.environmentError && !report.cleanupError, "probe setup or cleanup failed");
  const env = report.environment;
  assert.equal(env.apiLevel, api);
  assert.equal(env.abi, abi);
  assert.equal(env.pageSizeBytes, pageSize);
  assert.equal(env.kernelMachine, abi === "arm64-v8a" ? "aarch64" : "x86_64", "native execution required");
  assert(!(abi === "x86_64" && pageSize > 4096), "known x86_64 large-page incompatibility");
  assert(Number.isInteger(env.uid) && env.uid >= 10000 && env.uid % 100000 !== 2000, "application UID required");
  assert(/^u:r:untrusted_app(?:_|:)/.test(env.selinuxContext), "application SELinux domain required");
  assert.equal(env.seccomp, 2);
  assert.deepEqual(report.probes.map(p => p.id), probes.map(p => p.id), "missing, duplicate, or reordered results");
  for (let i = 0; i < probes.length; i++) {
    const expected = probes[i], result = report.probes[i];
    assert.equal(result.passed, true, expected.id + " failed");
    assert(!result.error && !result.streamError && !result.evidenceError, expected.id + " stream/process/evidence error");
    assert.equal(result.termination, expected.termination);
    assert.equal(result.outputLimitBytes, expected.outputBytes ?? 16384);
    assert.equal(result.processReaped, true, expected.id + " process not reaped");
    assert.equal(result.workspaceRemoved, true, expected.id + " workspace remains");
    assert(Number.isInteger(result.capturedBytes) && result.capturedBytes >= 0 &&
      result.capturedBytes <= result.outputLimitBytes, "output budget exceeded");
    assert(Number.isInteger(result.elapsedMillis) && result.elapsedMillis >= 0 &&
      result.elapsedMillis < (expected.timeoutMillis ?? 15000) + 4000, "unbounded process lifecycle");
    if (expected.termination === "exited") assert.equal(result.exitCode, 0);
    if (expected.termination !== "exited") {
      assert.equal(result.forciblyTerminated, true, "forcible fallback not exercised");
      assert.equal(result.exitCode, 137, "SIGTERM-ignoring child must exit through SIGKILL");
      for (const field of ["readyObserved", "parentageVerified", "childGone", "supervisorGone"])
        assert.equal(result[field], true, expected.id + " missing " + field);
      for (const field of ["childPid", "supervisorPid"])
        assert(Number.isInteger(result[field]) && result[field] > 1, "invalid observed PID");
      assert.notEqual(result.childPid, result.supervisorPid);
      assert(Number.isInteger(result.readinessMillis) && result.readinessMillis >= 0 &&
        result.readinessMillis < (expected.timeoutMillis ?? 15000), "handler not ready before timeout");
      assert(Number.isInteger(result.terminationToExitMillis) && result.terminationToExitMillis >= 0 &&
        result.terminationToExitMillis < 2000, "unbounded forcible reaping");
      assert(Number.isInteger(result.terminationRequestedAfterReadyMillis) && result.terminationRequestedAfterReadyMillis >= 0,
        "termination preceded handler readiness");
      if (expected.termination === "cancelled") assert(result.terminationRequestedAfterReadyMillis >= 100 &&
        result.terminationRequestedAfterReadyMillis < 2000, "cancellation was not prompt after readiness");
    } else assert.equal(result.forciblyTerminated, false);
    if (expected.termination === "output-limit") assert.equal(result.capturedBytes, result.outputLimitBytes);
    if (expected.termination === "output-limit") assert(result.elapsedMillis < 10000, "unbounded output-limit cleanup");
    for (const channel of ["stdout", "stderr"]) {
      assert(typeof result[channel] === "string" && result[channel].length <= 2059, "unbounded stream summary");
      if (expected[channel]) assert(result[channel].includes(expected[channel]), expected.id + " missing " + channel);
    }
    if (expected.sourceFile) {
      validateFdEvidence(result.fdEvidence, expected.mode, abi);
      const lines = result.stdout.trim().split(/\r?\n/);
      assert.equal(lines.length, 1, "exactly one bounded FD result required");
      assert(lines[0].startsWith("FD_PROBE_RESULT="));
      assert.deepEqual(JSON.parse(lines[0].slice("FD_PROBE_RESULT=".length)), result.fdEvidence, "FD evidence/output drift");
    } else assert(!result.fdEvidence, "unexpected FD evidence");
  }
  assert.equal(report.passed, true);
  return report;
}

export function parsePackageUid(output) {
  const lines = output.trim().split(/\r?\n/);
  assert.equal(lines.length, 1, "exact installed probe UID required");
  const match = lines[0].match(/^package:([^ ]+) uid:(\d+)$/);
  assert(match && match[1] === PACKAGE, "unexpected installed package/UID record");
  const uid = Number(match[2]);
  assert(Number.isSafeInteger(uid) && uid >= 10000 && uid % 100000 !== 2000, "ordinary probe application UID required");
  return uid;
}

export function countUidProcesses(output, uid) {
  assert(Number.isSafeInteger(uid) && uid >= 10000, "application UID required");
  const lines = output.trim().split(/\r?\n/);
  assert.equal(lines.shift().trim().replace(/\s+/g, " "), "UID PID NAME", "unexpected ps columns");
  return lines.filter(line => {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+.+$/);
    assert(match, "unparseable ps entry");
    return Number(match[1]) === uid;
  }).length;
}

export function parseInstrumentation(output) {
  const lines = output.split(/\r?\n/);
  const reports = lines.filter(line => line.startsWith("INSTRUMENTATION_RESULT: report="));
  assert.equal(reports.length, 1, "exactly one instrumentation report required");
  const codes = lines.filter(line => line.startsWith("INSTRUMENTATION_CODE: "));
  assert.deepEqual(codes, ["INSTRUMENTATION_CODE: -1"], "instrumentation did not finish successfully");
  return JSON.parse(reports[0].slice("INSTRUMENTATION_RESULT: report=".length));
}
