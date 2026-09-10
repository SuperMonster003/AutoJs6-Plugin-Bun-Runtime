import { OPENAT2_CASES, openat2FilterSha256 } from "./openat2-evidence.mjs";
// Synthetic verifier inputs, never device evidence.
export function openat2Fixture(abi = "arm64-v8a", native = true) {
  const policy = (error,before) => ({installed:true,before:{result:-1,errno:before},after:{result:-1,errno:error ? 5 : 38},
    filterSha256:openat2FilterSha256(abi,error)});
  const rows=() => OPENAT2_CASES.map((name,i) => i<2 ? [200,"ok"] : [404,"miss"]);
  return {schemaVersion:1,mode:"confinement",arch:abi==="arm64-v8a" ? "arm64" : "x64",kernel:"5.10.0-test",passed:true,
    nativeOpen:{opened:native,errno:native ? 0 : 38},eioOpen:{opened:false,errno:5},trapOpen:{opened:false,errno:38},
    errorPolicy:policy(true,22),trapPolicy:policy(false,5),reachability:native ? "EIO" : "unavailable-before-filter",
    errorControl:native ? [404,"miss"] : [200,"ok"],nativeRows:rows(),trapRows:rows(),
    publicLchmod:["undefined","undefined"],filesRemoved:true};
}
