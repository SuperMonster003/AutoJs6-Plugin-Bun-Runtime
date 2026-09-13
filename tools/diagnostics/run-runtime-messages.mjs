import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PACKAGE, MESSAGE_CLASS, METHODS, facts, inputFacts, root, validateMessages } from "./runtime-message-common.mjs";
import { TEST_CLASS, validateInstrumentation, validateDevice, parseBinderUid } from "../bun-runtime/experimental/api28/binder/binder-common.mjs";
import { countUidProcesses } from "../bun-runtime/experimental/api28/app-probe/probe-common.mjs";
import { inspectApkRuntime } from "../bun-runtime/verify-apk-runtime.mjs";
import { supervisorArtifacts } from "../bun-runtime/supervisor/supervisor-common.mjs";
import { parseApkSignerOutput } from "../bun-runtime/release/assemble-corresponding-source.mjs";

const options = Object.fromEntries(process.argv.slice(2).reduce((rows, value, i, all) => {
    if (i % 2 === 0) { assert(value.startsWith("--") && all[i + 1]); rows.push([value, all[i + 1]]); }
    return rows;
}, []));
assert.deepEqual(Object.keys(options).sort(), ["--abi", "--api", "--apks", "--jdk", "--output", "--pages", "--sdk", "--serial"].sort());
const expected = { abi: options["--abi"], api: Number(options["--api"]), pages: Number(options["--pages"]) };
assert(expected.api >= 33 && expected.api <= 100);
assert(["arm64-v8a", "x86_64"].includes(expected.abi));
const pageRefusal = expected.abi === "x86_64" && expected.pages === 16384;
assert(expected.pages === 4096 || pageRefusal);
const serial = options["--serial"], directory = resolve(options["--apks"]), output = resolve(options["--output"]);
assert(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(serial));
const apk = join(directory, `app-${expected.abi}-debug.apk`), testApk = join(directory, "app-debug-androidTest.apk");
const build = JSON.parse(readFileSync(join(directory, "build.json"), "utf8"));
assert.deepEqual(build.inputs, inputFacts(), "Compiled source inputs changed; use a fresh, separately bound APK batch");
assert.equal(build.buildProperties.instrumentationApplicationIdSuffix, ".diagnostics");
assert.deepEqual(facts(apk), build.apks[expected.abi]);
assert.deepEqual(facts(testApk), build.apks.test);
const lock = JSON.parse(readFileSync(join(root, "tools/bun-runtime/runtime.lock.json"), "utf8"));
const payloads = inspectApkRuntime(apk, [expected.abi], new Map(lock.artifacts.map(a => [a.abi, a])), supervisorArtifacts);
mkdirSync(output); // Never overwrite an earlier run, including a failed attempt.
const report = { schemaVersion: 1, kind: "runtime-message-regression", capturedAt: new Date().toISOString(),
    expected, serial, package: PACKAGE, apk: facts(apk), testApk: facts(testApk), build, payloads,
    runner: ["run-runtime-messages.mjs", "runtime-message-common.mjs"].map(name => ({ name, ...facts(join(root, "tools/diagnostics", name)) })),
    pageRefusal, rounds: [], cleanup: [], passed: false, distributionReady: false };
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
        assert.match(manifest.stdout, /minSdkVersion:'33'/);
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
    Object.assign(report.device, { pages: await checked("shell", "getconf", "PAGE_SIZE"), pageSizeSource: "getconf PAGE_SIZE plus instrumentation Os.sysconf assertion",
        machine: await checked("shell", "uname", "-m"), kernel: await checked("shell", "uname", "-r") });
    validateDevice(report.device, expected);
    const smaps = await checked("shell", "cat", "/proc/self/smaps");
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
        for (const suite of pageRefusal ? ["resources", "pages"] : ["binder", "resources", "errors"]) {
            const result = await command(adb, ["-s", serial, "shell", "am", "instrument", "-w", "-r", "-e", "class",
                suite === "binder" ? TEST_CLASS : `${MESSAGE_CLASS}#${METHODS[suite]}`,
                "-e", "requiredApiLevel", String(expected.api), "-e", "requiredPageSizeBytes", String(expected.pages),
                `${testPackage}/androidx.test.runner.AndroidJUnitRunner`], 180000);
            record.suites.push({ suite, ...result });
            writeFileSync(join(output, `round-${round}-${suite}.txt`), result.stdout + result.stderr, { flag: "wx" });
            assert.equal(result.status, 0, result.stderr);
            const validation = suite === "binder" ? validateInstrumentation(result.stdout) : validateMessages(result.stdout, suite);
            Object.assign(record.suites.at(-1), { passed: true, validation });
            console.log(`${serial} round ${round}: ${suite} passed`);
        }
    }
    assert.deepEqual(build.inputs, inputFacts(), "Source inputs changed during device regression");
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
