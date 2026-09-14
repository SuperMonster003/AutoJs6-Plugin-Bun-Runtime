import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { NETWORK_CLASS, NETWORK_TEST, MODES, fixtureFacts, verifyCertificates, validateNetworkRecord } from "./network-common.mjs";
import { validateNetworkBinding } from "./archive-network.mjs";
import { facts } from "../binder/binder-common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const keys = (value, names) => assert.deepEqual(Object.keys(value).sort(), names.slice().sort());
// This is a failure classifier, never a relaxed success validator. It accepts
// exactly two independently valid TLS records and the observed HTTPS ALPN fault.
export function validateNetworkFailureInstrumentation(text, expected, uid) {
    verifyCertificates(); assert(typeof text === "string" && Buffer.byteLength(text) <= 2 * 1024 * 1024);
    const records = []; let bundle = {}, continuation, started = false, failed = false, failure;
    for (const line of text.split(/\r?\n/)) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (field) {
            assert(!Object.hasOwn(bundle, field[1])); bundle[field[1]] = field[2];
            continuation = ["stream", "stack"].includes(field[1]) ? field[1] : undefined;
        } else if (!status && continuation) bundle[continuation] += "\n" + line;
        if (!status) continue;
        const code = Number(status[1]); assert([0, 1, -2].includes(code));
        if (bundle.class === undefined && bundle.test === undefined) {
            assert(started && !failed); assert.equal(code, 0); keys(bundle, ["stream"]);
            const stream = bundle.stream.trim();
            if (records.length < 2) {
                assert.match(stream, /^RUNTIME_NETWORK=[^\r\n]+$/);
                records.push(validateNetworkRecord(JSON.parse(stream.slice("RUNTIME_NETWORK=".length)), MODES[records.length], expected, uid));
            } else {
                assert.equal(failure, undefined); assert.match(stream, /^RUNTIME_NETWORK_FAILURE=[^\r\n]+$/);
                failure = JSON.parse(stream.slice("RUNTIME_NETWORK_FAILURE=".length));
                keys(failure, ["mode", "sourceSha256", "stdout", "stderr", "terminal", "compatibilityAcceptance"]);
                assert.equal(failure.mode, "https"); assert.equal(failure.sourceSha256, fixtureFacts("https").sha256);
                assert.equal(failure.compatibilityAcceptance, false); assert.equal(failure.stdout, "");
                assert.deepEqual(failure.terminal, { succeeded: false, exitCode: 1, errorCode: "NON_ZERO_EXIT" });
                assert(typeof failure.stderr === "string" && Buffer.byteLength(failure.stderr) <= 16384);
                assert.match(failure.stderr, /assert\.equal\(peer\.alpn, "http\/1\.1"\)/);
                assert.match(failure.stderr, /AssertionError: Expected values to be strictly equal:/);
                assert.match(failure.stderr, /^\+ false\n- 'http\/1\.1'$/m);
                assert.match(failure.stderr, /actual: false,/); assert.match(failure.stderr, /expected: "http\/1\.1",/);
                assert.match(failure.stderr, /runtime-network-https\.mjs\.js:75:60/);
                assert(failure.stderr.endsWith(`Bun v1.4.0 (Android ${expected.abi === "arm64-v8a" ? "arm64" : "x64"})\n`));
                assert.doesNotMatch(failure.stderr, /RUNTIME_NETWORK_DEADLINE|Segmentation fault|SIGSYS/);
            }
        } else {
            assert.equal(bundle.class, NETWORK_CLASS); assert.equal(bundle.test, NETWORK_TEST);
            assert.equal(Number(bundle.numtests), 1); assert.equal(Number(bundle.current), 1);
            if (code === 1) { assert(!started && !failed && !failure); started = true; }
            else {
                assert.equal(code, -2); assert(started && !failed && failure); assert.equal(records.length, 2);
                assert.match(bundle.stack, /java\.lang\.AssertionError: Runtime network mode failed: https/); failed = true;
            }
        }
        bundle = {}; continuation = undefined;
    }
    assert(started && failed && failure); assert.equal(records.length, 2);
    assert.deepEqual([...text.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\s*$/gm)].map(m => m[1]), ["-1"]);
    assert.match(text, /FAILURES!!!\r?\nTests run: 1,  Failures: 1/);
    assert.doesNotMatch(text, /OK \(1 test\)|INSTRUMENTATION_FAILED|Process crashed/);
    return { passedPrefix: records, failure, unreachedModes: ["ipv6"], fixedScopePassed: false, compatibilityAcceptance: false };
}
export function validateNetworkFailureRun(r, raw) {
    validateNetworkBinding(r); assert.equal(r.passed, false); assert(!Object.hasOwn(r, "error"));
    assert.equal(r.rounds.length, 2); assert.equal(raw.length, 2);
    return r.rounds.map((round, i) => {
        assert.equal(round.round, i + 1); assert.equal(round.status, 0); assert.equal(round.stderr, "");
        assert.equal(raw[i], round.stdout); assert.equal(round.remainingUidProcesses, 0);
        assert(typeof round.error === "string" && round.error.includes("RUNTIME_NETWORK_FAILURE="));
        assert(!Object.hasOwn(round, "passedTests") && !Object.hasOwn(round, "runtimeNetwork"));
        keys(round.memory, ["before", "after"]);
        for (const value of Object.values(round.memory)) {
            assert(typeof value === "string" && Buffer.byteLength(value) <= 32768); assert.match(value, /^MemAvailable:\s+\d+ kB$/m);
        }
        return validateNetworkFailureInstrumentation(round.stdout, r.expected, r.uid);
    });
}
export function summarizeNetworkFailures(reports) {
    assert.equal(reports.length, 5); assert.equal(new Set(reports.map(r => r.serial)).size, 5);
    assert.deepEqual(reports.map(r => `${r.expected.abi}/${r.expected.api}/${r.expected.pages}`).sort(),
        ["arm64-v8a/28/4096", "arm64-v8a/31/4096", "arm64-v8a/33/4096", "arm64-v8a/35/4096", "x86_64/33/4096"]);
    for (const r of reports) { assert.deepEqual(r.build, reports[0].build); assert.deepEqual(r.testApk, reports[0].testApk); }
    const arm = reports.filter(r => r.expected.abi === "arm64-v8a"); arm.forEach(r => assert.deepEqual(r.apk, arm[0].apk));
    const rounds = reports.flatMap(r => validateNetworkFailureRun(r, r.rounds.map(v => v.stdout)));
    assert.equal(rounds.length, 10);
    return { environments: 5, fixedRounds: 10, plannedModes: 40, passedPrefixModes: 20, failedHttpsModes: 10,
        unreachedIpv6Modes: 10, tlsProtocolSessions: 20, certificateRejections: 20, validRecoveryConnections: 10,
        removedSuccessfulWorkspaces: 20, fixedScopePassed: false, originalApiModesAdded: 0,
        originalProbePassesAdded: 0, originalBinderPassesAdded: 0, productionReleaseAcceptance: false };
}
function main() {
    const [output, projectBaseCommit, ...directories] = process.argv.slice(2);
    assert(output && /^[a-f0-9]{40}$/.test(projectBaseCommit) && directories.length === 5);
    const target = resolve(output); assert(target.startsWith(resolve(root, "docs/compatibility") + sep));
    const reports = directories.map(directory => {
        const path = join(directory, "report.json"), r = JSON.parse(readFileSync(path, "utf8"));
        const classifiedRounds = validateNetworkFailureRun(r, r.rounds.map(v => readFileSync(join(directory, `round-${v.round}.txt`), "utf8")));
        return { inputReport: facts(path), classifiedRounds, ...r };
    });
    const git = (...args) => { const result = spawnSync("git", args, { cwd: root }); assert.equal(result.status, 0); return result.stdout; };
    for (const item of reports[0].build.inputs) {
        const bytes = git("show", `${projectBaseCommit}:${item.path}`);
        assert.equal(bytes.length, item.bytes); assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
    }
    const archive = { schemaVersion: 1, kind: "runtime-network-alpn-failure", evidenceDate: new Date().toISOString().slice(0, 10),
        projectBaseCommit, validatorSourceCommit: git("rev-parse", "HEAD").toString().trim(),
        fixedScopePassed: false, compatibilityAcceptance: false, distributionReady: false,
        scope: "Unchanged four-mode gate fails HTTPS ALPN in both fixed rounds across five native 4 KiB environments. Two valid TLS prefix modes are separately parsed; IPv6 is unreached. No retry, bypass, weakened assertion, native rebuild, broad compatibility or Release acceptance.",
        limits: { sourceBytesPerMode: 12288, scriptMillis: 8000, binderTimeoutMillis: 12000, outputBytes: 16384, successRecordBytes: 8192 },
        fixtures: MODES.map(mode => ({ mode, ...fixtureFacts(mode) })),
        validation: ["network-common.mjs", "archive-network.mjs", "archive-network-failure.mjs", "../binder/run-binder.mjs", "certificates.json"]
            .map(path => ({ path: "tools/bun-runtime/experimental/api28/runtime-network/" + path, ...facts(new URL(path, import.meta.url)) })),
        summary: summarizeNetworkFailures(reports), reports };
    writeFileSync(target, JSON.stringify(archive, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify(archive.summary));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
