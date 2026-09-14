import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { TRACE_KIND, TRACE_TEST, validateTraceInstrumentation, fixtureFacts, MAP_MODES, summarizeTraceObservations, verifyWorkloadPreserved } from "./trace-common.mjs";
import { PACKAGE, buildInputs, facts, validateDevice } from "../../api28/binder/binder-common.mjs";
import { loadThirteenPatchJscCandidate, THIRTEEN_PATCH_BASELINE } from "../thirteen-patch-common.mjs";
import { countUidProcesses } from "../../api28/app-probe/probe-common.mjs";
import { supervisorArtifacts } from "../../../supervisor/supervisor-common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const pkg = PACKAGE + ".jsc16k";
export function validateTraceRun(r, raw) {
    verifyWorkloadPreserved();
    assert.equal(r.schemaVersion, 1); assert.equal(r.kind, TRACE_KIND);
    assert.equal(r.passed, true); // Complete diagnostic collection, never compatibility.
    assert.equal(r.compatibilityAcceptance, false); assert.equal(r.distributionReady, false);
    for (const key of ["error", "cleanupError", "commandFailure"]) assert(!Object.hasOwn(r, key));
    assert.equal(r.package, pkg); assert.equal(r.expected.api, 36); assert.equal(r.expected.abi, "x86_64");
    assert([4096, 16384].includes(r.expected.pages)); validateDevice(r.device, r.expected);
    assert.deepEqual(Object.keys(r.packageUids).sort(), [pkg, pkg + ".test"].sort());
    for (const uid of Object.values(r.packageUids)) assert(Number.isSafeInteger(uid) && uid >= 10000 && uid % 100000 >= 10000);
    assert.equal(r.packageUids[pkg], r.uid);
    assert.equal(r.finalUidProcesses, 0); assert.equal(r.finalPackageListing, "");
    assert(typeof r.finalProcessListing === "string" && Buffer.byteLength(r.finalProcessListing) <= 2 * 1024 * 1024);
    assert.match(r.finalProcessListing, /^UID\s+PID\s+NAME/);
    for (const uid of Object.values(r.packageUids)) assert.equal(countUidProcesses(r.finalProcessListing, uid), 0);
    assert.deepEqual(r.finalPackageUidProcesses, { [pkg]: 0, [pkg + ".test"]: 0 });
    assert.deepEqual(r.cleanup, [{ package: pkg + ".test", uninstalled: true }, { package: pkg, uninstalled: true }]);
    const candidate = loadThirteenPatchJscCandidate();
    const baseline = JSON.parse(readFileSync(THIRTEEN_PATCH_BASELINE, "utf8"));
    assert.deepEqual(r.build.inputs, buildInputs(), "Archive before compiled inputs change");
    assert.deepEqual(r.build.jscCandidate, candidate); assert.deepEqual(r.build.source, baseline.source);
    assert.deepEqual(r.runtime, { ...baseline.identity, variant: candidate.variant });
    assert.deepEqual(r.build.runtime, r.runtime);
    assert.deepEqual(r.build.runtimes, baseline.artifacts.map(a => a.abi === "x86_64" ? candidate.artifact : a)
        .map(({ abi, bytes, sha256 }) => ({ abi, bytes, sha256 })));
    assert.equal(r.payloads.length, 1);
    const payload = r.payloads[0], helper = supervisorArtifacts.get("x86_64");
    assert.equal(payload.abi, "x86_64"); assert.equal(payload.entry, "lib/x86_64/libbun_exec.so");
    assert.equal(payload.sha256, candidate.artifact.sha256); assert.equal(payload.bytes, candidate.artifact.bytes);
    assert.equal(payload.supervisor.entry, "lib/x86_64/libbun_supervisor.so");
    assert.equal(payload.supervisor.sha256, helper.binarySha256); assert.equal(payload.supervisor.bytes, helper.binaryBytes);
    for (const key of ["apk", "testApk"]) {
        assert(/^[a-f0-9]{64}$/.test(r[key].sha256)); assert(Number.isSafeInteger(r[key].bytes) && r[key].bytes > 0);
    }
    assert.equal(r.installedApkSha256, r.apk.sha256); assert.equal(r.installedTestApkSha256, r.testApk.sha256);
    assert.equal(r.signatures.length, 2);
    for (const s of r.signatures) {
        assert.equal(s.signerCount, 1); assert(s.verifiedSchemes.includes("v2")); assert(/^[a-f0-9]{64}$/.test(s.certificateSha256));
    }
    assert.equal(r.signatures[0].certificateSha256, r.signatures[1].certificateSha256);
    assert.equal(r.rounds.length, 2); assert.equal(raw.length, 2);
    for (const [i, round] of r.rounds.entries()) {
        assert.equal(round.round, i + 1); assert.equal(round.status, 0); assert.equal(round.stderr, "");
        assert.equal(round.remainingUidProcesses, 0); assert(!Object.hasOwn(round, "error"));
        assert.equal(raw[i], round.stdout + round.stderr);
        assert.deepEqual(round.passedTests, [TRACE_TEST]);
        assert.deepEqual(round.trace, validateTraceInstrumentation(round.stdout, r.expected.pages, round.round));
        for (const memory of Object.values(round.memory)) {
            assert(typeof memory === "string" && Buffer.byteLength(memory) <= 32768);
            assert.match(memory, /^MemAvailable:\s+\d+ kB$/m);
        }
        assert.deepEqual(Object.keys(round.memory).sort(), ["after", "before"]);
    }
    return r;
}

