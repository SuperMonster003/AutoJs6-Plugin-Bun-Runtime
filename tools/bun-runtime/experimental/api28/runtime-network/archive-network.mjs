import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { NETWORK_KIND, NETWORK_TEST, MODES, fixtureFacts, validateNetworkInstrumentation } from "./network-common.mjs";
import { PACKAGE, buildInputs, facts, validateDevice } from "../binder/binder-common.mjs";
import { countUidProcesses } from "../app-probe/probe-common.mjs";
import { supervisorArtifacts } from "../../../supervisor/supervisor-common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const baseline = () => JSON.parse(readFileSync(new URL("../runtime-evidence.json", import.meta.url), "utf8"));
export function validateNetworkBinding(r) {
    assert.equal(r.schemaVersion, 1); assert.equal(r.kind, NETWORK_KIND);
    assert.equal(r.compatibilityAcceptance, false); assert.equal(r.distributionReady, false);
    for (const key of ["cleanupError", "commandFailure"]) assert(!Object.hasOwn(r, key));
    assert.equal(r.package, PACKAGE); assert.equal(r.expected.pages, 4096); validateDevice(r.device, r.expected);
    assert.deepEqual(Object.keys(r.packageUids).sort(), [PACKAGE, PACKAGE + ".test"].sort());
    for (const uid of Object.values(r.packageUids)) assert(Number.isSafeInteger(uid) && uid >= 10000 && uid % 100000 >= 10000);
    assert.equal(new Set(Object.values(r.packageUids)).size, 2); assert.equal(r.packageUids[PACKAGE], r.uid);
    assert.equal(r.finalUidProcesses, 0); assert.equal(r.finalPackageListing, "");
    assert(typeof r.finalProcessListing === "string" && Buffer.byteLength(r.finalProcessListing) <= 2 * 1024 * 1024);
    assert.match(r.finalProcessListing, /^UID\s+PID\s+NAME/);
    for (const uid of Object.values(r.packageUids)) assert.equal(countUidProcesses(r.finalProcessListing, uid), 0);
    assert.deepEqual(r.finalPackageUidProcesses, { [PACKAGE]: 0, [PACKAGE + ".test"]: 0 });
    assert.deepEqual(r.cleanup, [{ package: PACKAGE + ".test", uninstalled: true }, { package: PACKAGE, uninstalled: true }]);
    const native = baseline();
    assert.deepEqual(r.build.inputs, buildInputs(), "Archive before compiled inputs change");
    assert.deepEqual(r.build.jscCandidate, null); assert.deepEqual(r.build.source, native.source);
    assert.deepEqual(r.runtime, native.identity); assert.deepEqual(r.build.runtime, r.runtime);
    assert.deepEqual(r.build.runtimes, native.artifacts.map(({ abi, bytes, sha256 }) => ({ abi, bytes, sha256 })));
    assert.equal(r.payloads.length, 1);
    const artifact = native.artifacts.find(a => a.abi === r.expected.abi), payload = r.payloads[0], helper = supervisorArtifacts.get(r.expected.abi);
    assert(artifact && helper); assert.equal(payload.abi, artifact.abi); assert.equal(payload.entry, `lib/${artifact.abi}/libbun_exec.so`);
    assert.equal(payload.sha256, artifact.sha256); assert.equal(payload.bytes, artifact.bytes);
    assert.equal(payload.supervisor.entry, `lib/${artifact.abi}/libbun_supervisor.so`);
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
    return r;
}
export function validateNetworkRun(r, raw) {
    assert.equal(r.passed, true); assert(!Object.hasOwn(r, "error")); validateNetworkBinding(r);
    assert.equal(r.rounds.length, 2); assert.equal(raw.length, 2);
    for (const [i, round] of r.rounds.entries()) {
        assert.equal(round.round, i + 1); assert.equal(round.status, 0); assert.equal(round.stderr, "");
        assert.equal(round.remainingUidProcesses, 0); assert(!Object.hasOwn(round, "error"));
        assert.equal(raw[i], round.stdout + round.stderr); assert.deepEqual(round.passedTests, [NETWORK_TEST]);
        assert.deepEqual(round.runtimeNetwork, validateNetworkInstrumentation(round.stdout, r.expected, r.uid));
        assert.deepEqual(Object.keys(round.memory).sort(), ["after", "before"]);
        for (const memory of Object.values(round.memory)) {
            assert(typeof memory === "string" && Buffer.byteLength(memory) <= 32768); assert.match(memory, /^MemAvailable:\s+\d+ kB$/m);
        }
    }
    return r;
}

