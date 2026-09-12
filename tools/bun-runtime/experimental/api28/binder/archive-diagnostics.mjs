import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { facts } from "./binder-common.mjs";

const [output, directory] = process.argv.slice(2);
assert.equal(process.argv.length, 4);
const reports = [];
for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(directory, entry.name, "report.json");
    let r;
    try { r = JSON.parse(readFileSync(path, "utf8")); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (r.passed) continue;
    reports.push({ label: entry.name, inputReport: facts(path), passed: false,
        countedInAcceptance: false, apk: r.apk, testApk: r.testApk,
        build: r.build ?? null, device: r.device ?? null,
        // Remove workstation path prefixes from the short explanation, not from
        // the original immutable report whose raw digest is retained above.
        error: (r.error?.split("\n")[0] ?? null)?.replace(/D:\\idea-projects\\AutoJs6-Plugin-Bun-Runtime\\/g, "<repository>/"),
        rounds: r.rounds, cleanup: r.cleanup, finalUidProcesses: r.finalUidProcesses ?? null,
    });
}
writeFileSync(output, JSON.stringify({ schemaVersion: 1, evidenceDate: "2026-09-12",
    kind: "preliminary-binder-harness-and-signature-diagnostics", countedInAcceptance: false,
    note: "Failed reports are preserved, including parser failures with successful raw JUnit output. A null UID count means it was not captured, never zero by inference. Only separately rerun successful candidates enter the acceptance matrix.",
    reports,
}, null, 2) + "\n", { flag: "wx" });
