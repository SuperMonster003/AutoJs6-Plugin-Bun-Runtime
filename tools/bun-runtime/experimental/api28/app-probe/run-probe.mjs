import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyApkSignature } from "../../../release/assemble-corresponding-source.mjs";
import { HERE, PACKAGE, RUNNER, ABIS, json, newOutputDirectory, parseOptions, requireFile,
  validateProbes, validateReceipt, validateManifestDump, verifyProbeApk, parseInstrumentation, validateReport,
  parsePackageUid, countUidProcesses } from "./probe-common.mjs";

function command(executable, args, timeout = 60000) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", bytes = 0, error;
    const timer = setTimeout(() => { error = new Error("bounded adb command timed out"); child.kill(); }, timeout);
    const collect = (channel, chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 1024 * 1024) { error = new Error("bounded adb output exceeded"); child.kill(); return; }
      if (channel === "stdout") stdout += chunk;
      else stderr += chunk;
    };
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", data => collect("stdout", data));
    child.stderr.on("data", data => collect("stderr", data));
    child.on("error", caught => { clearTimeout(timer); reject(caught); });
    child.on("close", status => {
      clearTimeout(timer);
      if (error) reject(error); else resolveResult({ status, stdout, stderr });
    });
  });
}

export async function runProbe(options) {
  const adb = requireFile(options["--adb"]), serial = options["--serial"], abi = options["--abi"];
  assert(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(serial), "invalid explicit device serial");
  assert(ABIS.includes(abi), "unsupported ABI");
  assert(/^\d+$/.test(options["--required-api"]) && /^\d+$/.test(options["--required-page-size"]), "invalid numeric gate");
  const api = Number(options["--required-api"]), pageSize = Number(options["--required-page-size"]);
  assert(api >= 28 && api <= 100, "API 28 or later required");
  assert([4096, 16384].includes(pageSize), "an explicit 4096/16384 page size is required");
  assert(!(abi === "x86_64" && pageSize > 4096), "locked x86_64 JSC cannot run on 16 KiB pages");
  const receiptPath = requireFile(join(options["--apk-directory"], "probe-build.json"));
  const receipt = validateReceipt(json(receiptPath));
  const probes = validateProbes(json(join(HERE, "probes.json")));
  const apk = receipt.apks.find(item => item.abi === abi);
  const apkPath = requireFile(join(options["--apk-directory"], apk.filename));
  verifyProbeApk(apkPath, apk, receipt.runtimes, receipt.supervisor);
  const supervisor = receipt.supervisor.artifacts.find(item => item.abi === abi);
  assert(/^\d+\.\d+\.\d+$/.test(options["--build-tools"]), "invalid build-tools version");
  const exe = process.platform === "win32" ? ".exe" : "";
  const buildTools = join(options["--sdk"], "build-tools", options["--build-tools"]);
  const aapt2 = requireFile(join(buildTools, "aapt2" + exe));
  const java = requireFile(join(options["--jdk"], "bin", "java" + exe));
  assert.deepEqual(verifyApkSignature(apkPath, java, requireFile(join(buildTools, "lib", "apksigner.jar"))),
    apk.signing, "APK signer changed");
  const manifest = await command(aapt2, ["dump", "xmltree", "--file", "AndroidManifest.xml", apkPath]);
  assert.equal(manifest.status, 0, "cannot inspect actual packaged manifest");
  validateManifestDump(manifest.stdout);
  const aligned = await command(requireFile(join(buildTools, "zipalign" + exe)), ["-c", "-P", "16", "4", apkPath]);
  assert.equal(aligned.status, 0, "APK ZIP alignment failed");
  const output = newOutputDirectory(options["--output-directory"]);
  const adbCall = (...args) => command(adb, ["-s", serial, ...args]);
  const checked = async (...args) => {
    const result = await adbCall(...args);
    assert.equal(result.status, 0, result.stderr || result.stdout || "adb failed");
    return result.stdout.trim();
  };
  assert.equal(await checked("get-state"), "device");
  assert.equal(Number(await checked("shell", "getprop", "ro.build.version.sdk")), api, "device API mismatch");
  assert.equal(await checked("shell", "getprop", "ro.product.cpu.abi"), abi, "native primary ABI mismatch");
  const existing = await adbCall("shell", "pm", "path", PACKAGE);
  assert((existing.status === 0 || existing.status === 1) && !existing.stdout.trim() && !existing.stderr.trim(),
    "refusing to replace a pre-existing probe package, or package preflight failed");
  mkdirSync(output);
  const result = {
    schemaVersion: 2, kind: "test-only-application-process-probe-runs", capturedAt: new Date().toISOString(),
    pluginBinderExercised: false, distributionReady: false, build: receipt, runs: [],
    lifecycle: { installedByThisRun: false, forceStopVerified: false, rounds: [], uninstalled: false }, passed: false,
  };
  let installed = false;
  let installedUid;
  const uidProcessCount = async () => countUidProcesses(await checked("shell", "ps", "-A", "-o", "UID,PID,NAME"), installedUid);
  try {
    console.log("Installing isolated test-only probe for API " + api + " " + abi);
    const install = await checked("install", "-t", apkPath);
    assert(install.includes("Success"), "installation did not report success");
    installed = true; result.lifecycle.installedByThisRun = true;
    installedUid = parsePackageUid(await checked("shell", "pm", "list", "packages", "-U", PACKAGE));
    result.lifecycle.installedUid = installedUid;
    for (let index = 0; index < 2; index++) {
      const instrument = await command(adb, ["-s", serial, "shell", "am", "instrument", "-w", "-r",
        "-e", "expectedAbi", abi, "-e", "requiredApiLevel", String(api),
        "-e", "requiredPageSizeBytes", String(pageSize), "-e", "requiredApkSha256", apk.sha256, RUNNER],
      30000 + probes.reduce((total, probe) => total + (probe.timeoutMillis ?? 15000) + 4000, 0));
      writeFileSync(join(output, "instrumentation-" + (index + 1) + ".txt"),
        instrument.stdout + instrument.stderr, { flag: "wx" });
      // Preserve failed reports too; success validation below must not discard diagnostics.
      const line = instrument.stdout.split(/\r?\n/).find(text => text.startsWith("INSTRUMENTATION_RESULT: report="));
      assert(line, "instrumentation produced no machine-readable report");
      const report = JSON.parse(line.slice("INSTRUMENTATION_RESULT: report=".length));
      result.runs.push(report);
      try {
        assert.equal(instrument.status, 0, "adb instrumentation failed");
        validateReport(report, { abi, api, pageSize, apk, runtime: receipt.runtimes[abi], supervisor, variant: receipt.variant, probes });
        assert.equal(report.environment.uid, installedUid, "instrumentation UID differs from installed package");
        parseInstrumentation(instrument.stdout);
      } catch (error) {
        (result.validationErrors ??= []).push("Round " + (index + 1) + ": " + error.message);
      }
      console.log("Application process round " + (index + 1) + ": " +
        report.probes.filter(probe => probe.passed).length + "/" + probes.length + " passed");
      await checked("shell", "am", "force-stop", PACKAGE);
      const pids = await adbCall("shell", "pidof", PACKAGE);
      assert(pids.status === 1 && !pids.stdout.trim() && !pids.stderr.trim(), "probe PID survived force-stop");
      const count = await uidProcessCount();
      result.lifecycle.rounds.push({ round: index + 1, packageProcessAbsent: true, uidProcessCount: count });
      assert.equal(count, 0, "probe UID has surviving child processes after force-stop");
      result.lifecycle.forceStopVerified = true;
    }
    result.passed = !result.validationErrors;
    if (!result.passed) result.error = result.validationErrors.join("; ");
  } catch (error) {
    result.error = error.message;
  } finally {
    if (installed) {
      try {
        await checked("shell", "am", "force-stop", PACKAGE);
        assert((await checked("uninstall", PACKAGE)).includes("Success"), "probe uninstall failed");
        const remaining = await adbCall("shell", "pm", "path", PACKAGE);
        assert((remaining.status === 0 || remaining.status === 1) && !remaining.stdout.trim() && !remaining.stderr.trim(),
          "probe package remains after uninstall");
        result.lifecycle.uninstalled = true;
        if (installedUid !== undefined) {
          result.lifecycle.finalUidProcessCount = await uidProcessCount();
          assert.equal(result.lifecycle.finalUidProcessCount, 0, "probe UID processes remain after uninstall");
        }
      } catch (error) { result.passed = false; result.cleanupError = error.message; }
    }
    writeFileSync(join(output, "probe-result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  }
  assert(result.passed, "Probe failed; diagnostics retained in " + output + ": " + (result.error ?? result.cleanupError));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await runProbe(parseOptions(process.argv.slice(2), ["--adb", "--serial", "--abi", "--required-api",
      "--required-page-size", "--apk-directory", "--output-directory", "--sdk", "--jdk", "--build-tools"]));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
