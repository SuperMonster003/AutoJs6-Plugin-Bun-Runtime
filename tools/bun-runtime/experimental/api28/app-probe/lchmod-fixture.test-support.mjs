import { LCHMOD_CASES, LCHMOD_POLICIES, lchmodFilterSha256 } from "./lchmod-evidence.mjs";
export function lchmodFixture(abi = "arm64-v8a") {
  return { schemaVersion:1, mode:"bin-link", arch:abi==="arm64-v8a"?"arm64":"x64", kernel:"5.10.0-test", passed:true,
    policies:Object.fromEntries(LCHMOD_POLICIES.map(kind=>[kind,lchmodFilterSha256(abi,kind)])),
    rows:LCHMOD_CASES.map(id=>[id,id==="kill"?null:0,id==="kill"?"SIGSYS":null,
      ["native","trap","repeat"].includes(id)?0o700:0o600,true,true,true,38,22,77,1,1]),
    childrenReaped:true, filesRemoved:true, killLeader:null };
}
