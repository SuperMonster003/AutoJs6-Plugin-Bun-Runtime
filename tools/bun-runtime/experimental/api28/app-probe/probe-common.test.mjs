import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { supervisorLock } from "../../../supervisor/supervisor-common.mjs";
import { ABIS, HERE, ROOT, PACKAGE, RUNNER, SHARED_PROCESS, inputFacts, json, lockedEvidence, newOutputDirectory,
  outsideRepository, parseInstrumentation, parseOptions, validateManifestDump, validateProbes, validateReceipt, validateReport,
  parsePackageUid, countUidProcesses, FD_MODES, materializeProbes, materializeOpenat2Source, materializeLchmodSource, materializeHardLimitSource, validateFdEvidence, fdFilterSha256, hash } from "./probe-common.mjs";
import { SYSCALL_MODES } from "./syscall-evidence.mjs";
import { syscallFixture } from "./syscall-fixture.test-support.mjs";
import { OPENAT2_MODES } from "./openat2-evidence.mjs";
import { openat2Fixture } from "./openat2-fixture.test-support.mjs";
import { LCHMOD_MODES } from "./lchmod-evidence.mjs";
import { lchmodFixture } from "./lchmod-fixture.test-support.mjs";
import { HARD_LIMIT_MODES } from "./hard-limit-evidence.mjs";
import { hardLimitResult } from "./hard-limit-fixture.test-support.mjs";
import { ASYNC_SIGNAL_MODES } from "./async-signal-evidence.mjs";
import { asyncSignalResult } from "./async-signal-fixture.test-support.mjs";

