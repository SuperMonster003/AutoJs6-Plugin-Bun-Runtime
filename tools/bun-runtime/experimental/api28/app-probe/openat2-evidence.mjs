import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const OPENAT2_MODES = { "openat2-confinement": "confinement" };
export const OPENAT2_CASES = ["regular", "internal-symlink", "parent", "encoded-parent", "encoded-separator",
  "double-encoded", "nul", "missing", "relative-escape", "absolute-escape", "magic-link", "fifo"];
export function openat2Filter(abi, error = false) {
  assert(["arm64-v8a", "x86_64"].includes(abi));
  const arm = abi === "arm64-v8a", action = error ? 0x00050005 : 0x00030000;
  const rows = [[0x20,0,0,4],[0x15,1,0,arm ? 0xc00000b7 : 0xc000003e],[0x06,0,0,0x80000000],
    [0x20,0,0,0],[0x15,0,1,437],[0x06,0,0,action],[0x15,0,3,arm ? 167 : 157],
    [0x20,0,0,16],[0x15,0,1,0x41554a36],[0x06,0,0,action],[0x06,0,0,0x7fff0000]];
  const bytes = Buffer.alloc(rows.length*8);
  rows.forEach(([code,jt,jf,k],i) => {
    bytes.writeUInt16LE(code,i*8); bytes[i*8+2]=jt; bytes[i*8+3]=jf; bytes.writeUInt32LE(k,i*8+4);
  });
  return bytes;
}
export const openat2FilterSha256 = (abi, error = false) => createHash("sha256").update(openat2Filter(abi,error)).digest("hex");

// Inspect complete failure evidence without reclassifying it as acceptance.
// The runner uses validateOpenat2Evidence below, which always requires success.
export function inspectOpenat2Evidence(proof, mode, abi) {
  assert(proof && mode === "confinement");
  assert.equal(proof.schemaVersion,1); assert.equal(proof.mode,mode);
  assert.equal(proof.arch,abi === "arm64-v8a" ? "arm64" : "x64");
  assert(typeof proof.kernel === "string" && proof.kernel.length <= 128 && /^\d+\.\d+\.\d+[-+.\w]*$/.test(proof.kernel));
  assert(!proof.error && !proof.cleanupError && !proof.skipped, "complete control and cleanup evidence required");
  assert.equal(proof.filesRemoved,true);
  const policy = (value,error,before) => assert.deepEqual(value,{installed:true,before:{result:-1,errno:before},
    after:{result:-1,errno:error ? 5 : 38},filterSha256:openat2FilterSha256(abi,error)});
  policy(proof.errorPolicy,true,22); policy(proof.trapPolicy,false,5);
  assert([0,1,7,22,38].includes(proof.nativeOpen?.errno));
  assert.deepEqual(proof.nativeOpen,{opened:proof.nativeOpen.errno===0,errno:proof.nativeOpen.errno});
  assert([5,38].includes(proof.eioOpen?.errno)); assert.deepEqual(proof.eioOpen,{opened:false,errno:proof.eioOpen.errno});
  assert.deepEqual(proof.trapOpen,{opened:false,errno:38});
  const reached=proof.nativeOpen.opened && proof.eioOpen.errno===5;
  assert.equal(proof.reachability,reached ? "EIO" : "unavailable-before-filter");
  assert.deepEqual(proof.errorControl,reached ? [404,"miss"] : [200,"ok"]);
  assert.deepEqual(proof.publicLchmod,["undefined","undefined"],"public Android lchmod does not exercise internal fchmodat2");
  const failures=[];
  for (const phase of ["nativeRows","trapRows"]) {
    const rows=proof[phase]; assert(Array.isArray(rows) && rows.length===OPENAT2_CASES.length,"exact ordered path inventory");
    rows.forEach((row,i) => {
      assert(Array.isArray(row) && row.length===2 && [200,400,404].includes(row[0]) &&
        ["ok","miss","other","secret"].includes(row[1]),"bounded HTTP observation");
      const passed=i<2 ? row[0]===200 && row[1]==="ok" : [400,404].includes(row[0]) && ["miss","other"].includes(row[1]);
      if (!passed) failures.push({phase:phase==="nativeRows" ? "native" : "trap",case:OPENAT2_CASES[i],status:row[0],body:row[1]});
    });
  }
  assert.equal(proof.passed,failures.length===0,"verdict must reflect every confinement assertion");
  return {passed:proof.passed,failures};
}
export function validateOpenat2Evidence(proof, mode, abi) {
  const verdict=inspectOpenat2Evidence(proof,mode,abi);
  assert.equal(verdict.passed,true,"openat2 directory confinement failed");
  return proof;
}
