// Enter the read-only observer through the unchanged production supervisor.
// execve retains this owned PID; there is no unsupervised Bun.spawn warmup.
import { dlopen, ptr } from "bun:ffi";
import { dirname, join, isAbsolute } from "node:path";
const entry = process.argv[2];
if (!entry || !isAbsolute(entry) || process.argv.length !== 3) throw Error("fixed absolute diagnostic entry required");
const observer = join(dirname(process.execPath), "libbun_signal_trace.so");
function vector(strings) {
  const buffers = strings.map(s => Buffer.from(s + "\0")), pointers = new BigUint64Array(buffers.length + 1);
  buffers.forEach((b,i) => { pointers[i] = BigInt(ptr(b)); }); return { buffers, pointers };
}
const args = vector([observer, process.execPath, entry]);
const env = vector(Object.entries(process.env).map(([k,v]) => k + "=" + v));
const libc = dlopen("libc.so", { execve: { args: ["ptr", "ptr", "ptr"], returns: "i32" } });
libc.symbols.execve(ptr(args.buffers[0]), ptr(args.pointers), ptr(env.pointers));
throw Error("diagnostic same-PID exec failed");
