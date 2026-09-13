import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { inputFacts, facts, PACKAGE, METHODS, validateMessages } from "./runtime-message-common.mjs";
import { TESTS, validateInstrumentation, validateDevice } from "../bun-runtime/experimental/api28/binder/binder-common.mjs";

// Usage: node archive-runtime-messages.mjs binder|messages|page-refusal OUTPUT.json REPORT_DIRECTORY...
const [scope, output, ...directories] = process.argv.slice(2);
assert(["binder", "messages", "page-refusal"].includes(scope) && output && directories.length);
const inputs = inputFacts(), records = [], devices = new Set();
for (const directory of directories) {
    const reportFile = join(resolve(directory), "report.json");
    const report = JSON.parse(readFileSync(reportFile, "utf8"));
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.kind, "runtime-message-regression");
    assert.equal(report.passed, true);
    assert(!report.error && !report.commandFailure);
    assert.equal(report.package, PACKAGE);
    assert.equal(report.distributionReady, false);
    assert.equal(report.pageRefusal, scope === "page-refusal");
    assert.deepEqual(report.build.inputs, inputs);
    assert.deepEqual(report.apk, report.build.apks[report.expected.abi]);
    assert.deepEqual(report.testApk, report.build.apks.test);
    assert.deepEqual(report.rounds.map(r => r.round), [1, 2]);
    assert.equal(report.cleanup.length, 2);
    assert.deepEqual(report.cleanup.map(c => c.package).sort(), [PACKAGE, PACKAGE + ".test"].sort());
    for (const c of report.cleanup) assert(c.absent === true && c.remainingUidProcesses === 0 && Number.isInteger(c.uid));
    for (const installed of report.installed) {
        assert.equal(installed.installedApkSha256, installed.package === PACKAGE ? report.apk.sha256 : report.testApk.sha256);
        assert.equal(report.cleanup.find(c => c.package === installed.package).uid, installed.uid);
    }
    validateDevice(report.device, report.expected);
    assert(!devices.has(report.serial), "Duplicate device report"); devices.add(report.serial);
    const rounds = [];
    for (const round of report.rounds) {
        assert.deepEqual(round.suites.map(s => s.suite), report.pageRefusal ? ["resources", "pages"] : ["binder", "resources", "errors"]);
        for (const suite of round.suites) {
            assert.equal(suite.status, 0);
            assert.equal(suite.passed, true);
            assert.equal(readFileSync(join(directory, `round-${round.round}-${suite.suite}.txt`), "utf8"), suite.stdout + suite.stderr);
            const validation = suite.suite === "binder" ? validateInstrumentation(suite.stdout) : validateMessages(suite.stdout, suite.suite);
            assert.deepEqual(suite.validation, validation);
        }
        const selected = round.suites.filter(s => scope === "binder" ? s.suite === "binder" : s.suite !== "binder");
        rounds.push({ round: round.round, status: 0,
            passedTests: selected.flatMap(s => s.suite === "binder" ? s.validation : [s.validation.test]),
            raw: selected.map(s => ({ suite: s.suite, stdout: s.stdout, stderr: s.stderr, validation: s.validation })) });
    }
    const { rounds: unused, ...metadata } = report;
    records.push({ ...metadata, sourceReport: facts(reportFile), rounds });
}
const tests = scope === "binder" ? TESTS : [METHODS.resources, scope === "messages" ? METHODS.errors : METHODS.pages];
const archive = { schemaVersion: 1, kind: "runtime-message-" + scope, capturedAt: new Date().toISOString(),
    scope: scope === "binder" ? "Unchanged eight-test Binder suite with the newly localized production service and official Bun; isolated Debug APKs."
        : scope === "messages" ? "Ten-language resources and six real terminal errors with matching finished events; separate presentation suite."
            : "Ten-language cached page-size refusal before Bun execution; official x86_64 remains incompatible with 16 KiB process pages.",
    runtime: { version: "1.4.0", revision: "1.4.0+34cbb9a40", commit: "34cbb9a40b4bd1bd767d134a7065e66c2432a676", variant: "bun-1.4.0-android" },
    tests, records, summary: { deviceCount: records.length, roundCount: records.length * 2,
        passedTests: records.length * 2 * tests.length, totalTests: records.length * 2 * tests.length, failedTests: 0 },
    passed: true, distributionReady: false };
writeFileSync(resolve(output), JSON.stringify(archive, null, 2) + "\n", { flag: "wx" });
console.log(`${scope}: archived ${archive.summary.passedTests}/${archive.summary.totalTests} JUnit tests`);
