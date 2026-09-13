import assert from "node:assert/strict";
import test from "node:test";
import { PROBE_CLASS, PROBE_TESTS, validateProbeLifecycle } from "./probe-lifecycle-common.mjs";

function transcript() {
    return Object.entries(PROBE_TESTS).map(([method, observation]) => {
        const fields = `INSTRUMENTATION_STATUS: class=${PROBE_CLASS}\nINSTRUMENTATION_STATUS: numtests=3\nINSTRUMENTATION_STATUS: test=${method}\n`;
        return fields + "INSTRUMENTATION_STATUS_CODE: 1\nINSTRUMENTATION_STATUS: stream=\nBUN_PROBE " + observation +
            "\nINSTRUMENTATION_STATUS_CODE: 0\n" + fields + "INSTRUMENTATION_STATUS_CODE: 0\n";
    }).join("") + "OK (3 tests)\nINSTRUMENTATION_CODE: -1\n";
}

test("probe lifecycle evidence requires all tests and exact controlled observations", () => {
    assert.equal(validateProbeLifecycle(transcript()).tests.length, 3);
    assert.equal(validateProbeLifecycle(transcript().replaceAll("\n", "\r\n")).observations.length, 3);
    for (const [from, to] of [["recovered=true", "recovered=false"], ["commands=4", "commands=8"],
        ["capBytes=4096", "capBytes=8192"], ["reaped=true", "reaped=false"], ["readers=0", "readers=1"],
        ["syntheticExit=true", "syntheticExit=false"], ["INSTRUMENTATION_STATUS_CODE: 0", "INSTRUMENTATION_STATUS_CODE: -3"],
        ["INSTRUMENTATION_CODE: -1", "INSTRUMENTATION_CODE: 0"], ["OK (3 tests)", "FAILURES!!!"]]) {
        assert.throws(() => validateProbeLifecycle(transcript().replace(from, to)), from);
    }
});

test("missing, duplicated or wrong-class results cannot pass", () => {
    const methods = Object.keys(PROBE_TESTS);
    assert.throws(() => validateProbeLifecycle(transcript().replaceAll(methods[0], methods[1])));
    assert.throws(() => validateProbeLifecycle(transcript().replace(PROBE_CLASS, "WrongClass")));
    assert.throws(() => validateProbeLifecycle(transcript().replace("BUN_PROBE retry", "MISSING retry")));
});
