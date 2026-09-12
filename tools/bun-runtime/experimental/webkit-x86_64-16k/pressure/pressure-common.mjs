import assert from "node:assert/strict";
import { facts, PACKAGE } from "../../api28/binder/binder-common.mjs";

export const MODES = Object.freeze(["jit-off", "baseline", "dfg", "ftl", "gc", "wasm", "workers"]);
export const PRESSURE_TEST = "fixedJitGcWasmWorkerPressure";
export const PRESSURE_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.JscPressureInstrumentedTest";
export const KIND = "experimental-jsc-pressure-binder";
export const fixtureFacts = () => facts(new URL("assets/jsc-pressure.mjs", import.meta.url));
export const REFERENCE = Object.freeze(Array.from({ length: 16 }, (_, seed) => {
    let value = BigInt(seed);
    for (let i = 0n; i < 16384n; i++) value = ((value ^ i) * 1664525n + 1013904223n) & 0xffffffffn;
    return Number(value);
}));
const integer = (value, min, max) => assert(Number.isSafeInteger(value) && value >= min && value <= max,
    `Integer outside [${min}, ${max}]: ${value}`);

export function validateObservation(record, mode, pages, sourceSha256 = fixtureFacts().sha256) {
    assert.equal(record.sourceSha256, sourceSha256, "Pressure fixture bytes changed");
    assert.equal(record.workspaceRemoved, true);
    assert.equal(typeof record.stdout, "string");
    assert(Buffer.byteLength(record.stdout) <= 65536);
    const line = record.stdout.trim();
    assert(!line.includes("\n") && line.startsWith("JSC_PRESSURE_RESULT="));
    const proof = JSON.parse(line.slice("JSC_PRESSURE_RESULT=".length));
    assert.deepEqual(record.evidence, proof, "Parsed result differs from retained Bun output");
    assert.equal(proof.schemaVersion, 1);
    assert(MODES.includes(mode));
    assert.equal(proof.mode, mode);
    assert.equal(proof.platform, "android");
    assert.equal(proof.arch, "x64");
    assert.equal(proof.version, "1.4.0");
    assert([4096, 16384].includes(pages));
    assert.equal(proof.pages, pages);
    assert.equal(proof.pageSizeSource, "/proc/self/auxv AT_PAGESZ");
    assert.equal(proof.kernelMappingPages, 4096, "This native-x86 fixture records the real 4 KiB kernel mappings separately");
    assert.equal(proof.userPageSizeEmulated, pages === 16384);
    assert.equal(proof.passed, true);
    integer(proof.elapsedMillis, 1, 19999);
    assert.equal(typeof proof.workspace, "string");
    // Android's /data/data spelling aliases /data/user/0. The device test also
    // compares canonical parents and checks nonexistence after runScript.
    const prefix = ["/data/user/0/", "/data/data/"].map(base => `${base}${PACKAGE}.jsc16k/cache/bun-executions/`)
        .find(base => proof.workspace.startsWith(base));
    assert(prefix, "Workspace must be an immediate private execution directory");
    assert(/^[A-Za-z0-9_-]{1,128}$/.test(proof.workspace.slice(prefix.length)));
    const e = proof.evidence;
    if (MODES.slice(0, 4).includes(mode)) {
        const target = { "jit-off": "LLInt", baseline: "Baseline", dfg: "DFG", ftl: "FTL" }[mode];
        assert.equal(e.target, target);
        assert.deepEqual(Object.keys(e.samples).sort(), ["Baseline", "DFG", "FTL", "LLInt"]);
        for (const count of Object.values(e.samples)) integer(count, 0, 10240000);
        assert(e.samples[target] >= 3, "Actual target-tier samples required");
        assert.equal(e.witnesses.length, 3);
        for (const { timestamp, frame } of e.witnesses) {
            assert(Number.isFinite(timestamp) && timestamp > 0);
            assert.equal(frame.name, "jscPressureHotLoop");
            assert.equal(frame.category, target);
            assert.equal(typeof frame.location, "string");
            assert(frame.location.length > 0 && frame.location.length <= 4096);
        }
        assert.equal(new Set(e.witnesses.map(w => w.timestamp)).size, 3, "Three distinct sampled traces required");
        integer(e.profiles, 1, 4);
        integer(e.calls, 129, 400128);
        assert.equal(e.iterationsPerCall, 16384);
        assert.deepEqual(e.reference, REFERENCE);
        if (mode === "jit-off" || mode === "baseline") {
            assert.equal(e.compiles, 1000000, "Disabled-DFG sentinel is not an observed compile count");
            assert.equal(e.samples.DFG + e.samples.FTL, 0);
            if (mode === "jit-off") assert.equal(e.samples.Baseline, 0);
        } else integer(e.compiles, 1, 999999);
        if (mode === "dfg") assert.equal(e.samples.FTL, 0);
    } else if (mode === "gc") {
        for (const [key, value] of Object.entries({ rounds: 24, fullCollections: 25, edenCollections: 24,
            objectsAllocated: 98304, bufferBytesAllocated: 50331648, objectsChecked: 192512 })) assert.equal(e[key], value, key);
        integer(e.peakHeap, 1, 128 * 1024 * 1024 - 1);
        integer(e.finalHeap, 1, 128 * 1024 * 1024 - 1);
    } else if (mode === "wasm") {
        assert.deepEqual(e, { modules: 32, calls: 2097152, memoryPages: 64, grows: 63, growthLimitRejected: true });
    } else {
        assert.equal(e.waves, 4); assert.equal(e.concurrency, 4); assert.equal(e.exited, 16);
        assert.equal(e.workers.length, 16);
        for (const [seed, worker] of e.workers.entries()) {
            assert.equal(worker.seed, seed);
            assert.equal(worker.checksum, Number((BigInt(REFERENCE[seed]) * 512n) & 0xffffffffn));
            integer(worker.compiles, 1, 999999);
            assert.equal(worker.transferredBytes, 1048576);
            assert.equal(worker.exitCode, 0);
        }
    }
    return record;
}