const probes = json(join(HERE, "probes.json"));
const evidence = lockedEvidence();
// Only the expected revision changes when testing the repaired runtime.
// Historical definition hashes still protect every other field/assertion.
const previousRevision = rows => rows.map(p => p.id === "revision" ? {...p, stdout:"1.4.0+a260ef308"} : p);
const ninePatchRevision = rows => rows.map(p => p.id === "revision" ? {...p, stdout:"1.4.0+7b9ac2668"} : p);
const withoutHardLimits = rows => rows.filter(p => !Object.hasOwn(HARD_LIMIT_MODES, p.id) && !Object.hasOwn(ASYNC_SIGNAL_MODES, p.id));
const withoutLchmod = rows => withoutHardLimits(rows).filter(p => !Object.hasOwn(LCHMOD_MODES, p.id));
function fdFixture(mode, abi = "arm64-v8a") {
  const lowered = mode === "lowered-native" || mode === "lowered-trap";
  const enosys = { result: -1, errno: 38 };
  const trap = { marker: enosys, closeRange: enosys };
  const base = { schemaVersion: 1, mode, arch: abi === "arm64-v8a" ? "arm64" : "x64", passed: true };
  return structuredClone({ ...base, before: { fd: 256, open: true, cloexec: false },
    nativeCloseRange: enosys, nativeStillOpen: true, nativeCloexec: false,
    after: { parentOpen: true, parentCloexec: false, sentinelIdentity: true },
    ...(mode !== "spawn-native" && mode !== "lowered-native" ? { policy: { installed: true, before: { result: -1, errno: 22 },
      after: enosys, filterSha256: fdFilterSha256(abi) }, trap } : {}),
    ...(mode === "startup-trap" ? { startup: { samePid: true, inheritedOpen: true, cloexec: true, sentinelIdentity: true } } :
      mode === "sigsys-listener" ? { listener: { during: trap, after: trap, delivered: 1 } } : {
      control: { exitCode: 0, stdoutTarget: "/memfd:spawn_stdio_stdout (deleted)", stderrEmpty: true },
      ...(lowered ? { limit: { before: { soft: 32768, hard: 32768, openMax: 32768 },
        during: { soft: 128, hard: 32768, openMax: 128 }, after: { soft: 32768, hard: 32768, openMax: 32768 }, restored: true } } :
        { maskRestored: true }),
      sync: { sentinelAbsent: true, ...(lowered ? { sentinelIdentity: false } : {}), exitCode: 1 },
      async: { sentinelAbsent: true, ...(lowered ? { sentinelIdentity: false } : {}), exitCode: 1 },
      ...(mode === "blocked-sigsys" ? { mask: { childBlocked: true, callerStillBlocked: true } } : {}),
    }),
  });
}
function receipt() {
  return {
    schemaVersion: 2, kind: "test-only-application-process-probe", packageName: PACKAGE, runner: RUNNER,
    testOnly: true, minSdk: 28, targetSdk: 36, variant: evidence.identity.variant, inputs: inputFacts(),
    inputEncoding: "utf8-lf", supervisor: structuredClone(supervisorLock),
    runtimes: Object.fromEntries(evidence.artifacts.map(a => [a.abi, { bytes: a.bytes, sha256: a.sha256 }])),
    apks: ABIS.map(abi => ({ abi, filename: "bun-api28-probe-" + abi + ".apk", bytes: 10,
      sha256: "a".repeat(64), signing: { certificateSha256: "b".repeat(64), verifiedSchemes: ["v2"], signerCount: 1 } })),
  };
}
function fixture() {
  const build = receipt();
  const options = { abi: "arm64-v8a", api: 28, pageSize: 4096, apk: build.apks[0],
    runtime: build.runtimes["arm64-v8a"], supervisor: supervisorLock.artifacts[0], variant: build.variant, probes };
  return { options, report: {
    schemaVersion: 2, kind: build.kind, pluginBinderExercised: false, variant: build.variant,
    installedApkSha256: options.apk.sha256, runtimeSha256: options.runtime.sha256,
    runtimeBytes: options.runtime.bytes, installedPayloadVerified: true, passed: true,
    supervisorSha256: options.supervisor.binarySha256, supervisorBytes: options.supervisor.binaryBytes,
    installedSupervisorVerified: true, privateJobRemoved: true,
    environment: { apiLevel: 28, abi: "arm64-v8a", pageSizeBytes: 4096, kernelMachine: "aarch64", kernel: "5.10.0-test",
      uid: 10001, selinuxContext: "u:r:untrusted_app:s0:c1,c2", seccomp: 2 },
    probes: probes.map(probe => ({ id: probe.id, passed: true, termination: probe.termination,
      exitCode: probe.termination === "exited" ? 0 : 137, forciblyTerminated: probe.termination !== "exited",
      outputLimitBytes: probe.outputBytes ?? 16384, capturedBytes: probe.outputBytes ?? 64,
      processReaped: true, workspaceRemoved: true,
      elapsedMillis: 2000, stdout: probe.stdout ?? "bounded output", stderr: probe.stderr ?? "",
      ...(probe.requiresReady ? { readyObserved: true, parentageVerified: true, childGone: true, supervisorGone: true,
        childPid: 1001, supervisorPid: 1002, readinessMillis: 200, terminationToExitMillis: 250,
        terminationRequestedAfterReadyMillis: 200 } : {}),
      ...(probe.sourceFile === "fd-probes.mjs" ? { fdEvidence: fdFixture(probe.mode),
        stdout: "FD_PROBE_RESULT=" + JSON.stringify(fdFixture(probe.mode)) + "\n" } : {}),
      ...(probe.sourceFile === "syscall-probes.mjs" ? { syscallEvidence: syscallFixture(probe.mode),
        stdout: "SYSCALL_PROBE_RESULT=" + JSON.stringify(syscallFixture(probe.mode)) + "\n" } : {}),
      ...(probe.sourceFile === "openat2-probes.mjs" ? { openat2Evidence: openat2Fixture(),
        stdout: "OPENAT2_PROBE_RESULT=" + JSON.stringify(openat2Fixture()) + "\n" } : {}),
      ...(probe.sourceFile === "lchmod-probes.mjs" ? { lchmodEvidence: lchmodFixture(),
        stdout: "LCHMOD_PROBE_RESULT=" + JSON.stringify(lchmodFixture()) + "\n" } : {}),
      ...(probe.sourceFile === "hard-limit-probes.mjs" ? hardLimitResult(probe.mode) : {}),
      ...(probe.sourceFile === "async-signal-probes.mjs" ? asyncSignalResult(probe.mode) : {}),
    })),
  } };
}

