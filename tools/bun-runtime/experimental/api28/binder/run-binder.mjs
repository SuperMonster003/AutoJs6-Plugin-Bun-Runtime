import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectApkRuntime, readBoundedApkEntry } from "../../../verify-apk-runtime.mjs";
import { supervisorArtifacts } from "../../../supervisor/supervisor-common.mjs";
import { countUidProcesses } from "../app-probe/probe-common.mjs";
import { PACKAGE, TEST_PACKAGE, TEST_CLASS, facts, buildInputs, parseBinderUid, validateDevice, validateInstrumentation } from "./binder-common.mjs";
import { loadJscCandidate } from "../../webkit-x86_64-16k/jsc-common.mjs";
import { parseApkSignerOutput } from "../../../release/assemble-corresponding-source.mjs";
import { KIND, MODES, PRESSURE_CLASS, PRESSURE_TEST, validatePressureInstrumentation } from "../../webkit-x86_64-16k/pressure/pressure-common.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {
    assert(args[i].startsWith("--") && args[i + 1] && !options[args[i]], "Invalid or duplicate argument");
    options[args[i]] = args[i + 1];
}
assert(!options["--profile"] || options["--profile"] === "jsc16k");
const jsc = options["--profile"] ? loadJscCandidate() : null;
const pressure = options["--suite"] === "jsc-pressure";
assert(!options["--suite"] || (pressure && jsc), "Pressure suite requires the explicit jsc16k profile");
const pkg = PACKAGE + (jsc ? ".jsc16k" : ""), testPkg = pkg + ".test";
assert.deepEqual(Object.keys(options).sort(), ["--abi", "--api", "--output", "--pages", "--sdk", "--serial", ...(jsc ? ["--profile"] : []), ...(pressure ? ["--suite"] : [])].sort());
const expected = { abi: options["--abi"], api: Number(options["--api"]), pages: Number(options["--pages"]) };
assert(["arm64-v8a", "x86_64"].includes(expected.abi));
assert(Number.isInteger(expected.api) && expected.api >= 28 && expected.api <= 100);
assert([4096, 16384].includes(expected.pages));
assert(expected.abi !== "x86_64" || expected.pages === 4096 || jsc, "Original experimental x86_64 JSC remains limited to 4 KiB");
assert(!jsc || expected.abi === "x86_64");
assert(!pressure || expected.api === 36, "Pressure acceptance is scoped to API 36 native x86_64");
const serial = options["--serial"];
assert(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(serial));
const exe = process.platform === "win32" ? ".exe" : "";
const adb = join(options["--sdk"], "platform-tools", "adb" + exe);
const aapt = join(options["--sdk"], "build-tools/36.0.0/aapt2" + exe);
const zipalign = join(options["--sdk"], "build-tools/36.0.0/zipalign" + exe);
const buildRoot = resolve(here, `../../../../../build/experimental-binder${jsc ? "-jsc16k" : ""}`);
const apk = join(buildRoot, `outputs/apk/debug/experimental-binder-${expected.abi}-debug.apk`);
const testApk = join(buildRoot, "outputs/apk/androidTest/debug/experimental-binder-debug-androidTest.apk");
const evidence = JSON.parse(readFileSync(join(here, "../runtime-evidence.json"), "utf8"));
if (jsc) {
    evidence.artifacts = evidence.artifacts.map(a => a.abi === "x86_64" ? jsc.artifact : a);
    evidence.identity.variant = jsc.variant;
}
const artifacts = new Map(evidence.artifacts.map(a => [a.abi, { binaryBytes: a.bytes, binarySha256: a.sha256 }]));
const payloads = inspectApkRuntime(apk, [expected.abi], artifacts, supervisorArtifacts);
const build = JSON.parse(readBoundedApkEntry(apk, "assets/binder-build.json").toString("utf8"));
assert.deepEqual(build.inputs, buildInputs(), "Compiled plugin/test inputs changed; rebuild the APKs");
assert.deepEqual(build.source, evidence.source);
assert.deepEqual(build.jscCandidate, jsc);
const output = resolve(options["--output"]);
mkdirSync(output); // Refuse to overwrite a previous report, including a failure.
const report = { schemaVersion: 1, kind: pressure ? KIND : "experimental-plugin-binder", capturedAt: new Date().toISOString(),
    serial, expected, package: pkg, runtime: evidence.identity, apk: facts(apk), testApk: facts(testApk),
    build, payloads, rounds: [], cleanup: [], passed: false, distributionReady: false };

