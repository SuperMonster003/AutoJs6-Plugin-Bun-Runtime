import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { LCHMOD_POLICIES, lchmodFilter, validateLchmodEvidence } from "./lchmod-evidence.mjs";
import { lchmodFixture } from "./lchmod-fixture.test-support.mjs";

function evaluate(bytes, arch, nr, arg0 = 0, arg1 = 0) {
  let value = 0;
  for (let pc=0;pc<bytes.length/8;pc++) {
    const code=bytes.readUInt16LE(pc*8),jt=bytes[pc*8+2],jf=bytes[pc*8+3],k=bytes.readUInt32LE(pc*8+4);
    if (code===0x20) { assert([0,4,16,24].includes(k)); value={0:nr,4:arch,16:arg0,24:arg1}[k]; }
    else if (code===0x15) pc+=value===k?jt:jf;
    else { assert.equal(code,0x06); return k; }
  }
  assert.fail("BPF fallthrough");
}

test("the fixed child normalizes FFI i64 and cannot parse the config path as a link dependency", () => {
  const source=readFileSync(new URL("./lchmod-probes.mjs",import.meta.url),"utf8");
  const control=source.split("\n").find(line=>line.includes("raw invalid-argument control"));
  assert(control);
  runInNewContext(control,{c:{syscall:()=>-1n},check:(ok)=>assert.equal(ok,true)});
  assert.match(source,/vector\(\[process\.execPath,"link","--ignore-scripts","--config="\+process\.cwd\(\)\+"\/bunfig\.toml"\]\)/);
  assert(!source.includes('"--config",'),"optional config value requires the equals form");
});
test("lchmod policies restrict only sockets, the exact target, fallback mode and marker", () => {
  for (const abi of ["arm64-v8a","x86_64"]) for (const kind of LCHMOD_POLICIES) {
    const arm=abi==="arm64-v8a",arch=arm?0xc00000b7:0xc000003e,filter=lchmodFilter(abi,kind);
    for(let nr=0;nr<=512;nr++) for(const mode of [0,0o600,0o700,0o755]) {
      const expected=nr===(arm?198:41)?0x00050001:nr===452&&kind!=="native"?
        kind==="kill"?0:0x00030000:
        nr===(arm?52:91)&&mode===0o700&&kind==="fallback-eio"?0x00050005:0x7fff0000;
      assert.equal(evaluate(filter,arch,nr,0,mode),expected);
      assert.equal(evaluate(filter,0x40000003,nr,0,mode),0x80000000);
    }
    assert.equal(evaluate(filter,arch,arm?167:157,0x41554a36),0x0005004d);
    assert.equal(evaluate(filter,arch,arm?167:157,0x41554a37),0x7fff0000);
  }
});
test("bin-link evidence includes native/TRAP/repeat, no-follow and ignored-error controls", () => {
  for(const abi of ["arm64-v8a","x86_64"]) {
    const proof=lchmodFixture(abi);
    assert.equal(validateLchmodEvidence(proof,"bin-link",abi),proof);
    assert(("LCHMOD_PROBE_RESULT="+JSON.stringify(proof)).length<=2048);
  }
});

test("thread-kill control requires SIGSYS leader status before sibling cleanup, never just SIGKILL", () => {
  const source=readFileSync(new URL("./lchmod-probes.mjs",import.meta.url),"utf8");
  const body=source.slice(source.indexOf("function killedLeader("),source.indexOf("async function killControl("));
  const parse=runInNewContext(body+"\nkilledLeader",{check:(ok)=>assert.equal(ok,true)});
  const fields=Array(50).fill("0"); fields[0]="Z";fields[17]="3";fields[49]="31";
  const stat=()=>"123 (name (with) spaces) "+fields.join(" ");
  assert.equal(JSON.stringify(parse(stat(),123)),JSON.stringify(["Z",31,3]));
  fields[49]="9"; assert.equal(parse(stat(),123),null);
  fields[49]="31";fields[0]="S";assert.equal(parse(stat(),123),null);
  fields[0]="Z";assert.throws(()=>parse(stat(),124));
  fields[17]="65";assert.throws(()=>parse(stat(),123));
  const proof=lchmodFixture();proof.rows[1][2]="SIGKILL";
  assert.throws(()=>validateLchmodEvidence(proof,"bin-link","arm64-v8a"));
  proof.killLeader=["Z",31,3];validateLchmodEvidence(proof,"bin-link","arm64-v8a");
  for(const leader of [["Z",9,3],["S",31,3],["Z",31,0],["Z",31,65],["Z",31,3,true],undefined]) {
    proof.killLeader=leader;assert.throws(()=>validateLchmodEvidence(proof,"bin-link","arm64-v8a"));
  }
});
test("a successful CLI exit cannot hide wrong permissions, missing reachability or followed links", () => {
  for(const change of [p=>{p.rows.splice(1,1);},p=>{p.rows[1][1]=0;},p=>{p.rows[1][1]=159;},p=>{p.rows[0][2]="SIGSYS";},
    p=>{p.rows[2][3]=0o600;},p=>{p.rows[3][3]=0o600;},p=>{p.rows[4][3]=0o600;},
    p=>{p.rows[5][3]=0o700;},p=>{p.rows[6][3]=0o700;},p=>{p.rows[3][5]=false;},
    p=>{p.rows[3][6]=false;},p=>{p.rows[2][7]=0;},p=>{p.rows[3][10]=0;},
    p=>{p.rows[3][9]=22;},p=>{p.childrenReaped=false;},p=>{p.filesRemoved=false;},
    p=>{p.skipped=true;},p=>{p.policies.trap="0".repeat(64);},p=>{p.rows[0].push(true);}]) {
    const proof=lchmodFixture(); change(proof);
    assert.throws(()=>validateLchmodEvidence(proof,"bin-link","arm64-v8a"));
  }
});
