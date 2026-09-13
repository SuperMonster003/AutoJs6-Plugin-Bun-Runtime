import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyJscCandidate } from "./jsc-common.mjs";
import { BUILD_RECIPES, canonicalFacts, loadRebasedJscCandidate, validateCleanRebase } from "./rebased-common.mjs";

export const TWELVE_PATCH_HEAD = "06e518f73b4fccc6c3ffb17412ea166bf886bed0";
export const TWELVE_PATCH_TREE = "1eb8d5ea945001f018bdf14bd00c261d40b02573";
export const TWELVE_PATCH_REVISION = "1.4.0+06e518f73";
export const TWELVE_PATCH_BASELINE = new URL("../../../../docs/compatibility/2026-09-13-m2-pending-wait-runtime-evidence.json", import.meta.url);
const TWELVE_PATCH_ARCHIVE = new URL("../../../../docs/compatibility/2026-09-13-m5-twelve-patch-jsc-builds.json", import.meta.url);
const TWELVE_PATCH_ARCHIVE_SHA256 = "43b7dd5d09ae26a2baf673a6f1948675d9f3f9529e08cc332fc2a330694496ad";
export const API28_RECIPES = Object.freeze([
    "run-locked-build.mjs", "build-experiment.mjs", "config/arm64-v8a.configure.json", "config/x86_64.configure.json",
    "source-inputs.lock.json", "toolchain-inputs.lock.json", "build-network-inputs.lock.json", "cargo-inputs.lock.json",
    "bun-inputs.lock.json", "patches/series.lock.json", "experiment.lock.json", "verify-experiment.mjs",
    "materialize-cargo-inputs.mjs", "materialize-bun-inputs.mjs", "materialize-source-inputs.mjs", "materialize-toolchain-inputs.mjs",
]);

function sharedSourceBindings() {
    return {
        historicalCandidate: canonicalFacts(new URL("candidate.lock.json", import.meta.url)),
        historicalCleanBuilds: canonicalFacts(new URL("../../../../docs/compatibility/2026-09-12-m5-x86-16k-clean-builds.json", import.meta.url)),
        priorRebasedCandidate: canonicalFacts(new URL("rebased-candidate.lock.json", import.meta.url)),
        baselineRuntimeEvidence: canonicalFacts(TWELVE_PATCH_BASELINE),
        recipes: Object.fromEntries(BUILD_RECIPES.map(name => [name, canonicalFacts(new URL(name, import.meta.url))])),
    };
}

export function twelvePatchSourceBindings() {
    return { ...sharedSourceBindings(),
        api28Recipes: Object.fromEntries(API28_RECIPES.map(name => [name, canonicalFacts(new URL(`../api28/${name}`, import.meta.url))])),
    };
}

