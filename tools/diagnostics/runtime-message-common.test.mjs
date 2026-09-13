import assert from "node:assert/strict";
import test from "node:test";
import { LOCALES, METHODS, MESSAGE_CLASS, validateMessages } from "./runtime-message-common.mjs";

function transcript(suite) {
    const fields = `INSTRUMENTATION_STATUS: class=${MESSAGE_CLASS}\nINSTRUMENTATION_STATUS: test=${METHODS[suite]}\n`;
    const records = LOCALES.map(locale => suite === "resources"
        ? `resources locale=${locale} keys=17 help=5 errorCodes=10 diagnosticBound=true`
        : suite === "errors" ? `binder locale=${locale} errors=6 finishedMatches=true`
            : `page-refusal locale=${locale} pages=16384 prewarmInfoRun=true finishedMatches=true`);
    if (suite !== "resources") records.push("localeRestored=true");
    return fields + "INSTRUMENTATION_STATUS_CODE: 1\n" + records.map(record =>
        `INSTRUMENTATION_STATUS: stream=\nBUN_MESSAGES ${record}\nINSTRUMENTATION_STATUS_CODE: 0\n`).join("") +
        fields + "INSTRUMENTATION_STATUS_CODE: 0\nOK (1 test)\nINSTRUMENTATION_CODE: -1\n";
}

test("message evidence requires every locale and a successful unskipped JUnit run", () => {
    for (const suite of Object.keys(METHODS)) {
        assert.equal(validateMessages(transcript(suite), suite).locales.length, 10);
        assert.throws(() => validateMessages(transcript(suite).replace("INSTRUMENTATION_STATUS_CODE: 0", "INSTRUMENTATION_STATUS_CODE: -3"), suite));
        assert.throws(() => validateMessages(transcript(suite).replace("locale=ar", "locale=en"), suite));
        assert.throws(() => validateMessages(transcript(suite).replace("OK (1 test)", "FAILURES!!!"), suite));
        assert.throws(() => validateMessages(transcript(suite).replace("INSTRUMENTATION_CODE: -1", "INSTRUMENTATION_CODE: 0"), suite));
    }
});

test("error and page-refusal evidence requires callback agreement and restored locale", () => {
    for (const suite of ["errors", "pages"]) {
        assert.throws(() => validateMessages(transcript(suite).replace("finishedMatches=true", "finishedMatches=false"), suite));
        assert.throws(() => validateMessages(transcript(suite).replace("BUN_MESSAGES localeRestored=true", ""), suite));
    }
    assert.throws(() => validateMessages(transcript("pages").replaceAll("pages=16384", "pages=4096"), "pages"));
    assert.throws(() => validateMessages(transcript("resources").replace("keys=17", "keys=16"), "resources"));
});
