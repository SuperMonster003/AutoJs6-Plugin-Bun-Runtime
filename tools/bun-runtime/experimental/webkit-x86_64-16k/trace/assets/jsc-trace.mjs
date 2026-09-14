// Fixed restart/clear diagnostic, separate from the original sampling fixture.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { profile, noFTL, numberOfDFGCompiles, optimizeNextInvocation, reoptimizationRetryCount } from "bun:jsc";

const mode = process.env.AUTOJS6_JSC_RESTART_MODE;
assert(["target", "target-absent"].includes(mode));
assert.equal(process.platform, "android");
assert.equal(process.arch, "x64");
assert.equal(Bun.version, "1.4.0");
const mappings = [...new Set([...readFileSync("/proc/self/smaps", "utf8").matchAll(/^KernelPageSize:\s+(\d+) kB$/gm)].map(m => Number(m[1]) * 1024))];
assert.deepEqual(mappings, [4096]);
const auxv = readFileSync("/proc/self/auxv");
assert(auxv.length <= 8192 && auxv.length % 16 === 0);
const pageEntries = [];
for (let offset = 0; offset < auxv.length; offset += 16) {
  const type = auxv.readBigUInt64LE(offset);
  if (type === 0n) break;
  if (type === 6n) pageEntries.push(Number(auxv.readBigUInt64LE(offset + 8)));
}
assert.equal(pageEntries.length, 1);
const pages = pageEntries[0];
assert([4096, 16384].includes(pages));

// This hot function, reference and invoke body match the original fixture.
function jscPressureHotLoop(seed) {
  let value = seed | 0;
  for (let i = 0; i < 16384; i++) value = (Math.imul(value ^ i, 1664525) + 1013904223) | 0;
  return value >>> 0;
}
function jscRestartControlLoop(seed) {
  let value = seed | 0;
  for (let i = 0; i < 16384; i++) value = (Math.imul(value ^ i, 1664525) + 1013904223) | 0;
  return value >>> 0;
}
const expected = Array.from({ length: 16 }, (_, seed) => {
  let value = BigInt(seed);
  for (let i = 0n; i < 16384n; i++) value = ((value ^ i) * 1664525n + 1013904223n) & 0xffffffffn;
  return Number(value);
});

// TRACE-OBSERVATION-BEGIN
const traceClasses = ["target-ftl-linked", "target-ftl-unlinked", "invoke-ftl-other-target",
  "invoke-ftl-target-absent", "dfg-pair", "other"];
const traceEvidence = { schemaVersion: 1, perClassCap: 1, witnessByteCap: 4096,
  totalWitnessByteCap: 24576, storedWitnessBytes: 0, captures: [] };
