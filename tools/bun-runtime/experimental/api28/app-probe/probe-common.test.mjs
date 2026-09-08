import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { supervisorLock } from "../../../supervisor/supervisor-common.mjs";
import { ABIS, HERE, ROOT, PACKAGE, RUNNER, SHARED_PROCESS, inputFacts, json, lockedEvidence, newOutputDirectory,
  outsideRepository, parseInstrumentation, parseOptions, validateManifestDump, validateProbes, validateReceipt, validateReport,
  parsePackageUid, countUidProcesses } from "./probe-common.mjs";

const probes = json(join(HERE, "probes.json"));
const evidence = lockedEvidence();
function receipt() {
  return {
    schemaVersion: 2, kind: "test-only-application-process-probe", packageName: PACKAGE, runner: RUNNER,
    testOnly: true, minSdk: 28, targetSdk: 36, variant: evidence.identity.variant, inputs: inputFacts(),
    inputEncoding: "utf8-lf", supervisor: structuredClone(supervisorLock),
    runtimes: Object.fromEntries(evidence.artifacts.map(a => [a.abi, { bytes: a.bytes, sha256: a.sha256 }])),
    apks: ABIS.map(abi => ({ abi, filename: "bun-api28-probe-" + abi + ".apk", bytes: 10,
      sha256: "a".repeat(64), signing: { certificateSha256: "b".repeat(64), verifiedSchemes: ["v2"], signerCount: 1 } })),
  };
}
function fixture() {
  const build = receipt();
  const options = { abi: "arm64-v8a", api: 28, pageSize: 4096, apk: build.apks[0],
    runtime: build.runtimes["arm64-v8a"], supervisor: supervisorLock.artifacts[0], variant: build.variant, probes };
  return { options, report: {
    schemaVersion: 2, kind: build.kind, pluginBinderExercised: false, variant: build.variant,
    installedApkSha256: options.apk.sha256, runtimeSha256: options.runtime.sha256,
    runtimeBytes: options.runtime.bytes, installedPayloadVerified: true, passed: true,
    supervisorSha256: options.supervisor.binarySha256, supervisorBytes: options.supervisor.binaryBytes,
    installedSupervisorVerified: true, privateJobRemoved: true,
    environment: { apiLevel: 28, abi: "arm64-v8a", pageSizeBytes: 4096, kernelMachine: "aarch64",
      uid: 10001, selinuxContext: "u:r:untrusted_app:s0:c1,c2", seccomp: 2 },
    probes: probes.map(probe => ({ id: probe.id, passed: true, termination: probe.termination,
      exitCode: probe.termination === "exited" ? 0 : 137, forciblyTerminated: probe.termination !== "exited",
      outputLimitBytes: probe.outputBytes ?? 16384, capturedBytes: probe.outputBytes ?? 64,
      processReaped: true, workspaceRemoved: true,
      elapsedMillis: 2000, stdout: probe.stdout ?? "bounded output", stderr: probe.stderr ?? "",
      ...(probe.requiresReady ? { readyObserved: true, parentageVerified: true, childGone: true, supervisorGone: true,
        childPid: 1001, supervisorPid: 1002, readinessMillis: 200, terminationToExitMillis: 250,
        terminationRequestedAfterReadyMillis: 200 } : {}) })),
  } };
}