export function validatePressureInstrumentation(text, pages, sourceSha256 = fixtureFacts().sha256) {
    assert(Buffer.byteLength(text) <= 2 * 1024 * 1024);
    const observations = [], started = [], passed = [];
    let bundle = {};
    for (const line of text.split(/\r?\n/)) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        if (field) { assert(!Object.hasOwn(bundle, field[1]), "Duplicate instrumentation field"); bundle[field[1]] = field[2]; }
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (!field && !status && bundle.stream !== undefined) bundle.stream += "\n" + line;
        if (!status) continue;
        const code = Number(status[1]);
        assert([0, 1].includes(code), "Failed/ignored pressure instrumentation");
        if (bundle.class === undefined && bundle.test === undefined) {
            assert.equal(code, 0);
            assert.deepEqual(Object.keys(bundle), ["stream"]);
            const stream = bundle.stream.trim();
            assert(stream.startsWith("JSC_PRESSURE=") && !stream.includes("\n"));
            assert(observations.length < MODES.length, "Extra pressure observation");
            observations.push(validateObservation(JSON.parse(stream.slice("JSC_PRESSURE=".length)),
                MODES[observations.length], pages, sourceSha256));
        } else {
            assert.equal(bundle.class, PRESSURE_CLASS);
            assert.equal(Number(bundle.numtests), 1);
            assert.equal(Number(bundle.current), 1);
            assert.equal(bundle.test, PRESSURE_TEST);
            (code === 0 ? passed : started).push(bundle.test);
        }
        bundle = {};
    }
    assert.deepEqual(started, [PRESSURE_TEST]);
    assert.deepEqual(passed, [PRESSURE_TEST]);
    assert.equal(observations.length, MODES.length, "All seven pressure modes required exactly once");
    assert.match(text, /OK \(1 test\)/);
    assert.deepEqual([...text.matchAll(/^INSTRUMENTATION_CODE: (-?\d+)\s*$/gm)].map(m => m[1]), ["-1"]);
    assert.doesNotMatch(text, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed/);
    return observations;
}
