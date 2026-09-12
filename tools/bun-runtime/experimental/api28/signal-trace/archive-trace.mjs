// Append-only archival of the nine-patch failure and API 31 diagnostic control.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBaselineTraceRecord } from "./trace-evidence.mjs";
import { hash, fileFacts, ROOT } from "../app-probe/probe-common.mjs";
const base = "fb9fbc6652ec434e4ec5e8674561461c9f33ccf5";
const [output, api28, api31, extra] = process.argv.slice(2);
assert(output && api28 && api31 && !extra, "Usage: node archive-trace.mjs <new-json> <api28-run-directory> <api31-run-directory>");
assert.equal(realpathSync(dirname(resolve(output))), realpathSync(join(ROOT, "docs/compatibility")));
assert(output.endsWith(".json"));
const records = [api28, api31].map(directory => JSON.parse(readFileSync(join(directory,"trace-result.json"),"utf8")));
const summary = records.map((record, i) => validateBaselineTraceRecord(record, i === 0 ? 28 : 31));
assert.deepEqual(records[0].build, records[1].build);
assert.equal(records[0].build.inputs.length, 33);
assert.equal(new Set(records[0].build.inputs.map(i => i.path)).size, 33);
for (const input of records[0].build.inputs) {
  assert(/^(tools\/bun-runtime\/|app\/src\/main\/java\/)[A-Za-z0-9_./-]+$/.test(input.path) && !input.path.includes(".."));
  let bytes;
  if (input.path.startsWith("tools/bun-runtime/experimental/api28/signal-trace/")) bytes = readFileSync(join(ROOT,input.path));
  else {
    const git = spawnSync("git", ["show", base + ":" + input.path], { cwd: ROOT, maxBuffer: 1024 * 1024, windowsHide:true });
    assert.equal(git.status,0); bytes = git.stdout;
  }
  bytes = Buffer.from(bytes.toString("utf8").replace(/\r\n/g,"\n"));
  assert.deepEqual({bytes:bytes.length,sha256:hash(bytes)}, {bytes:input.bytes,sha256:input.sha256});
}
for (let i=0;i<records.length;i++) {
  const directory=[api28,api31][i], record=records[i];
  for (let n=0;n<2;n++) assert.equal(readFileSync(join(directory,`instrumentation-${n+1}.txt`),"utf8"),record.runs[n].raw);
  assert.deepEqual(record.runner, { path:"tools/bun-runtime/experimental/api28/signal-trace/run-trace.mjs",
    ...fileFacts(join(ROOT,"tools/bun-runtime/experimental/api28/signal-trace/run-trace.mjs")) });
}
const archive = {schemaVersion:1,kind:"archived-blocked-async-signal-diagnosis",archivedAt:new Date().toISOString(),projectBaseCommit:base,
  compatibilityAcceptance:false,distributionReady:false,productionReleaseAcceptance:false,pluginBinderExercised:false,
  scope:"Original nine-patch Bun and unchanged async fixtures, plain/ptrace pairs twice on native ARM64 API 28 and 31 at 4096-byte pages. Four API 28 leader SIGSYS deliveries identify syscall 434 (pidfd_open), followed by exit 159. Both plain modes also exit 159. API 31 pairs pass the original semantic validator with no pidfd SIGSYS.",
  limits:"Observer requests dumpability only in its disposable owned tracee and forwards SIGSYS unchanged. It does not record instruction pointers or call stacks; syscall identity is dynamic, Rust caller attribution is source analysis. Diagnostic execution is not Binder, full-suite, native 16 KiB or Release acceptance.",
  summary, records, validator:{path:"tools/bun-runtime/experimental/api28/signal-trace/trace-evidence.mjs",...fileFacts(new URL("./trace-evidence.mjs",import.meta.url))},
  archiver:{path:"tools/bun-runtime/experimental/api28/signal-trace/archive-trace.mjs",...fileFacts(fileURLToPath(import.meta.url))}};
writeFileSync(resolve(output),JSON.stringify(archive,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify(summary));
