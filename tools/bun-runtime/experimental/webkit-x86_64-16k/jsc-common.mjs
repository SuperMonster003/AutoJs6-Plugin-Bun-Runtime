import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inspectElfBuffer } from "../api28/verify-built-runtime.mjs";
import { REQUIRED_CONFIG } from "./record-candidate.mjs";

export function loadJscCandidate() {
    const lock = JSON.parse(readFileSync(new URL("./candidate.lock.json", import.meta.url), "utf8"));
    assert.equal(lock.schemaVersion, 1);
    assert.equal(lock.kind, "diagnostic-incremental-large-page-jsc-candidate");
    assert.equal(lock.distributionReady, false);
    assert.equal(lock.officialArtifact, false);
    assert.equal(lock.bunCommit, "7b9ac266888abda7ee6ec0b8ac11a74236420030");
    assert.equal(lock.webkitCommit, "0f966e81b78c84bb23213e391bc679c4ef83e56b");
    assert.deepEqual(lock.config, REQUIRED_CONFIG);
    assert.equal(lock.x86PageSizeCeiling, 65536);
    assert.equal(lock.artifact.abi, "x86_64");
    assert.deepEqual(lock.recipes.map(recipe => recipe.path), ["build-webkit.sh", "relink-bun.sh"]);
    for (const recipe of lock.recipes) {
        const data = Buffer.from(readFileSync(new URL(recipe.path, import.meta.url), "utf8").replace(/\r\n/g, "\n"));
        assert.equal(data.length, recipe.bytes, `${recipe.path}: recipe length drift`);
        assert.equal(createHash("sha256").update(data).digest("hex"), recipe.sha256, `${recipe.path}: recipe drift`);
    }
    return lock;
}
export function verifyJscCandidate(path, lock = loadJscCandidate()) {
    const data = readFileSync(path);
    assert.equal(data.length, lock.artifact.bytes);
    assert.equal(createHash("sha256").update(data).digest("hex"), lock.artifact.sha256);
    assert.deepEqual(inspectElfBuffer(data), lock.artifact.elf);
    return path;
}
