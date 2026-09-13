// Separate diagnostic APK. Does not relax the production/two-payload verifier.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, SHARED_PROCESS, fileFacts, hash, inputFacts, lockedEvidence, materializeAsyncSignalSource, materializePendingSignalSource,
  newOutputDirectory, parseOptions, requireFile, verifyRuntimePair } from "../app-probe/probe-common.mjs";
import { supervisorLock, verifySupervisorSource, verifySupervisorBytes } from "../../../supervisor/supervisor-common.mjs";
import { verifyElfBuffer } from "../../../verify-runtime.mjs";
import { readBoundedApkEntry } from "../../../verify-apk-runtime.mjs";
import { verifyApkSignature } from "../../../release/assemble-corresponding-source.mjs";
export const HERE=dirname(fileURLToPath(import.meta.url));
export const PACKAGE="io.github.supermonster003.autojs6.plugin.bun.runtime.signaltrace";
export const RUNNER=PACKAGE+"/"+PACKAGE+".TraceInstrumentation";
export const NDK="29.0.14206865";
export const FLAGS=Object.freeze(["-std=c11","-Oz","-Wall","-Wextra","-Werror","-fPIE","-pie","-fstack-protector-strong","-D_FORTIFY_SOURCE=2",
  "-Wl,-z,relro,-z,now,-z,noexecstack,-z,max-page-size=16384","-Wl,--build-id=sha1","-Wl,--strip-all"]);
