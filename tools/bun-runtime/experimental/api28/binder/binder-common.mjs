import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
export function buildInputs() {
    const walk = path => readdirSync(resolve(root, path), { withFileTypes: true }).flatMap(entry =>
        entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
    const paths = ["settings.gradle.kts", "build.gradle.kts", "app/build.gradle.kts", "version.properties",
        "gradle/libs.versions.toml", "libs/api-artifacts.lock.json", "libs/common-plugin-api.aar", "libs/bun-runtime-api.aar",
        "app/src/main/AndroidManifest.xml", "app/src/androidTest/AndroidManifest.xml",
        "tools/bun-runtime/experimental/api28/binder/build.gradle.kts",
        "tools/bun-runtime/experimental/api28/binder/AndroidManifest.xml",
        "tools/bun-runtime/experimental/api28/binder/prepare-runtime.mjs",
        "tools/bun-runtime/experimental/api28/binder/binder-common.mjs",
        "tools/bun-runtime/supervisor/supervisor.lock.json",
        "tools/bun-runtime/experimental/webkit-x86_64-16k/jsc-common.mjs",
        "tools/bun-runtime/experimental/webkit-x86_64-16k/record-candidate.mjs",
        "tools/bun-runtime/experimental/webkit-x86_64-16k/rebased-common.mjs",
        "tools/bun-runtime/experimental/webkit-x86_64-16k/rebased-candidate.lock.json",
        "tools/bun-runtime/experimental/webkit-x86_64-16k/twelve-patch-common.mjs",
        "tools/bun-runtime/experimental/webkit-x86_64-16k/twelve-patch-candidate.lock.json",
        "tools/bun-runtime/experimental/webkit-x86_64-16k/thirteen-patch-common.mjs",
        "tools/bun-runtime/experimental/webkit-x86_64-16k/thirteen-patch-candidate.lock.json",
        "tools/bun-runtime/experimental/api28/runtime-evidence.json",
        ...walk("app/src/main/java"), ...walk("app/src/main/res"), ...walk("app/src/main/assets"),
        ...walk("app/src/androidTest/java"), ...walk("samples"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/java"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/assets"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/sampling/java"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/sampling/assets"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/restart/java"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/restart/assets"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/pcmap/java"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/trace/java"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/trace/assets"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/flow/java"),
        ...walk("tools/bun-runtime/experimental/webkit-x86_64-16k/flow/assets"),
        ...walk("tools/bun-runtime/experimental/api28/runtime-api/java"),
        ...walk("tools/bun-runtime/experimental/api28/runtime-api/assets"),
        "tools/bun-runtime/experimental/api28/runtime-network/certificates.json",
        ...walk("tools/bun-runtime/experimental/api28/runtime-network/java"),
        ...walk("tools/bun-runtime/experimental/api28/runtime-network/assets")];
    return paths.sort().map(path => {
        let data = readFileSync(resolve(root, path));
        if (!path.endsWith(".aar")) data = Buffer.from(data.toString("utf8").replace(/\r\n/g, "\n"));
        return { path, bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
    });
}

export const PACKAGE = "io.github.supermonster003.autojs6.plugin.bun.runtime.api28binder";
export const TEST_PACKAGE = PACKAGE + ".test";
export const TEST_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.BunRuntimeInstrumentedTest";
export const TESTS = Object.freeze([
    "installedNativeRuntimeMatchesTheLockedPayload",
    "discoveryMetadataPrewarmJavaScriptAndTypeScriptRoundTrip",
    "checkedInSamplesExecuteWithinPublishedBoundaries",
    "sigtermIgnoringTimeoutReapsTheChild",
    "sigtermIgnoringCancellationAfterReadinessReapsTheChild",
    "sigtermIgnoringOutputLimitReapsTheChild",
    "timeoutCancellationAndInvalidRequestAreBounded",
    "workspaceArchiveProjectRoundTrip",
    "manifestPublishesWakeInfoAndRuntimeContracts",
]);
export const facts = path => {
    const data = readFileSync(path);
    return { bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
};

export function parseBinderUid(output, pkg = PACKAGE) {
    const lines = output.trim().split(/\r?\n/).filter(line => line.startsWith(`package:${pkg} uid:`));
    assert.equal(lines.length, 1, "Exactly one installed Binder package UID is required");
    const match = lines[0].match(/ uid:(\d+)$/);
    assert(match);
    const uid = Number(match[1]);
    assert(Number.isSafeInteger(uid) && uid >= 10000 && uid % 100000 >= 10000, "Ordinary application UID required");
    return uid;
}

export function validateInstrumentation(text) {
    const passed = [], started = [], lifecycle = [];
    let bundle = {};
    for (const line of text.split(/\r?\n/)) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        if (field) bundle[field[1]] = field[2];
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (!field && !status && bundle.stream !== undefined) bundle.stream += "\n" + line;
        if (status) {
            const code = Number(status[1]);
            assert([0, 1].includes(code), "Failed, ignored, or invalid instrumentation status: " + code);
            if (bundle.class === undefined && bundle.test === undefined) {
                assert.equal(code, 0);
                assert.deepEqual(Object.keys(bundle), ["stream"]);
                const match = bundle.stream.trim().match(/^BUN_LIFECYCLE error=(CANCELLED|TIMEOUT|OUTPUT_LIMIT) childPid=(\d+) reaped=true exitCode=(\d+) durationMillis=(\d+) workspaceRemoved=true$/);
                assert(match, "Unexpected or unsuccessful lifecycle diagnostic");
                assert(Number(match[4]) <= 5000, "Lifecycle cleanup exceeded bound");
                lifecycle.push(match[1]);
                bundle = {};
                continue;
            }
            assert.equal(bundle.class, TEST_CLASS);
            assert.equal(Number(bundle.numtests), TESTS.length);
            assert(TESTS.includes(bundle.test), "Unexpected Binder test: " + bundle.test);
            (code === 0 ? passed : started).push(bundle.test);
            bundle = {};
        }
    }
    assert.deepEqual(passed.slice().sort(), TESTS.slice().sort(), "Every Binder test must pass exactly once");
    assert.deepEqual(started.slice().sort(), TESTS.slice().sort(), "Every Binder test must start exactly once");
    assert.deepEqual(lifecycle.sort(), ["CANCELLED", "CANCELLED", "CANCELLED", "OUTPUT_LIMIT", "TIMEOUT"]);
    assert.match(text, new RegExp(`OK \\(${TESTS.length} tests\\)`));
    assert.match(text, /^INSTRUMENTATION_CODE: -1\s*$/m);
    assert.doesNotMatch(text, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed/);
    return passed;
}

export function validateDevice({ api, abi, pages, bridge, machine }, expected) {
    assert.equal(Number(api), expected.api, "Wrong Android API");
    assert.equal(abi, expected.abi, "Wrong native primary ABI");
    assert.equal(Number(pages), expected.pages, "Wrong actual page size");
    // x86_64 AVDs can offer an ARM translator without using it for an x86_64
    // ELF. ARM64 native acceptance still requires the bridge to be disabled.
    if (abi === "arm64-v8a") assert(["", "0"].includes(bridge), "ARM64 native bridge must be disabled");
    assert.equal(machine, abi === "arm64-v8a" ? "aarch64" : "x86_64");
}