test("checked-in probe definitions have bounded commands and unique safe paths", () => validateProbes(probes));
test("probe definitions reject traversal, duplication, arbitrary arguments, and unbounded work", () => {
  for (const change of [
    p => { p[0].id = "../escape"; }, p => { p[1].id = p[0].id; },
    p => { p[0].arguments = ["run", "arbitrary"]; }, p => { p[2].extension = "../js"; },
    p => { p[2].timeoutMillis = 600000; }, p => { p[2].outputBytes = 1000000; },
    p => { p[2].source = "x".repeat(8193); }, p => { p.pop(); },
    p => { p[9].requiresReady = false; }, p => { p[9].source = "setInterval(()=>{},1000);"; },
    p => { p[10].termination = "exited"; }, p => { p[11].cancelAfterReadyMillis = 10000; },
    p => { p[9].timeoutMillis = 15000; }, p => { p[10].outputBytes = 16384; },
  ]) {
    const changed = structuredClone(probes); change(changed);
    assert.throws(() => validateProbes(changed));
  }
});
test("CLI rejects absent, duplicate, unknown and valueless arguments", () => {
  assert.deepEqual(parseOptions(["--serial", "a"], ["--serial"]), { "--serial": "a" });
  for (const args of [[], ["--serial"], ["--serial", "--bad"], ["--bad", "x"],
    ["--serial", "a", "--serial", "b"]]) assert.throws(() => parseOptions(args, ["--serial"]));
});
test("outputs cannot overwrite a directory or target the repository/ancestors", () => {
  for (const path of [ROOT, join(ROOT, "app"), join(ROOT, "..")]) assert.throws(() => outsideRepository(path));
  const temp = mkdtempSync(join(tmpdir(), "bun-api28-probe-test-"));
  try {
    assert.throws(() => newOutputDirectory(temp));
    assert.throws(() => newOutputDirectory("relative-path"));
    assert.equal(newOutputDirectory(join(temp, "new")), join(temp, "new"));
  } finally { rmSync(temp, { recursive: true }); }
});
test("build receipts bind current probe inputs, exact runtime hashes and APK inventory", () => validateReceipt(receipt()));
test("receipts reject production identity, source drift, paths and ABI/hash drift", () => {
  for (const change of [
    r => { r.packageName = "io.github.supermonster003.autojs6.plugin.bun.runtime"; },
    r => { r.testOnly = false; }, r => { r.minSdk = 27; }, r => { r.inputs[0].sha256 = "0".repeat(64); },
    r => { r.apks[0].filename = "../escape.apk"; }, r => { r.apks.reverse(); },
    r => { r.runtimes["arm64-v8a"].sha256 = "0".repeat(64); },
    r => { r.apks[1].signing.certificateSha256 = "c".repeat(64); },
    r => { r.schemaVersion = 1; }, r => { delete r.supervisor; },
    r => { r.supervisor.sourceSha256 = "0".repeat(64); }, r => { r.supervisor.ndkVersion = "27.2.12479018"; },
    r => { r.supervisor.artifacts[0].binarySha256 = "0".repeat(64); },
    r => { r.inputs = r.inputs.filter(input => input.path !== SHARED_PROCESS); },
    r => { r.apks[0].signing.verifiedSchemes = []; }, r => { r.inputEncoding = "raw"; },
  ]) {
    const changed = receipt(); change(changed); assert.throws(() => validateReceipt(changed));
  }
});
test("a complete application-process report validates without implying Binder support", () => {
  const { report, options } = fixture(); assert.equal(validateReport(report, options), report);
});
test("shell/root, missing seccomp, translated ABIs and device mismatches cannot pass", () => {
  for (const change of [
    r => { r.environment.uid = 0; }, r => { r.environment.uid = 2000; },
    r => { r.environment.uid = 102000; }, r => { r.environment.seccomp = 0; },
    r => { r.environment.selinuxContext = "u:r:shell:s0"; },
    r => { r.environment.kernelMachine = "x86_64"; }, r => { r.environment.apiLevel = 31; },
    r => { r.environment.pageSizeBytes = 16384; }, r => { r.pluginBinderExercised = true; },
  ]) {
    const { report, options } = fixture(); change(report);
    assert.throws(() => validateReport(report, options));
  }
});
test("reported success cannot hide missing probes, wrong bytes, output leaks or process failure", () => {
  for (const change of [
    r => { r.probes.pop(); }, r => { r.probes[1] = r.probes[0]; },
    r => { r.probes[0].exitCode = 159; }, r => { r.probes[0].passed = false; },
    r => { r.probes[0].stdout = ""; }, r => { r.probes[0].stderr = "x".repeat(3000); },
    r => { r.probes[0].capturedBytes = 16385; }, r => { r.probes[0].elapsedMillis = 60000; },
    r => { r.probes[9].forciblyTerminated = false; }, r => { r.cleanupError = "leaked job"; },
    r => { r.installedApkSha256 = "c".repeat(64); }, r => { r.installedPayloadVerified = false; },
    r => { r.installedSupervisorVerified = false; }, r => { r.supervisorSha256 = "0".repeat(64); },
    r => { r.supervisorBytes++; }, r => { r.schemaVersion = 1; }, r => { r.privateJobRemoved = false; },
    r => { r.probes[0].processReaped = false; }, r => { r.probes[0].workspaceRemoved = false; },
    r => { r.probes[9].readyObserved = false; }, r => { r.probes[9].parentageVerified = false; },
    r => { r.probes[9].childGone = false; }, r => { r.probes[9].supervisorGone = false; },
    r => { r.probes[9].exitCode = 143; }, r => { r.probes[9].childPid = r.probes[9].supervisorPid; },
    r => { r.probes[9].readinessMillis = 1600; }, r => { r.probes[10].terminationToExitMillis = 2000; },
    r => { r.probes[10].capturedBytes = 0; }, r => { r.probes[10].elapsedMillis = 10000; },
    r => { r.probes[11].terminationRequestedAfterReadyMillis = 0; },
    r => { r.probes[11].terminationRequestedAfterReadyMillis = 2000; },
  ]) {
    const { report, options } = fixture(); change(report);
    assert.throws(() => validateReport(report, options));
  }
});