export function fixtureAsset(fixtureSet, mode) {
  assert(["blocked-async", "pending-async"].includes(fixtureSet), "fixed diagnostic fixture set required");
  assert(["native", "trap"].includes(mode), "fixed diagnostic mode required");
  return (fixtureSet === "pending-async" ? "pending-signal-" : "async-signal-") + mode + ".mjs";
}
export function fixtureSource(fixtureSet, mode) {
  fixtureAsset(fixtureSet, mode);
  return fixtureSet === "pending-async" ? materializePendingSignalSource(mode) : materializeAsyncSignalSource(mode);
}
export function traceInputs() {
  return [...inputFacts(), ...["trace.c","trace-launcher.mjs","TraceInstrumentation.java","AndroidManifest.xml","build-trace.mjs"].map(name=>{
    const path="tools/bun-runtime/experimental/api28/signal-trace/"+name;
    const bytes=Buffer.from(readFileSync(join(ROOT,path),"utf8").replace(/\r\n/g,"\n")); return {path,bytes:bytes.length,sha256:hash(bytes)};
  })];
}
export function run(command,args) {
  const r=spawnSync(command,args,{encoding:"utf8",timeout:60000,maxBuffer:2*1024*1024,windowsHide:true});
  assert(!r.error && r.status===0,(r.error?.message??r.stderr??"")+"\n"+(r.stdout??"")); return r.stdout.trim();
}
function classes(path) { return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?classes(join(path,e.name)):e.name.endsWith(".class")?[join(path,e.name)]:[]); }
export function verifyTraceApk(path,receipt,java,jar,apksigner,zipalign) {
  assert.equal(receipt.kind,"test-only-signal-trace-build"); assert.equal(receipt.packageName,PACKAGE);
  assert.equal(receipt.compatibilityAcceptance,false); assert.deepEqual(receipt.inputs,traceInputs());
  assert.deepEqual(fileFacts(path),{bytes:receipt.apk.bytes,sha256:receipt.apk.sha256});
  assert.deepEqual(verifyApkSignature(path,java,apksigner),receipt.apk.signing);
  run(zipalign,["-c","-P","16","4",path]);
  const abi=receipt.abi; assert(["arm64-v8a","x86_64"].includes(abi));
  const expected=["libbun_exec.so","libbun_supervisor.so","libbun_signal_trace.so"].map(n=>`lib/${abi}/${n}`).sort();
  const entries=run(jar,["--list","--file",path]).split(/\r?\n/).filter(p=>p.startsWith("lib/")&&!p.endsWith("/")).sort();
  assert.deepEqual(entries,expected);
  for(const name of expected) {
    const bytes=readBoundedApkEntry(path,name,100*1024*1024), fact=receipt.payloads[abi][name.split("/").at(-1)];
    assert.deepEqual({bytes:bytes.length,sha256:hash(bytes)},fact);
  }
  const embedded=JSON.parse(readBoundedApkEntry(path,"assets/trace-build.json",131072));
  const {apk,...base}=receipt; assert.deepEqual(embedded,base);
  for(const mode of ["native","trap"]) assert.equal(readBoundedApkEntry(path,`assets/${fixtureAsset(receipt.fixtureSet,mode)}`,12288).toString(),fixtureSource(receipt.fixtureSet,mode));
  assert.equal(readBoundedApkEntry(path,"assets/trace-launcher.mjs",4096).toString(),readFileSync(join(HERE,"trace-launcher.mjs"),"utf8").replace(/\r\n/g,"\n"));
  return receipt;
}
export function buildTrace(o) {
  const fixtureSet=o["--fixture-set"] ?? "blocked-async"; fixtureAsset(fixtureSet,"native");
  const output=newOutputDirectory(o["--output-directory"]),sdk=realpathSync(o["--sdk"]),jdk=realpathSync(o["--jdk"]),ndk=realpathSync(o["--ndk"]);
  assert(readFileSync(join(ndk,"source.properties"),"utf8").split(/\r?\n/).includes("Pkg.Revision = "+NDK));
  const abi=o["--abi"]; assert(["arm64-v8a","x86_64"].includes(abi));
  const exe=process.platform==="win32"?".exe":"",jdkBin=join(jdk,"bin"),bt=join(sdk,"build-tools","37.0.0");
  const java=requireFile(join(jdkBin,"java"+exe)),jar=requireFile(join(jdkBin,"jar"+exe));
  const aapt2=requireFile(join(bt,"aapt2"+exe)),zipalign=requireFile(join(bt,"zipalign"+exe)),apksigner=requireFile(join(bt,"lib/apksigner.jar"));
  const androidJar=requireFile(join(sdk,"platforms/android-36/android.jar"));
  const clang=requireFile(join(ndk,"toolchains/llvm/prebuilt",process.platform==="win32"?"windows-x86_64":"linux-x86_64","bin/clang"+exe));
  const runtime=lockedEvidence().artifacts.find(a=>a.abi===abi),helper=supervisorLock.artifacts.find(a=>a.abi===abi);
  const runtimePath=verifyRuntimePair(o["--runtime"],o["--repeat-runtime"],runtime);
  verifySupervisorSource(); verifySupervisorBytes(readFileSync(join(ROOT,helper.binaryPath)),helper);
  const staging=realpathSync(mkdtempSync(join(tmpdir(),"bun-signal-trace-")));
  try {
    for(const folder of ["classes","dex","assets","lib/"+abi]) mkdirSync(join(staging,folder),{recursive:true});
    const tracePath=join(staging,"lib",abi,"libbun_signal_trace.so"),repeatPath=join(staging,"repeat-trace");
    for(const path of [tracePath,repeatPath]) run(clang,[`--target=${abi==="arm64-v8a"?"aarch64-linux-android":"x86_64-linux-android"}28`,...FLAGS,join(HERE,"trace.c"),"-o",path]);
    assert.deepEqual(fileFacts(tracePath),fileFacts(repeatPath),"diagnostic C builds differ");
    const traceElf=verifyElfBuffer(readFileSync(tracePath),{abi,elfMachine:helper.elfMachine,minimumLoadAlignment:16384,
      interpreter:"/system/bin/linker64",androidIdentApi:28,neededLibraries:["libdl.so","libc.so"]});
    copyFileSync(runtimePath,join(staging,"lib",abi,"libbun_exec.so"));
    copyFileSync(join(ROOT,helper.binaryPath),join(staging,"lib",abi,"libbun_supervisor.so"));
    run(requireFile(join(jdkBin,"javac"+exe)),["-encoding","UTF-8","-source","8","-target","8","-bootclasspath",androidJar,"-d",join(staging,"classes"),join(HERE,"TraceInstrumentation.java"),join(ROOT,SHARED_PROCESS)]);
    run(java,["-cp",requireFile(join(bt,"lib/d8.jar")),"com.android.tools.r8.D8","--min-api","28","--lib",androidJar,"--output",join(staging,"dex"),...classes(join(staging,"classes"))]);
    const receipt={schemaVersion:1,kind:"test-only-signal-trace-build",packageName:PACKAGE,runner:RUNNER,abi,fixtureSet,compatibilityAcceptance:false,
      inputs:traceInputs(),runtimeSourceCommit:lockedEvidence().source.downstreamHeadCommit,ndkVersion:NDK,flags:FLAGS,traceElf,
      toolchain:{clang:fileFacts(clang),androidJar:fileFacts(androidJar),apksigner:fileFacts(apksigner)},
      payloads:{[abi]:{"libbun_exec.so":{bytes:runtime.bytes,sha256:runtime.sha256},"libbun_supervisor.so":{bytes:helper.binaryBytes,sha256:helper.binarySha256},"libbun_signal_trace.so":fileFacts(tracePath)}}};
    writeFileSync(join(staging,"assets/trace-build.json"),JSON.stringify(receipt));
    for(const mode of ["native","trap"]) writeFileSync(join(staging,`assets/${fixtureAsset(fixtureSet,mode)}`),fixtureSource(fixtureSet,mode));
    writeFileSync(join(staging,"assets/trace-launcher.mjs"),readFileSync(join(HERE,"trace-launcher.mjs"),"utf8").replace(/\r\n/g,"\n"));
    for(const name of ["BUN-LICENSE.md","WEBKIT-JAVASCRIPTCORE-COPYING.LIB","WEBKIT-WEBCORE-LICENSE-LGPL-2","WEBKIT-WEBCORE-LICENSE-LGPL-2.1","WEBKIT-WEBCORE-LICENSE-APPLE"])
      copyFileSync(join(ROOT,"app/src/main/assets/doc/licenses",name),join(staging,"assets",name));
    copyFileSync(join(ROOT,"LICENSE"),join(staging,"assets/PROJECT-LICENSE.txt"));
    const unsigned=join(staging,"unsigned.apk"),aligned=join(staging,"aligned.apk"),apkPath=join(staging,"bun-signal-trace-"+abi+".apk");
    run(aapt2,["link","--manifest",join(HERE,"AndroidManifest.xml"),"--min-sdk-version","28","--target-sdk-version","36","--version-code","1","--version-name","0.0.0-signal-diagnostic","-I",androidJar,"-A",join(staging,"assets"),"-o",unsigned]);
    run(jar,["--update","--file",unsigned,"--no-manifest","-C",join(staging,"dex"),"classes.dex","-C",staging,"lib"]);
    run(zipalign,["-P","16","4",unsigned,aligned]);
    const keystore=join(staging,"test-only.p12");
    run(requireFile(join(jdkBin,"keytool"+exe)),["-genkeypair","-keystore",keystore,"-storetype","PKCS12","-alias","trace","-storepass","diagnostic-not-release","-keypass","diagnostic-not-release","-keyalg","RSA","-keysize","2048","-validity","30","-dname","CN=Local Signal Diagnostic"]);
    run(java,["-jar",apksigner,"sign","--ks",keystore,"--ks-key-alias","trace","--ks-pass","pass:diagnostic-not-release","--key-pass","pass:diagnostic-not-release","--v1-signing-enabled","false","--v2-signing-enabled","true","--v3-signing-enabled","false","--v4-signing-enabled","false","--out",apkPath,aligned]);
    receipt.apk={filename:"bun-signal-trace-"+abi+".apk",...fileFacts(apkPath),signing:verifyApkSignature(apkPath,java,apksigner)};
    verifyTraceApk(apkPath,receipt,java,jar,apksigner,zipalign);
    mkdirSync(output); copyFileSync(apkPath,join(output,receipt.apk.filename));
    writeFileSync(join(output,"trace-build.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
    console.log(JSON.stringify(receipt.apk)); return receipt;
  } finally {
    assert(staging.startsWith(realpathSync(tmpdir())+sep+"bun-signal-trace-") && realpathSync(staging)===staging);
    rmSync(staging,{recursive:true,force:false});
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  buildTrace(parseOptions(process.argv.slice(2),["--sdk","--jdk","--ndk","--abi","--runtime","--repeat-runtime","--output-directory","--fixture-set"]));
