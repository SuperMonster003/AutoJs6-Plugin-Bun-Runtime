// A fresh nine-patch Bun checkout, the existing audited offline inputs, and a
// separately built JSC. Does not modify the original input/cache directories.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createBuildPlan, preflightBuildInputs } from "../api28/build-experiment.mjs";
import { loadJscCandidate } from "./jsc-common.mjs";
import { verifyJscConfig } from "./record-candidate.mjs";

const plan = createBuildPlan({ experimentDirectory: "/work/api28", abi: "x86_64", bunRepository: "/work/bun" });
const verified = await preflightBuildInputs(plan, {
    bunRepository: "/work/bun", bunInputDirectory: "/inputs/bun", cargoInputDirectory: "/inputs/cargo",
    sourcePrefetchDirectory: "/inputs/source", toolchainDirectory: "/inputs/toolchain",
    androidNdkRoot: "/opt/autojs6/android-ndk-r27c", validateHostTools: true,
});
const execute = (command, args) => {
    const result = spawnSync(command, args, { cwd: "/work/bun", env: verified.environment, stdio: "inherit" });
    assert(!result.error && result.status === 0, `${command} failed: ${result.error?.message ?? result.status}`);
};
const lock = loadJscCandidate();
verifyJscConfig(readFileSync("/largepage/cmakeconfig.h", "utf8"));
const check = (path, fact) => {
    const data = readFileSync(path);
    assert.equal(data.length, fact.bytes);
    assert.equal(createHash("sha256").update(data).digest("hex"), fact.sha256);
};
check("/largepage/cmakeconfig.h", lock.generatedConfig);
for (const [name, fact] of Object.entries(lock.libraries)) check(`/largepage/lib/${name}`, fact);
execute(process.execPath, plan.commands[0].configure.arguments);
// Extract the pinned upstream bundle through Bun's verified offline fetch rule
// before replacing its JSC members. ICU and all headers retain their provenance.
execute("ninja", ["-C", "build/autojs6-api28/x86_64", "WebKit"]);
const bundle = "/work/bun/build/autojs6-api28/cache/webkit-0f966e81b78c84bb-android-android";
for (const name of Object.keys(lock.libraries)) copyFileSync(`/largepage/lib/${name}`, `${bundle}/lib/${name}`);
copyFileSync("/largepage/cmakeconfig.h", `${bundle}/include/cmakeconfig.h`);
execute("ninja", ["-C", "build/autojs6-api28/x86_64", "-j8"]);
for (const [name, fact] of Object.entries(lock.libraries)) check(`${bundle}/lib/${name}`, fact);
check(`${bundle}/include/cmakeconfig.h`, lock.generatedConfig);
writeFileSync("/work/bun/build/autojs6-api28/x86_64/jsc-clean-build.json", JSON.stringify({
    kind: "clean-bun-with-locked-large-page-jsc", source: plan.downstreamHeadCommit,
    sourceInputCount: verified.sourceInputCount, cargoArchiveCount: verified.cargoArchiveCount,
    bunArchiveCount: verified.bunArchiveCount, toolVersions: verified.toolVersions, jsc: lock,
}, null, 2) + "\n", { flag: "wx" });
