import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const PACKAGE = "io.github.supermonster003.autojs6.plugin.bun.runtime.diagnostics";
export const MESSAGE_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.BunRuntimeMessagesInstrumentedTest";
export const LOCALES = ["en", "ar", "es", "fr", "ja", "ko", "ru", "zh-CN", "zh-HK", "zh-TW"];
export const METHODS = {
    resources: "tenLocalesRenderResourcesHelpAndBoundedDiagnostics",
    errors: "binderErrorsFollowAppLocaleAndMatchFinishedEvents",
    pages: "cachedPageSizeRefusalFollowsLocaleInPrewarmInfoAndRun",
};
export const facts = path => {
    const bytes = readFileSync(path);
    return { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
};

export function inputFacts() {
    const walk = dir => readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
    const paths = ["settings.gradle.kts", "build.gradle.kts", "app/build.gradle.kts", "version.properties",
        "gradle/libs.versions.toml", "gradle/wrapper/gradle-wrapper.properties",
        "build-logic/settings.gradle.kts", "build-logic/convention/build.gradle.kts",
        "libs/api-artifacts.lock.json", "libs/common-plugin-api.aar", "libs/bun-runtime-api.aar",
        "tools/bun-runtime/runtime.lock.json", "tools/bun-runtime/supervisor/supervisor.lock.json",
        "app/src/main/AndroidManifest.xml", "app/src/androidTest/AndroidManifest.xml",
        ...walk("build-logic/convention/src"), ...walk("app/src/main/java"), ...walk("app/src/main/res"),
        ...walk("app/src/main/assets"), ...walk("app/src/androidTest/java"), ...walk("samples")];
    return paths.sort().map(path => {
        let bytes = readFileSync(resolve(root, path));
        if (!path.endsWith(".aar")) bytes = Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"));
        return { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    });
}

export function validateMessages(output, suite) {
    assert(Object.hasOwn(METHODS, suite));
    assert.doesNotMatch(output, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed/);
    const statuses = [...output.matchAll(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)\s*$/gm)].map(m => Number(m[1]));
    assert(statuses.length > 2 && statuses.every(x => x === 0 || x === 1), "Failed or skipped message test");
    assert.equal(statuses.filter(x => x === 1).length, 1);
    const methods = [...output.matchAll(/^INSTRUMENTATION_STATUS: test=(.+)\r?$/gm)].map(m => m[1].trim());
    assert.deepEqual(methods, [METHODS[suite], METHODS[suite]]);
    const classes = [...output.matchAll(/^INSTRUMENTATION_STATUS: class=(.+)\r?$/gm)].map(m => m[1].trim());
    assert.deepEqual(classes, [MESSAGE_CLASS, MESSAGE_CLASS]);
    assert.match(output, /^INSTRUMENTATION_CODE: -1\s*$/m);
    assert.match(output, /OK \(1 test\)/);
    const records = [...output.matchAll(/^BUN_MESSAGES (.+)\r?$/gm)].map(m => m[1].trim());
    const expected = LOCALES.map(locale => suite === "resources"
        ? `resources locale=${locale} keys=17 help=5 errorCodes=10 diagnosticBound=true`
        : suite === "errors" ? `binder locale=${locale} errors=6 finishedMatches=true`
            : `page-refusal locale=${locale} pages=16384 prewarmInfoRun=true finishedMatches=true`);
    if (suite !== "resources") expected.push("localeRestored=true");
    assert.deepEqual(records, expected, "Missing, duplicated or unsuccessful locale observations");
    return { test: METHODS[suite], locales: LOCALES, records };
}
