import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyApkSignature } from "../../../release/assemble-corresponding-source.mjs";
import { supervisorArtifacts, supervisorLock, verifySupervisorSource, verifySupervisorBytes } from "../../../supervisor/supervisor-common.mjs";
import { ABIS, HERE, ROOT, PACKAGE, RUNNER, SHARED_PROCESS, fileFacts, inputFacts, json, lockedEvidence,
  newOutputDirectory, parseOptions, requireFile, materializeProbes, materializeOpenat2Source, materializeLchmodSource, materializeHardLimitSource, materializeAsyncSignalSource, materializePendingSignalSource, materializeWatchReloadSource, validateReceipt,
  validateManifestDump, verifyProbeApk, verifyRuntimePair } from "./probe-common.mjs";
import { HARD_LIMIT_MODES } from "./hard-limit-evidence.mjs";
import { ASYNC_SIGNAL_MODES } from "./async-signal-evidence.mjs";
import { PENDING_SIGNAL_MODES } from "./pending-signal-evidence.mjs";
import { WATCH_RELOAD_MODES } from "./watch-reload-evidence.mjs";

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 60000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
  assert(!result.error && result.status === 0, (result.error?.message ?? result.stderr ?? "") + "\n" + (result.stdout ?? ""));
  return result.stdout.trim();
}

function classFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? classFiles(join(directory, entry.name)) :
      entry.name.endsWith(".class") ? [join(directory, entry.name)] : []);
}

export function compileProbe({ jdk, sdk, outputDirectory }) {
  const exe = process.platform === "win32" ? ".exe" : "";
  const javac = requireFile(join(jdk, "bin", "javac" + exe));
  const androidJar = requireFile(join(sdk, "platforms", "android-36", "android.jar"));
  run(javac, ["-encoding", "UTF-8", "-source", "8", "-target", "8", "-bootclasspath", androidJar,
    "-d", outputDirectory, join(HERE, "ProbeInstrumentation.java"), join(ROOT, SHARED_PROCESS)]);
  return classFiles(outputDirectory);
}

