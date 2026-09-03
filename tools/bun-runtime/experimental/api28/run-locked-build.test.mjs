import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createLockedContainerBuildPlan } from "./run-locked-build.mjs";

test("the locked container plan isolates the network and mounts only the Bun checkout writable", () => {
  const temporary = mkdtempSync(join(tmpdir(), "autojs6-locked-build-"));
  try {
    const directories = Object.fromEntries(
      ["bun", "bun-inputs", "cargo-inputs", "source", "toolchain-inputs", "toolchains", "ndk"].map((name) => {
        const path = join(temporary, name);
        mkdirSync(path);
        return [name, path];
      }),
    );
    const plan = createLockedContainerBuildPlan({
      abi: "x86_64",
      bunRepository: directories.bun,
      bunInputDirectory: directories["bun-inputs"],
      cargoInputDirectory: directories["cargo-inputs"],
      sourcePrefetchDirectory: directories.source,
      toolchainInputDirectory: directories["toolchain-inputs"],
      toolchainInstallDirectory: directories.toolchains,
      androidNdkRoot: directories.ndk,
      uid: 1234,
      gid: 5678,
    });

    assert.equal(plan.image, `autojs6/bun-host-locked@${plan.imageDigest}`);
    assert.match(plan.imageDigest, /^sha256:[0-9a-f]{64}$/);
    assert.ok(plan.arguments.includes("--pull=never"));
    assert.ok(plan.arguments.includes("--network=none"));
    assert.ok(plan.arguments.includes("--read-only"));
    assert.ok(plan.arguments.includes("--cap-drop=ALL"));
    assert.deepEqual(plan.arguments.slice(plan.arguments.indexOf("--user") + 1, plan.arguments.indexOf("--user") + 2), ["1234:5678"]);
    assert.ok(plan.arguments.includes("CCACHE_DISABLE=1"));
    assert.ok(plan.innerCommand.includes("--execute"));
    assert.ok(plan.innerCommand.includes("x86_64"));

    const mounts = plan.arguments.filter((argument) => argument.startsWith("type=bind,"));
    assert.equal(mounts.length, 8);
    assert.equal(mounts.filter((mount) => !mount.endsWith(",readonly")).length, 1);
    assert.equal(
      mounts.find((mount) => !mount.endsWith(",readonly")),
      `type=bind,src=${plan.hostPaths.bunRepository},dst=/work/bun`,
    );
    assert.ok(mounts.some((mount) => mount.endsWith("dst=/opt/autojs6/android-ndk-r27c,readonly")));
    assert.ok(!plan.arguments.join("\n").includes("app/src/main/jniLibs"));
    assert.ok(!plan.arguments.join("\n").includes("tools/bun-runtime/prebuilt"));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("the locked container plan rejects an unknown ABI", () => {
  assert.throws(
    () => createLockedContainerBuildPlan({ abi: "armeabi-v7a", uid: 1, gid: 1 }),
    /Unknown ABI selection/,
  );
});
