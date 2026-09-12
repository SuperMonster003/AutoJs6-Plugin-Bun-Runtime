import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createLockedContainerBuildPlan } from "../api28/run-locked-build.mjs";

const [bunRepository, cache, bunInputs, toolchains, webkitBuild] = process.argv.slice(2);
assert(process.platform === "linux" && process.argv.length === 7, "Linux builder and five explicit input directories required");
const here = dirname(fileURLToPath(import.meta.url));
const plan = createLockedContainerBuildPlan({
    experimentDirectory: resolve(here, "../api28"), abi: "x86_64", bunRepository,
    bunInputDirectory: bunInputs, cargoInputDirectory: join(cache, "cargo-build-std"),
    sourcePrefetchDirectory: join(cache, "source-prefetch"), toolchainInputDirectory: join(cache, "toolchain"),
    toolchainInstallDirectory: toolchains, androidNdkRoot: join(toolchains, "android-ndk-r27c"),
});
const args = [...plan.arguments];
const imageAt = args.indexOf(plan.image);
const largepage = realpathSync(webkitBuild), experimental = realpathSync(resolve(here, ".."));
for (const value of [largepage, experimental]) assert(!/[\0\r\n,]/.test(value));
args.splice(imageAt, 0, "--mount", `type=bind,src=${largepage},dst=/largepage,readonly`,
    "--mount", `type=bind,src=${experimental},dst=/work/experimental,readonly`);
const commandAt = args.indexOf(plan.innerCommand[0]);
assert(commandAt > imageAt);
args.splice(commandAt, args.length - commandAt, plan.innerCommand[0], "/work/experimental/webkit-x86_64-16k/build-clean-bun.mjs");
const inspection = spawnSync("docker", ["image", "inspect", "--format={{.Id}}", plan.image], { encoding: "utf8" });
assert.equal(inspection.status, 0);
assert.equal(inspection.stdout.trim(), plan.imageDigest);
const result = spawnSync("docker", args, { stdio: "inherit" });
assert(!result.error && result.status === 0, `Clean large-page Bun build failed: ${result.error?.message ?? result.status}`);