// Driver receipts bind the exact physical bytes used during the build. Git
// stores canonical LF. An explicit mixed-line map also preserves old working
// files with both endings; every reconstructed byte must match the original hash.
export function verifyApi28RecipeEncodings(recorded, encodings) {
    assert.deepEqual(Object.keys(recorded).sort(), [...API28_RECIPES].sort());
    if (encodings !== undefined) assert.deepEqual(Object.keys(encodings).sort(), [...API28_RECIPES].sort());
    const facts = text => {
        const bytes = Buffer.from(text);
        return { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    };
    return Object.fromEntries(API28_RECIPES.map(name => {
        assert.deepEqual(Object.keys(recorded[name]).sort(), ["bytes", "sha256"]);
        const canonical = readFileSync(new URL(`../api28/${name}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
        const lf = facts(canonical);
        const encoding = encodings?.[name] ?? (recorded[name].bytes === lf.bytes && recorded[name].sha256 === lf.sha256 ? "utf8-lf" : "utf8-crlf");
        let reconstructed;
        if (encoding === "utf8-lf") reconstructed = canonical;
        else if (encoding === "utf8-crlf") reconstructed = canonical.replace(/\n/g, "\r\n");
        else {
            assert.deepEqual(Object.keys(encoding).sort(), ["encoding", "lfOnlyLines"]);
            assert.equal(encoding.encoding, "utf8-mixed");
            const lines = encoding.lfOnlyLines, count = (canonical.match(/\n/g) ?? []).length;
            assert(Array.isArray(lines) && lines.length > 0 && lines.length < count);
            assert(lines.every((line, index) => Number.isSafeInteger(line) && line >= 1 && line <= count && (!index || line > lines[index - 1])));
            const lfLines = new Set(lines);
            let line = 0;
            reconstructed = canonical.replace(/\n/g, () => lfLines.has(++line) ? "\n" : "\r\n");
        }
        assert.deepEqual(recorded[name], facts(reconstructed), `${name}: reconstructed source must match the exact original bytes`);
        return [name, encoding];
    }));
}

export function captureApi28RecipeEncodings(recorded) {
    assert.deepEqual(Object.keys(recorded).sort(), [...API28_RECIPES].sort());
    const encodings = Object.fromEntries(API28_RECIPES.map(name => {
        const raw = readFileSync(new URL(`../api28/${name}`, import.meta.url));
        assert.deepEqual(recorded[name], { bytes: raw.length, sha256: createHash("sha256").update(raw).digest("hex") }, `${name}: physical recipe changed after build`);
        const endings = [...raw.toString("utf8").matchAll(/\r?\n/g)].map(match => match[0]);
        const lfOnlyLines = endings.flatMap((ending, index) => ending === "\n" ? [index + 1] : []);
        return [name, lfOnlyLines.length === endings.length ? "utf8-lf" : lfOnlyLines.length === 0 ? "utf8-crlf"
            : { encoding: "utf8-mixed", lfOnlyLines }];
    }));
    return verifyApi28RecipeEncodings(recorded, encodings);
}

export function validateTwelvePatchCandidate(lock) {
    const bindings = twelvePatchSourceBindings();
    validateCleanRebase(lock, { schemaVersion: 2, head: TWELVE_PATCH_HEAD, tree: TWELVE_PATCH_TREE,
        revision: TWELVE_PATCH_REVISION, baselineEvidence: TWELVE_PATCH_BASELINE, bindings });
    assert.notEqual(lock.artifact.sha256, loadRebasedJscCandidate().artifact.sha256, "Ten-patch bytes cannot accept twelve-patch source");
    for (const build of lock.builds) {
        const driver = build.driver;
        assert.equal(driver.state, "complete");
        assert.equal(driver.freshCheckout, true);
        assert.equal(driver.recipesUnchanged, true);
        assert.equal(driver.api28RecipesUnchanged, true);
        assert.deepEqual(build.api28RecipeEncodings, verifyApi28RecipeEncodings(driver.api28Recipes, build.api28RecipeEncodings));
        const times = ["startedAt", "buildStartedAt", "buildFinishedAt", "finishedAt"].map(key => {
            assert.match(driver[key], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
            const time = Date.parse(driver[key]);
            assert(Number.isFinite(time));
            return time;
        });
        for (let i = 1; i < times.length; i++) assert(times[i] >= times[i - 1], "Build chronology drift");
        assert(times[2] > times[1], "Actual build interval required");
    }
    return lock;
}

export function loadTwelvePatchJscCandidate() {
    const path = new URL("twelve-patch-candidate.lock.json", import.meta.url);
    assert.equal(canonicalFacts(path).sha256, TWELVE_PATCH_ARCHIVE_SHA256, "Historical candidate bytes changed");
    return validateArchivedTwelvePatchCandidate(JSON.parse(readFileSync(path, "utf8")));
}

// Historical loading binds every field, including the original physical recipe
// bytes and line-ending maps, to the immutable accepted archive. It must not
// reinterpret those recipes using a later API 28 source. New build recording
// still uses validateTwelvePatchCandidate and its current-file encoding checks.
export function validateArchivedTwelvePatchCandidate(lock) {
    assert.equal(canonicalFacts(TWELVE_PATCH_ARCHIVE).sha256, TWELVE_PATCH_ARCHIVE_SHA256, "Historical build archive changed");
    const archived = JSON.parse(readFileSync(TWELVE_PATCH_ARCHIVE, "utf8"));
    assert.deepEqual(lock, archived, "Historical candidate must match its complete accepted build record");
    return validateCleanRebase(lock, { schemaVersion: 2, head: TWELVE_PATCH_HEAD, tree: TWELVE_PATCH_TREE,
        revision: TWELVE_PATCH_REVISION, baselineEvidence: TWELVE_PATCH_BASELINE,
        bindings: { ...sharedSourceBindings(), api28Recipes: archived.bindings.api28Recipes } });
}

export function verifyTwelvePatchJscCandidate(path, lock = loadTwelvePatchJscCandidate()) {
    validateArchivedTwelvePatchCandidate(lock);
    return verifyJscCandidate(path, lock);
}
