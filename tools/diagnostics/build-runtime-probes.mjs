import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync, createWriteStream } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { facts, root } from "./runtime-message-common.mjs";
import { probeInputs } from "./probe-lifecycle-common.mjs";

const [mode, outputArg, runtime, repeat, ...extra] = process.argv.slice(2);
assert(["official", "experimental"].includes(mode) && outputArg && !extra.length,
    "Usage: node build-runtime-probes.mjs official|experimental NEW_OUTPUT [RUNTIME_DIRECTORY REPEAT_DIRECTORY]");
assert(mode === "experimental" ? runtime && repeat : !runtime && !repeat);
for (const directory of [runtime, repeat].filter(Boolean)) {
    // These two arguments enter a fixed Gradle command through cmd on Windows.
    assert(isAbsolute(directory) && /^[A-Za-z0-9_:/\\ .-]+$/.test(directory), "Unsupported native input path");
}
const output = resolve(outputArg);
mkdirSync(output);
const before = probeInputs(mode), startedAt = new Date().toISOString();
const tasks = mode === "official" ? [":app:testDebugUnitTest", ":app:verifyDebugApkRuntimeIntegrity",
    ":app:assembleDebugAndroidTest", ":app:lintDebug", "-PinstrumentationApplicationIdSuffix=.diagnostics"]
    : [":experimental-binder:assembleDebug", ":experimental-binder:assembleDebugAndroidTest",
        `-PexperimentalRuntimeDirectory=${runtime}`, `-PexperimentalRuntimeRepeatDirectory=${repeat}`];
tasks.push("--console=plain");
const log = createWriteStream(join(output, "gradle.log"), { flags: "wx" });
const windows = process.platform === "win32";
const exitCode = await new Promise((done, fail) => {
    const child = spawn(windows ? "cmd.exe" : "sh", windows ? ["/d", "/c", "gradlew.bat", ...tasks] : ["./gradlew", ...tasks],
        { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    for (const stream of [child.stdout, child.stderr]) stream.on("data", data => { log.write(data); process.stdout.write(data); });
    child.on("error", fail);
    child.on("close", code => log.end(() => done(code)));
});
const receipt = { schemaVersion: 1, kind: "probe-lifecycle-build", mode, startedAt, finishedAt: new Date().toISOString(), exitCode,
    sourceSnapshotUnchanged: JSON.stringify(before) === JSON.stringify(probeInputs(mode)), inputs: before, apks: {} };
writeFileSync(join(output, "attempt.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
assert.equal(exitCode, 0, "Build failed; log retained");
assert(receipt.sourceSnapshotUnchanged, "Source inputs changed during build");
const source = mode === "official" ? "app/build/outputs/apk" : "build/experimental-binder/outputs/apk";
for (const abi of mode === "official" ? ["arm64-v8a", "x86_64", "universal"] : ["arm64-v8a", "x86_64"]) {
    const name = `app-${abi}-debug.apk`;
    copyFileSync(join(root, source, "debug", mode === "official" ? name : `experimental-binder-${abi}-debug.apk`), join(output, name));
    receipt.apks[abi] = facts(join(output, name));
}
copyFileSync(join(root, source, "androidTest/debug", mode === "official" ? "app-debug-androidTest.apk" : "experimental-binder-debug-androidTest.apk"),
    join(output, "app-debug-androidTest.apk"));
receipt.apks.test = facts(join(output, "app-debug-androidTest.apk"));
writeFileSync(join(output, "build.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
