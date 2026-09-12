// A separate receipt preserves the diagnostic candidate's historical origin.
import assert from "node:assert/strict";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadJscCandidate, verifyJscCandidate } from "./jsc-common.mjs";
import { verifyJscConfig } from "./record-candidate.mjs";
import { facts } from "../api28/binder/binder-common.mjs";

const [output, webkit1, webkit2, bun1, bun2] = process.argv.slice(2);
assert.equal(process.argv.length, 7, "Expected new receipt path, two WebKit build dirs and two fresh Bun checkout dirs");
assert.notEqual(realpathSync(webkit1), realpathSync(webkit2));
assert.notEqual(realpathSync(bun1), realpathSync(bun2));
const lock = loadJscCandidate();
const webkit = [webkit1, webkit2].map(directory => {
    verifyJscConfig(readFileSync(join(directory, "cmakeconfig.h"), "utf8"));
    const config = facts(join(directory, "cmakeconfig.h"));
    assert.deepEqual(config, lock.generatedConfig);
    const libraries = Object.fromEntries(Object.keys(lock.libraries).map(name => [name, facts(join(directory, "lib", name))]));
    assert.deepEqual(libraries, lock.libraries);
    return { config, libraries };
});
const bun = [bun1, bun2].map(directory => {
    const build = join(directory, "build/autojs6-api28/x86_64");
    const receipt = JSON.parse(readFileSync(join(build, "jsc-clean-build.json"), "utf8"));
    assert.equal(receipt.kind, "clean-bun-with-locked-large-page-jsc");
    assert.deepEqual(receipt.jsc, lock);
    assert.equal(receipt.source, lock.bunCommit);
    assert.equal(receipt.cargoArchiveCount, 206);
    assert.equal(receipt.bunArchiveCount, 125);
    verifyJscCandidate(join(build, "bun"), lock);
    return { artifact: facts(join(build, "bun")), receipt };
});
const recipes = ["build-webkit.sh", "run-clean-bun.mjs", "build-clean-bun.mjs", "record-rebuilds.mjs"].map(path => ({
    path, ...facts(new URL(path, import.meta.url)),
}));
writeFileSync(output, JSON.stringify({ schemaVersion: 1, evidenceDate: "2026-09-12",
    kind: "independent-clean-large-page-jsc-and-bun-rebuilds", distributionReady: false,
    passed: true, cleanWebKitBuilds: 2, cleanBunBuilds: 2, matchesDiagnosticCandidate: true,
    scope: "Two fresh WebKit build trees and two fresh nine-patch Bun checkouts, canonical container paths, locked offline inputs; upstream ICU reused. Not device or Release acceptance.",
    candidateLock: facts(new URL("candidate.lock.json", import.meta.url)), recipes, webkit, bun,
}, null, 2) + "\n", { flag: "wx" });
console.log("Two independent clean WebKit and Bun builds match the exact Binder-tested candidate");
