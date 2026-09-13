import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalFacts, loadRebasedJscCandidate, validateRebasedCandidate } from "./rebased-common.mjs";
import { API28_RECIPES, TWELVE_PATCH_HEAD, TWELVE_PATCH_TREE, TWELVE_PATCH_REVISION,
    loadTwelvePatchJscCandidate, twelvePatchSourceBindings, validateTwelvePatchCandidate, verifyApi28RecipeEncodings } from "./twelve-patch-common.mjs";

test("the recorded twelve-patch candidate matches its separate immutable build archive", () => {
    const lock = loadTwelvePatchJscCandidate();
    assert.equal(lock.artifact.bytes, 90609496);
    assert.equal(lock.artifact.sha256, "34edd4b99d74c7472febfcc3f1a1c6068bd57cd5714aab150b5b86dafa75b1ad");
    assert.deepEqual(lock, JSON.parse(readFileSync(new URL("../../../../docs/compatibility/2026-09-13-m5-twelve-patch-jsc-builds.json", import.meta.url), "utf8")));
});

// Synthetic metadata tests rejection, without claiming another native build.
function fixture() {
    const lock = structuredClone(loadRebasedJscCandidate());
    Object.assign(lock, { schemaVersion: 2, bunCommit: TWELVE_PATCH_HEAD, bunTree: TWELVE_PATCH_TREE,
        revision: TWELVE_PATCH_REVISION, bindings: twelvePatchSourceBindings() });
    lock.artifact.sha256 = "a".repeat(64);
    for (const build of lock.builds) {
        build.api28RecipeEncodings = Object.fromEntries(API28_RECIPES.map(name => [name, "utf8-lf"]));
        build.receipt.source = TWELVE_PATCH_HEAD;
        const receipt = Buffer.from(JSON.stringify(build.receipt, null, 2) + "\n");
        Object.assign(build.driver, { state: "complete", freshCheckout: true, recipesUnchanged: true, api28RecipesUnchanged: true,
            head: TWELVE_PATCH_HEAD, headAfter: TWELVE_PATCH_HEAD, tree: TWELVE_PATCH_TREE, treeAfter: TWELVE_PATCH_TREE,
            api28Recipes: lock.bindings.api28Recipes, artifact: { bytes: lock.artifact.bytes, sha256: lock.artifact.sha256 },
            startedAt: "2026-09-13T00:00:00Z", buildStartedAt: "2026-09-13T00:00:01Z",
            buildFinishedAt: "2026-09-13T00:01:00Z", finishedAt: "2026-09-13T00:01:01Z",
            receipt: { bytes: receipt.length, sha256: createHash("sha256").update(receipt).digest("hex") } });
    }
    return lock;
}

test("twelve-patch candidate retains independent build evidence and rejects historical acceptance", () => {
    validateTwelvePatchCandidate(fixture());
    assert.throws(() => validateRebasedCandidate(fixture()));
    assert.throws(() => validateTwelvePatchCandidate(loadRebasedJscCandidate()));
    const mutations = [
        x => { x.schemaVersion = 1; }, x => { x.revision = "1.4.0+a9c76a599"; },
        x => { x.bunCommit = loadRebasedJscCandidate().bunCommit; },
        x => { x.artifact.sha256 = loadRebasedJscCandidate().artifact.sha256;
            for (const build of x.builds) build.driver.artifact.sha256 = x.artifact.sha256; },
        x => { x.builds[1].driver.exitCode = null; }, x => { x.builds[1].driver.exitCode = 1; },
        x => { x.builds[1].driver.state = "building"; }, x => { x.builds[1].driver.freshCheckout = false; },
        x => { x.builds[1].driver.cleanAfter = false; }, x => { x.builds[1].driver.treeAfter = "0".repeat(40); },
        x => { x.builds[1].driver.recipesUnchanged = false; }, x => { x.builds[1].driver.api28RecipesUnchanged = false; },
        x => { delete x.builds[1].driver.api28Recipes[API28_RECIPES[0]]; },
        x => { x.builds[1].api28RecipeEncodings[API28_RECIPES[0]] = "utf8-crlf"; },
        x => { x.builds[1].driver.buildFinishedAt = x.builds[1].driver.buildStartedAt; },
        x => { x.builds[1].driver.startedAt = "invalid"; },
        x => { x.builds[1].driver.finishedAt = "2026-09-12T23:59:59Z"; },
        x => { x.bindings.priorRebasedCandidate.sha256 = "0".repeat(64); },
        x => { x.bindings.baselineRuntimeEvidence.sha256 = "0".repeat(64); },
        x => { x.builds[1].inputDriver = x.builds[0].inputDriver; },
        x => { x.builds[1].finalEdges.pop(); }, x => { x.builds[1].driver.receipt.sha256 = "0".repeat(64); },
        x => { x.generatedConfig.sha256 = "0".repeat(64); }, x => { x.distributionReady = true; },
    ];
    for (const mutate of mutations) {
        const changed = fixture(); mutate(changed);
        assert.throws(() => validateTwelvePatchCandidate(changed));
    }
});

