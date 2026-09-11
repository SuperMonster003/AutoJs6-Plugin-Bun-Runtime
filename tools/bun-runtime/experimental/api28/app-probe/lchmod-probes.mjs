// Offline test-only CLI; no package/bin execution.
import { dlopen, ptr, read } from "bun:ffi";
import { mkdirSync, writeFileSync, readFileSync, statSync, lstatSync, realpathSync,
  readlinkSync, symlinkSync, existsSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { release } from "node:os";
const arm = process.arch === "arm64", phase = process.env.PROBE_LCHMOD_CHILD;
const check = (ok, message) => { if (!ok) throw Error(message); };
const digest = data => new Bun.CryptoHasher("sha256").update(data).digest("hex");
const c = dlopen("libc.so", {
  prctl: { args: ["i32", "u64", "u64", "u64", "u64"], returns: "i32" },
  syscall: { args: ["i64", "i64", "i64", "i64", "i64", "i64", "i64"], returns: "i64" },
  socket: { args: ["i32", "i32", "i32"], returns: "i32" },
  __errno: { args: [], returns: "ptr" }, umask: { args: ["u32"], returns: "u32" },
  setrlimit: { args: ["i32", "ptr"], returns: "i32" },
  execve: { args: ["ptr", "ptr", "ptr"], returns: "i32" },
}).symbols;
const errno = c.__errno(), marker = () => {
  check(c.prctl(0x41554a36, 0n, 0n, 0n, 0n) === -1, "marker result"); return read.i32(errno);
};
function policy(kind) {
  const instructions = [[0x20,0,0,4],[0x15,1,0,arm?0xc00000b7:0xc000003e],[0x06,0,0,0x80000000],
    [0x20,0,0,0],[0x15,0,1,arm?198:41],[0x06,0,0,0x00050001]]; // no socket creation
  if (kind !== "native") instructions.push([0x15,0,1,452],[0x06,0,0,kind==="kill"?0:0x00030000]);
  if (kind === "fallback-eio") instructions.push([0x15,0,4,arm?52:91],[0x20,0,0,24],
    [0x15,0,1,0o700],[0x06,0,0,0x00050005],[0x20,0,0,0]);
  instructions.push([0x15,0,3,arm?167:157],[0x20,0,0,16],[0x15,0,1,0x41554a36],
    [0x06,0,0,0x0005004d],[0x06,0,0,0x7fff0000]);
  const filter = Buffer.alloc(instructions.length * 8), program = Buffer.alloc(16);
  instructions.forEach(([code,jt,jf,k],i) => {
    filter.writeUInt16LE(code,i*8); filter[i*8+2]=jt; filter[i*8+3]=jf; filter.writeUInt32LE(k,i*8+4);
  });
  program.writeUInt16LE(instructions.length); program.writeBigUInt64LE(BigInt(ptr(filter)),8);
  const before = marker(); check(before === 22, "pre-filter marker");
  check(c.prctl(38,1n,0n,0n,0n)===0 && c.prctl(22,2n,BigInt(ptr(program)),0n,0n)===0, "child-only filter");
  const after = marker(); check(after === 77, "installed marker");
  const network = [2,10].map(family => { check(c.socket(family,1,0)===-1,"network socket allowed"); return read.i32(errno); });
  check(network.every(n=>n===1), "network errno");
  return { sha256:digest(filter), before, after, network };
}
function vector(strings) {
  const buffers=strings.map(s=>Buffer.from(s+"\0")), pointers=new BigUint64Array(buffers.length+1);
  buffers.forEach((b,i)=>{pointers[i]=BigInt(ptr(b));}); return {buffers,pointers};
}
if (phase) {
  check(["native","kill","trap","fallback-eio"].includes(phase),"fixed child policy");
  check(c.setrlimit(4,ptr(new BigUint64Array(2)))===0,"disable core files in test child");
  c.umask(0o077);
  check(Number(c.syscall(452n,-1n,0n,0n,0n,0n,0n))===-1,"raw invalid-argument control");
  const rawBefore=read.i32(errno), installed=policy(phase);
  writeFileSync("policy.json",JSON.stringify({pid:process.pid,rawBefore,...installed}),{flag:"wx",mode:0o600});
  const argv=vector([process.execPath,"link","--ignore-scripts","--config="+process.cwd()+"/bunfig.toml"]);
  const env=vector(Object.entries(process.env).filter(([key])=>key!=="PROBE_LCHMOD_CHILD").map(([k,v])=>k+"="+v));
  c.execve(ptr(argv.buffers[0]),ptr(argv.pointers),ptr(env.pointers));
  throw Error("same-PID CLI exec failed: "+read.i32(errno));
}
const proof={schemaVersion:1,mode:LCHMOD_MODE,arch:process.arch,kernel:release(),passed:false,policies:{},rows:[]};
const root=process.cwd()+"/lchmod-owned", content="// Fixed bin-link fixture; never executed.\n";
const ids=["no-bin","kill","native","trap","repeat","fallback-eio","symlink"];
function removeOwned(path,depth=0,count={n:0}) {
  check(path===root || path.startsWith(root+"/"),"cleanup root"); check(depth<=8 && ++count.n<=256,"cleanup budget");
  if (lstatSync(path).isDirectory()) { for(const name of readdirSync(path)) removeOwned(path+"/"+name,depth+1,count); rmdirSync(path); }
  else unlinkSync(path); // Never follow a directory symlink.
}
// KILL_THREAD is available on old kernels. Observe its SIGSYS leader death
// before terminating any remaining threads through the owned child handle.
function killedLeader(stat,pid) {
  check(stat.length<=4096 && stat.startsWith(pid+" ("),"owned proc stat");
  const fields=stat.slice(stat.lastIndexOf(")")+2).trim().split(/\s+/);
  check(fields.length===50,"proc stat fields");
  const threads=Number(fields[17]);
  check(Number.isInteger(threads)&&threads>=1&&threads<=64,"thread bound");
  return fields[0]==="Z"&&fields[49]==="31"?["Z",31,threads]:null;
}
async function killControl(cmd,options) {
  const child=Bun.spawn(cmd,{cwd:options.cwd,env:options.env,stdin:"ignore",stdout:"pipe",stderr:"pipe"});
  let bytes=0,exitedDueToTimeout=false,exitedDueToMaxBuffer=false,leader=null,pollError;
  const terminate=()=>child.kill("SIGKILL");
  const drain=async stream=>{
    const chunks=[];
    for await(const chunk of stream) {
      bytes+=chunk.length;
      if(bytes>4096) { exitedDueToMaxBuffer=true; terminate(); } else chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  };
  const stdout=drain(child.stdout),stderr=drain(child.stderr);
  const deadline=setTimeout(()=>{exitedDueToTimeout=true;terminate();},1500);
  const poll=setInterval(()=>{
    if(leader||pollError) return;
    try {
      leader=killedLeader(readFileSync("/proc/"+child.pid+"/stat","utf8"),child.pid);
      if(leader) terminate();
    } catch(error) { if(error.code!=="ENOENT") {pollError=error;terminate();} }
  },10);
  try {
    await child.exited;
    const outputs=await Promise.all([stdout,stderr]);
    if(pollError) throw pollError;
    return {pid:child.pid,exitCode:child.exitCode,signalCode:child.signalCode,success:false,
      stdout:outputs[0],stderr:outputs[1],exitedDueToTimeout,exitedDueToMaxBuffer,leader};
  } finally {clearTimeout(deadline);clearInterval(poll);}
}
try {
  check(LCHMOD_MODE==="bin-link" && ["arm64","x64"].includes(process.arch),"fixed mode/ABI");
  mkdirSync(root);
  for(const id of ids) {
    const repeat=id==="repeat", base=root+"/"+(repeat?"trap":id), pkg=base+"/pkg";
    if (!repeat) {
      mkdirSync(base); for(const name of ["pkg","global","bin","cache","tmp"]) mkdirSync(base+"/"+name);
      const manifest={name:"autojs6-lchmod-probe",version:"1.0.0",...(id==="no-bin"?{}:{bin:{"lchmod-probe":"cli.js"}})};
      writeFileSync(pkg+"/package.json",JSON.stringify(manifest),{flag:"wx",mode:0o600});
      writeFileSync(pkg+"/bunfig.toml","[install]\nignoreScripts = true\n",{flag:"wx",mode:0o600});
      writeFileSync(pkg+(id==="symlink"?"/target.js":"/cli.js"),content,{flag:"wx",mode:0o600});
      if(id==="symlink") symlinkSync("target.js",pkg+"/cli.js");
    } else {
      unlinkSync(pkg+"/policy.json");
      const fs=await import("node:fs"); fs.chmodSync(pkg+"/cli.js",0o600);
      check(lstatSync(base+"/bin/lchmod-probe").isSymbolicLink(),"repeat requires existing bin link");
    }
    const manifestBefore=digest(readFileSync(pkg+"/package.json"));
    const kind=["no-bin","kill"].includes(id)?"kill":id==="fallback-eio"?id:id==="native"?id:"trap";
    const cmd=[process.execPath,"run","--no-install",process.argv[1]],options={
      cwd:pkg,stdin:"ignore",stdout:"pipe",stderr:"pipe",timeout:1500,killSignal:"SIGKILL",maxBuffer:4096,
      env:{PATH:"/system/bin",TMPDIR:base+"/tmp",BUN_INSTALL_GLOBAL_DIR:base+"/global",
        BUN_INSTALL_BIN:base+"/bin",BUN_INSTALL_CACHE_DIR:base+"/cache",PROBE_LCHMOD_CHILD:kind,NO_COLOR:"1"},
    };
    const run=id==="kill"?await killControl(cmd,options):Bun.spawnSync(cmd,options);
    if(id==="kill") proof.killLeader=run.leader;
    check(!run.exitedDueToTimeout && !run.exitedDueToMaxBuffer,"bounded CLI child");
    check(existsSync(pkg+"/policy.json"),id+" bootstrap "+run.exitCode+": "+(run.stderr.toString().match(/error: [^\n]+/)?.[0]??run.signalCode));
    const installed=JSON.parse(readFileSync(pkg+"/policy.json","utf8"));
    check(installed.pid===run.pid && !existsSync("/proc/"+run.pid),"same-PID exec and child reap");
    if(proof.policies[kind]) check(proof.policies[kind]===installed.sha256,"policy drift");
    proof.policies[kind]=installed.sha256;
    check(id==="kill"?(run.signalCode==="SIGSYS"||run.signalCode==="SIGKILL"&&run.leader):run.exitCode===0&&!run.signalCode&&run.success,
      id+" CLI "+run.exitCode+": "+run.stderr.toString().replaceAll(root,"").slice(-190));
    const registered=realpathSync(base+"/global/node_modules/autojs6-lchmod-probe")===pkg;
    const bin=id==="no-bin"?!existsSync(base+"/bin/lchmod-probe"):
      lstatSync(base+"/bin/lchmod-probe").isSymbolicLink() && realpathSync(base+"/bin/lchmod-probe")===realpathSync(pkg+"/cli.js");
    const permissions=statSync(pkg+"/cli.js").mode&0o777;
    const unchanged=readFileSync(pkg+"/cli.js","utf8")===content && digest(readFileSync(pkg+"/package.json"))===manifestBefore;
    proof.rows.push([id,run.exitCode??null,run.signalCode??null,permissions,registered,bin,unchanged,
      installed.rawBefore,installed.before,installed.after,...installed.network]);
    check(registered && bin && unchanged,"link target/fixture bytes");
    const expected=["native","trap","repeat"].includes(id)?0o700:0o600;
    check(permissions===expected,"file mode differs from semantic/control expectation");
    if(id==="symlink") check(readlinkSync(pkg+"/cli.js")==="target.js","bin symlink changed");
  }
  proof.childrenReaped=true; proof.passed=true;
} catch(error) { proof.error=String(error.message??error).replaceAll(root,"<root>").slice(0,200); }
finally {
  try { if(existsSync(root)) removeOwned(root); proof.filesRemoved=!existsSync(root); }
  catch(error) { proof.passed=false; proof.error="cleanup: "+String(error.message).slice(0,160); }
}
const output="LCHMOD_PROBE_RESULT="+JSON.stringify(proof);
if(output.length>2048) throw Error("lchmod evidence exceeds fixed bound");
console.log(output); if(!proof.passed) process.exitCode=1;
