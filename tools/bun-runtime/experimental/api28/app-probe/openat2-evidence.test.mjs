import assert from "node:assert/strict";
import test from "node:test";
import { openat2Filter, inspectOpenat2Evidence, validateOpenat2Evidence } from "./openat2-evidence.mjs";
import { openat2Fixture } from "./openat2-fixture.test-support.mjs";

function evaluate(bytes, arch, nr, arg) {
  let value=0;
  for (let pc=0;pc<bytes.length/8;pc++) {
    const code=bytes.readUInt16LE(pc*8),jt=bytes[pc*8+2],jf=bytes[pc*8+3],k=bytes.readUInt32LE(pc*8+4);
    if (code===0x20) { assert([0,4,16].includes(k)); value={0:nr,4:arch,16:arg}[k]; }
    else if (code===0x15) pc+=value===k ? jt : jf;
    else { assert.equal(code,0x06); return k; }
  }
  assert.fail("BPF fallthrough");
}
test("openat2 BPF affects only the native target and marker, with an ABI guard", () => {
  for (const abi of ["arm64-v8a","x86_64"]) for (const error of [false,true]) {
    const arm=abi==="arm64-v8a",arch=arm ? 0xc00000b7 : 0xc000003e,filter=openat2Filter(abi,error);
    const action=error ? 0x00050005 : 0x00030000;
    for (let nr=0;nr<=512;nr++) {
      assert.equal(evaluate(filter,arch,nr,0),nr===437 ? action : 0x7fff0000);
      assert.equal(evaluate(filter,0x40000003,nr,0),0x80000000);
    }
    assert.equal(evaluate(filter,arch,arm ? 167 : 157,0x41554a36),action);
    assert.equal(evaluate(filter,arch,arm ? 167 : 157,0x41554a37),0x7fff0000);
  }
});
test("native and already-unavailable controls retain the same strict containment expectations", () => {
  for (const abi of ["arm64-v8a","x86_64"]) for (const native of [false,true]) {
    const proof=openat2Fixture(abi,native);
    assert.equal(validateOpenat2Evidence(proof,"confinement",abi),proof);
    assert(("OPENAT2_PROBE_RESULT="+JSON.stringify(proof)).length<=2048);
  }
});
test("symlink escapes remain archived failures and can never be relabeled as passing fallback", () => {
  for (const phase of ["nativeRows","trapRows"]) for (const index of [8,9,10]) {
    const proof=openat2Fixture(); proof[phase][index]=[200,"secret"]; proof.passed=false;
    const verdict=inspectOpenat2Evidence(proof,"confinement","arm64-v8a");
    assert.equal(verdict.passed,false); assert.equal(verdict.failures.length,1);
    assert.throws(() => validateOpenat2Evidence(proof,"confinement","arm64-v8a"),/confinement failed/);
    proof.passed=true;
    assert.throws(() => inspectOpenat2Evidence(proof,"confinement","arm64-v8a"),/every confinement assertion/);
  }
});
test("ordinary paths, encodings, missing files and FIFO are not dropped when symlinks fail", () => {
  for (let i=0;i<12;i++) {
    const proof=openat2Fixture(); proof.trapRows[i]=i<2 ? [404,"miss"] : [200,"ok"]; proof.passed=false;
    assert.equal(inspectOpenat2Evidence(proof,"confinement","arm64-v8a").failures.length,1);
    proof.trapRows.splice(i,1);
    assert.throws(() => inspectOpenat2Evidence(proof,"confinement","arm64-v8a"),/ordered path inventory/);
  }
});
test("filter activation, raw results, public API boundary and cleanup are mandatory", () => {
  for (const change of [p => {p.trapOpen.errno=5;},p => {p.eioOpen.opened=true;},p => {p.errorPolicy.after.errno=38;},
    p => {p.trapPolicy.filterSha256="0".repeat(64);},p => {p.nativeOpen.errno=5;},p => {p.errorControl=[200,"ok"];},
    p => {p.reachability="unavailable-before-filter";},p => {p.publicLchmod[0]="function";},p => {p.filesRemoved=false;},
    p => {p.skipped=true;},p => {p.kernel="unknown";},p => {p.cleanupError="leftover";}]) {
    const proof=openat2Fixture(); change(proof);
    assert.throws(() => inspectOpenat2Evidence(proof,"confinement","arm64-v8a"));
  }
});