test("physical CRLF build inputs remain exact and portable without accepting other byte changes", () => {
    const recipes = structuredClone(twelvePatchSourceBindings().api28Recipes);
    const name = "verify-experiment.mjs";
    const canonical = readFileSync(new URL(`../api28/${name}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
    const crlf = Buffer.from(canonical.replace(/\n/g, "\r\n"));
    recipes[name] = { bytes: crlf.length, sha256: createHash("sha256").update(crlf).digest("hex") };
    assert.equal(verifyApi28RecipeEncodings(recipes)[name], "utf8-crlf");
    const lock = fixture();
    for (const build of lock.builds) {
        build.driver.api28Recipes = structuredClone(recipes);
        build.api28RecipeEncodings = verifyApi28RecipeEncodings(recipes);
    }
    validateTwelvePatchCandidate(lock);
    recipes[name].sha256 = "0".repeat(64);
    assert.throws(() => verifyApi28RecipeEncodings(recipes));
    const partial = Buffer.from(canonical.replace("\n", "\r\n"));
    recipes[name] = { bytes: partial.length, sha256: createHash("sha256").update(partial).digest("hex") };
    assert.throws(() => verifyApi28RecipeEncodings(recipes));
    let line = 0;
    const mixed = Buffer.from(canonical.replace(/\n/g, () => [2, 3].includes(++line) ? "\n" : "\r\n"));
    recipes[name] = { bytes: mixed.length, sha256: createHash("sha256").update(mixed).digest("hex") };
    const encodings = Object.fromEntries(API28_RECIPES.map(name => [name, "utf8-lf"]));
    encodings[name] = { encoding: "utf8-mixed", lfOnlyLines: [2, 3] };
    assert.throws(() => verifyApi28RecipeEncodings(recipes));
    assert.deepEqual(verifyApi28RecipeEncodings(recipes, encodings), encodings);
    encodings[name].lfOnlyLines = [2, 2];
    assert.throws(() => verifyApi28RecipeEncodings(recipes, encodings));
    encodings[name].lfOnlyLines = [2, 4];
    assert.throws(() => verifyApi28RecipeEncodings(recipes, encodings));
});

test("JSC rebase preserves the accepted pressure source, semantic validator and budgets", () => {
    const original = JSON.parse(readFileSync(new URL("../../../../docs/compatibility/2026-09-13-m5-ten-patch-jsc-pressure.json", import.meta.url), "utf8"));
    const fixturePath = "tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/assets/jsc-pressure.mjs";
    const javaPath = "tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/java/JscPressureInstrumentedTest.kt";
    assert.deepEqual(canonicalFacts(new URL("pressure/assets/jsc-pressure.mjs", import.meta.url)),
        { bytes: original.fixture.bytes, sha256: original.fixture.sha256 });
    const java = original.reports[0].build.inputs.find(input => input.path === javaPath);
    assert(java && original.fixture.path === fixturePath);
    assert.deepEqual(canonicalFacts(new URL("pressure/java/JscPressureInstrumentedTest.kt", import.meta.url)), { bytes: java.bytes, sha256: java.sha256 });
    const validator = original.validation.find(input => input.path.endsWith("/pressure/pressure-common.mjs"));
    assert(validator);
    assert.deepEqual(canonicalFacts(new URL("pressure/pressure-common.mjs", import.meta.url)), { bytes: validator.bytes, sha256: validator.sha256 });
});
