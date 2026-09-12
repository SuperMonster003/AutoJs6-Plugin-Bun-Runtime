// Acceptance and preliminary diagnostics are deliberately different records.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { KIND, MODES, PRESSURE_TEST, fixtureFacts, validatePressureInstrumentation } from "./pressure-common.mjs";
import { PACKAGE, buildInputs, facts, validateDevice } from "../../api28/binder/binder-common.mjs";
import { loadJscCandidate } from "../jsc-common.mjs";
import { supervisorArtifacts } from "../../../supervisor/supervisor-common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const pkg = PACKAGE + ".jsc16k";
export function validatePressureRun(record, rawRounds) {
    assert.equal(record.schemaVersion, 1);
    assert.equal(record.kind, KIND);
    assert.equal(record.passed, true);
    assert.equal(record.distributionReady, false);
    for (const key of ["error", "cleanupError", "commandFailure"]) assert(!Object.hasOwn(record, key));
    assert.equal(record.package, pkg);
    assert.equal(record.expected.api, 36);
    assert.equal(record.expected.abi, "x86_64");
    assert([4096, 16384].includes(record.expected.pages));
    validateDevice(record.device, record.expected);
    assert(Number.isSafeInteger(record.uid) && record.uid >= 10000 && record.uid % 100000 >= 10000);
    assert.equal(record.finalUidProcesses, 0);
    assert.deepEqual(record.cleanup, [{ package: pkg + ".test", uninstalled: true }, { package: pkg, uninstalled: true }]);
    const candidate = loadJscCandidate();
    assert.deepEqual(record.build.inputs, buildInputs(), "Archive before changing compiled inputs; never substitute a later APK");
    assert.deepEqual(record.build.jscCandidate, candidate);
    const baseline = JSON.parse(readFileSync(new URL("../../api28/runtime-evidence.json", import.meta.url), "utf8"));
    assert.deepEqual(record.runtime, { ...baseline.identity, variant: candidate.variant });
    assert.deepEqual(record.build.runtime, record.runtime);
    assert.deepEqual(record.build.source, baseline.source);
    assert.deepEqual(record.build.runtimes, baseline.artifacts.map(a => a.abi === "x86_64" ? candidate.artifact : a)
        .map(({ abi, bytes, sha256 }) => ({ abi, bytes, sha256 })));
    assert.equal(record.payloads.length, 1);
    const payload = record.payloads[0], helper = supervisorArtifacts.get("x86_64");
    assert.equal(payload.abi, "x86_64");
    assert.equal(payload.entry, "lib/x86_64/libbun_exec.so");
    assert.equal(payload.sha256, candidate.artifact.sha256);
    assert.equal(payload.bytes, candidate.artifact.bytes);
    assert.equal(payload.supervisor.entry, "lib/x86_64/libbun_supervisor.so");
    assert.equal(payload.supervisor.sha256, helper.binarySha256);
    assert.equal(payload.supervisor.bytes, helper.binaryBytes);
    for (const key of ["apk", "testApk"]) {
        assert(/^[a-f0-9]{64}$/.test(record[key].sha256));
        assert(Number.isSafeInteger(record[key].bytes) && record[key].bytes > 0);
    }
    assert.equal(record.installedApkSha256, record.apk.sha256);
    assert.equal(record.installedTestApkSha256, record.testApk.sha256);
    assert.equal(record.signatures.length, 2);
    for (const signature of record.signatures) {
        assert.equal(signature.signerCount, 1);
        assert(signature.verifiedSchemes.includes("v2"));
        assert(/^[a-f0-9]{64}$/.test(signature.certificateSha256));
    }
    assert.equal(record.signatures[0].certificateSha256, record.signatures[1].certificateSha256);
    assert.equal(record.rounds.length, 2);
    assert.equal(rawRounds.length, 2);
    for (const [index, round] of record.rounds.entries()) {
        assert.equal(round.round, index + 1);
        assert.equal(round.status, 0);
        assert.equal(round.remainingUidProcesses, 0);
        assert(!Object.hasOwn(round, "error"));
        assert.equal(round.stderr, "");
        assert.equal(rawRounds[index], round.stdout + round.stderr, "Raw pressure transcript drift");
        assert.deepEqual(round.passedTests, [PRESSURE_TEST]);
        assert.deepEqual(round.pressure, validatePressureInstrumentation(round.stdout, record.expected.pages));
    }
    return record;
}

