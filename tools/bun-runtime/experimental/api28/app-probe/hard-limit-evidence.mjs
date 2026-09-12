import assert from "node:assert/strict";
import { createHash } from "node:crypto";
export const HARD_LIMIT_MODES = Object.freeze({
  "fd-hard-startup-native": "startup-native", "fd-hard-startup-trap": "startup-trap",
  "fd-hard-spawn-native": "spawn-native", "fd-hard-spawn-trap": "spawn-trap",
});
export function hardLimitFilter(abi) {
  assert(["arm64-v8a", "x86_64"].includes(abi));
  const rows = [[0x20,0,0,4],[0x15,1,0,abi === "arm64-v8a" ? 0xc00000b7 : 0xc000003e],[0x06,0,0,0x80000000],
    [0x20,0,0,0],[0x15,4,0,436],[0x15,0,4,abi === "arm64-v8a" ? 167 : 157],
    [0x20,0,0,16],[0x15,1,0,0x41554a36],[0x06,0,0,0x7fff0000],[0x06,0,0,0x00030000],[0x06,0,0,0x7fff0000]];
  const bytes = Buffer.alloc(rows.length * 8);
  rows.forEach(([code,jt,jf,k],i) => { bytes.writeUInt16LE(code,i*8); bytes[i*8+2]=jt; bytes[i*8+3]=jf; bytes.writeUInt32LE(k,i*8+4); });
  return bytes;
}
export const hardLimitFilterSha256 = abi => createHash("sha256").update(hardLimitFilter(abi)).digest("hex");
export function validateHardLimitEvidence(proof, mode, abi) {
  assert(Object.values(HARD_LIMIT_MODES).includes(mode));
  assert(["arm64-v8a", "x86_64"].includes(abi));
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.mode, mode); assert.equal(proof.passed, true);
  for (const field of ["error", "skipped"]) assert(!Object.hasOwn(proof,field));
  assert.equal(proof.arch, abi === "arm64-v8a" ? "arm64" : "x64");
  assert(Number.isSafeInteger(proof.uid) && proof.uid >= 10000 && proof.uid % 100000 >= 10000);
  assert(Number.isSafeInteger(proof.pid) && proof.pid > 1);
  assert(Number.isInteger(proof.fd) && proof.fd >= 256 && proof.fd < 512);
  assert.equal(proof.sentinelIdentity,true);
  for (const n of [proof.before.soft,proof.before.hard,proof.before.openMax]) assert(Number.isSafeInteger(n) && n >= 512 && n <= 0x7fffffff);
  assert(proof.before.hard >= proof.before.soft); assert.equal(proof.before.openMax,proof.before.soft);
  for (const key of ["during","after"]) assert.deepEqual(proof[key],{soft:128,hard:128,openMax:128});
  assert.deepEqual(proof.raiseAttempt,{result:-1,errno:1});
  assert.equal(proof.supervisorBefore.length,2);
  for (const n of proof.supervisorBefore) assert(Number.isSafeInteger(n) && n >= 512 && n <= 0x7fffffff);
  assert(proof.supervisorBefore[1] >= proof.supervisorBefore[0]);
  assert.deepEqual(proof.supervisorAfter,proof.supervisorBefore);
  assert(proof.nativeCloseRange.result === 0 ? proof.nativeCloseRange.errno === 0 :
    proof.nativeCloseRange.result === -1 && [22,38].includes(proof.nativeCloseRange.errno));
  if (mode.endsWith("-trap")) {
    assert.deepEqual(proof.policy,{before:{result:-1,errno:22},after:{result:-1,errno:38},sha256:hardLimitFilterSha256(abi)});
    assert.deepEqual(proof.trap,{marker:{result:-1,errno:38},closeRange:{result:-1,errno:38}});
  } else { assert(!Object.hasOwn(proof,"policy")); assert(!Object.hasOwn(proof,"trap")); }
  const startup = mode.startsWith("startup-");
  assert.equal(proof.parentFlags,startup ? 1 : 0);
  if (startup) {
    assert.deepEqual(proof.startup,{samePid:true,inheritedOpen:true,cloexec:true});
    assert(!proof.sync && !proof.async);
  } else {
    assert(!proof.startup);
    for (const key of ["sync","async"]) assert.deepEqual(proof[key],{positive:true,sentinelAbsent:true,exitCode:1,limits:[128,128]});
  }
  return proof;
}
