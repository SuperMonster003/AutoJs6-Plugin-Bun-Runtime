// Fixed offline test fixture, not a supported plugin capability or benchmark.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Worker } from "node:worker_threads";
import { profile, noFTL, numberOfDFGCompiles, optimizeNextInvocation, fullGC, edenGC, heapSize } from "bun:jsc";

const mode = process.env.AUTOJS6_JSC_PRESSURE_MODE;
assert(["jit-off", "baseline", "dfg", "ftl", "gc", "wasm", "workers"].includes(mode));
assert.equal(process.platform, "android");
assert.equal(process.arch, "x64");
assert.equal(Bun.version, "1.4.0");
// x86_64 Android's 16 KiB environment emulates the userspace page ABI through
// ELF AT_PAGESZ while smaps still exposes 4 KiB kernel mappings. Preserve both,
// and have the instrumentation cross-check AT_PAGESZ against Os.sysconf.
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
const result = { schemaVersion: 1, mode, platform: process.platform, arch: process.arch, version: Bun.version, pages,
  pageSizeSource: "/proc/self/auxv AT_PAGESZ", kernelMappingPages: mappings[0], userPageSizeEmulated: pages !== mappings[0] };

function jscPressureHotLoop(seed) {
  let value = seed | 0;
  for (let i = 0; i < 16384; i++) value = (Math.imul(value ^ i, 1664525) + 1013904223) | 0;
  return value >>> 0;
}
// Independent BigInt modular arithmetic reference, outside the measured loop.
const expected = Array.from({ length: 16 }, (_, seed) => {
  let value = BigInt(seed);
  for (let i = 0n; i < 16384n; i++) value = ((value ^ i) * 1664525n + 1013904223n) & 0xffffffffn;
  return Number(value);
});

function tierPressure() {
  if (mode === "dfg") noFTL(jscPressureHotLoop);
  let calls = 0;
  const invoke = () => {
    const seed = calls++ % 16;
    assert.equal(jscPressureHotLoop(seed), expected[seed], "JIT arithmetic differs from BigInt reference");
  };
  for (let i = 0; i < 128; i++) invoke();
  if (mode === "dfg" || mode === "ftl") optimizeNextInvocation(jscPressureHotLoop);
  const samples = { LLInt: 0, Baseline: 0, DFG: 0, FTL: 0 };
  const target = { "jit-off": "LLInt", baseline: "Baseline", dfg: "DFG", ftl: "FTL" }[mode];
  const witnesses = [];
  let profiles = 0;
  for (; profiles < 4; profiles++) {
    const captured = profile(() => {
      const deadline = performance.now() + 300;
      for (let i = 0; i < 100000 && performance.now() < deadline; i++) invoke();
    }, 1000);
    assert(captured.stackTraces.traces.length <= 10000, "Sampling capture exceeded bound");
    for (const trace of captured.stackTraces.traces) {
      assert(trace.frames.length <= 256);
      for (const frame of trace.frames) {
        if (frame.name === "jscPressureHotLoop" && Object.hasOwn(samples, frame.category)) {
          samples[frame.category]++;
          if (frame.category === target && witnesses.length < 3) witnesses.push({ timestamp: trace.timestamp, frame });
        }
      }
    }
    if (samples[target] >= 3) { profiles++; break; }
  }
  const compiles = numberOfDFGCompiles(jscPressureHotLoop);
  assert(samples[target] >= 3, `Missing ${target} samples: ${JSON.stringify(samples)}; compiles=${compiles}`);
  if (mode === "jit-off" || mode === "baseline") {
    // WebKit intentionally returns this sentinel when any optimizing JIT gate
    // is off. It is NOT a million observed compilations.
    assert.equal(compiles, 1000000);
    assert.equal(samples.DFG + samples.FTL, 0);
    if (mode === "jit-off") assert.equal(samples.Baseline, 0);
  } else assert(Number.isInteger(compiles) && compiles > 0 && compiles < 1000000);
  if (mode === "dfg") assert.equal(samples.FTL, 0);
  return { target, samples, witnesses, compiles, profiles, calls, iterationsPerCall: 16384, reference: expected };
}

function gcPressure() {
  const retained = [];
  let checked = 0, peakHeap = 0;
  for (let round = 0; round < 24; round++) {
    const objects = Array.from({ length: 4096 }, (_, index) => ({ index, text: `gc-${round}-${index}`, value: index ^ round }));
    const buffers = Array.from({ length: 16 }, (_, index) => {
      const bytes = new Uint8Array(131072);
      bytes.fill((round + index) & 255);
      return bytes;
    });
    retained.push({ round, objects, buffers });
    if (retained.length > 2) retained.shift();
    edenGC(); fullGC();
    for (const entry of retained) {
      for (const item of entry.objects) {
        assert.equal(item.text, `gc-${entry.round}-${item.index}`);
        assert.equal(item.value, item.index ^ entry.round);
        checked++;
      }
      entry.buffers.forEach((bytes, index) => {
        for (let offset = 0; offset < bytes.length; offset += 4096) assert.equal(bytes[offset], (entry.round + index) & 255);
        assert.equal(bytes[bytes.length - 1], (entry.round + index) & 255);
      });
    }
    const current = heapSize();
    assert(Number.isFinite(current) && current > 0 && current < 128 * 1024 * 1024);
    peakHeap = Math.max(peakHeap, current);
  }
  retained.length = 0;
  fullGC();
  return { rounds: 24, fullCollections: 25, edenCollections: 24, objectsAllocated: 98304,
    bufferBytesAllocated: 50331648, objectsChecked: checked, peakHeap, finalHeap: heapSize() };
}

