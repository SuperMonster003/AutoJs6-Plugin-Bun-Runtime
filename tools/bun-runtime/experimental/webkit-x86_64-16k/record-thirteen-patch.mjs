// Record thirteen-patch Bun builds separately from all three historical JSC candidates.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { inspectElfBuffer } from "../api28/verify-built-runtime.mjs";
import { loadJscCandidate } from "./jsc-common.mjs";
import { verifyJscConfig } from "./record-candidate.mjs";
import { REBASED_KIND } from "./rebased-common.mjs";
import { THIRTEEN_PATCH_HEAD, THIRTEEN_PATCH_TREE, THIRTEEN_PATCH_REVISION, thirteenPatchSourceBindings, validateThirteenPatchCandidate, captureApi28RecipeEncodings } from "./thirteen-patch-common.mjs";

const args = process.argv.slice(2);
assert.equal(args.length, 6, "Two clean Bun checkouts, two original JSC build directories and two driver receipts required");
const [bun1, bun2, webkit1, webkit2, driver1, driver2] = args;
for (const pair of [[bun1, bun2], [webkit1, webkit2], [driver1, driver2]]) assert.notEqual(realpathSync(pair[0]), realpathSync(pair[1]));
const historical = loadJscCandidate();
const facts = path => {
    const data = readFileSync(path);
    return { bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
};
const builds = [bun1, bun2].map((directory, index) => {
    const git = (...args) => execFileSync("git", ["-C", directory, ...args], { encoding: "utf8" }).trim();
    assert.equal(git("rev-parse", "HEAD"), THIRTEEN_PATCH_HEAD);
    assert.equal(git("rev-parse", "HEAD^{tree}"), THIRTEEN_PATCH_TREE);
    assert.equal(git("status", "--porcelain"), "");
    const build = join(directory, "build/autojs6-api28/x86_64");
    const driverPath = [driver1, driver2][index];
    const original = JSON.parse(readFileSync(driverPath, "utf8"));
    assert.equal(original.run, index + 1);
    const api28RecipeEncodings = captureApi28RecipeEncodings(original.api28Recipes);
    for (const [name, fact] of Object.entries(original.api28Recipes)) {
        assert.deepEqual(fact, facts(new URL(`../api28/${name}`, import.meta.url)), `${name}: physical recipe bytes changed after the build`);
    }
    assert.deepEqual(original.artifact, facts(join(build, "bun")));
    assert.deepEqual(original.receipt, facts(join(build, "jsc-clean-build.json")));
    assert.deepEqual(original.ninjaLog, facts(join(build, ".ninja_log")));
    const log = join(dirname(driverPath), `native-run-${index + 1}.log`);
    assert.deepEqual(original.log, facts(log));
    const transcript = readFileSync(log, "utf8");
    assert.match(transcript, /^\[\d+\/\d+\] link bun-profile\r?$/m);
    assert.match(transcript, /^\[\d+\/\d+\] strip bun\r?$/m);
    const rows = readFileSync(join(build, ".ninja_log"), "utf8").trim().split("\n").slice(1).map(line => line.split("\t"));
    const finalEdges = ["bun-profile", "bun-profile.linker-map", "bun"].map(output => {
        const matches = rows.filter(row => row[3] === output);
        assert.equal(matches.length, 1, `Exactly one final clean-build edge required for ${output}`);
        const [start, end, , , commandHash] = matches[0];
        return { output, start: Number(start), end: Number(end), commandHash };
    });
    const jscDirectory = [webkit1, webkit2][index];
    verifyJscConfig(readFileSync(join(jscDirectory, "cmakeconfig.h"), "utf8"));
    const webkit = { config: facts(join(jscDirectory, "cmakeconfig.h")), libraries: Object.fromEntries(
        Object.keys(historical.libraries).map(name => [name, facts(join(jscDirectory, "lib", name))])) };
    // Host paths remain in the local driver receipt, bound by its digest below.
    const { command, run, driverPid, ...driver } = original;
    return { run, inputDriver: facts(driverPath), driver, finalEdges, webkit,
        api28RecipeEncodings,
        receipt: JSON.parse(readFileSync(join(build, "jsc-clean-build.json"), "utf8")) };
});
const path = join(bun1, "build/autojs6-api28/x86_64/bun");
const lock = { schemaVersion: 2, kind: REBASED_KIND, evidenceDate: new Date().toISOString().slice(0, 10),
    distributionReady: false, officialArtifact: false, cleanBunBuilds: 2, newWebKitBuilds: 0, reusedIndependentWebKitBuilds: 2,
    bunCommit: THIRTEEN_PATCH_HEAD, bunTree: THIRTEEN_PATCH_TREE, revision: THIRTEEN_PATCH_REVISION,
    ...Object.fromEntries(["variant", "webkitCommit", "hostImage", "sourceDateEpoch", "x86PageSizeCeiling", "config", "generatedConfig", "libraries"].map(key => [key, historical[key]])),
    bindings: thirteenPatchSourceBindings(), artifact: { abi: "x86_64", ...facts(path), elf: inspectElfBuffer(readFileSync(path)) }, builds,
    limits: ["Two new independent clean Bun builds; exact prior independently built JSC libraries/config and upstream ICU reused",
        "No new WebKit/ICU compilation or device acceptance inferred from these builds", "Official, baseline thirteen-patch and historical nine/ten/twelve-patch payload evidence unchanged", "Not Release acceptance"],
};
validateThirteenPatchCandidate(lock);
const output = resolve(dirname(fileURLToPath(import.meta.url)), "thirteen-patch-candidate.lock.json");
writeFileSync(output, JSON.stringify(lock, null, 2) + "\n", { flag: "wx" });
console.log(`Thirteen-patch candidate recorded: ${lock.artifact.sha256}; two actual build-driver exits 0`);