export function buildProbe(options) {
  const output = newOutputDirectory(options["--output-directory"]);
  const sdk = realpathSync(options["--sdk"]), jdk = realpathSync(options["--jdk"]);
  const buildToolsVersion = options["--build-tools"];
  assert(/^\d+\.\d+\.\d+$/.test(buildToolsVersion), "invalid build-tools version");
  const buildTools = join(sdk, "build-tools", buildToolsVersion);
  const exe = process.platform === "win32" ? ".exe" : "";
  const java = requireFile(join(jdk, "bin", "java" + exe));
  const jar = requireFile(join(jdk, "bin", "jar" + exe));
  const keytool = requireFile(join(jdk, "bin", "keytool" + exe));
  const aapt2 = requireFile(join(buildTools, "aapt2" + exe));
  const zipalign = requireFile(join(buildTools, "zipalign" + exe));
  const apksigner = requireFile(join(buildTools, "lib", "apksigner.jar"));
  const d8 = requireFile(join(buildTools, "lib", "d8.jar"));
  const androidJar = requireFile(join(sdk, "platforms", "android-36", "android.jar"));
  const evidence = lockedEvidence();
  verifySupervisorSource();
  const helpers = ABIS.map(abi => {
    const artifact = supervisorArtifacts.get(abi);
    const path = requireFile(join(ROOT, artifact.binaryPath));
    verifySupervisorBytes(readFileSync(path), artifact);
    return path;
  });
  const probes = materializeProbes(json(join(HERE, "probes.json")));
  const sources = evidence.artifacts.map((artifact, index) => verifyRuntimePair(
    options[index === 0 ? "--arm64" : "--x86"], options[index === 0 ? "--repeat-arm64" : "--repeat-x86"], artifact));
  const receipt = {
    schemaVersion: 2, kind: "test-only-application-process-probe", packageName: PACKAGE, runner: RUNNER,
    testOnly: true, minSdk: 28, targetSdk: 36, variant: evidence.identity.variant,
    inputEncoding: "utf8-lf", inputs: inputFacts(), supervisor: supervisorLock,
    runtimes: Object.fromEntries(evidence.artifacts.map(a => [a.abi, { bytes: a.bytes, sha256: a.sha256 }])),
    tools: { buildToolsVersion, androidJar: fileFacts(androidJar),
      javacVersion: run(requireFile(join(jdk, "bin", "javac" + exe)), ["--version"]),
      aapt2Version: run(aapt2, ["version"]), d8: fileFacts(d8), apksigner: fileFacts(apksigner) },
    apks: [],
  };
  const staging = realpathSync(mkdtempSync(join(tmpdir(), "bun-api28-apk-")));
  try {
    for (const folder of ["classes", "dex", "assets"]) mkdirSync(join(staging, folder));
    const classes = compileProbe({ jdk, sdk, outputDirectory: join(staging, "classes") });
    run(java, ["-cp", d8, "com.android.tools.r8.D8", "--min-api", "28", "--lib", androidJar,
      "--output", join(staging, "dex"), ...classes]);
    writeFileSync(join(staging, "assets", "probes.json"), JSON.stringify(probes));
    writeFileSync(join(staging, "assets", "openat2-probes.mjs"), materializeOpenat2Source());
    writeFileSync(join(staging, "assets", "lchmod-probes.mjs"), materializeLchmodSource());
    for (const mode of Object.values(HARD_LIMIT_MODES))
      writeFileSync(join(staging, "assets", "hard-limit-" + mode + ".mjs"), materializeHardLimitSource(mode));
    for (const mode of Object.values(ASYNC_SIGNAL_MODES))
      writeFileSync(join(staging, "assets", "async-signal-" + mode + ".mjs"), materializeAsyncSignalSource(mode));
    for (const mode of Object.values(PENDING_SIGNAL_MODES))
      writeFileSync(join(staging, "assets", "pending-signal-" + mode + ".mjs"), materializePendingSignalSource(mode));
    for (const mode of Object.values(WATCH_RELOAD_MODES))
      writeFileSync(join(staging, "assets", "watch-reload-" + mode + ".mjs"), materializeWatchReloadSource(mode));
    writeFileSync(join(staging, "assets", "build-facts.json"), JSON.stringify(receipt));
    for (const filename of ["BUN-LICENSE.md", "WEBKIT-JAVASCRIPTCORE-COPYING.LIB",
      "WEBKIT-WEBCORE-LICENSE-LGPL-2", "WEBKIT-WEBCORE-LICENSE-LGPL-2.1", "WEBKIT-WEBCORE-LICENSE-APPLE"]) {
      copyFileSync(join(ROOT, "app/src/main/assets/doc/licenses", filename), join(staging, "assets", filename));
    }
    copyFileSync(join(ROOT, "LICENSE"), join(staging, "assets", "PROJECT-LICENSE.txt"));
    // Ephemeral testing identity only. Never reads the project's release signing configuration.
    const keystore = join(staging, "probe-test-only.p12"), password = "test-only-not-release";
    run(keytool, ["-genkeypair", "-keystore", keystore, "-storetype", "PKCS12", "-alias", "probe",
      "-storepass", password, "-keypass", password, "-keyalg", "RSA", "-keysize", "2048",
      "-validity", "30", "-dname", "CN=Local Test Only, O=AutoJs6 Runtime Probe"]);
    for (let i = 0; i < ABIS.length; i++) {
      const abi = ABIS[i], stage = join(staging, abi);
      mkdirSync(join(stage, "lib", abi), { recursive: true });
      copyFileSync(sources[i], join(stage, "lib", abi, "libbun_exec.so"));
      copyFileSync(helpers[i], join(stage, "lib", abi, "libbun_supervisor.so"));
      const unsigned = join(stage, "unsigned.apk"), aligned = join(stage, "aligned.apk");
      run(aapt2, ["link", "--manifest", join(HERE, "AndroidManifest.xml"), "--min-sdk-version", "28",
        "--target-sdk-version", "36", "--version-code", "1", "--version-name", "0.0.0-api28-probe",
        "-I", androidJar, "-A", join(staging, "assets"), "-o", unsigned]);
      run(jar, ["--update", "--file", unsigned, "--no-manifest",
        "-C", join(staging, "dex"), "classes.dex", "-C", stage, "lib"]);
      run(zipalign, ["-P", "16", "4", unsigned, aligned]);
      const filename = "bun-api28-probe-" + abi + ".apk", apkPath = join(staging, filename);
      run(java, ["-jar", apksigner, "sign", "--ks", keystore, "--ks-key-alias", "probe",
        "--ks-pass", "pass:" + password, "--key-pass", "pass:" + password,
        "--v1-signing-enabled", "false", "--v2-signing-enabled", "true",
        "--v3-signing-enabled", "false", "--v4-signing-enabled", "false",
        "--out", apkPath, aligned]);
      run(zipalign, ["-c", "-P", "16", "4", apkPath]);
      validateManifestDump(run(aapt2, ["dump", "xmltree", "--file", "AndroidManifest.xml", apkPath]));
      const apk = { abi, filename, ...fileFacts(apkPath), signing: verifyApkSignature(apkPath, java, apksigner) };
      verifyProbeApk(apkPath, apk, receipt.runtimes, receipt.supervisor);
      receipt.apks.push(apk);
      console.log("Verified test-only APK: " + abi + " " + apk.sha256);
    }
    validateReceipt(receipt);
    mkdirSync(output); // Must still be absent: concurrent runs may not overwrite it.
    for (const apk of receipt.apks) copyFileSync(join(staging, apk.filename), join(output, apk.filename));
    writeFileSync(join(output, "probe-build.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
    return receipt;
  } finally {
    // Delete only this invocation's resolved mkdtemp child, never an input or output directory.
    const parent = realpathSync(tmpdir()) + sep;
    assert(staging.startsWith(parent + "bun-api28-apk-") && realpathSync(staging) === staging);
    rmSync(staging, { recursive: true, force: false });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const options = parseOptions(process.argv.slice(2), ["--sdk", "--jdk", "--build-tools",
      "--arm64", "--x86", "--repeat-arm64", "--repeat-x86", "--output-directory"]);
    buildProbe(options);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