test("checked-in probe definitions have bounded commands and unique safe paths", () => validateProbes(probes));
test("the pidfd repair preserves all 31 definitions and every existing fixture and semantic validator", () => {
  const historical = json(join(ROOT, "docs/compatibility/2026-09-13-m3-blocked-async-passing.json"));
  assert.equal(probes.length, 31);
  assert.deepEqual(ninePatchRevision(probes), historical.probes);
  const protectedInputs = inputFacts().filter(input => /\/(?:ProbeInstrumentation\.java|(?:fd|syscall|openat2|lchmod|hard-limit|async-signal)-(?:probes|evidence)\.mjs|probe-common\.mjs)$/.test(input.path));
  assert.equal(protectedInputs.length, 13);
  for (const input of protectedInputs) assert.deepEqual(input, historical.inputs.find(old => old.path === input.path));
});
test("hard-limit additions preserve all 25 definitions and allow only the four fixed assets", () => {
  assert.equal(withoutHardLimits(probes).length, 25);
  assert.equal(hash(JSON.stringify(ninePatchRevision(withoutHardLimits(probes)))), "2c905e8eed2e455c1ab5324410811d6847b9f5011fdc0946776ab9445f94a270");
  for (const path of ["/hard-limit-probes.mjs", "/hard-limit-evidence.mjs"])
    assert(inputFacts().some(input => input.path.endsWith(path)));
  for (const mode of ["", "../spawn-native", "skip", "startup-native\n"]) assert.throws(() => materializeHardLimitSource(mode));
  for (const change of [p => { p[24].sourceFile = "../hard-limit-probes.mjs"; }, p => { p[24].mode = "spawn-native"; },
    p => { p[24].source = "fake"; }, p => { p[24].sourceAsset = "fake.mjs"; }, p => { p[24].timeoutMillis = 15000; },
    p => { p[24].stdout = ""; }, p => { p[24].arguments = ["--version"]; }, p => { p[24].outputBytes = 16384; }]) {
    const changed = structuredClone(probes); change(changed); assert.throws(() => validateProbes(changed));
  }
});
test("hard-limit output and independent Java UID/parent-limit observations must agree", () => {
  for (const change of [r => { delete r.probes[24].hardLimitEvidence; }, r => { delete r.probes[24].hardLimitParentLimits; },
    r => { r.probes[24].hardLimitEvidence.uid++; }, r => { r.probes[24].hardLimitParentLimits.after = [128,128]; },
    r => { r.probes[24].hardLimitParentLimits.before = [1024,1024]; },
    r => { r.probes[24].hardLimitEvidence.supervisorBefore = [512,512]; r.probes[24].hardLimitEvidence.supervisorAfter = [512,512]; },
    r => { r.probes[24].stdout = "HARD_LIMIT_RESULT={}"; }, r => { r.probes[24].stdout += r.probes[24].stdout; },
    r => { r.probes[0].hardLimitEvidence = r.probes[24].hardLimitEvidence; },
    r => { r.probes[0].hardLimitParentLimits = r.probes[24].hardLimitParentLimits; }]) {
    const { report, options } = fixture(); change(report); assert.throws(() => validateReport(report, options));
  }
});
test("async-signal semantic records must match stdout and the independent application UID", () => {
  for (const change of [r => { delete r.probes[28].asyncSignalEvidence; },
    r => { r.probes[28].asyncSignalEvidence.uid++; r.probes[28].asyncSignalEvidence.rows[2].uid++; },
    r => { r.probes[28].stdout = "ASYNC_SIGNAL_RESULT={}"; }, r => { r.probes[28].stdout += r.probes[28].stdout; },
    r => { r.probes[0].asyncSignalEvidence = r.probes[28].asyncSignalEvidence; },
    r => { r.probes[28].asyncSignalEvidence.rows[0].after[1] = "0000000000000000"; }]) {
    const { report, options } = fixture(); change(report); assert.throws(() => validateReport(report, options));
  }
});
test("the scoped-open repair changes only the expected revision in all 24 definitions", () => {
  assert.equal(probes.find(p => p.id === "revision").stdout, "1.4.0+a9c76a599");
  assert.equal(hash(JSON.stringify(previousRevision(withoutLchmod(probes)))), "0f0284a6ff603967d847c8bbc68632fd46f41c39a34fa9c3c87f7761204d92cf");
});
test("probe definitions reject traversal, duplication, arbitrary arguments, and unbounded work", () => {
  for (const change of [
    p => { p[0].id = "../escape"; }, p => { p[1].id = p[0].id; },
    p => { p[0].arguments = ["run", "arbitrary"]; }, p => { p[2].extension = "../js"; },
    p => { p[2].timeoutMillis = 600000; }, p => { p[2].outputBytes = 1000000; },
    p => { p[2].source = "x".repeat(8193); }, p => { p.pop(); },
    p => { p[9].requiresReady = false; }, p => { p[9].source = "setInterval(()=>{},1000);"; },
    p => { p[10].termination = "exited"; }, p => { p[11].cancelAfterReadyMillis = 10000; },
    p => { p[9].timeoutMillis = 15000; }, p => { p[10].outputBytes = 16384; },
    p => { p[12].sourceFile = "../fd-probes.mjs"; }, p => { p[12].sourceFile = "missing.mjs"; },
    p => { p[12].source = "console.log('fake')"; }, p => { p[12].mode = "startup-trap"; },
    p => { p[12].stdout = ""; }, p => { p[12].arguments = ["--version"]; },
    p => { delete p[12].sourceFile; }, p => { p[2].sourceFile = "fd-probes.mjs"; },
  ]) {
    const changed = structuredClone(probes); change(changed);
    assert.throws(() => validateProbes(changed));
  }
});
test("fixed FD fixtures are materialized deterministically with canonical source and bounded assets", () => {
  const materialized = materializeProbes(probes);
  const source = readFileSync(join(HERE, "fd-probes.mjs"), "utf8").replace(/\r\n/g, "\n");
  assert(Buffer.byteLength(JSON.stringify(materialized)) <= 131072);
  for (let i = 0; i < probes.length; i++) {
    const probe = probes[i], actual = materialized[i];
    if (probe.sourceFile === "fd-probes.mjs") {
      assert.equal(actual.source, "const FD_MODE = " + JSON.stringify(probe.mode) + ";\n" + source);
      assert(Buffer.byteLength(actual.source) <= 16384);
      assert(!Object.hasOwn(probe, "source"), "definitions may not be mutated");
    } else if (probe.sourceFile === "syscall-probes.mjs") {
      const syscallSource = readFileSync(join(HERE, "syscall-probes.mjs"), "utf8").replace(/\r\n/g, "\n");
      assert.equal(actual.source, "const SYSCALL_MODE = " + JSON.stringify(probe.mode) + ";\n" + syscallSource);
      assert(Buffer.byteLength(actual.source) <= 16384);
    } else if (probe.sourceFile === "lchmod-probes.mjs") {
      assert.deepEqual(actual,{...probe,sourceAsset:"lchmod-probes.mjs"});
      assert.equal(materializeLchmodSource(), "const LCHMOD_MODE = \"bin-link\";\n" +
        readFileSync(join(HERE,"lchmod-probes.mjs"),"utf8").replace(/\r\n/g,"\n"));
    } else if (probe.sourceFile === "openat2-probes.mjs") {
      assert.deepEqual(actual,{...probe,sourceAsset:"openat2-probes.mjs"});
      assert.equal(materializeOpenat2Source(),"const OPENAT2_MODE = \"confinement\";\n" +
        readFileSync(join(HERE,"openat2-probes.mjs"),"utf8").replace(/\r\n/g,"\n"));
      assert(Buffer.byteLength(materializeOpenat2Source())<=8192);
    } else if (probe.sourceFile === "hard-limit-probes.mjs") {
      assert.deepEqual(actual, {...probe,sourceAsset:"hard-limit-" + probe.mode + ".mjs"});
      const source = materializeHardLimitSource(probe.mode);
      assert.equal(source, "const HARD_LIMIT_MODE = " + JSON.stringify(probe.mode) + ";\n" +
        readFileSync(join(HERE,"hard-limit-probes.mjs"),"utf8").replace(/\r\n/g,"\n"));
      assert(Buffer.byteLength(source) <= 12288);
    } else if (probe.sourceFile === "async-signal-probes.mjs") {
      assert.deepEqual(actual, {...probe, sourceAsset: "async-signal-" + probe.mode + ".mjs"});
    } else assert.deepEqual(actual, probe);
  }
  assert.throws(() => validateProbes(materialized), /ambiguous FD fixture/);
  assert(inputFacts().some(input => input.path.endsWith("/fd-probes.mjs")));
});
test("all FD modes require concrete CLOEXEC, filter, child and listener observations on both ABIs", () => {
  for (const abi of ABIS) for (const mode of Object.values(FD_MODES)) {
    const proof = fdFixture(mode, abi);
    assert.equal(validateFdEvidence(proof, mode, abi), proof);
    if (mode !== "startup-trap") {
      proof.nativeCloseRange = { result: 0, errno: 0 }; proof.nativeCloexec = true;
      validateFdEvidence(proof, mode, abi);
      proof.nativeCloseRange = { result: -1, errno: 22 }; proof.nativeCloexec = false;
      validateFdEvidence(proof, mode, abi);
    }
  }
});
test("child stdout positive control supports Bun memfd, socketpair and pipe without accepting failed readlink", () => {
  for (const target of ["/memfd:spawn_stdio_stdout (deleted)", "socket:[123]", "pipe:[456]"]) {
    const proof = fdFixture("spawn-native"); proof.control.stdoutTarget = target;
    validateFdEvidence(proof, "spawn-native", "arm64-v8a");
  }
  for (const target of ["", "No such file or directory", "sentinel.txt", "pipe:[123]\nfake", "x".repeat(129)]) {
    const proof = fdFixture("spawn-native"); proof.control.stdoutTarget = target;
    assert.throws(() => validateFdEvidence(proof, "spawn-native", "arm64-v8a"));
  }
});
test("FD evidence cannot hide no-op fallback, missing controls, wrong policy or lost signal masks", () => {
  const cases = [
    ["spawn-native", p => { p.before.cloexec = true; }], ["spawn-native", p => { p.before.fd = 65536; }],
    ["spawn-native", p => { p.nativeCloexec = true; }], ["spawn-native", p => { p.nativeStillOpen = false; }],
    ["spawn-native", p => { p.nativeCloseRange.errno = 1; }], ["spawn-native", p => { p.after.parentOpen = false; }],
    ["spawn-native", p => { p.after.parentCloexec = true; }], ["spawn-native", p => { delete p.control; }],
    ["spawn-native", p => { p.control.exitCode = 1; }], ["spawn-native", p => { p.sync.sentinelAbsent = false; }],
    ["spawn-trap", p => { p.async.exitCode = 0; }], ["spawn-trap", p => { p.policy.installed = false; }],
    ["spawn-trap", p => { p.policy.before.errno = 38; }], ["spawn-trap", p => { p.policy.after.errno = 22; }],
    ["spawn-trap", p => { p.policy.filterSha256 = fdFilterSha256("x86_64"); }],
    ["spawn-trap", p => { p.trap.closeRange = { result: 0, errno: 0 }; }],
    ["blocked-sigsys", p => { p.mask.childBlocked = false; }],
    ["blocked-sigsys", p => { p.mask.callerStillBlocked = false; }],
    ["blocked-sigsys", p => { p.maskRestored = false; }],
    ["startup-trap", p => { p.startup.cloexec = false; }], ["startup-trap", p => { p.startup.inheritedOpen = false; }],
    ["startup-trap", p => { p.startup.samePid = false; }], ["startup-trap", p => { delete p.trap; }],
    ["sigsys-listener", p => { p.listener.delivered = 0; }],
    ["sigsys-listener", p => { p.listener.after.marker.errno = 22; }],
  ];
  for (const [mode, change] of cases) {
    const proof = fdFixture(mode); change(proof);
    assert.throws(() => validateFdEvidence(proof, mode, "arm64-v8a"));
  }
  assert.throws(() => validateFdEvidence(undefined, "spawn-native", "arm64-v8a"));
});
test("lowered nofile probes require the exact lowered bound, unchanged hard limit, restoration and both child checks", () => {
  for (const abi of ABIS) for (const mode of ["lowered-native", "lowered-trap"]) {
    const proof = fdFixture(mode, abi);
    validateFdEvidence(proof, mode, abi);
    for (const change of [
      p => { delete p.limit; }, p => { p.limit.restored = false; },
      p => { p.limit.before.soft = 128; }, p => { p.limit.before.soft = Infinity; },
      p => { p.limit.before.hard = 1024; }, p => { p.limit.before.openMax = 1024; },
      p => { p.limit.during.soft = 32768; }, p => { p.limit.during.hard = 128; },
      p => { p.limit.during.openMax = 32768; }, p => { p.limit.after.soft = 128; },
      p => { p.sync.sentinelAbsent = false; }, p => { p.sync.sentinelIdentity = true; },
      p => { p.async.exitCode = 0; }, p => { delete p.async; }, p => { delete p.control; },
    ]) {
      const changed = structuredClone(proof); change(changed);
      assert.throws(() => validateFdEvidence(changed, mode, abi));
    }
  }
});
test("lowered-limit fixtures preserve the original probe suite and cannot disguise a skip as success", () => {
  for (const id of ["fd-spawn-lowered-native", "fd-spawn-lowered-trap"]) {
    const index = probes.findIndex(probe => probe.id === id);
    const { report, options } = fixture();
    assert.equal(report.probes.length, 31);
    report.probes[index].fdEvidence.sync = { sentinelAbsent: false, sentinelIdentity: true, exitCode: 0 };
    report.probes[index].stdout = "FD_PROBE_RESULT=" + JSON.stringify(report.probes[index].fdEvidence) + "\n";
    assert.throws(() => validateReport(report, options), /child inherited sentinel/);
    const skipped = fixture();
    skipped.report.probes[index].fdEvidence = { mode: FD_MODES[id], passed: true, skipped: true };
    assert.throws(() => validateReport(skipped.report, skipped.options));
  }
});
test("CLI rejects absent, duplicate, unknown and valueless arguments", () => {
  assert.deepEqual(parseOptions(["--serial", "a"], ["--serial"]), { "--serial": "a" });
  for (const args of [[], ["--serial"], ["--serial", "--bad"], ["--bad", "x"],
    ["--serial", "a", "--serial", "b"]]) assert.throws(() => parseOptions(args, ["--serial"]));
});

