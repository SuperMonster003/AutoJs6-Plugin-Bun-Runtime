// Archive exact retained observations, never regenerate a historical device run.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { facts, TESTS, validateDevice, validateInstrumentation } from "./binder-common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const [output, scope, ...directories] = process.argv.slice(2);
assert(output && ["baseline", "jsc16k"].includes(scope) && directories.length > 0,
    "Usage: node archive-binder.mjs <new-report.json> <baseline|jsc16k> <run-directory>...");
const target = resolve(output);
assert(target.startsWith(resolve(root, "docs/compatibility") + "/") ||
    target.startsWith(resolve(root, "docs/compatibility") + "\\"));
const reports = directories.map(directory => {
    const path = join(directory, "report.json");
    const record = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(record.passed, true);
    assert.equal(record.distributionReady, false);
    assert.equal(record.finalUidProcesses, 0);
    assert.equal(record.rounds.length, 2);
    assert.equal(record.cleanup.length, 2);
    assert(record.cleanup.every(item => item.uninstalled === true));
    assert.equal(record.installedApkSha256, record.apk.sha256);
    validateDevice(record.device, record.expected);
    assert.equal(Boolean(record.build.jscCandidate), scope === "jsc16k");
    for (const round of record.rounds) {
        assert.equal(round.status, 0);
        assert.equal(round.remainingUidProcesses, 0);
        assert.deepEqual(validateInstrumentation(round.stdout), round.passedTests);
        assert.equal(readFileSync(join(directory, `round-${round.round}.txt`), "utf8"), round.stdout + round.stderr);
    }
    return { inputReport: facts(path), ...record };
});
const distinct = new Set(reports.map(r => `${r.serial}/${r.device.api}/${r.device.abi}/${r.device.pages}`));
assert.equal(distinct.size, reports.length, "Repeated candidate runs cannot inflate the device matrix");
const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
assert.equal(git.status, 0);
const validation = ["binder-common.mjs", "run-binder.mjs", "archive-binder.mjs"].map(name => ({
    path: `tools/bun-runtime/experimental/api28/binder/${name}`,
    ...facts(new URL(name, import.meta.url)),
}));
writeFileSync(target, JSON.stringify({ schemaVersion: 1, evidenceDate: "2026-09-12",
    kind: `${scope}-experimental-plugin-binder`, projectBaseCommit: git.stdout.trim(),
    passed: true, distributionReady: false, productionReleaseAcceptance: false,
    scope: "Two process-restarted rounds of the existing complete eight-test plugin Binder suite per native environment. Not the full Bun/syscall/API/FD or Release matrix.",
    sourceBinding: "Each retained APK embeds the exact build-input receipt shown below; later documentation-only builds are not substituted for these tested bytes.",
    officialMinimumApi: 33, officialBunAndSupervisorUnchanged: true, tests: TESTS,
    summary: { environments: reports.length, rounds: reports.length * 2,
        passedTests: reports.length * 2 * TESTS.length, totalTests: reports.length * 2 * TESTS.length,
        lifecycleObservations: reports.length * 2 * 5 },
    validation, reports,
}, null, 2) + "\n", { flag: "wx" });
console.log(`Archived ${reports.length * 2 * TESTS.length} passing Binder observations: ${target}`);
