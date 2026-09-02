import assert from "node:assert/strict";
import { dirname } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createBuildPlan,
  executeBuildPlan,
} from "./build-experiment.mjs";

const experimentRoot = dirname(fileURLToPath(import.meta.url));

test("the read-only build plan records both API 28 ABI commands", () => {
  const plan = createBuildPlan({ experimentDirectory: experimentRoot });
  assert.equal(plan.executionAllowed, false);
  assert.equal(plan.buildReady, false);
  assert.equal(plan.sourceDateEpoch, 1788278400);
  assert.equal(plan.timezone, "UTC");
  assert.equal(plan.locale, "C.UTF-8");
  assert.deepEqual(plan.commands.map((command) => command.abi), ["arm64-v8a", "x86_64"]);
  assert.deepEqual(plan.commands[0].configure.arguments.slice(0, 2), ["--experimental-strip-types", "scripts/build.ts"]);
  assert.match(plan.commands[0].configure.arguments[2], /arm64-v8a\.configure\.json$/);
  assert.deepEqual(plan.commands[0].build.arguments, ["-C", "build/autojs6-api28/arm64-v8a"]);
  assert.equal(plan.openBlockers.length, 2);
});

test("the build plan can select exactly one ABI", () => {
  const plan = createBuildPlan({ experimentDirectory: experimentRoot, abi: "x86_64" });
  assert.deepEqual(plan.commands.map((command) => command.abi), ["x86_64"]);
  assert.deepEqual(plan.commands[0].build.arguments, ["-C", "build/autojs6-api28/x86_64"]);
});

test("an unknown ABI is rejected before any command can run", () => {
  assert.throws(
    () => createBuildPlan({ experimentDirectory: experimentRoot, abi: "armeabi-v7a" }),
    /Unknown ABI selection/,
  );
});

test("execution remains locked while buildReady is false", async () => {
  const plan = createBuildPlan({ experimentDirectory: experimentRoot, abi: "arm64-v8a" });
  await assert.rejects(
    executeBuildPlan(plan),
    /experiment\.lock\.json is not buildReady/,
  );
});
