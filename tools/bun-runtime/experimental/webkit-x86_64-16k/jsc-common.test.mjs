import assert from "node:assert/strict";
import test from "node:test";
import { REQUIRED_CONFIG, verifyJscConfig } from "./record-candidate.mjs";
import { loadJscCandidate } from "./jsc-common.mjs";

const config = Object.entries(REQUIRED_CONFIG).map(([name, value]) => `#define ${name} ${value}`).join("\n");

test("large-page JSC explicitly retains all JIT and allocator settings", () => {
    assert.deepEqual(verifyJscConfig(config), REQUIRED_CONFIG);
    assert.deepEqual(verifyJscConfig(config.replaceAll("\n", "\r\n")), REQUIRED_CONFIG);
    for (const [name, value] of Object.entries(REQUIRED_CONFIG)) {
        assert.throws(() => verifyJscConfig(config.replace(`#define ${name} ${value}`, "")));
        assert.throws(() => verifyJscConfig(config.replace(`#define ${name} ${value}`, `#define ${name} ${1 - value}`)));
        assert.throws(() => verifyJscConfig(config + `\n#define ${name} ${value}`));
    }
});

test("candidate identity remains separate from official and release acceptance", () => {
    const lock = loadJscCandidate();
    assert.equal(lock.distributionReady, false);
    assert.equal(lock.officialArtifact, false);
    assert.equal(lock.cleanBunBuilds, 0); // Diagnostic origin; later rebuild evidence is a separate receipt.
    assert.equal(lock.artifact.elf.machine, 62);
    assert.equal(lock.artifact.elf.pie, true);
    assert(lock.artifact.elf.minimumLoadAlignment >= 16384);
});
