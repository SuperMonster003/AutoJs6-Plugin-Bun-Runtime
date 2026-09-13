import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadJscCandidate, verifyJscCandidate } from "./jsc-common.mjs";

export const REBASED_KIND = "clean-rebased-large-page-jsc-candidate";
export const REBASED_HEAD = "a9c76a599bacb75c72d3c00fc6f99c5cc9483b47";
export const REBASED_TREE = "cb762d12f6959834517c79f01f4c538346990962";
// The ten-patch candidate retains its original baseline evidence after the API
// 28 experiment advances. Binder preparation separately requires current source.
const BASELINE_EVIDENCE = new URL("../../../../docs/compatibility/2026-09-13-m2-blocked-pidfd-runtime-evidence.json", import.meta.url);
export const BUILD_RECIPES = Object.freeze([
    "run-clean-bun.mjs", "build-clean-bun.mjs", "jsc-common.mjs", "record-candidate.mjs", "candidate.lock.json",
]);
export function canonicalFacts(path) {
    const data = Buffer.from(readFileSync(path, "utf8").replace(/\r\n/g, "\n"));
    return { bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
}
export function rebasedSourceBindings() {
    return {
        historicalCandidate: canonicalFacts(new URL("candidate.lock.json", import.meta.url)),
        historicalCleanBuilds: canonicalFacts(new URL("../../../../docs/compatibility/2026-09-12-m5-x86-16k-clean-builds.json", import.meta.url)),
        baselineRuntimeEvidence: canonicalFacts(BASELINE_EVIDENCE),
        recipes: Object.fromEntries(BUILD_RECIPES.map(name => [name, canonicalFacts(new URL(name, import.meta.url))])),
    };
}
export function validateRebasedCandidate(lock) {
    return validateCleanRebase(lock, { schemaVersion: 1, head: REBASED_HEAD, tree: REBASED_TREE,
        revision: "1.4.0+a9c76a599", baselineEvidence: BASELINE_EVIDENCE, bindings: rebasedSourceBindings() });
}
// Shared structural checks; public lineage loaders supply fixed source profiles.
export function validateCleanRebase(lock, profile) {
    const historical = loadJscCandidate();
    const cleanHistory = JSON.parse(readFileSync(new URL("../../../../docs/compatibility/2026-09-12-m5-x86-16k-clean-builds.json", import.meta.url), "utf8"));
    const baseline = JSON.parse(readFileSync(profile.baselineEvidence, "utf8"));
    assert.equal(lock.schemaVersion, profile.schemaVersion);
    assert.equal(lock.kind, REBASED_KIND);
    assert.equal(lock.distributionReady, false);
    assert.equal(lock.officialArtifact, false);
    assert.equal(lock.cleanBunBuilds, 2);
    assert.equal(lock.newWebKitBuilds, 0);
    assert.equal(lock.reusedIndependentWebKitBuilds, 2);
    assert.equal(lock.bunCommit, profile.head);
    assert.equal(lock.bunTree, profile.tree);
    assert.equal(baseline.source.downstreamHeadCommit, profile.head);
    assert.equal(lock.revision, profile.revision);
    for (const key of ["variant", "webkitCommit", "hostImage", "sourceDateEpoch", "x86PageSizeCeiling", "config", "generatedConfig", "libraries"]) {
        assert.deepEqual(lock[key], historical[key], `${key}: only Bun is rebased; JSC inputs must remain exact`);
    }
    assert.deepEqual(lock.bindings, profile.bindings);
    assert.equal(lock.artifact.abi, "x86_64");
    assert.notEqual(lock.artifact.sha256, historical.artifact.sha256, "Historical bytes cannot accept a new Bun source");
    assert.notEqual(lock.artifact.sha256, baseline.artifacts.find(a => a.abi === "x86_64").sha256);
    assert.equal(lock.artifact.elf.machine, 62);
    assert.equal(lock.artifact.elf.pie, true);
    assert(lock.artifact.elf.minimumLoadAlignment >= 16384);
    assert.equal(lock.builds.length, 2);
    assert.deepEqual(lock.builds.map(build => build.run), [1, 2]);
    assert.equal(new Set(lock.builds.map(build => build.inputDriver.sha256)).size, 2, "Independent driver receipts required");
    const hashFact = fact => {
        assert(Number.isSafeInteger(fact.bytes) && fact.bytes > 0);
        assert(/^[a-f0-9]{64}$/.test(fact.sha256));
    };
    hashFact(lock.artifact);
    for (const build of lock.builds) {
        const driver = build.driver;
        assert.equal(driver.exitCode, 0, "Require the actual retained build-driver exit, not a dry run");
        assert.equal(driver.head, profile.head);
        assert.equal(driver.headAfter, profile.head);
        assert.equal(driver.tree, profile.tree);
        assert.equal(driver.treeAfter, profile.tree);
        assert.equal(driver.cleanBefore, true);
        assert.equal(driver.cleanAfter, true);
        assert.equal(driver.newWebKitBuilds, 0);
        assert.deepEqual(driver.recipes, lock.bindings.recipes);
        assert.deepEqual(driver.artifact, { bytes: lock.artifact.bytes, sha256: lock.artifact.sha256 });
        for (const key of ["log", "receipt", "ninjaLog"]) hashFact(driver[key]);
        hashFact(build.inputDriver);
        assert.equal(build.receipt.kind, "clean-bun-with-locked-large-page-jsc");
        assert.equal(build.receipt.source, profile.head);
        assert.equal(build.receipt.sourceInputCount, 22);
        assert.equal(build.receipt.cargoArchiveCount, 206);
        assert.equal(build.receipt.bunArchiveCount, 125);
        assert.deepEqual(build.receipt.toolVersions, cleanHistory.bun[0].receipt.toolVersions);
        assert.deepEqual(build.receipt.jsc, historical);
        const receiptBytes = Buffer.from(JSON.stringify(build.receipt, null, 2) + "\n");
        assert.deepEqual(driver.receipt, { bytes: receiptBytes.length,
            sha256: createHash("sha256").update(receiptBytes).digest("hex") }, "Retained build receipt drift");
        assert.deepEqual(build.webkit, { config: historical.generatedConfig, libraries: historical.libraries });
        assert.deepEqual(build.finalEdges.map(edge => edge.output).sort(), ["bun", "bun-profile", "bun-profile.linker-map"]);
        for (const edge of build.finalEdges) {
            assert(Number.isSafeInteger(edge.start) && edge.start >= 0);
            assert(Number.isSafeInteger(edge.end) && edge.end >= edge.start);
            assert(/^[a-f0-9]+$/.test(edge.commandHash));
        }
    }
    assert.deepEqual(lock.builds[0].receipt, lock.builds[1].receipt);
    return lock;
}
export function loadRebasedJscCandidate() {
    return validateRebasedCandidate(JSON.parse(readFileSync(new URL("rebased-candidate.lock.json", import.meta.url), "utf8")));
}
export function verifyRebasedJscCandidate(path, lock = loadRebasedJscCandidate()) {
    validateRebasedCandidate(lock);
    return verifyJscCandidate(path, lock);
}