test("cleanup checks an exact package UID and all its processes, not only the package name", () => {
  assert.equal(parsePackageUid("package:" + PACKAGE + " uid:10123\r\n"), 10123);
  for (const output of ["", "package:another.app uid:10123", "package:" + PACKAGE + " uid:2000",
    "package:" + PACKAGE + " uid:10123\npackage:another.app uid:10124"])
    assert.throws(() => parsePackageUid(output));
  assert.equal(countUidProcesses(" UID PID NAME\n0 1 init\n10123 22 libbun_exec.so\n10123 21 libbun_supervisor.so\n10124 23 other", 10123), 2);
  assert.equal(countUidProcesses(" UID PID NAME\n0 1 init\n10124 23 other", 10123), 0);
  for (const output of ["", "USER PID NAME\nu0_a123 22 bun", "UID PID NAME\ntruncated"])
    assert.throws(() => countUidProcesses(output, 10123));
});
test("instrumentation requires exactly one report and the success terminal code", () => {
  const output = "INSTRUMENTATION_RESULT: report={\"passed\":true}\r\nINSTRUMENTATION_CODE: -1\r\n";
  assert.deepEqual(parseInstrumentation(output), { passed: true });
  for (const value of ["", output + output, output.replace("-1", "0"), output.replace("{", "invalid{")])
    assert.throws(() => parseInstrumentation(value));
});

test("packaged manifest gates enforce isolation, test-only signing use and native extraction", () => {
  const sections = {
    manifest: { package: PACKAGE, versionCode: "1", versionName: "0.0.0-api28-probe" },
    "uses-sdk": { minSdkVersion: "28", targetSdkVersion: "36" },
    "uses-permission": { name: "android.permission.INTERNET" },
    application: { debuggable: "false", testOnly: "true", allowBackup: "false",
      extractNativeLibs: "true", usesCleartextTraffic: "true" },
    instrumentation: { name: PACKAGE + ".ProbeInstrumentation", targetPackage: PACKAGE },
  };
  const dump = Object.entries(sections).map(([name, attributes]) => "  E: " + name + " (line=1)\n" +
    Object.entries(attributes).map(([key, value]) => "    A: " + key + "=" + value).join("\n")).join("\n");
  assert.equal(validateManifestDump(dump), true);
  for (const value of [
    dump.replace("testOnly=true", "testOnly=false"),
    dump.replace("extractNativeLibs=true", "extractNativeLibs=false"),
    dump.replace("minSdkVersion=28", "minSdkVersion=27"),
    dump.replace("targetPackage=" + PACKAGE, "targetPackage=another.app"),
    dump + "\n  E: service (line=1)",
    dump + "\n    A: sharedUserId=android.uid.system",
    dump.replace("package=" + PACKAGE, "package=another.app"),
  ]) assert.throws(() => validateManifestDump(value));
});
