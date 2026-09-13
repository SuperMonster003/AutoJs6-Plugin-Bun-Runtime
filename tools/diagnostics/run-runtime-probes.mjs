import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PACKAGE as OFFICIAL_PACKAGE, MESSAGE_CLASS, METHODS, facts, root, validateMessages } from "./runtime-message-common.mjs";
import { TEST_CLASS, buildInputs, validateInstrumentation, validateDevice, parseBinderUid } from "../bun-runtime/experimental/api28/binder/binder-common.mjs";
import { countUidProcesses } from "../bun-runtime/experimental/api28/app-probe/probe-common.mjs";
import { inspectApkRuntime, readBoundedApkEntry } from "../bun-runtime/verify-apk-runtime.mjs";
import { supervisorArtifacts } from "../bun-runtime/supervisor/supervisor-common.mjs";
import { parseApkSignerOutput } from "../bun-runtime/release/assemble-corresponding-source.mjs";

import { PROBE_CLASS, probeInputs, validateProbeLifecycle } from "./probe-lifecycle-common.mjs";

const options = Object.fromEntries(process.argv.slice(2).reduce((rows, value, i, all) => {
    if (i % 2 === 0) {
        assert(value.startsWith("--") && all[i + 1] && !rows.some(([key]) => key === value), "Missing or duplicate option");
        rows.push([value, all[i + 1]]);
    }
    return rows;
}, []));
assert.deepEqual(Object.keys(options).sort(), ["--abi", "--api", "--apks", "--jdk", "--mode", "--output", "--pages", "--sdk", "--serial"].sort());
const mode = options["--mode"];
assert(["official", "experimental"].includes(mode));
const PACKAGE = mode === "official" ? OFFICIAL_PACKAGE : "io.github.supermonster003.autojs6.plugin.bun.runtime.api28binder";
const minSdk = mode === "official" ? 33 : 28;
const expected = { abi: options["--abi"], api: Number(options["--api"]), pages: Number(options["--pages"]) };
assert(Number.isInteger(expected.api) && expected.api >= minSdk && expected.api <= 100);
assert(["arm64-v8a", "x86_64"].includes(expected.abi));
assert(expected.pages === 4096, "This probe regression batch covers native 4 KiB environments");
const serial = options["--serial"], directory = resolve(options["--apks"]), output = resolve(options["--output"]);
assert(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(serial));
const apk = join(directory, `app-${expected.abi}-debug.apk`), testApk = join(directory, "app-debug-androidTest.apk");
const build = JSON.parse(readFileSync(join(directory, "build.json"), "utf8"));
assert.deepEqual(build.inputs, probeInputs(mode), "Compiled source inputs changed; use a fresh, separately bound APK batch");
assert.equal(build.kind, "probe-lifecycle-build");
assert.equal(build.mode, mode);
assert.equal(build.exitCode, 0);
assert.equal(build.sourceSnapshotUnchanged, true);
assert.deepEqual(facts(apk), build.apks[expected.abi]);
assert.deepEqual(facts(testApk), build.apks.test);
const lock = JSON.parse(readFileSync(join(root, "tools/bun-runtime/runtime.lock.json"), "utf8"));
const experiment = JSON.parse(readFileSync(join(root, "tools/bun-runtime/experimental/api28/runtime-evidence.json"), "utf8"));
const artifacts = mode === "official" ? lock.artifacts : experiment.artifacts.map(a => ({ abi: a.abi, binaryBytes: a.bytes, binarySha256: a.sha256 }));
const payloads = inspectApkRuntime(apk, [expected.abi], new Map(artifacts.map(a => [a.abi, a])), supervisorArtifacts);
if (mode === "experimental") {
    const embedded = JSON.parse(readBoundedApkEntry(apk, "assets/binder-build.json"));
    assert.deepEqual(embedded.inputs, buildInputs());
    assert.deepEqual(embedded.source, experiment.source);
    assert.equal(embedded.jscCandidate, null);
}
const runtime = mode === "official"
    ? { version: "1.4.0", revision: "1.4.0+34cbb9a40", commit: "34cbb9a40b4bd1bd767d134a7065e66c2432a676", variant: "bun-1.4.0-android" }
    : { version: "1.4.0", revision: "1.4.0+" + experiment.source.downstreamHeadCommit.slice(0, 9),
        commit: experiment.source.downstreamHeadCommit, variant: experiment.identity.variant };
