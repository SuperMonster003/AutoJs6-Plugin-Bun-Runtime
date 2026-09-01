import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(toolDirectory, "../..");
const lock = JSON.parse(readFileSync(resolve(toolDirectory, "runtime.lock.json"), "utf8"));

for (const artifact of lock.artifacts) {
  const file = resolve(rootDirectory, artifact.binaryPath);
  const stat = statSync(file);
  if (stat.size !== artifact.binaryBytes) {
    throw new Error(`${artifact.abi}: expected ${artifact.binaryBytes} bytes, found ${stat.size}`);
  }
  const digest = await sha256(file);
  if (digest !== artifact.binarySha256) {
    throw new Error(`${artifact.abi}: SHA-256 mismatch: ${digest}`);
  }
  verifyElf(file, artifact);
  console.log(`${artifact.abi}: ${digest} (${stat.size} bytes, ELF alignment OK)`);
}

function sha256(file) {
  return new Promise((resolveDigest, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("error", reject)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolveDigest(hash.digest("hex")));
  });
}

function verifyElf(file, artifact) {
  const data = readFileSync(file);
  if (data[0] !== 0x7f || data.toString("ascii", 1, 4) !== "ELF") {
    throw new Error(`${artifact.abi}: not an ELF file`);
  }
  if (data[4] !== 2 || data[5] !== 1) {
    throw new Error(`${artifact.abi}: expected little-endian ELF64`);
  }
  if (data.readUInt16LE(16) !== 3) {
    throw new Error(`${artifact.abi}: expected ET_DYN Android PIE executable`);
  }
  if (data.readUInt16LE(18) !== artifact.elfMachine) {
    throw new Error(`${artifact.abi}: unexpected ELF machine`);
  }
  const programHeaderOffset = Number(data.readBigUInt64LE(32));
  const programHeaderSize = data.readUInt16LE(54);
  const programHeaderCount = data.readUInt16LE(56);
  let loadCount = 0;
  for (let index = 0; index < programHeaderCount; index += 1) {
    const offset = programHeaderOffset + index * programHeaderSize;
    if (data.readUInt32LE(offset) !== 1) continue;
    loadCount += 1;
    const alignment = Number(data.readBigUInt64LE(offset + 48));
    if (alignment < artifact.minimumLoadAlignment || alignment % artifact.minimumLoadAlignment !== 0) {
      throw new Error(`${artifact.abi}: PT_LOAD alignment ${alignment} is below ${artifact.minimumLoadAlignment}`);
    }
  }
  if (loadCount === 0) throw new Error(`${artifact.abi}: ELF contains no PT_LOAD segment`);
}