export function summarizeNetworkRuns(reports) {
    assert.equal(reports.length, 5); assert.equal(new Set(reports.map(r => r.serial)).size, 5);
    assert.deepEqual(reports.map(r => `${r.expected.abi}/${r.expected.api}/${r.expected.pages}`).sort(),
        ["arm64-v8a/28/4096", "arm64-v8a/31/4096", "arm64-v8a/33/4096", "arm64-v8a/35/4096", "x86_64/33/4096"]);
    for (const r of reports) { assert.deepEqual(r.build, reports[0].build); assert.deepEqual(r.testApk, reports[0].testApk); }
    const arm = reports.filter(r => r.expected.abi === "arm64-v8a"); arm.forEach(r => assert.deepEqual(r.apk, arm[0].apk));
    const observations = reports.flatMap(r => r.rounds.flatMap(round => round.runtimeNetwork));
    assert.equal(observations.length, 40);
    for (const mode of MODES) assert.equal(observations.filter(r => r.mode === mode).length, 10);
    return { environments: 5, rounds: 10, fixedModesPassed: 40, modesPerRound: 4,
        tlsProtocolSessions: 20, certificateRejections: 20, validRecoveryConnections: 10,
        httpsRequests: 10, ipv6TcpConnections: 10, ipv6UdpExchanges: 10, ipv6HttpRequests: 10,
        removedWorkspaces: 40, originalApiModesAdded: 0, originalProbePassesAdded: 0,
        originalBinderPassesAdded: 0, productionReleaseAcceptance: false };
}
function main() {
    const [output, ...directories] = process.argv.slice(2);
    assert(output && directories.length === 5, "Expected new output and five fixed TLS/IPv6 run directories");
    const target = resolve(output); assert(target.startsWith(resolve(root, "docs/compatibility") + sep));
    const reports = directories.map(directory => {
        const path = join(directory, "report.json"), r = JSON.parse(readFileSync(path, "utf8"));
        validateNetworkRun(r, r.rounds.map(round => readFileSync(join(directory, `round-${round.round}.txt`), "utf8")));
        return { inputReport: facts(path), ...r };
    });
    const git = (...args) => { const r = spawnSync("git", args, { cwd: root }); assert.equal(r.status, 0); return r.stdout; };
    const projectBaseCommit = git("rev-parse", "HEAD").toString().trim();
    for (const input of reports[0].build.inputs) {
        const data = git("show", `${projectBaseCommit}:${input.path}`);
        assert.equal(data.length, input.bytes, input.path); assert.equal(createHash("sha256").update(data).digest("hex"), input.sha256, input.path);
    }
    const basePath = "tools/bun-runtime/experimental/api28/runtime-network/";
    const validation = ["network-common.mjs", "archive-network.mjs", "../binder/run-binder.mjs", "../binder/binder-common.mjs", "certificates.json"]
        .map(path => ({ path: basePath + path, ...facts(new URL(path, import.meta.url)) }));
    const archive = { schemaVersion: 1, kind: "runtime-network-boundaries", evidenceDate: new Date().toISOString().slice(0, 10),
        projectBaseCommit, fixedScopePassed: true, compatibilityAcceptance: false, distributionReady: false, productionReleaseAcceptance: false,
        scope: "Four independent fixed TLS/IPv6 modes through the production Binder service and exact AARs. Exactly two rounds in five native 4 KiB environments, reusing baseline thirteen-patch payloads. Explicit per-connection trust of public loopback-only test certificates; actual TLS1.2/1.3, SNI/ALPN, wrong CA/hostname rejection, authenticated HTTPS and literal IPv6 TCP/UDP/HTTP. No original API/probe/Binder counts, public network, global trust changes, mTLS/OCSP/PSK/resumption, HTTP2, TLS over IPv6, native16KiB, performance or Release acceptance.",
        limits: { sourceBytesPerMode: 12288, scriptMillis: 8000, binderTimeoutMillis: 12000, outputBytes: 16384, successRecordBytes: 8192 },
        fixtures: MODES.map(mode => ({ mode, path: basePath + `assets/runtime-network-${mode}.mjs`, ...fixtureFacts(mode) })),
        validation, modes: MODES, summary: summarizeNetworkRuns(reports), reports };
    writeFileSync(target, JSON.stringify(archive, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify(archive.summary));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
