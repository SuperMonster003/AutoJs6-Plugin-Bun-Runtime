import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { root, supervisorLock, verifySupervisorBytes, verifySupervisorSource } from "./supervisor-common.mjs";

verifySupervisorSource();
for (const artifact of supervisorLock.artifacts) {
  const result = verifySupervisorBytes(readFileSync(resolve(root, artifact.binaryPath)), artifact);
  console.log(`${artifact.abi}: supervisor ${result.sha256} (${result.bytes} bytes, ELF/16 KiB alignment OK)`);
}
