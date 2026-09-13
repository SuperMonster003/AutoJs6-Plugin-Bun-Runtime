import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, fileFacts, hash, json } from "../app-probe/probe-common.mjs";
import { HERE, traceInputs } from "./build-trace.mjs";
import { validatePendingTraceRecord } from "./pending-trace-evidence.mjs";

export function archivePendingTrace(output,directories) {
  const target=resolve(output);
  assert.equal(realpathSync(dirname(target)),realpathSync(join(ROOT,"docs/compatibility")));
  assert(target.endsWith(".json") && directories.length > 0);
  const records=directories.map(directory => {
    const path=join(directory,"trace-result.json"), record=validatePendingTraceRecord(json(path));
    assert.deepEqual(record.build.inputs,traceInputs(),"diagnostic source drift");
    const instrumentation=[1,2].map(round => {
      const filename=`instrumentation-${round}.txt`, raw=join(directory,filename), text=readFileSync(raw,"utf8");
      assert.equal(text,record.runs[round-1].raw);
      return {filename,...fileFacts(raw)};
    });
    return { ...record, rawReport:fileFacts(path), instrumentation };
  });
  const identity=r => JSON.stringify([r.api,r.abi,r.pageSize,r.model,r.fingerprint,r.kernel]);
  assert.equal(new Set(records.map(r => identity(r.runs[0].report))).size,records.length);
  records.forEach(r => assert.deepEqual(r.build,records[0].build));
  const git=spawnSync("git",["rev-parse","HEAD"],{cwd:ROOT,encoding:"utf8",windowsHide:true}); assert.equal(git.status,0);
  const archive={ schemaVersion:1,kind:"archived-pending-signal-diagnosis",archivedAt:new Date().toISOString(),
    projectBaseCommit:git.stdout.trim(),compatibilityAcceptance:false,distributionReady:false,productionReleaseAcceptance:false,
    scope:"Two native ARM64 4 KiB environments; fixed native/TRAP cases are paired plain/traced twice. SI_TKILL reaches the spawning main thread before the child close_range trap. No registers, masks or signals are modified by the observer.",
    summary:{environments:records.length,rounds:records.length*2,plainObservations:records.length*4,
      tracedObservations:records.length*4,earlyUserSignals:records.length*4,compatibilityPasses:0},
    sourceReview:{commit:"a9c76a599bacb75c72d3c00fc6f99c5cc9483b47",path:"src/jsc/bindings/bun-spawn.cpp",
      gitBlob:"8a24df2f4f3d8e09934815aca31ac74c51919d71",bytes:20188,sha256:"f681ff77d780385a4afa01f609a73f9b6772ebe459bb7d7a01d1cd1becbc7942",line:253,
      interpretation:"The parent SIG_SETMASK excludes SIGSYS before vfork; the ptrace evidence captures SI_TKILL delivery, not rt_sigprocmask arguments or a call stack. This identifies the source-level explanation for the observed early delivery, not a fixed runtime."},
    inputs:traceInputs(),validators:["archive-pending-trace.mjs","pending-trace-evidence.mjs"].map(name => ({
      path:"tools/bun-runtime/experimental/api28/signal-trace/"+name,...fileFacts(join(HERE,name))})),records,
  };
  writeFileSync(target,JSON.stringify(archive,null,2)+"\n",{flag:"wx"});
  console.log(`Archived ${archive.summary.earlyUserSignals} early SI_TKILL observations; no compatibility acceptance.`);
  return archive;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [output,...directories]=process.argv.slice(2); assert(output && directories.length);
  archivePendingTrace(output,directories);
}
