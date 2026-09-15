import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync, createWriteStream } from "node:fs";
import { join, resolve } from "node:path";
import { facts, inputFacts, root } from "./runtime-message-common.mjs";

// A controlled build with source snapshots on both sides; no native Bun rebuild.
const [outputArg, ...extra] = process.argv.slice(2);
assert(outputArg && !extra.length, "Usage: node tools/diagnostics/build-runtime-messages.mjs NEW_OUTPUT_DIRECTORY");
const output = resolve(outputArg);
mkdirSync(output); // Refuse to replace a previous build, including its failure log.
const before = inputFacts(), startedAt = new Date().toISOString();
const tasks = [":app:testDebugUnitTest", ":app:verifyDebugApkRuntimeIntegrity", ":app:assembleDebugAndroidTest", ":app:lintDebug",
    "-PinstrumentationApplicationIdSuffix=.diagnostics", "--offline", "--console=plain"];
const log = createWriteStream(join(output, "gradle.log"), { flags: "wx" });
const windows = process.platform === "win32";
const command = windows ? "cmd.exe" : "sh";
// Only fixed repository task arguments enter cmd; user paths are used solely by fs.
const args = windows ? ["/d", "/c", "gradlew.bat", ...tasks] : ["./gradlew", ...tasks];
const exit = await new Promise((done, fail) => {
    const child = spawn(command, args, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    for (const stream of [child.stdout, child.stderr]) stream.on("data", data => { log.write(data); process.stdout.write(data); });
    child.on("error", fail);
    child.on("close", code => log.end(() => done(code)));
});
const receipt = { schemaVersion: 1, startedAt, finishedAt: new Date().toISOString(), exitCode: exit,
    buildProperties: { instrumentationApplicationIdSuffix: ".diagnostics" }, inputEncoding: "UTF-8/LF except binary AARs",
    sourceSnapshotUnchanged: JSON.stringify(before) === JSON.stringify(inputFacts()), inputs: before, apks: {} };
writeFileSync(join(output, "attempt.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
assert.equal(exit, 0, "Build failed; retained its log and source snapshot");
assert(receipt.sourceSnapshotUnchanged, "Sources changed during the build");
for (const abi of ["arm64-v8a", "x86_64", "universal"]) {
    const name = `app-${abi}-debug.apk`;
    copyFileSync(join(root, "app/build/outputs/apk/debug", name), join(output, name));
    receipt.apks[abi] = facts(join(output, name));
}
const testName = "app-debug-androidTest.apk";
copyFileSync(join(root, "app/build/outputs/apk/androidTest/debug", testName), join(output, testName));
receipt.apks.test = facts(join(output, testName));
writeFileSync(join(output, "build.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