test("syscall additions preserve the original 20 definitions apart from the expected revision", () => {
  const original = withoutLchmod(probes).filter(probe => !Object.hasOwn(SYSCALL_MODES, probe.id) && !Object.hasOwn(OPENAT2_MODES,probe.id));
  assert.equal(original.length, 20);
  assert.equal(hash(JSON.stringify(previousRevision(original))), "8e1450d608cc8694ffac9988ecf6677c70fb576cb4eb64dd9ea130ca3fb254fb");
  for (const path of ["/syscall-probes.mjs", "/syscall-evidence.mjs"])
    assert(inputFacts().some(input => input.path.endsWith(path)));
});

test("syscall reports reject missing, mismatched, forged, duplicated or unbound evidence", () => {
  for (const change of [r => { delete r.probes[19].syscallEvidence; }, r => { r.probes[19].syscallEvidence.calls.pop(); },
    r => { r.probes[20].syscallEvidence.errorControl = "not-observable"; },
    r => { r.probes[21].stdout += r.probes[21].stdout; }, r => { r.probes[19].stdout = "SYSCALL_PROBE_RESULT={}"; },
    r => { r.probes[0].syscallEvidence = syscallFixture("raw-controls"); },
    r => { r.probes[19].fdEvidence = fdFixture("spawn-native"); }]) {
    const { report, options } = fixture(); change(report);
    assert.throws(() => validateReport(report, options));
  }
  for (const change of [p => { p[19].sourceFile = "../syscall-probes.mjs"; }, p => { p[19].mode = "pidfd"; },
    p => { p[19].stdout = "FD_PROBE_RESULT="; }, p => { p[19].source = "console.log('fake')"; }]) {
    const changed = structuredClone(probes); change(changed); assert.throws(() => validateProbes(changed));
  }
});

