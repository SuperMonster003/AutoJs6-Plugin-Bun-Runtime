import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyJscCandidate } from "./jsc-common.mjs";
import { BUILD_RECIPES, canonicalFacts, loadRebasedJscCandidate, validateCleanRebase } from "./rebased-common.mjs";
import { API28_RECIPES, loadTwelvePatchJscCandidate, validateCurrentBuildDrivers } from "./twelve-patch-common.mjs";

export { captureApi28RecipeEncodings } from "./twelve-patch-common.mjs";
export const THIRTEEN_PATCH_HEAD = "e8b1296169a8e6f20c81e926dba6448afb25cd11";
export const THIRTEEN_PATCH_TREE = "7d715cd177328d44b12b6346bcf0e07e835b3578";
export const THIRTEEN_PATCH_REVISION = "1.4.0+e8b129616";
export const THIRTEEN_PATCH_BASELINE = new URL("../../../../docs/compatibility/2026-09-13-m2-watch-reload-runtime-evidence.json", import.meta.url);

export function thirteenPatchSourceBindings() {
    return {
        historicalCandidate: canonicalFacts(new URL("candidate.lock.json", import.meta.url)),
        historicalCleanBuilds: canonicalFacts(new URL("../../../../docs/compatibility/2026-09-12-m5-x86-16k-clean-builds.json", import.meta.url)),
        priorRebasedCandidate: canonicalFacts(new URL("rebased-candidate.lock.json", import.meta.url)),
        priorTwelvePatchCandidate: canonicalFacts(new URL("twelve-patch-candidate.lock.json", import.meta.url)),
        baselineRuntimeEvidence: canonicalFacts(THIRTEEN_PATCH_BASELINE),
        recipes: Object.fromEntries(BUILD_RECIPES.map(name => [name, canonicalFacts(new URL(name, import.meta.url))])),
        api28Recipes: Object.fromEntries(API28_RECIPES.map(name => [name, canonicalFacts(new URL(`../api28/${name}`, import.meta.url))])),
    };
}

export function validateThirteenPatchCandidate(lock) {
    validateCleanRebase(lock, { schemaVersion: 2, head: THIRTEEN_PATCH_HEAD, tree: THIRTEEN_PATCH_TREE,
        revision: THIRTEEN_PATCH_REVISION, baselineEvidence: THIRTEEN_PATCH_BASELINE,
        bindings: thirteenPatchSourceBindings() });
    for (const historical of [loadRebasedJscCandidate(), loadTwelvePatchJscCandidate()])
        assert.notEqual(lock.artifact.sha256, historical.artifact.sha256, "Historical JSC bytes cannot accept thirteen-patch source");
    return validateCurrentBuildDrivers(lock);
}

export function loadThirteenPatchJscCandidate() {
    return validateThirteenPatchCandidate(JSON.parse(readFileSync(new URL("thirteen-patch-candidate.lock.json", import.meta.url), "utf8")));
}

export function verifyThirteenPatchJscCandidate(path, lock = loadThirteenPatchJscCandidate()) {
    validateThirteenPatchCandidate(lock);
    return verifyJscCandidate(path, lock);
}
