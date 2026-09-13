import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadJscCandidate } from "./jsc-common.mjs";
import { REBASED_KIND, REBASED_HEAD, REBASED_TREE, rebasedSourceBindings, validateRebasedCandidate } from "./rebased-common.mjs";

// Synthetic metadata exercises rejection gates, never a claim of actual builds.
function fixture() {
    const historical = loadJscCandidate();
    const earlier = JSON.parse(readFileSync(new URL("../../../../docs/compatibility/2026-09-12-m5-x86-16k-clean-builds.json", import.meta.url), "utf8"));
    const bindings = rebasedSourceBindings();
    const artifact = { ...historical.artifact, sha256: "a".repeat(64) };
    const receipt = { ...earlier.bun[0].receipt, source: REBASED_HEAD };
    const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n");
    const hash = { bytes: 100, sha256: "b".repeat(64) };
    return { ...historical, kind: REBASED_KIND, cleanBunBuilds: 2, newWebKitBuilds: 0, reusedIndependentWebKitBuilds: 2,
        bunCommit: REBASED_HEAD, bunTree: REBASED_TREE, revision: "1.4.0+a9c76a599", bindings, artifact,
        builds: [1, 2].map(run => ({ run, inputDriver: { bytes: 100, sha256: String(run).repeat(64) }, receipt,
            webkit: { config: historical.generatedConfig, libraries: historical.libraries },
            driver: { exitCode: 0, cleanBefore: true, cleanAfter: true, head: REBASED_HEAD, headAfter: REBASED_HEAD,
                tree: REBASED_TREE, treeAfter: REBASED_TREE, newWebKitBuilds: 0, recipes: bindings.recipes,
                artifact: { bytes: artifact.bytes, sha256: artifact.sha256 }, log: hash, ninjaLog: hash,
                receipt: { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") } },
            finalEdges: ["bun-profile", "bun-profile.linker-map", "bun"].map(output => ({ output, start: 1, end: 2, commandHash: "123abc" })),
        })),
    };
}
test("rebased candidate keeps original JSC provenance and requires two actual successful clean Bun receipts", () => {
    validateRebasedCandidate(fixture());
    const mutations = [
        x => { x.bunCommit = loadJscCandidate().bunCommit; },
        x => { x.artifact.sha256 = loadJscCandidate().artifact.sha256; },
        x => { x.artifact.elf.machine = 183; }, x => { x.artifact.elf.minimumLoadAlignment = 4096; },
        x => { x.distributionReady = true; }, x => { x.officialArtifact = true; },
        x => { x.cleanBunBuilds = 1; }, x => { x.newWebKitBuilds = 2; },
        x => { x.libraries["libJavaScriptCore.a"].sha256 = "e".repeat(64); },
        x => { x.config.ENABLE_FTL_JIT = 0; }, x => { x.bindings.baselineRuntimeEvidence.sha256 = "c".repeat(64); },
        x => { x.builds[1].run = 1; }, x => { x.builds[1].inputDriver = x.builds[0].inputDriver; },
        x => { x.builds[1].driver.exitCode = null; }, x => { x.builds[1].driver.exitCode = 1; },
        x => { x.builds[1].driver.cleanAfter = false; }, x => { x.builds[1].driver.headAfter = loadJscCandidate().bunCommit; },
        x => { x.builds[1].driver.artifact.sha256 = "d".repeat(64); },
        x => { x.builds[1].receipt.sourceInputCount = 21; },
        x => { x.builds[1].receipt.toolVersions.node = "wrong"; },
        x => { x.builds[1].finalEdges.pop(); }, x => { x.builds[1].finalEdges[0].end = 0; },
        x => { x.builds[1].driver.receipt.sha256 = "0".repeat(64); },
    ];
    for (const mutate of mutations) {
        const value = structuredClone(fixture());
        // Mutations themselves must succeed; the validator is what must reject them.
        mutate(value);
        assert.throws(() => validateRebasedCandidate(value));
    }
});