test("a forged old-kernel label cannot turn required semantic reachability into a gated pass", () => {
  const { report, options } = fixture();
  const forged = syscallFixture("copy-range", "arm64-v8a", "4.4.1");
  report.probes[20].syscallEvidence = forged;
  report.probes[20].stdout = "SYSCALL_PROBE_RESULT=" + JSON.stringify(forged) + "\n";
  assert.throws(() => validateReport(report, options), /independent uname observation/);
});
test("outputs cannot overwrite a directory or target the repository/ancestors", () => {
  for (const path of [ROOT, join(ROOT, "app"), join(ROOT, "..")]) assert.throws(() => outsideRepository(path));
  const temp = mkdtempSync(join(tmpdir(), "bun-api28-probe-test-"));
  try {
    assert.throws(() => newOutputDirectory(temp));
    assert.throws(() => newOutputDirectory("relative-path"));
    assert.equal(newOutputDirectory(join(temp, "new")), join(temp, "new"));
  } finally { rmSync(temp, { recursive: true }); }
});

test("openat2 additions preserve the original 23 definitions and assets apart from the expected revision", () => {
  const original=withoutLchmod(probes).filter(p => !Object.hasOwn(OPENAT2_MODES,p.id));
  assert.equal(probes.find(p => p.id === "revision").stdout, "1.4.0+a9c76a599");
  assert.equal(hash(JSON.stringify(previousRevision(original))),"7c3740ddfad40a1709f16fcc7ecb211df3e43632cc8f7a084edb3e6c847884f4");
  const oldAssets=withoutLchmod(materializeProbes(probes)).filter(p => !Object.hasOwn(OPENAT2_MODES,p.id));
  assert.equal(Buffer.byteLength(JSON.stringify(oldAssets)),123987);
  for (const path of ["/openat2-probes.mjs","/openat2-evidence.mjs"])
    assert(inputFacts().some(input => input.path.endsWith(path)));
  for (const change of [p => {p[22].sourceAsset="../escape";},p => {p[22].sourceFile="../openat2-probes.mjs";},
    p => {p[22].mode="skip";},p => {p[22].source="fake";}]) {
    const changed=structuredClone(probes); change(changed); assert.throws(() => validateProbes(changed));
  }
});