async function command(command, args, timeout = 60000) {
    return await new Promise((done, fail) => {
        const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "", stderr = "", bytes = 0, error;
        const timer = setTimeout(() => { error = new Error(`Command timed out after ${timeout} ms: ${command} ${JSON.stringify(args)}`); child.kill(); }, timeout);
        for (const [name, stream] of [["stdout", child.stdout], ["stderr", child.stderr]]) {
            stream.setEncoding("utf8");
            stream.on("data", chunk => {
                bytes += Buffer.byteLength(chunk);
                if (bytes > 2 * 1024 * 1024) { error = new Error("Command output exceeded bound"); child.kill(); }
                else if (name === "stdout") stdout += chunk; else stderr += chunk;
            });
        }
        child.on("error", error => { clearTimeout(timer); fail(error); });
        child.on("close", status => {
            clearTimeout(timer);
            if (error) {
                error.commandDiagnostic = { command, args, status, stdout, stderr };
                fail(error);
            } else done({ status, stdout, stderr });
        });
    });
}
const call = (...args) => command(adb, ["-s", serial, ...args]);
async function checked(...args) {
    const result = await call(...args);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout.trim();
}
async function actualPageSize() {
    const result = await call("shell", "getconf", "PAGE_SIZE");
    if (result.status === 0) return { value: result.stdout.trim(), source: "getconf PAGE_SIZE" };
    assert.equal(result.status, 127, "Unexpected getconf failure");
    const smaps = await checked("shell", "cat", "/proc/self/smaps");
    const sizes = [...new Set([...smaps.matchAll(/^KernelPageSize:\s+(\d+) kB\r?$/gm)].map(m => Number(m[1]) * 1024))];
    assert.equal(sizes.length, 1, "Ambiguous process page size");
    assert([4096, 16384].includes(sizes[0]));
    return { value: String(sizes[0]), source: "/proc/self/smaps KernelPageSize (getconf unavailable); instrumentation also asserts Os.sysconf" };
}
const installed = [];
try {
    const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, "bin", "java" + exe) : "java";
    const signer = join(options["--sdk"], "build-tools/36.0.0/lib/apksigner.jar");
    report.signatures = [];
    for (const path of [apk, testApk]) {
        const signed = await command(java, ["-jar", signer, "verify", "--verbose", "--print-certs", path]);
        assert.equal(signed.status, 0, signed.stderr);
        report.signatures.push(parseApkSignerOutput(signed.stdout, path));
    }
    assert.equal(report.signatures[0].certificateSha256, report.signatures[1].certificateSha256);
    const manifest = await command(aapt, ["dump", "xmltree", "--file", "AndroidManifest.xml", apk]);
    assert.equal(manifest.status, 0);
    assert(manifest.stdout.includes(`package="${pkg}"`));
    assert.match(manifest.stdout, /testOnly\(0x01010272\)=true\r?$/m);
    assert.match(manifest.stdout, /minSdkVersion\(0x0101020c\)=28\r?$/m);
    report.manifest = manifest.stdout;
    assert.equal((await command(zipalign, ["-c", "-P", "16", "4", apk])).status, 0);
    assert.equal(await checked("get-state"), "device");
    const page = await actualPageSize();
    report.device = {
        model: await checked("shell", "getprop", "ro.product.model"),
        api: await checked("shell", "getprop", "ro.build.version.sdk"),
        abi: await checked("shell", "getprop", "ro.product.cpu.abi"),
        pages: page.value, pageSizeSource: page.source,
        bridge: await checked("shell", "getprop", "ro.dalvik.vm.native.bridge"),
        machine: await checked("shell", "uname", "-m"),
        kernel: await checked("shell", "uname", "-r"),
        fingerprint: await checked("shell", "getprop", "ro.build.fingerprint"),
    };
    validateDevice(report.device, expected);
    for (const target of [pkg, testPkg]) {
        const found = await call("shell", "pm", "path", target);
        assert([0, 1].includes(found.status) && !found.stdout.trim() && !found.stderr.trim(), "Refusing to replace an existing package: " + target);
    }
    for (const [pkg, path] of [[report.package, apk], [testPkg, testApk]]) {
        // The package manager may finish after the adb client times out. Own
        // the attempt before starting it so the finally block still cleans it.
        // Both exact packages were proven absent above; never replace user apps.
        installed.push(pkg);
        assert.match(await checked("install", "-t", path), /Success/);
        if (pkg === report.package) report.uid = parseBinderUid(await checked("shell", "pm", "list", "packages", "-U", pkg), pkg);
    }
    const uid = report.uid;
    // Verify the installed APK itself, not merely the local input archive.
    const installedPath = (await checked("shell", "pm", "path", pkg)).replace(/^package:/, "");
    assert(/^\/data\/app\/[A-Za-z0-9_+./=~-]+\/base\.apk$/.test(installedPath));
    report.installedApkSha256 = (await checked("shell", "sha256sum", installedPath)).split(/\s+/)[0];
    assert.equal(report.installedApkSha256, report.apk.sha256);
    const testPath = (await checked("shell", "pm", "path", testPkg)).replace(/^package:/, "");
    assert(/^\/data\/app\/[A-Za-z0-9_+./=~-]+\/base\.apk$/.test(testPath));
    report.installedTestApkSha256 = (await checked("shell", "sha256sum", testPath)).split(/\s+/)[0];
    assert.equal(report.installedTestApkSha256, report.testApk.sha256);
    for (let round = 1; round <= 2; round++) {
        await checked("shell", "am", "force-stop", pkg);
        assert.equal(countUidProcesses(await checked("shell", "ps", "-A", "-o", "UID,PID,NAME"), uid), 0);
        const result = await command(adb, ["-s", serial, "shell", "am", "instrument", "-w", "-r",
            "-e", "class", pressure ? PRESSURE_CLASS : TEST_CLASS, "-e", "requiredApiLevel", String(expected.api),
            "-e", "requiredPageSizeBytes", String(expected.pages), `${testPkg}/androidx.test.runner.AndroidJUnitRunner`], 300000);
        const record = { round, ...result };
        report.rounds.push(record);
        writeFileSync(join(output, `round-${round}.txt`), result.stdout + result.stderr, { flag: "wx" });
        try {
            assert.equal(result.status, 0);
            if (pressure) {
                record.pressure = validatePressureInstrumentation(result.stdout, expected.pages);
                record.passedTests = [PRESSURE_TEST];
            } else record.passedTests = validateInstrumentation(result.stdout);
        } catch (error) { record.error = error.message; }
        await checked("shell", "am", "force-stop", pkg);
        record.remainingUidProcesses = countUidProcesses(await checked("shell", "ps", "-A", "-o", "UID,PID,NAME"), uid);
        assert.equal(record.remainingUidProcesses, 0);
        console.log(pressure ? `${serial} round ${round}: ${record.pressure?.length ?? 0}/${MODES.length} JSC pressure modes passed`
            : `${serial} round ${round}: ${record.passedTests?.length ?? 0}/8 Binder tests passed`);
    }
    report.passed = report.rounds.every(round => !round.error);
} catch (error) { report.error = error.stack; if (error.commandDiagnostic) report.commandFailure = error.commandDiagnostic; }
finally {
    for (const pkg of installed.reverse()) {
        try {
            if (pkg === report.package && report.uid === undefined) {
                const path = await call("shell", "pm", "path", pkg);
                assert([0, 1].includes(path.status) && !path.stderr.trim());
                if (!path.stdout.trim()) { report.cleanup.push({ package: pkg, absentAfterInstallAttempt: true }); continue; }
                report.uid = parseBinderUid(await checked("shell", "pm", "list", "packages", "-U", pkg), pkg);
            }
            await checked("shell", "am", "force-stop", pkg);
            const result = await checked("uninstall", pkg);
            assert.match(result, /Success/);
            report.cleanup.push({ package: pkg, uninstalled: true });
        } catch (error) { report.cleanup.push({ package: pkg, error: error.message }); report.passed = false; }
    }
    if (report.uid !== undefined) {
        try {
            report.finalUidProcesses = countUidProcesses(await checked("shell", "ps", "-A", "-o", "UID,PID,NAME"), report.uid);
            assert.equal(report.finalUidProcesses, 0);
        } catch (error) { report.cleanupError = error.message; report.passed = false; }
    }
    writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
}
assert(report.passed, "Experimental Binder gate failed: " + (report.error ?? report.rounds.find(r => r.error)?.error ?? "cleanup"));
