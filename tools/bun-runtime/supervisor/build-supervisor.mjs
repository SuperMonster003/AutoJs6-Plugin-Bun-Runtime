import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { root, supervisorLock, verifySupervisorBytes, verifySupervisorSource } from "./supervisor-common.mjs";

// No network, source mutation, or overwrite of an existing build directory.
const args = process.argv.slice(2);
assert.ok(args.length === 4 || (args.length === 5 && args[4] === "--candidate"),
  "Usage: node build-supervisor.mjs --ndk <absolute-path> --output-directory <new-absolute-path> [--candidate]");
assert.equal(args[0], "--ndk");
assert.equal(args[2], "--output-directory");
assert.ok(isAbsolute(args[1]) && isAbsolute(args[3]), "absolute paths are required");
assert.ok(!existsSync(args[3]), "output directory must not already exist");
verifySupervisorSource();
const ndk = resolve(args[1]);
const properties = readFileSync(resolve(ndk, "source.properties"), "utf8");
assert.ok(properties.split(/\r?\n/).includes(`Pkg.Revision = ${supervisorLock.ndkVersion}`), "NDK revision drifted");
assert.ok(["win32", "linux"].includes(process.platform), "reproduction is supported on Windows or Linux x64");
assert.equal(process.arch, "x64");
const host = process.platform === "win32" ? "windows-x86_64" : "linux-x86_64";
const clang = resolve(ndk, "toolchains/llvm/prebuilt", host, "bin", `clang${process.platform === "win32" ? ".exe" : ""}`);
const output = resolve(args[3]);
mkdirSync(output, { recursive: true });
for (const artifact of supervisorLock.artifacts) {
  const target = resolve(output, `bun-supervisor-${artifact.abi}`);
  const result = spawnSync(clang, [
    `--target=${artifact.target}${supervisorLock.androidApi}`, ...supervisorLock.flags,
    supervisorLock.source, "-o", target,
  ], { cwd: root, encoding: "utf8", timeout: 120_000, windowsHide: true });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  console.log(JSON.stringify({ abi: artifact.abi, path: target,
    ...verifySupervisorBytes(readFileSync(target), artifact, !args.includes("--candidate")) }));
}