test("a failed confinement proof or mismatched kernel can never pass the full runner", () => {
  for (const change of [r => {delete r.probes[22].openat2Evidence;},r => {r.probes[22].openat2Evidence.kernel="4.4.1";},
    r => {r.probes[22].stdout="OPENAT2_PROBE_RESULT={}";},r => {r.probes[0].openat2Evidence=openat2Fixture();},
    r => {r.probes[22].openat2Evidence.trapRows[8]=[200,"secret"];r.probes[22].openat2Evidence.passed=false;}]) {
    const {report,options}=fixture(); change(report); assert.throws(() => validateReport(report,options));
  }
});
test("lchmod adds only a fixed asset and preserves every original 24-probe definition", () => {
  assert.equal(withoutLchmod(probes).length,24);
  for(const path of ["/lchmod-probes.mjs","/lchmod-evidence.mjs"])
    assert(inputFacts().some(input=>input.path.endsWith(path)));
  assert(Buffer.byteLength(materializeLchmodSource())<=12288);
  assert(Buffer.byteLength(JSON.stringify(materializeProbes(probes)))<=131072);
  for(const change of [p=>{p[23].sourceAsset="../escape";},p=>{p[23].sourceFile="../lchmod-probes.mjs";},
    p=>{p[23].mode="install";},p=>{p[23].source="fake";},p=>{p[23].stdout="SYSCALL_PROBE_RESULT=";},
    p=>{p[23].timeoutMillis=30000;}]) {
    const changed=structuredClone(probes);change(changed);assert.throws(()=>validateProbes(changed));
  }
});
test("lchmod CLI evidence must match output, kernel, path effects and negative controls", () => {
  for(const change of [r=>{delete r.probes[23].lchmodEvidence;},r=>{r.probes[23].lchmodEvidence.kernel="4.4.1";},
    r=>{r.probes[23].stdout="LCHMOD_PROBE_RESULT={}";},r=>{r.probes[23].stdout+=r.probes[23].stdout;},
    r=>{r.probes[0].lchmodEvidence=lchmodFixture();},r=>{r.probes[23].lchmodEvidence.rows[1][1]=0;}]) {
    const {report,options}=fixture();change(report);assert.throws(()=>validateReport(report,options));
  }
});