// (module (func (export "add") (param i32 i32) (result i32)
//   local.get 0 local.get 1 i32.add)) -- no downloaded compiler/dependency.
const wasmBytes = new Uint8Array([0,97,115,109,1,0,0,0,1,7,1,96,2,127,127,1,127,3,2,1,0,7,7,1,3,97,100,100,0,0,10,9,1,7,0,32,0,32,1,106,11]);
async function wasmPressure() {
  assert(WebAssembly.validate(wasmBytes));
  for (let round = 0; round < 32; round++) {
    const module = await WebAssembly.compile(wasmBytes);
    const { exports } = await WebAssembly.instantiate(module);
    for (let index = 0; index < 65536; index++) assert.equal(exports.add(index, round), (index + round) | 0);
  }
  const memory = new WebAssembly.Memory({ initial: 1, maximum: 64 });
  let view = new Uint8Array(memory.buffer);
  view[0] = 123;
  for (let page = 1; page < 64; page++) {
    const previous = view.buffer;
    assert.equal(memory.grow(1), page);
    assert.equal(previous.byteLength, 0);
    view = new Uint8Array(memory.buffer);
    assert.equal(view[0], 123);
    assert.equal(view[page * 65536], 0);
    view[page * 65536] = page;
    for (let old = 1; old <= page; old++) assert.equal(view[old * 65536], old);
  }
  assert.throws(() => memory.grow(1), RangeError);
  return { modules: 32, calls: 2097152, memoryPages: 64, grows: 63, growthLimitRejected: true };
}

async function workerPressure() {
  const workerSource = `import { numberOfDFGCompiles, fullGC } from "bun:jsc";
    import { parentPort } from "node:worker_threads";
    ${jscPressureHotLoop.toString()}
    parentPort.on("message", data => {
      let checksum = 0;
      for (let i = 0; i < 512; i++) checksum = (checksum + jscPressureHotLoop(data.seed)) >>> 0;
      const bytes = new Uint8Array(1048576); bytes.fill(data.seed); fullGC();
      parentPort.postMessage({seed:data.seed,checksum,compiles:numberOfDFGCompiles(jscPressureHotLoop),bytes:bytes.buffer},[bytes.buffer]);
      parentPort.close();
    });`;
  const observations = [];
  for (let wave = 0; wave < 4; wave++) {
    const group = [];
    try {
      for (let slot = 0; slot < 4; slot++) {
        const seed = wave * 4 + slot, worker = new Worker(workerSource, { eval: true });
        let timer;
        const done = new Promise((resolve, reject) => {
          let message;
          timer = setTimeout(() => reject(new Error("Worker exceeded 8-second bound")), 8000);
          worker.once("error", reject);
          worker.once("exit", code => {
            try {
              assert.equal(code, 0);
              assert(message, "Worker exited without its checked result");
              observations.push({ ...message, exitCode: code });
              resolve();
            } catch (error) { reject(error); }
          });
          worker.on("message", data => {
            try {
              assert(!message, "Duplicate worker result");
              assert.equal(data.seed, seed);
              assert.equal(data.checksum, Number((BigInt(expected[seed]) * 512n) & 0xffffffffn));
              assert(Number.isInteger(data.compiles) && data.compiles > 0 && data.compiles < 1000000);
              const bytes = new Uint8Array(data.bytes);
              assert.equal(bytes.length, 1048576);
              for (let offset = 0; offset < bytes.length; offset += 4096) assert.equal(bytes[offset], seed);
              message = { seed, checksum: data.checksum, compiles: data.compiles, transferredBytes: bytes.length };
            } catch (error) { reject(error); }
          });
          worker.postMessage({ seed });
        });
        group.push({ worker, done: done.finally(() => clearTimeout(timer)) });
      }
      await Promise.all(group.map(item => item.done));
    } finally { await Promise.all(group.map(item => item.worker.terminate())); }
  }
  return { waves: 4, concurrency: 4, workers: observations.sort((a, b) => a.seed - b.seed), exited: 16 };
}

const start = performance.now();
result.evidence = ["jit-off", "baseline", "dfg", "ftl"].includes(mode) ? tierPressure()
  : mode === "gc" ? gcPressure() : mode === "wasm" ? await wasmPressure() : await workerPressure();
result.elapsedMillis = Math.ceil(performance.now() - start);
assert(result.elapsedMillis < 20000, "Pressure fixture exceeded 20-second bound");
result.workspace = process.cwd();
result.passed = true;
console.log("JSC_PRESSURE_RESULT=" + JSON.stringify(result));