const suites = mode === "official" ? ["binder", "probe", "resources", "errors"] : ["binder", "probe"];
mkdirSync(output); // Never overwrite an earlier run, including a failed attempt.
const report = { schemaVersion: 1, kind: "probe-lifecycle-regression", mode, runtime, capturedAt: new Date().toISOString(),
    expected, serial, package: PACKAGE, apk: facts(apk), testApk: facts(testApk), build, payloads,
    runner: ["run-runtime-probes.mjs", "probe-lifecycle-common.mjs", "runtime-message-common.mjs"].map(name => ({ name, ...facts(join(root, "tools/diagnostics", name)) })),
    suites, rounds: [], cleanup: [], passed: false, distributionReady: false };
const suffix = process.platform === "win32" ? ".exe" : "";
const adb = join(options["--sdk"], "platform-tools", "adb" + suffix);
const aapt = join(options["--sdk"], "build-tools/37.0.0/aapt2" + suffix);
const testPackage = PACKAGE + ".test", installed = [];
async function command(executable, args, timeout = 60000) {
    return await new Promise((done, fail) => {
        const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "", stderr = "", bytes = 0, error;
        const timer = setTimeout(() => { error = new Error("Command exceeded its time limit"); child.kill(); }, timeout);
        for (const [name, stream] of [["stdout", child.stdout], ["stderr", child.stderr]]) {
            stream.setEncoding("utf8");
            stream.on("data", text => {
                bytes += Buffer.byteLength(text);
                if (bytes > 2 * 1024 * 1024) { error = new Error("Command exceeded its output limit"); child.kill(); }
                else if (name === "stdout") stdout += text; else stderr += text;
            });
        }
        child.on("error", err => { clearTimeout(timer); fail(err); });
        child.on("close", status => { clearTimeout(timer); if (error) fail(Object.assign(error, { diagnostic: { status, stdout, stderr } })); else done({ status, stdout, stderr }); });
    });
}
const call = (...args) => command(adb, ["-s", serial, ...args]);
async function checked(...args) { const result = await call(...args); assert.equal(result.status, 0, result.stderr || result.stdout); return result.stdout.trim(); }
try {
    report.signatures = [];
    for (const [name, path] of [[PACKAGE, apk], [testPackage, testApk]]) {
        const manifest = await command(aapt, ["dump", "badging", path]);
        assert.equal(manifest.status, 0);
        assert(manifest.stdout.startsWith(`package: name='${name}'`));
        assert(manifest.stdout.includes(`minSdkVersion:'${minSdk}'`));
        const sign = await command(join(options["--jdk"], "bin/java" + suffix), ["-jar", join(options["--sdk"], "build-tools/37.0.0/lib/apksigner.jar"), "verify", "--verbose", "--print-certs", path]);
        assert.equal(sign.status, 0, sign.stderr);
        report.signatures.push(parseApkSignerOutput(sign.stdout, name));
        assert.equal((await command(join(options["--sdk"], "build-tools/37.0.0/zipalign" + suffix), ["-c", "-P", "16", "4", path])).status, 0);
    }
    assert.equal(report.signatures[0].certificateSha256, report.signatures[1].certificateSha256);
    report.device = {};
    for (const [key, property] of Object.entries({ manufacturer: "ro.product.manufacturer", model: "ro.product.model",
        api: "ro.build.version.sdk", abi: "ro.product.cpu.abi", bridge: "ro.dalvik.vm.native.bridge", fingerprint: "ro.build.fingerprint" })) {
        report.device[key] = await checked("shell", "getprop", property);
    }
    const getconf = await call("shell", "getconf", "PAGE_SIZE");
    const smaps = await checked("shell", "cat", "/proc/self/smaps");
    const kernelPages = [...new Set([...smaps.matchAll(/^KernelPageSize:\s+(\d+) kB\r?$/gm)].map(m => Number(m[1]) * 1024))];
    if (getconf.status !== 0) {
        assert.equal(getconf.status, 127, "Unexpected getconf failure");
        assert.deepEqual(kernelPages, [4096], "Ambiguous fallback page measurement");
    }
    Object.assign(report.device, { pages: getconf.status === 0 ? getconf.stdout.trim() : String(kernelPages[0]),
        pageSizeSource: (getconf.status === 0 ? "getconf PAGE_SIZE" : "shell smaps; getconf unavailable") + " plus instrumentation Os.sysconf assertion",
        machine: await checked("shell", "uname", "-m"), kernel: await checked("shell", "uname", "-r") });
    validateDevice(report.device, expected);
    report.kernelMappingPageSizes = [...new Set([...smaps.matchAll(/^KernelPageSize:\s+(\d+) kB\r?$/gm)].map(m => Number(m[1]) * 1024))];
    for (const name of [PACKAGE, testPackage]) {
        const found = await call("shell", "pm", "path", name);
        assert([0, 1].includes(found.status) && !found.stdout.trim() && !found.stderr.trim(), "Refusing to replace existing package " + name);
    }
    for (const [name, path] of [[PACKAGE, apk], [testPackage, testApk]]) {
        const owned = { package: name }; installed.push(owned);
        assert.match(await checked("install", "-t", path), /Success/);
        owned.uid = parseBinderUid(await checked("shell", "pm", "list", "packages", "-U", name), name);
        const devicePath = (await checked("shell", "pm", "path", name)).replace(/^package:/, "");
        assert(/^\/data\/app\/[A-Za-z0-9_+./=~-]+\/base\.apk$/.test(devicePath));
        owned.installedApkSha256 = (await checked("shell", "sha256sum", devicePath)).split(/\s+/)[0];
        assert.equal(owned.installedApkSha256, facts(path).sha256);
    }
    report.installed = installed.map(x => ({ ...x }));
    report.uid = installed[0].uid;
    for (let round = 1; round <= 2; round++) {
        await checked("shell", "am", "force-stop", PACKAGE);
        assert.equal(countUidProcesses(await checked("shell", "ps", "-A", "-o", "UID,PID,NAME"), report.uid), 0);
        const record = { round, suites: [] }; report.rounds.push(record);
        for (const suite of suites) {
            const result = await command(adb, ["-s", serial, "shell", "am", "instrument", "-w", "-r", "-e", "class",
                suite === "binder" ? TEST_CLASS : suite === "probe" ? PROBE_CLASS : `${MESSAGE_CLASS}#${METHODS[suite]}`,
                "-e", "requiredApiLevel", String(expected.api), "-e", "requiredPageSizeBytes", String(expected.pages),
                `${testPackage}/androidx.test.runner.AndroidJUnitRunner`], 180000);
            record.suites.push({ suite, ...result });
            writeFileSync(join(output, `round-${round}-${suite}.txt`), result.stdout + result.stderr, { flag: "wx" });
            assert.equal(result.status, 0, result.stderr);
            const validation = suite === "binder" ? validateInstrumentation(result.stdout) : suite === "probe" ? validateProbeLifecycle(result.stdout) : validateMessages(result.stdout, suite);
            Object.assign(record.suites.at(-1), { passed: true, validation });
            console.log(`${serial} round ${round}: ${suite} passed`);
        }
    }
    assert.deepEqual(build.inputs, probeInputs(mode), "Source inputs changed during device regression");
    report.passed = true;
} catch (error) { report.error = error.stack; if (error.diagnostic) report.commandFailure = error.diagnostic; }
finally {
    for (const owned of installed.reverse()) {
        try {
            const found = await call("shell", "pm", "path", owned.package);
            assert([0, 1].includes(found.status) && !found.stderr.trim());
            if (found.stdout.trim()) {
                owned.uid ??= parseBinderUid(await checked("shell", "pm", "list", "packages", "-U", owned.package), owned.package);
                await checked("shell", "am", "force-stop", owned.package);
                assert.match(await checked("uninstall", owned.package), /Success/);
            }
            const absent = await call("shell", "pm", "path", owned.package);
            assert([0, 1].includes(absent.status) && !absent.stdout.trim() && !absent.stderr.trim());
            const processes = owned.uid === undefined ? null : countUidProcesses(await checked("shell", "ps", "-A", "-o", "UID,PID,NAME"), owned.uid);
            if (owned.uid !== undefined) assert.equal(processes, 0);
            report.cleanup.push({ package: owned.package, uid: owned.uid ?? null, absent: true, remainingUidProcesses: processes });
        } catch (error) { report.cleanup.push({ package: owned.package, error: error.message }); report.passed = false; }
    }
    writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
}
assert(report.passed, report.error ?? "Device regression or cleanup failed");