test("build receipts bind current probe inputs, exact runtime hashes and APK inventory", () => validateReceipt(receipt()));
test("receipts reject production identity, source drift, paths and ABI/hash drift", () => {
  for (const change of [
    r => { r.packageName = "io.github.supermonster003.autojs6.plugin.bun.runtime"; },
    r => { r.testOnly = false; }, r => { r.minSdk = 27; }, r => { r.inputs[0].sha256 = "0".repeat(64); },
    r => { r.apks[0].filename = "../escape.apk"; }, r => { r.apks.reverse(); },
    r => { r.runtimes["arm64-v8a"].sha256 = "0".repeat(64); },
    r => { r.apks[1].signing.certificateSha256 = "c".repeat(64); },
    r => { r.schemaVersion = 1; }, r => { delete r.supervisor; },
    r => { r.supervisor.sourceSha256 = "0".repeat(64); }, r => { r.supervisor.ndkVersion = "27.2.12479018"; },
    r => { r.supervisor.artifacts[0].binarySha256 = "0".repeat(64); },
    r => { r.inputs = r.inputs.filter(input => input.path !== SHARED_PROCESS); },
    r => { r.inputs = r.inputs.filter(input => !input.path.endsWith("/fd-probes.mjs")); },
    r => { r.apks[0].signing.verifiedSchemes = []; }, r => { r.inputEncoding = "raw"; },
  ]) {
    const changed = receipt(); change(changed); assert.throws(() => validateReceipt(changed));
  }
});
test("a complete application-process report validates without implying Binder support", () => {
  const { report, options } = fixture(); assert.equal(validateReport(report, options), report);
});
test("shell/root, missing seccomp, translated ABIs and device mismatches cannot pass", () => {
  for (const change of [
    r => { r.environment.uid = 0; }, r => { r.environment.uid = 2000; },
    r => { r.environment.uid = 102000; }, r => { r.environment.seccomp = 0; },
    r => { r.environment.selinuxContext = "u:r:shell:s0"; },
    r => { r.environment.kernelMachine = "x86_64"; }, r => { r.environment.apiLevel = 31; },
    r => { r.environment.pageSizeBytes = 16384; }, r => { r.pluginBinderExercised = true; },
  ]) {
    const { report, options } = fixture(); change(report);
    assert.throws(() => validateReport(report, options));
  }
});
test("reported success cannot hide missing probes, wrong bytes, output leaks or process failure", () => {
  for (const change of [
    r => { r.probes.pop(); }, r => { r.probes[1] = r.probes[0]; },
    r => { r.probes[0].exitCode = 159; }, r => { r.probes[0].passed = false; },
    r => { r.probes[0].stdout = ""; }, r => { r.probes[0].stderr = "x".repeat(3000); },
    r => { r.probes[0].capturedBytes = 16385; }, r => { r.probes[0].elapsedMillis = 60000; },
    r => { r.probes[9].forciblyTerminated = false; }, r => { r.cleanupError = "leaked job"; },
    r => { r.installedApkSha256 = "c".repeat(64); }, r => { r.installedPayloadVerified = false; },
    r => { r.installedSupervisorVerified = false; }, r => { r.supervisorSha256 = "0".repeat(64); },
    r => { r.supervisorBytes++; }, r => { r.schemaVersion = 1; }, r => { r.privateJobRemoved = false; },
    r => { r.probes[0].processReaped = false; }, r => { r.probes[0].workspaceRemoved = false; },
    r => { r.probes[9].readyObserved = false; }, r => { r.probes[9].parentageVerified = false; },
    r => { r.probes[9].childGone = false; }, r => { r.probes[9].supervisorGone = false; },
    r => { r.probes[9].exitCode = 143; }, r => { r.probes[9].childPid = r.probes[9].supervisorPid; },
    r => { r.probes[9].readinessMillis = 1600; }, r => { r.probes[10].terminationToExitMillis = 2000; },
    r => { r.probes[10].capturedBytes = 0; }, r => { r.probes[10].elapsedMillis = 10000; },
    r => { r.probes[11].terminationRequestedAfterReadyMillis = 0; },
    r => { r.probes[11].terminationRequestedAfterReadyMillis = 2000; },
    r => { delete r.probes[12].fdEvidence; }, r => { r.probes[12].fdEvidence.passed = false; },
    r => { r.probes[12].fdEvidence.mode = "spawn-trap"; }, r => { r.probes[12].evidenceError = "bad JSON"; },
    r => { r.probes[12].stdout += r.probes[12].stdout; }, r => { r.probes[12].stdout = "FD_PROBE_RESULT={}"; },
    r => { r.probes[0].fdEvidence = fdFixture("spawn-native"); },
  ]) {
    const { report, options } = fixture(); change(report);
    assert.throws(() => validateReport(report, options));
  }
});