function captureTraceEvidence(traces, index) {
  const buckets = Object.fromEntries(traceClasses.map(kind => [kind,
    { count: 0, firstTraceIndex: null, firstWitnessBytes: null, status: "absent", witness: null }]));
  const totals = { targetFtlFrames: 0, linkedTargetFtlFrames: 0, linkedToInvokeFtlFrames: 0, invokeFtlFrames: 0 };
  for (const [traceIndex, trace] of traces.entries()) {
    assert(trace.frames.length <= 256);
    let targetFtl = 0, linked = 0, linkedToInvoke = 0, invokeFtl = 0, target = 0, targetDfg = 0, invokeDfg = 0;
    for (const [frameIndex, frame] of trace.frames.entries()) {
      if (frame.name === "invoke" && frame.category === "FTL") invokeFtl++;
      if (frame.name === "invoke" && frame.category === "DFG") invokeDfg++;
      if (frame.name !== "jscPressureHotLoop") continue;
      target++;
      if (frame.category === "DFG") targetDfg++;
      if (frame.category !== "FTL") continue;
      targetFtl++;
      const machine = frame.inliner;
      if (machine && trace.frames.some((outer, outerIndex) => outerIndex > frameIndex
        && outer.name === machine.name && outer.location === machine.location && outer.category === machine.category)) {
        linked++;
        if (machine.name === "invoke" && machine.category === "FTL") linkedToInvoke++;
      }
    }
    const kind = targetFtl ? (linked === targetFtl ? "target-ftl-linked" : "target-ftl-unlinked")
      : invokeFtl ? (target ? "invoke-ftl-other-target" : "invoke-ftl-target-absent")
        : targetDfg && invokeDfg ? "dfg-pair" : "other";
    totals.targetFtlFrames += targetFtl; totals.linkedTargetFtlFrames += linked;
    totals.linkedToInvokeFtlFrames += linkedToInvoke; totals.invokeFtlFrames += invokeFtl;
    const bucket = buckets[kind];
    bucket.count++;
    if (bucket.count !== 1) continue;
    bucket.firstTraceIndex = traceIndex;
    // Preserve the entire first JSON trace. Never truncate frames or substitute a later sample.
    const witness = { traceIndex, rawTrace: JSON.stringify(trace) };
    const bytes = Buffer.byteLength(JSON.stringify(witness));
    bucket.firstWitnessBytes = bytes;
    if (bytes > traceEvidence.witnessByteCap) bucket.status = "oversize";
    else if (traceEvidence.storedWitnessBytes + bytes > traceEvidence.totalWitnessByteCap) bucket.status = "budget";
    else {
      bucket.status = "stored"; bucket.witness = witness;
      traceEvidence.storedWitnessBytes += bytes;
    }
  }
  return { index, traces: traces.length, totals, buckets };
}
// TRACE-OBSERVATION-END
const started = performance.now();
function restartDiagnostic() {
  noFTL(jscPressureHotLoop);
  noFTL(jscRestartControlLoop);
  let calls = 0;
  const invoke = () => {
    const seed = calls++ % 16;
    assert.equal(jscPressureHotLoop(seed), expected[seed], "JIT arithmetic differs from BigInt reference");
  };
  for (let i = 0; i < 128; i++) invoke();
  optimizeNextInvocation(jscPressureHotLoop);
  const state = () => ({ compiles: numberOfDFGCompiles(jscPressureHotLoop), retries: reoptimizationRetryCount(jscPressureHotLoop) });
  const zeroTiers = () => ({ LLInt: 0, Baseline: 0, DFG: 0, FTL: 0 });
  const samples = zeroTiers(), captures = [], witnesses = [];
  let callbackStarted, callbackEnded;
  const perform = mode === "target" ? invoke : () => {
    const seed = calls++ % 16;
    assert.equal(jscRestartControlLoop(seed), expected[seed], "Control arithmetic differs from BigInt reference");
  };
  function runWork() {
    callbackStarted = performance.now();
    const deadline = performance.now() + 300;
    for (let i = 0; i < 100000 && performance.now() < deadline; i++) perform();
    callbackEnded = performance.now();
  }
  // Each once-called named callback must belong only to its own capture.
  function jscRestartPhase1() { runWork(); }
  function jscRestartPhase2() { runWork(); }
  function jscRestartPhase3() { runWork(); }
  function jscRestartPhase4() { runWork(); }
  const phases = [jscRestartPhase1, jscRestartPhase2, jscRestartPhase3, jscRestartPhase4];
  for (let index = 0; index < 4; index++) {
    const before = state(), callsBefore = calls;
    const profileStarted = performance.now();
    const captured = profile(phases[index], 1000);
    const profileEnded = performance.now(), after = state();
    // Summarize only after profile returns. Do not add work inside invoke or tune JIT.
    const traces = captured.stackTraces.traces;
    assert(traces.length <= 10000);
// TRACE-OBSERVATION-BEGIN
    traceEvidence.captures.push(captureTraceEvidence(traces, index + 1));
// TRACE-OBSERVATION-END
    const tierFrames = { ...zeroTiers(), other: 0 }, targetFrames = zeroTiers();
    const controlFrames = zeroTiers(), phaseFrames = [0, 0, 0, 0];
    let phaseWitness = null;
    const histogram = [], targetTimestamps = new Set(), timestamps = new Set();
    let frames = 0, overflowFrames = 0, unknownTargetFrames = 0, targetTraces = 0, topTargetTraces = 0;
    for (const trace of traces) {
      assert(Number.isFinite(trace.timestamp) && trace.timestamp > 0);
      timestamps.add(trace.timestamp);
      assert(trace.frames.length <= 256);
      let hasTarget = false;
      for (const [frameIndex, frame] of trace.frames.entries()) {
        frames++;
        assert.equal(typeof frame.name, "string");
        assert.equal(typeof frame.category, "string");
        tierFrames[Object.hasOwn(samples, frame.category) ? frame.category : "other"]++;
        const name = frame.name.slice(0, 128), category = frame.category.slice(0, 64);
        const entry = histogram.find(item => item.name === name && item.category === category);
        if (entry) entry.frames++;
        else if (histogram.length < 16) histogram.push({ name, category, frames: 1 });
        else overflowFrames++;
        const phaseIndex = phases.findIndex(phase => phase.name === frame.name);
        if (phaseIndex >= 0) {
          phaseFrames[phaseIndex]++;
          if (phaseIndex === index && !phaseWitness) {
            assert.equal(typeof frame.location, "string");
            phaseWitness = { timestamp: trace.timestamp, frameIndex,
              frame: { name: frame.name, category: frame.category, location: frame.location.slice(0, 512) } };
          }
        }
        if (frame.name === "jscRestartControlLoop" && Object.hasOwn(samples, frame.category)) controlFrames[frame.category]++;
        if (frame.name !== "jscPressureHotLoop") continue;
        hasTarget = true;
        if (frameIndex === 0) topTargetTraces++;
        if (!Object.hasOwn(samples, frame.category)) { unknownTargetFrames++; continue; }
        targetFrames[frame.category]++;
        samples[frame.category]++;
        if (frame.category === "DFG") {
          targetTimestamps.add(trace.timestamp);
          if (witnesses.length < 3) {
            assert.equal(typeof frame.location, "string");
            witnesses.push({ profile: index + 1, timestamp: trace.timestamp, frameIndex,
              frame: { name: frame.name, category: frame.category, location: frame.location.slice(0, 512) } });
          }
        }
      }
      if (hasTarget) targetTraces++;
    }
    captures.push({ index: index + 1, before, after, calls: calls - callsBefore,
      callbackMillis: callbackEnded - callbackStarted, profileMillis: profileEnded - profileStarted,
      stopReason: calls - callsBefore === 100000 ? "call-cap" : "deadline",
      traces: traces.length, distinctTraceTimestamps: timestamps.size,
      firstTimestamp: traces.length ? Math.min(...timestamps) : null,
      lastTimestamp: traces.length ? Math.max(...timestamps) : null,
      frames, tierFrames, targetFrames, controlFrames, phaseFrames, phaseWitness, unknownTargetFrames, targetTraces, topTargetTraces,
      distinctDfgTraceTimestamps: targetTimestamps.size, histogram, overflowFrames });
    // Always collect the four declared phases; this is not the original stop rule.
  }
  const finalState = state(), elapsedMillis = Math.ceil(performance.now() - started);
  assert(elapsedMillis < 20000);
  // Report the original count/compile/no-FTL assertions and the distinct-witness
  // validator separately from successful diagnostic collection, including exit 1.
  const targetGatePassed = samples.DFG >= 3 && finalState.compiles > 0 && finalState.compiles < 1000000
    && samples.FTL === 0 && new Set(witnesses.map(w => w.timestamp)).size === 3;
  const restartObserved = captures.every((c, i) => c.phaseFrames[i] > 0
    && c.phaseFrames.every((count, phase) => phase === i || count === 0)
    && (i === 0 || c.firstTimestamp > captures[i - 1].lastTimestamp));
  const absentControlObserved = mode === "target-absent" ? captures.every(c =>
    Object.values(c.targetFrames).every(count => count === 0) && c.unknownTargetFrames === 0
    && Object.values(c.controlFrames).some(count => count > 0)) : null;
  const result = { schemaVersion: 1, mode, platform: process.platform, arch: process.arch,
    version: Bun.version, revision: Bun.revision, pages, kernelMappingPages: mappings[0],
    pageSizeSource: "/proc/self/auxv AT_PAGESZ", userPageSizeEmulated: pages === 16384,
    workspace: process.cwd(), reference: expected, iterationsPerCall: 16384, warmupCalls: 128,
    intervalMicroseconds: 1000, captureBudgetMillis: 300, captureCallCap: 100000, captureCap: 4,
    calls, sampledTargetCalls: mode === "target" ? calls - 128 : 0,
    sampledControlCalls: mode === "target-absent" ? calls - 128 : 0,
    samples, captures, witnesses, finalState, elapsedMillis, targetGatePassed, restartObserved, absentControlObserved,
    compatibilityAcceptance: false };
// TRACE-OBSERVATION-BEGIN
  result.traceEvidence = traceEvidence;
// TRACE-OBSERVATION-END
  const output = "JSC_RESTART_RESULT=" + JSON.stringify(result);
  assert(Buffer.byteLength(output + "\n") <= 65536);
  console.log(output);
  process.exitCode = targetGatePassed ? 0 : 1;
}
restartDiagnostic();
