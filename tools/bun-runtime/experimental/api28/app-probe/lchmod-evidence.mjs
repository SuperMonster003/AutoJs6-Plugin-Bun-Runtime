import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const LCHMOD_MODES = { "lchmod-bin-link": "bin-link" };
export const LCHMOD_CASES = ["no-bin", "kill", "native", "trap", "repeat", "fallback-eio", "symlink"];
export const LCHMOD_POLICIES = ["kill", "native", "trap", "fallback-eio"];
// Independent BPF encoding. The child-only filter never affects the supervisor.
export function lchmodFilter(abi, kind) {
  assert(["arm64-v8a", "x86_64"].includes(abi));
  assert(LCHMOD_POLICIES.includes(kind));
  const arm = abi === "arm64-v8a";
  const instructions = [[0x20,0,0,4],[0x15,1,0,arm?0xc00000b7:0xc000003e],[0x06,0,0,0x80000000],
    [0x20,0,0,0],[0x15,0,1,arm?198:41],[0x06,0,0,0x00050001]];
  if (kind !== "native") instructions.push([0x15,0,1,452],[0x06,0,0,kind==="kill"?0:0x00030000]);
  if (kind === "fallback-eio") instructions.push([0x15,0,4,arm?52:91],[0x20,0,0,24],
    [0x15,0,1,0o700],[0x06,0,0,0x00050005],[0x20,0,0,0]);
  instructions.push([0x15,0,3,arm?167:157],[0x20,0,0,16],[0x15,0,1,0x41554a36],
    [0x06,0,0,0x0005004d],[0x06,0,0,0x7fff0000]);
  const bytes = Buffer.alloc(instructions.length * 8);
  instructions.forEach(([code,jt,jf,k],i) => {
    bytes.writeUInt16LE(code,i*8); bytes[i*8+2]=jt; bytes[i*8+3]=jf; bytes.writeUInt32LE(k,i*8+4);
  });
  return bytes;
}
export const lchmodFilterSha256 = (abi, kind) => createHash("sha256").update(lchmodFilter(abi, kind)).digest("hex");

export function validateLchmodEvidence(proof, mode, abi) {
  assert(proof && mode === "bin-link", "fixed bin-link evidence required");
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.mode, mode);
  assert.equal(proof.arch, abi === "arm64-v8a" ? "arm64" : "x64");
  assert.equal(proof.passed, true); assert(!proof.error && !proof.skipped, "no skipped or failed controls");
  assert.equal(proof.filesRemoved, true); assert.equal(proof.childrenReaped, true);
  assert(Object.hasOwn(proof,"killLeader"),"explicit leader observation required");
  if(proof.killLeader!==null) {
    assert.deepEqual(proof.killLeader.slice(0,2),["Z",31],"leader must die of SIGSYS before group cleanup");
    assert.equal(proof.killLeader.length,3);
    assert(Number.isInteger(proof.killLeader[2])&&proof.killLeader[2]>=1&&proof.killLeader[2]<=64);
  }
  assert(typeof proof.kernel === "string" && proof.kernel.length <= 128 && /^\d+\.\d+\.\d+(?:[-+._\w]*)$/.test(proof.kernel));
  assert.deepEqual(proof.policies, Object.fromEntries(LCHMOD_POLICIES.map(kind => [kind, lchmodFilterSha256(abi, kind)])), "exact child policies");
  assert.deepEqual(proof.rows?.map(row => row[0]), LCHMOD_CASES, "all seven ordered CLI controls required");
  for (const row of proof.rows) {
    const id = row[0], killed = id === "kill", mode = ["native", "trap", "repeat"].includes(id) ? 0o700 : 0o600;
    assert.equal(row.length, 12, "exact CLI observation columns");
    const signal=killed?row[2]:null;
    if(killed) assert(signal==="SIGSYS"||signal==="SIGKILL"&&proof.killLeader!==null,"observed SIGSYS must precede forcible cleanup");
    assert.deepEqual(row.slice(0, 7), [id, killed ? null : 0, signal, mode, true, true, true],
      "CLI exit/signal, file mode, registration, bin target and unchanged bytes");
    assert([1,2,9,14,22,38,95].includes(row[7]), "native invalid-argument fchmodat2 errno");
    assert.deepEqual(row.slice(8), [22,77,1,1], "before/after marker and blocked IPv4/IPv6 sockets");
  }
  return proof;
}
