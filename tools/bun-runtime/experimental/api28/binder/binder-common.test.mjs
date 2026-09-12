import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PACKAGE, TEST_CLASS, TESTS, parseBinderUid, validateDevice, validateInstrumentation } from "./binder-common.mjs";

const valid = () => TESTS.map((name, i) => [1, 0].map(code =>
    `INSTRUMENTATION_STATUS: class=${TEST_CLASS}\nINSTRUMENTATION_STATUS: current=${i + 1}\nINSTRUMENTATION_STATUS: numtests=8\nINSTRUMENTATION_STATUS: test=${name}\nINSTRUMENTATION_STATUS_CODE: ${code}\n`).join("")).join("") +
    ["CANCELLED", "CANCELLED", "CANCELLED", "OUTPUT_LIMIT", "TIMEOUT"].map(error =>
        `INSTRUMENTATION_STATUS: stream=\nBUN_LIFECYCLE error=${error} childPid=12345 reaped=true exitCode=137 durationMillis=350 workspaceRemoved=true\nINSTRUMENTATION_STATUS_CODE: 0\n`).join("") +
    "INSTRUMENTATION_RESULT: stream=\nOK (8 tests)\nINSTRUMENTATION_CODE: -1\n";

test("exact eight-test inventory remains shared with the actual plugin suite", () => {
    const source = readFileSync(new URL("../../../../../app/src/androidTest/java/io/github/supermonster003/autojs6/plugin/bun/runtime/BunRuntimeInstrumentedTest.kt", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/@Test\s+fun (\w+)/g)].map(m => m[1]).sort(), TESTS.slice().sort());
});
test("all test outcomes and lifecycle diagnostics are required", () => {
    assert.equal(validateInstrumentation(valid()).length, 8);
    for (const changed of [
        valid().replace("INSTRUMENTATION_STATUS_CODE: 0", "INSTRUMENTATION_STATUS_CODE: -3"),
        valid().replace("reaped=true", "reaped=false"), valid().replace("workspaceRemoved=true", "workspaceRemoved=false"),
        valid().replace("durationMillis=350", "durationMillis=9000"),
        valid().replace("OK (8 tests)", "OK (7 tests)"), valid().replace("INSTRUMENTATION_CODE: -1", "INSTRUMENTATION_CODE: 0"),
        valid().replace(TESTS[0], "unknownTest"), valid() + "\nINSTRUMENTATION_FAILED: crash",
    ]) assert.throws(() => validateInstrumentation(changed));
});
test("UID selection is exact even when pm returns the test package too", () => {
    assert.equal(parseBinderUid(`package:${PACKAGE}.test uid:10501\npackage:${PACKAGE} uid:10500`), 10500);
    assert.throws(() => parseBinderUid(`package:${PACKAGE}.test uid:10501`));
    assert.throws(() => parseBinderUid(`package:${PACKAGE} uid:2000`));
    assert.throws(() => parseBinderUid(`package:${PACKAGE} uid:10500\npackage:${PACKAGE} uid:10500`));
});
test("native device gates cannot accept translated or wrong-page evidence", () => {
    const device = { api: "36", abi: "arm64-v8a", pages: "16384", bridge: "0", machine: "aarch64" };
    const expected = { api: 36, abi: "arm64-v8a", pages: 16384 };
    validateDevice(device, expected);
    for (const patch of [{ api: "35" }, { pages: "4096" }, { bridge: "libndk_translation.so" }, { machine: "x86_64" }]) {
        assert.throws(() => validateDevice({ ...device, ...patch }, expected));
    }
});

test("native x86 ELF execution does not use an available ARM translator", () => {
    validateDevice({ api: "36", abi: "x86_64", pages: "16384", bridge: "libndk_translation.so", machine: "x86_64" },
        { api: 36, abi: "x86_64", pages: 16384 });
});
