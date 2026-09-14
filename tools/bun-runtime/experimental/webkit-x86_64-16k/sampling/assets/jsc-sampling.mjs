// Independent diagnostic. A collected record is not pressure acceptance.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { profile, noFTL, numberOfDFGCompiles, optimizeNextInvocation, reoptimizationRetryCount } from "bun:jsc";

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
const expected = Array.from({ length: 16 }, (_, seed) => {
  let value = BigInt(seed);
  for (let i = 0n; i < 16384n; i++) value = ((value ^ i) * 1664525n + 1013904223n) & 0xffffffffn;
  return Number(value);
});

const started = performance.now();
function tierPressure() {
  noFTL(jscPressureHotLoop);
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
  for (let index = 0; index < 4; index++) {
    const before = state(), callsBefore = calls;
    let callbackStarted, callbackEnded;
    const profileStarted = performance.now();
    const captured = profile(() => {
      callbackStarted = performance.now();
      const deadline = performance.now() + 300;
      for (let i = 0; i < 100000 && performance.now() < deadline; i++) invoke();
      callbackEnded = performance.now();
    }, 1000);
    const profileEnded = performance.now(), after = state();
    // Summarize only after profile returns. Do not add work inside invoke or tune JIT.
    const traces = captured.stackTraces.traces;
    assert(traces.length <= 10000);
    const tierFrames = { ...zeroTiers(), other: 0 }, targetFrames = zeroTiers();
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
      frames, tierFrames, targetFrames, unknownTargetFrames, targetTraces, topTargetTraces,
      distinctDfgTraceTimestamps: targetTimestamps.size, histogram, overflowFrames });
    if (samples.DFG >= 3) break;
  }
  const finalState = state(), elapsedMillis = Math.ceil(performance.now() - started);
  assert(elapsedMillis < 20000);
  // Report the original count/compile/no-FTL assertions and the distinct-witness
  // validator separately from successful diagnostic collection, including exit 1.
  const originalGatePassed = samples.DFG >= 3 && finalState.compiles > 0 && finalState.compiles < 1000000
    && samples.FTL === 0 && new Set(witnesses.map(w => w.timestamp)).size === 3;
  const result = { schemaVersion: 1, mode: "dfg", platform: process.platform, arch: process.arch,
    version: Bun.version, revision: Bun.revision, pages, kernelMappingPages: mappings[0],
    pageSizeSource: "/proc/self/auxv AT_PAGESZ", userPageSizeEmulated: pages === 16384,
    workspace: process.cwd(), reference: expected, iterationsPerCall: 16384, warmupCalls: 128,
    intervalMicroseconds: 1000, captureBudgetMillis: 300, captureCallCap: 100000, captureCap: 4,
    calls, samples, captures, witnesses, finalState, elapsedMillis, originalGatePassed,
    compatibilityAcceptance: false };
  const output = "JSC_SAMPLING_RESULT=" + JSON.stringify(result);
  assert(Buffer.byteLength(output + "\n") <= 65536);
  console.log(output);
  process.exitCode = originalGatePassed ? 0 : 1;
}
tierPressure();