export function summarizePressureRuns(records) {
    assert.equal(records.length, 2, "One 4 KiB and one 16 KiB native environment required");
    assert.deepEqual(records.map(r => r.expected.pages).sort((a, b) => a - b), [4096, 16384]);
    assert.equal(new Set(records.map(r => `${r.device.fingerprint}/${r.device.api}/${r.device.abi}/${r.device.pages}`)).size, 2);
    for (const record of records.slice(1)) {
        assert.deepEqual(record.apk, records[0].apk, "Do not combine different APK builds");
        assert.deepEqual(record.testApk, records[0].testApk);
        assert.deepEqual(record.build, records[0].build);
    }
    return { environments: 2, rounds: 4, passedJUnitTests: 4, totalJUnitTests: 4,
        passedPressureModes: 28, totalPressureModes: 28, sampledTierObservations: 16,
        retainedTargetTierFrames: 48, explicitMainThreadFullGcCalls: 100, explicitMainThreadEdenGcCalls: 96,
        explicitWorkerFullGcCalls: 64,
        wasmModules: 128, wasmCalls: 8388608, wasmMemoryGrows: 252,
        workersExited: 64, workerTransferredBytes: 67108864 };
}

function main() {
    const [kind, output, ...directories] = process.argv.slice(2);
    assert(["acceptance", "diagnostics"].includes(kind) && output && directories.length > 0,
        "Usage: node archive-pressure.mjs <acceptance|diagnostics> <new-report.json> <run-directory>...");
    const target = resolve(output);
    assert(target.startsWith(resolve(root, "docs/compatibility") + sep));
    const reports = directories.map(directory => {
        const path = join(directory, "report.json"), record = JSON.parse(readFileSync(path, "utf8"));
        assert.equal(record.kind, KIND);
        const rawRounds = record.rounds.map(round => readFileSync(join(directory, `round-${round.round}.txt`), "utf8"));
        if (kind === "acceptance") validatePressureRun(record, rawRounds);
        else {
            assert.equal(typeof record.passed, "boolean"); // Keep even an early successful 4 KiB control unchanged.
            for (const [i, round] of record.rounds.entries()) assert.equal(rawRounds[i], round.stdout + round.stderr);
        }
        return { inputReport: facts(path), ...record };
    });
    const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
    assert.equal(git.status, 0);
    const validation = ["pressure-common.mjs", "archive-pressure.mjs", "../../api28/binder/run-binder.mjs"].map(path => ({
        path: `tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/${path}`, ...facts(new URL(path, import.meta.url)),
    }));
    const archive = { schemaVersion: 1, kind: `jsc-pressure-${kind}`, evidenceDate: "2026-09-12",
        projectBaseCommit: git.stdout.trim(), passed: kind === "acceptance", distributionReady: false,
        productionReleaseAcceptance: false, officialBunAndSupervisorUnchanged: true,
        scope: kind === "acceptance" ? "Fixed, offline, bounded seven-mode JSC pressure fixture through the real plugin Binder service, two restarted rounds per native x86_64 API 36 userspace page size. The 16 KiB x86 userspace ABI is emulated over 4 KiB kernel mappings, not ARM64 hardware 16 KiB evidence. Separate from the original eight-test Binder suite, performance, exhaustive JIT/Wasm coverage and Release acceptance."
            : "Exact preliminary receipts and outcomes, excluded from final acceptance counts. Later fixes/runs never overwrite these records; each build binds its own earlier fixture bytes.",
        modes: MODES, validation, reports,
    };
    if (kind === "acceptance") {
        archive.fixture = { path: "tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/assets/jsc-pressure.mjs", ...fixtureFacts() };
        archive.summary = summarizePressureRuns(reports);
    }
    writeFileSync(target, JSON.stringify(archive, null, 2) + "\n", { flag: "wx" });
    console.log(`Archived JSC pressure ${kind}: ${target}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
