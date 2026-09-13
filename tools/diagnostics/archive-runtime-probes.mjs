import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { facts, METHODS, validateMessages } from "./runtime-message-common.mjs";
import { PROBE_TESTS, probeInputs, validateProbeLifecycle } from "./probe-lifecycle-common.mjs";
import { TESTS, validateInstrumentation, validateDevice } from "../bun-runtime/experimental/api28/binder/binder-common.mjs";

const [mode, scope, output, ...directories] = process.argv.slice(2);
assert(["official", "experimental"].includes(mode) && ["binder", "probe", "messages"].includes(scope) && output && directories.length);
assert(scope !== "messages" || mode === "official");
const inputs = probeInputs(mode), records = [], devices = new Set();
const pkg = "io.github.supermonster003.autojs6.plugin.bun.runtime." + (mode === "official" ? "diagnostics" : "api28binder");
const suites = mode === "official" ? ["binder", "probe", "resources", "errors"] : ["binder", "probe"];
const validate = (text, suite) => suite === "binder" ? validateInstrumentation(text)
    : suite === "probe" ? validateProbeLifecycle(text) : validateMessages(text, suite);
for (const directory of directories) {
    const source = join(resolve(directory), "report.json");
    const report = JSON.parse(readFileSync(source, "utf8"));
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.kind, "probe-lifecycle-regression");
    assert.equal(report.mode, mode);
    assert.equal(report.passed, true);
    assert(!report.error && !report.commandFailure);
    assert.equal(report.distributionReady, false);
    assert.equal(report.package, pkg);
    assert.deepEqual(report.suites, suites);
    assert.deepEqual(report.build.inputs, inputs);
    assert.equal(report.build.kind, "probe-lifecycle-build");
    assert.equal(report.build.mode, mode);
    assert.equal(report.build.exitCode, 0);
    assert.equal(report.build.sourceSnapshotUnchanged, true);
    assert.deepEqual(report.apk, report.build.apks[report.expected.abi]);
    assert.deepEqual(report.testApk, report.build.apks.test);
    assert.equal(report.signatures.length, 2);
    assert.equal(report.signatures[0].certificateSha256, report.signatures[1].certificateSha256);
    assert.match(report.signatures[0].certificateSha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(report.rounds.map(r => r.round), [1, 2]);
    assert.equal(report.cleanup.length, 2);
    assert.deepEqual(report.cleanup.map(c => c.package).sort(), [pkg, pkg + ".test"].sort());
    assert.equal(report.installed.length, 2);
    assert.deepEqual(report.installed.map(c => c.package).sort(), [pkg, pkg + ".test"].sort());
    for (const c of report.cleanup) assert(c.absent === true && c.remainingUidProcesses === 0 && Number.isInteger(c.uid));
    for (const installed of report.installed) {
        assert.equal(installed.installedApkSha256, installed.package === pkg ? report.apk.sha256 : report.testApk.sha256);
        assert.equal(report.cleanup.find(c => c.package === installed.package).uid, installed.uid);
    }
    validateDevice(report.device, report.expected);
    assert(!devices.has(report.serial), "Duplicate device report"); devices.add(report.serial);
    if (records.length) assert.deepEqual(report.runtime, records[0].runtime, "Mixed runtime sources");
    const rounds = [];
    for (const round of report.rounds) {
        assert.deepEqual(round.suites.map(s => s.suite), suites);
        for (const suite of round.suites) {
            assert.equal(suite.status, 0);
            assert.equal(suite.passed, true);
            assert.equal(readFileSync(join(directory, `round-${round.round}-${suite.suite}.txt`), "utf8"), suite.stdout + suite.stderr);
            assert.deepEqual(suite.validation, validate(suite.stdout, suite.suite));
        }
        const selected = round.suites.filter(s => scope === "messages" ? ["resources", "errors"].includes(s.suite) : s.suite === scope);
        rounds.push({ round: round.round, status: 0,
            passedTests: selected.flatMap(s => s.suite === "binder" ? s.validation : s.suite === "probe" ? s.validation.tests : [s.validation.test]),
            raw: selected.map(s => ({ suite: s.suite, stdout: s.stdout, stderr: s.stderr, validation: s.validation })) });
    }
    const { rounds: unused, ...metadata } = report;
    records.push({ ...metadata, sourceReport: facts(source), rounds });
}
const tests = scope === "binder" ? TESTS : scope === "probe" ? Object.keys(PROBE_TESTS) : [METHODS.resources, METHODS.errors];
const archive = { schemaVersion: 1, kind: `runtime-probe-${mode}-${scope}`, capturedAt: new Date().toISOString(),
    scope: scope === "binder" ? "Unchanged eight-test Binder suite with revised production readiness diagnostics/cache; separately bound Debug batch."
        : scope === "probe" ? "Controlled readiness lifecycle: injected launch/version failures and virtual cooldown; real installed runtime command output/timeout/exit controls. Not seccomp or full native-probe acceptance."
            : "Ten-language resources and six terminal errors per locale with matching finished events after readiness changes.",
    runtime: records[0].runtime, tests, records,
    summary: { deviceCount: records.length, roundCount: records.length * 2,
        passedTests: records.length * 2 * tests.length, totalTests: records.length * 2 * tests.length, failedTests: 0 },
    passed: true, distributionReady: false };
writeFileSync(resolve(output), JSON.stringify(archive, null, 2) + "\n", { flag: "wx" });
console.log(`${mode}/${scope}: archived ${archive.summary.passedTests}/${archive.summary.totalTests}`);
