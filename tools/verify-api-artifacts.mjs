import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lock = JSON.parse(readFileSync(resolve(root, "libs/api-artifacts.lock.json"), "utf8"));

for (const artifact of lock.artifacts) {
  const file = resolve(root, "libs", artifact.file);
  const bytes = statSync(file).size;
  if (bytes !== artifact.bytes) throw new Error(`${artifact.file}: expected ${artifact.bytes} bytes, found ${bytes}`);
  const sha256 = await digest(file);
  if (sha256 !== artifact.sha256) throw new Error(`${artifact.file}: SHA-256 mismatch: ${sha256}`);
  console.log(`${artifact.file}: ${sha256} (${bytes} bytes)`);
}

function digest(file) {
  return new Promise((resolveDigest, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("error", reject)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolveDigest(hash.digest("hex")));
  });
}
