import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalFacts, loadRebasedJscCandidate } from "./rebased-common.mjs";
import { API28_RECIPES, loadTwelvePatchJscCandidate, validateArchivedTwelvePatchCandidate } from "./twelve-patch-common.mjs";
import { THIRTEEN_PATCH_HEAD, THIRTEEN_PATCH_TREE, THIRTEEN_PATCH_REVISION,
    thirteenPatchSourceBindings, validateThirteenPatchCandidate } from "./thirteen-patch-common.mjs";

// Synthetic metadata exercises rejection before a native build completes. It
// is never written as a candidate or counted as a successful build/device run.
function fixture() {
    const lock = structuredClone(loadTwelvePatchJscCandidate());
    Object.assign(lock, { bunCommit: THIRTEEN_PATCH_HEAD, bunTree: THIRTEEN_PATCH_TREE,
        revision: THIRTEEN_PATCH_REVISION, bindings: thirteenPatchSourceBindings() });
    lock.artifact.sha256 = "a".repeat(64);
    for (const build of lock.builds) {
        build.api28RecipeEncodings = Object.fromEntries(API28_RECIPES.map(name => [name, "utf8-lf"]));
        build.receipt.source = THIRTEEN_PATCH_HEAD;
        const receipt = Buffer.from(JSON.stringify(build.receipt, null, 2) + "\n");
        Object.assign(build.driver, { head: THIRTEEN_PATCH_HEAD, headAfter: THIRTEEN_PATCH_HEAD,
            tree: THIRTEEN_PATCH_TREE, treeAfter: THIRTEEN_PATCH_TREE, api28Recipes: lock.bindings.api28Recipes,
            artifact: { bytes: lock.artifact.bytes, sha256: lock.artifact.sha256 },
            receipt: { bytes: receipt.length, sha256: createHash("sha256").update(receipt).digest("hex") } });
    }
    return lock;
}

test("thirteen-patch source requires new independent builds and preserves historical loading", () => {
    validateThirteenPatchCandidate(fixture());
    const historical = [loadRebasedJscCandidate(), loadTwelvePatchJscCandidate()];
    for (const prior of historical) {
        assert.throws(() => validateThirteenPatchCandidate(prior));
        const relabeled = fixture();
        relabeled.artifact.sha256 = prior.artifact.sha256;
        for (const build of relabeled.builds) build.driver.artifact.sha256 = prior.artifact.sha256;
        assert.throws(() => validateThirteenPatchCandidate(relabeled));
    }
    assert.throws(() => validateArchivedTwelvePatchCandidate(fixture()));
    validateArchivedTwelvePatchCandidate(loadTwelvePatchJscCandidate());
});

test("new-source candidate rejects missing actual exits, byte drift and incomplete final edges", () => {
    const mutations = [
        x => { x.bunCommit = loadTwelvePatchJscCandidate().bunCommit; },
        x => { x.bunTree = "0".repeat(40); }, x => { x.revision = "1.4.0+06e518f73"; },
        x => { x.builds[1].driver.exitCode = null; }, x => { x.builds[1].driver.exitCode = 1; },
        x => { x.builds[1].driver.state = "building"; }, x => { x.builds[1].driver.freshCheckout = false; },
        x => { x.builds[1].driver.cleanAfter = false; }, x => { x.builds[1].driver.headAfter = x.builds[0].driver.tree; },
        x => { x.builds[1].driver.recipesUnchanged = false; }, x => { x.builds[1].driver.api28RecipesUnchanged = false; },
        x => { x.builds[1].inputDriver = x.builds[0].inputDriver; },
        x => { x.builds[1].driver.buildFinishedAt = x.builds[1].driver.buildStartedAt; },
        x => { x.builds[1].driver.finishedAt = "invalid"; },
        x => { x.builds[1].driver.api28Recipes = structuredClone(x.builds[1].driver.api28Recipes);
            x.builds[1].driver.api28Recipes[API28_RECIPES[0]].sha256 = "0".repeat(64); },
        x => { x.builds[1].api28RecipeEncodings[API28_RECIPES[0]] = "utf8-crlf"; },
        x => { x.builds[1].finalEdges.pop(); }, x => { x.builds[1].driver.receipt.sha256 = "0".repeat(64); },
        x => { x.bindings.priorTwelvePatchCandidate.sha256 = "0".repeat(64); },
        x => { x.bindings.baselineRuntimeEvidence.sha256 = "0".repeat(64); },
        x => { x.generatedConfig.sha256 = "0".repeat(64); },
        x => { x.newWebKitBuilds = 2; }, x => { x.distributionReady = true; },
    ];
    for (const mutate of mutations) {
        const changed = fixture(); mutate(changed);
        assert.throws(() => validateThirteenPatchCandidate(changed));
    }
});

test("thirteen-patch work retains the exact fixed pressure source, Java and semantic validator", () => {
    const original = JSON.parse(readFileSync(new URL("../../../../docs/compatibility/2026-09-13-m5-twelve-patch-jsc-pressure.json", import.meta.url), "utf8"));
    const javaPath = "tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/java/JscPressureInstrumentedTest.kt";
    const java = original.reports[0].build.inputs.find(input => input.path === javaPath);
    const validator = original.validation.find(input => input.path.endsWith("/pressure/pressure-common.mjs"));
    for (const [path, bound] of [["pressure/assets/jsc-pressure.mjs", original.fixture],
        ["pressure/java/JscPressureInstrumentedTest.kt", java], ["pressure/pressure-common.mjs", validator]]) {
        assert(bound);
        assert.deepEqual(canonicalFacts(new URL(path, import.meta.url)), { bytes: bound.bytes, sha256: bound.sha256 });
    }
});