export function summarizeTraceRuns(reports) {
    assert.equal(reports.length, 2);
    assert.deepEqual(reports.map(r => r.expected.pages).sort((a, b) => a - b), [4096, 16384]);
    for (const key of ["apk", "testApk", "build"]) assert.deepEqual(reports[0][key], reports[1][key]);
    const observations = reports.flatMap(r => r.rounds.flatMap(round => round.trace));
    return { environments: 2, rounds: 4, ...summarizeTraceObservations(observations) };
}

function main() {
    const [output, ...directories] = process.argv.slice(2);
    assert(output && directories.length === 2, "Expected new output and two diagnostic run directories");
    const target = resolve(output); assert(target.startsWith(resolve(root, "docs/compatibility") + sep));
    const reports = directories.map(directory => {
        const path = join(directory, "report.json"), r = JSON.parse(readFileSync(path, "utf8"));
        validateTraceRun(r, r.rounds.map(round => readFileSync(join(directory, `round-${round.round}.txt`), "utf8")));
        return { inputReport: facts(path), ...r };
    });
    const git = (...args) => { const r = spawnSync("git", args, { cwd: root }); assert.equal(r.status, 0); return r.stdout; };
    const projectBaseCommit = git("rev-parse", "HEAD").toString().trim();
    for (const input of reports[0].build.inputs) {
        const data = git("show", `${projectBaseCommit}:${input.path}`);
        assert.equal(data.length, input.bytes, input.path);
        assert.equal(createHash("sha256").update(data).digest("hex"), input.sha256, input.path);
    }
    const validation = ["trace-common.mjs", "archive-trace.mjs", "../pcmap/pcmap-common.mjs", "../restart/restart-common.mjs", "../../api28/binder/run-binder.mjs"]
        .map(path => ({ path: `tools/bun-runtime/experimental/webkit-x86_64-16k/trace/${path}`, ...facts(new URL(path, import.meta.url)) }));
    const archive = { schemaVersion: 1, kind: "jsc-trace-diagnostics", evidenceDate: new Date().toISOString().slice(0, 10),
        projectBaseCommit, diagnosticCollectionComplete: true, compatibilityAcceptance: false,
        distributionReady: false, productionReleaseAcceptance: false,
        scope: "Fixed PC-map off/on control with shared extra-profiler-data, finalized-option and compiler-inline logging; complete first traces and JSC-exported inliner metadata have explicit byte caps and omission states. Previous four-phase JavaScript with only marked post-profile trace observation blocks; unchanged original semantic validator, hot functions and budgets, target mode only; pair order reversed in round 2. Actual machine tiers and exit 1 retained. Compiler decisions alone are not executed FTL, and current observation options perturb code generation/timing. No historical failure root-cause, stability, original-suite, native rebuild or Release acceptance. x86 16 KiB userspace is emulated over 4 KiB kernel mappings.",
        fixture: { path: "tools/bun-runtime/experimental/webkit-x86_64-16k/trace/assets/jsc-trace.mjs", ...fixtureFacts() },
        validation, modes: MAP_MODES, summary: summarizeTraceRuns(reports), reports };
    writeFileSync(target, JSON.stringify(archive, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify(archive.summary));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
