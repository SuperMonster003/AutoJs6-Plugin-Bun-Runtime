import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PACKAGE, RUNNER, verifyTraceApk } from "./build-trace.mjs";
import { countUidProcesses, fileFacts, newOutputDirectory, parseOptions, requireFile, hash, materializeAsyncSignalSource } from "../app-probe/probe-common.mjs";
const o=parseOptions(process.argv.slice(2),["--adb","--serial","--api","--page-size","--apk-directory","--output-directory","--sdk","--jdk"]);
const adb=requireFile(o["--adb"]),serial=o["--serial"];
assert(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(serial));
const build=JSON.parse(readFileSync(join(o["--apk-directory"],"trace-build.json"),"utf8"));
const apk=join(o["--apk-directory"],build.apk.filename),exe=process.platform==="win32"?".exe":"",jdk=join(o["--jdk"],"bin"),bt=join(o["--sdk"],"build-tools/37.0.0");
verifyTraceApk(apk,build,join(jdk,"java"+exe),join(jdk,"jar"+exe),join(bt,"lib/apksigner.jar"),join(bt,"zipalign"+exe));
const command=(...args)=>{
  const r=spawnSync(adb,["-s",serial,...args],{encoding:"utf8",timeout:60000,maxBuffer:1024*1024,windowsHide:true});
  assert(!r.error,r.error?.message); return r;
};
const checked=(...args)=>{const r=command(...args);assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout.trim();};
assert.equal(checked("get-state"),"device");
assert.equal(checked("shell","getprop","ro.build.version.sdk"),o["--api"]);
assert.equal(checked("shell","getprop","ro.product.cpu.abi"),build.abi);
assert(["4096","16384"].includes(o["--page-size"]));
const existing=command("shell","pm","path",PACKAGE);
assert([0,1].includes(existing.status)&&!existing.stdout.trim()&&!existing.stderr.trim(),"refusing to replace existing diagnostic package");
const output=newOutputDirectory(o["--output-directory"]);mkdirSync(output);
const record={schemaVersion:1,kind:"test-only-signal-trace-runs",compatibilityAcceptance:false,capturedAt:new Date().toISOString(),
  build,runner:{path:"tools/bun-runtime/experimental/api28/signal-trace/run-trace.mjs",...fileFacts(new URL(import.meta.url))},runs:[],lifecycle:{rounds:[]}};
let installed=false,uid;
const uidCount=()=>countUidProcesses(checked("shell","ps","-A","-o","UID,PID,NAME"),uid);
try {
  assert(checked("install","-t",apk).includes("Success")); installed=true;
  const match=checked("shell","pm","list","packages","-U",PACKAGE).match(/^package:(\S+) uid:(\d+)$/);
  assert(match&&match[1]===PACKAGE);uid=Number(match[2]);assert(uid%100000>=10000);
  record.lifecycle.installedUid=uid; record.lifecycle.installedByThisRun=true;
  for(let round=1;round<=2;round++) {
    const r=command("shell","am","instrument","-w","-r","-e","abi",build.abi,"-e","api",o["--api"],"-e","pageSize",o["--page-size"],"-e","apkSha256",build.apk.sha256,RUNNER);
    const raw=r.stdout+r.stderr; writeFileSync(join(output,`instrumentation-${round}.txt`),raw,{flag:"wx"});
    const line=r.stdout.split(/\r?\n/).filter(t=>t.startsWith("INSTRUMENTATION_RESULT: report="));assert.equal(line.length,1);
    const report=JSON.parse(line[0].slice("INSTRUMENTATION_RESULT: report=".length));record.runs.push({report,raw,bytes:Buffer.byteLength(raw),sha256:hash(raw)});
    assert.equal(report.completed,true);assert.equal(report.compatibilityAcceptance,false);assert.equal(report.uid,uid);
    assert.equal(report.kind,"test-only-signal-trace-observation");assert.equal(report.apkSha256,build.apk.sha256);
    assert.equal(report.api,Number(o["--api"]));assert.equal(report.abi,build.abi);assert.equal(report.pageSize,Number(o["--page-size"]));
    assert.equal(report.workspaceRemoved,true);assert(!report.error&&!report.cleanupError);
    assert.deepEqual(report.payloads,build.payloads[build.abi]);assert.equal(report.seccomp,2);
    assert.deepEqual(report.rows.map(row=>[row.mode,row.traced]),[["native",false],["native",true],["trap",false],["trap",true]]);
    for(const row of report.rows) {
      assert.equal(row.sourceSha256,hash(materializeAsyncSignalSource(row.mode)));assert.equal(row.processReaped,true);
      assert(Buffer.byteLength(row.stdout)+Buffer.byteLength(row.stderr)<=16384);assert(row.elapsedMillis<15000);
      console.log(JSON.stringify({round,mode:row.mode,traced:row.traced,exitCode:row.exitCode,stderr:row.stderr}));
    }
    checked("shell","am","force-stop",PACKAGE);
    const remaining=uidCount();record.lifecycle.rounds.push({round,uidProcessCount:remaining});assert.equal(remaining,0);
  }
  record.completed=true;
} catch(error) {record.completed=false;record.error=error.message;}
finally {
  if(installed) try {
    checked("shell","am","force-stop",PACKAGE);assert(checked("uninstall",PACKAGE).includes("Success"));
    const remaining=command("shell","pm","path",PACKAGE);assert([0,1].includes(remaining.status)&&!remaining.stdout.trim()&&!remaining.stderr.trim());
    record.lifecycle.uninstalled=true;record.lifecycle.finalUidProcessCount=uidCount();assert.equal(record.lifecycle.finalUidProcessCount,0);
  } catch(error) {record.completed=false;record.cleanupError=error.message;}
  writeFileSync(join(output,"trace-result.json"),JSON.stringify(record,null,2)+"\n",{flag:"wx"});
}
assert.equal(record.completed,true,record.error||record.cleanupError);
