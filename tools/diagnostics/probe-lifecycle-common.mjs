import assert from "node:assert/strict";
import { inputFacts } from "./runtime-message-common.mjs";
import { buildInputs } from "../bun-runtime/experimental/api28/binder/binder-common.mjs";

export const PROBE_CLASS = "io.github.supermonster003.autojs6.plugin.bun.runtime.BunRuntimeProbeInstrumentedTest";
export const PROBE_TESTS = Object.freeze({
    transientFailureRetriesOnceForConcurrentCallersAfterCooldown:
        "retry callers=8 commands=4 cooldownMillis=30000 recovered=true injectedStartFailure=true",
    permanentIdentityFailureRequiresANewCacheAndDoesNotRetry:
        "permanent commands=1 elapsedMillis=3000000 cached=true newCacheReady=true injectedVersionMismatch=true",
    realCommandsBoundOutputTimeoutAndExitDiagnostics:
        "commands nonzero=159 syntheticExit=true outputStreams=2 capBytes=4096 timeoutExit=137 reaped=true readers=0 recovery=true",
});

export function probeInputs(mode) {
    assert(["official", "experimental"].includes(mode));
    return [...new Map([...inputFacts(), ...(mode === "experimental" ? buildInputs() : [])].map(f => [f.path, f])).values()]
        .sort((a, b) => a.path.localeCompare(b.path, "en"));
}

export function validateProbeLifecycle(text) {
    assert.doesNotMatch(text, /INSTRUMENTATION_FAILED|FAILURES!!!|Process crashed/);
    const started = [], passed = [], observations = [];
    let fields = {};
    for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
        const field = line.match(/^INSTRUMENTATION_STATUS: (\w+)=(.*)$/);
        const status = line.match(/^INSTRUMENTATION_STATUS_CODE: (-?\d+)$/);
        if (field) fields[field[1]] = field[2];
        else if (!status && fields.stream !== undefined) fields.stream += "\n" + line;
        if (!status) continue;
        const code = Number(status[1]);
        assert([0, 1].includes(code), "Failed or skipped probe test");
        if (fields.class === undefined && fields.test === undefined) {
            assert.equal(code, 0);
            assert.deepEqual(Object.keys(fields), ["stream"]);
            const value = fields.stream.trim();
            assert(value.startsWith("BUN_PROBE "));
            observations.push(value.slice("BUN_PROBE ".length));
        } else {
            assert.equal(fields.class, PROBE_CLASS);
            assert(Object.hasOwn(PROBE_TESTS, fields.test));
            assert.equal(Number(fields.numtests), 3);
            (code === 1 ? started : passed).push(fields.test);
        }
        fields = {};
    }
    assert.deepEqual(started.sort(), Object.keys(PROBE_TESTS).sort());
    assert.deepEqual(passed.sort(), Object.keys(PROBE_TESTS).sort());
    assert.deepEqual(observations.sort(), Object.values(PROBE_TESTS).sort());
    assert.match(text, /OK \(3 tests\)/);
    assert.match(text, /^INSTRUMENTATION_CODE: -1\s*$/m);
    return { tests: passed, observations };
}