test("cleanup checks an exact package UID and all its processes, not only the package name", () => {
  assert.equal(parsePackageUid("package:" + PACKAGE + " uid:10123\r\n"), 10123);
  for (const output of ["", "package:another.app uid:10123", "package:" + PACKAGE + " uid:2000",
    "package:" + PACKAGE + " uid:10123\npackage:another.app uid:10124"])
    assert.throws(() => parsePackageUid(output));
  assert.equal(countUidProcesses(" UID PID NAME\n0 1 init\n10123 22 libbun_exec.so\n10123 21 libbun_supervisor.so\n10124 23 other", 10123), 2);
  assert.equal(countUidProcesses(" UID PID NAME\n0 1 init\n10124 23 other", 10123), 0);
  for (const output of ["", "USER PID NAME\nu0_a123 22 bun", "UID PID NAME\ntruncated"])
    assert.throws(() => countUidProcesses(output, 10123));
});
test("instrumentation requires exactly one report and the success terminal code", () => {
  const output = "INSTRUMENTATION_RESULT: report={\"passed\":true}\r\nINSTRUMENTATION_CODE: -1\r\n";
  assert.deepEqual(parseInstrumentation(output), { passed: true });
  for (const value of ["", output + output, output.replace("-1", "0"), output.replace("{", "invalid{")])
    assert.throws(() => parseInstrumentation(value));
});

test("packaged manifest gates enforce isolation, test-only signing use and native extraction", () => {
  const sections = {
    manifest: { package: PACKAGE, versionCode: "1", versionName: "0.0.0-api28-probe" },
    "uses-sdk": { minSdkVersion: "28", targetSdkVersion: "36" },
    "uses-permission": { name: "android.permission.INTERNET" },
    application: { debuggable: "false", testOnly: "true", allowBackup: "false",
      extractNativeLibs: "true", usesCleartextTraffic: "true" },
    instrumentation: { name: PACKAGE + ".ProbeInstrumentation", targetPackage: PACKAGE },
  };
  const dump = Object.entries(sections).map(([name, attributes]) => "  E: " + name + " (line=1)\n" +
    Object.entries(attributes).map(([key, value]) => "    A: " + key + "=" + value).join("\n")).join("\n");
  assert.equal(validateManifestDump(dump), true);
  for (const value of [
    dump.replace("testOnly=true", "testOnly=false"),
    dump.replace("extractNativeLibs=true", "extractNativeLibs=false"),
    dump.replace("minSdkVersion=28", "minSdkVersion=27"),
    dump.replace("targetPackage=" + PACKAGE, "targetPackage=another.app"),
    dump + "\n  E: service (line=1)",
    dump + "\n    A: sharedUserId=android.uid.system",
    dump.replace("package=" + PACKAGE, "package=another.app"),
  ]) assert.throws(() => validateManifestDump(value));
});
