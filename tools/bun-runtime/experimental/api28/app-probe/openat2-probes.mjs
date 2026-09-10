// Fixed loopback-only fixture. All files, including the outside-root sentinel,
// belong to this private job. No network peer, host file or installed app is read.
import { dlopen, ptr, read } from "bun:ffi";
import * as fs from "node:fs";
import { release } from "node:os";
const proof = { schemaVersion: 1, mode: OPENAT2_MODE, arch: process.arch, kernel: release(), passed: false };
const check = (v, m) => { if (!v) throw Error(m); };
const c = dlopen("libc.so", {
  syscall: { args: ["i64", "i64", "i64", "i64", "i64", "i64", "i64"], returns: "i64" },
  prctl: { args: ["i32", "u64", "u64", "u64", "u64"], returns: "i32" },
  mkfifo: { args: ["ptr", "u32"], returns: "i32" }, __errno: { args: [], returns: "ptr" },
}).symbols;
const errno = c.__errno(), arm = process.arch === "arm64", MAGIC = 0x41554a36;
const call = value => ({ result: Number(value), errno: Number(value) === -1 ? read.i32(errno) : 0 });
const marker = () => call(c.prctl(MAGIC, 0n, 0n, 0n, 0n));
function filter(action, beforeErrno, afterErrno) {
  const instructions = [[0x20,0,0,4],[0x15,1,0,arm ? 0xc00000b7 : 0xc000003e],[0x06,0,0,0x80000000],
    [0x20,0,0,0],[0x15,0,1,437],[0x06,0,0,action],[0x15,0,3,arm ? 167 : 157],
    [0x20,0,0,16],[0x15,0,1,MAGIC],[0x06,0,0,action],[0x06,0,0,0x7fff0000]];
  const bytes = Buffer.alloc(instructions.length * 8), program = Buffer.alloc(16);
  instructions.forEach(([code,jt,jf,k],i) => {
    bytes.writeUInt16LE(code,i*8); bytes[i*8+2]=jt; bytes[i*8+3]=jf; bytes.writeUInt32LE(k,i*8+4);
  });
  program.writeUInt16LE(instructions.length); program.writeBigUInt64LE(BigInt(ptr(bytes)),8);
  const before = marker(); check(before.result === -1 && before.errno === beforeErrno,"filter pre-control");
  check(c.prctl(38,1n,0n,0n,0n) === 0,"NO_NEW_PRIVS");
  check(c.prctl(22,2n,BigInt(ptr(program)),0n,0n) === 0,"calling-thread filter");
  const after = marker(); check(after.result === -1 && after.errno === afterErrno,"filter post-control");
  return { installed: true, before, after, filterSha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex") };
}
const cases = ["ok.txt","alias","../secret.txt","%2e%2e/secret.txt","..%2fsecret.txt",
  "%252e%252e/secret.txt","a%00.txt","missing.txt","escape-rel","escape-abs","magic","fifo"];
const base = process.cwd(), files = [], fds = [];
let server, directoryCreated = false;
function own(path, create) { check(!fs.existsSync(path),"new fixture path"); create(); files.push(path); }
function rawOpen() {
  const path = Buffer.from("ok.txt\0"), how = new BigUint64Array([0x80800n,0n,0x12n]);
  const r = call(c.syscall(437n,BigInt(fds[0]),BigInt(ptr(path)),BigInt(ptr(how)),24n,0n,0n));
  if (r.result >= 0) { fs.closeSync(r.result); return { opened: true, errno: 0 }; }
  check(r.result === -1,"raw open result"); return { opened: false, errno: r.errno };
}
async function request(path) {
  let socket, timer, done = false, bytes = Buffer.alloc(0);
  return await new Promise((resolve,reject) => {
    const finish = error => {
      if (done) return; done = true; clearTimeout(timer); socket?.end();
      if (error) { reject(error); return; }
      const text = bytes.toString("utf8"), split = text.indexOf("\r\n\r\n");
      const match = text.match(/^HTTP\/1\.[01] (\d{3}) /);
      if (!match || split < 0) { reject(Error("invalid HTTP response")); return; }
      const body = text.slice(split+4), kind = body.includes("OPENAT2_PRIVATE_SENTINEL") ? "secret" :
        body === "OPENAT2_OK" ? "ok" : body === "MISS" || body === "" ? "miss" : "other";
      resolve([Number(match[1]),kind]);
    };
    timer = setTimeout(() => finish(Error("bounded loopback timeout")),1000);
    Bun.connect({ hostname:"127.0.0.1",port:server.port,socket: {
      open(s) { socket=s; if (done) { s.end(); return; }
        s.write("GET /static/"+path+" HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"); },
      data(s,data) { if (bytes.length+data.length > 8192) { finish(Error("HTTP response bound")); return; }
        bytes=Buffer.concat([bytes,Buffer.from(data)]); },
      close() { finish(); }, error(s,error) { finish(error); },
    }}).catch(finish);
  });
}
const matrix = async () => { const rows=[]; for (const path of cases) rows.push(await request(path)); return rows; };
const validRows = rows => rows.every(([status,kind],i) => i<2 ? status===200 && kind==="ok" :
  [400,404].includes(status) && ["miss","other"].includes(kind));
try {
  check(OPENAT2_MODE === "confinement" && ["arm64","x64"].includes(process.arch),"fixed native fixture");
  check(!fs.existsSync("public"),"new public root"); fs.mkdirSync("public"); directoryCreated=true;
  own("public/ok.txt",() => fs.writeFileSync("public/ok.txt","OPENAT2_OK",{flag:"wx",mode:0o600}));
  own("secret.txt",() => fs.writeFileSync("secret.txt","OPENAT2_PRIVATE_SENTINEL",{flag:"wx",mode:0o600}));
  fds.push(fs.openSync("public",fs.constants.O_RDONLY|fs.constants.O_DIRECTORY));
  fds.push(fs.openSync("secret.txt","r"));
  for (const [name,target] of [["alias","ok.txt"],["escape-rel","../secret.txt"],
    ["escape-abs",base+"/secret.txt"],["magic","/proc/self/fd/"+fds[1]]])
    own("public/"+name,() => fs.symlinkSync(target,"public/"+name));
  own("public/fifo",() => { const path=Buffer.from("public/fifo\0"); check(c.mkfifo(ptr(path),0o600)===0,"private FIFO"); });
  proof.nativeOpen=rawOpen(); check(proof.nativeOpen.opened || [1,7,22,38].includes(proof.nativeOpen.errno),"native open control");
  server=Bun.serve({ hostname:"127.0.0.1",port:0,development:false,
    routes:{ "/static/*":{dir:base+"/public"} },fetch:() => new Response("MISS",{status:404}) });
  proof.nativeRows=await matrix();
  proof.errorPolicy=filter(0x00050005,22,5); proof.eioOpen=rawOpen();
  check(!proof.eioOpen.opened && [5,38].includes(proof.eioOpen.errno),"EIO raw control");
  proof.errorControl=await request("ok.txt");
  proof.reachability=proof.nativeOpen.opened && proof.eioOpen.errno===5 ? "EIO" : "unavailable-before-filter";
  check(JSON.stringify(proof.errorControl)===JSON.stringify(proof.reachability==="EIO" ? [404,"miss"] : [200,"ok"]),"high-level error control");
  proof.trapPolicy=filter(0x00030000,5,38); proof.trapOpen=rawOpen();
  check(!proof.trapOpen.opened && proof.trapOpen.errno===38,"TRAP becomes ENOSYS");
  proof.trapRows=await matrix();
  proof.publicLchmod=[typeof fs.lchmod,typeof fs.lchmodSync];
  proof.passed=validRows(proof.nativeRows) && validRows(proof.trapRows);
} catch (error) { proof.error=String(error.message).slice(0,160); }
finally {
  try {
    if (server) await server.stop(true); server=null;
    for (const fd of fds) fs.closeSync(fd);
    for (const file of files.reverse()) fs.unlinkSync(file);
    if (directoryCreated) fs.rmdirSync("public");
    proof.filesRemoved=true;
  } catch (error) { proof.passed=false; proof.cleanupError=String(error.message).slice(0,160); }
}
const output="OPENAT2_PROBE_RESULT="+JSON.stringify(proof);
if (output.length>2048) throw Error("openat2 evidence bound");
console.log(output); if (!proof.passed) process.exitCode=1;
