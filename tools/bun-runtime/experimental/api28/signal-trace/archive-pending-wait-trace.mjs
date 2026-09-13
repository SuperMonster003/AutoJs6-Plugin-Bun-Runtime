import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, fileFacts, hash, json } from "../app-probe/probe-common.mjs";
import { HERE, traceInputs } from "./build-trace.mjs";
import { validatePendingWaitTraceRecord } from "./pending-wait-trace-evidence.mjs";

export function archivePendingWaitTrace(output,directories) {
  const target=resolve(output);
  assert.equal(realpathSync(dirname(target)),realpathSync(join(ROOT,"docs/compatibility")));
  assert(target.endsWith(".json") && directories.length > 0);
  const records=directories.map(directory => {
    const path=join(directory,"trace-result.json"), record=validatePendingWaitTraceRecord(json(path));
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
  const archive={ schemaVersion:1,kind:"archived-pending-wait-diagnosis",archivedAt:new Date().toISOString(),
    projectBaseCommit:git.stdout.trim(),compatibilityAcceptance:false,distributionReady:false,productionReleaseAcceptance:false,
    scope:"Two native ARM64 4 KiB environments; fixed native/TRAP cases are paired plain/traced twice. SI_TKILL reaches the main thread after child close_range; read-only register context records ARM64 epoll_pwait (22) and an actual zero signal-mask word at its non-null pointer. No registers, masks or signals are modified.",
    summary:{environments:records.length,rounds:records.length*2,plainObservations:records.length*4,
      tracedObservations:records.length*4,earlyUserSignals:records.length*4,compatibilityPasses:0},
    sourceReview:{"commit":"946f082ab8ede2b7cbd6ba9fddb90463a94f0330","path":"packages/bun-usockets/src/eventing/epoll_kqueue.c","gitBlob":"5431a0b9959b6a7a5009c27ff5461c7742a96ddb","bytes":42888,"sha256":"7e95bd26dbe8fcba5b382c6595026c021caf1d392a042fea32f6683de0a8b708","line":126,"interpretation":"bun_epoll_pwait2 builds an empty sigset and supplies it to both wait APIs. Eight read-only Android signal stops show epoll_pwait with this empty pointed-to mask after the spawn-stage preservation. No instruction address, call stack or epoll_pwait2 first-entry coverage is claimed."},
    inputs:traceInputs(),validators:["archive-pending-wait-trace.mjs","pending-wait-trace-evidence.mjs"].map(name => ({
      path:"tools/bun-runtime/experimental/api28/signal-trace/"+name,...fileFacts(join(HERE,name))})),records,
  };
  writeFileSync(target,JSON.stringify(archive,null,2)+"\n",{flag:"wx"});
  console.log(`Archived ${archive.summary.earlyUserSignals} early SI_TKILL observations; no compatibility acceptance.`);
  return archive;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [output,...directories]=process.argv.slice(2); assert(output && directories.length);
  archivePendingWaitTrace(output,directories);
}
