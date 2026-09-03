import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { materializeDistributionSource } from "./materialize-distribution-source.mjs";

test("an exact Bun source archive is accepted offline and byte drift is rejected", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "autojs6-distribution-source-test-"));
  try {
    const archiveRoot = "bun-0123456789abcdef";
    const source = resolve(root, "content", archiveRoot);
    mkdirSync(source, { recursive: true });
    writeFileSync(resolve(source, "LICENSE.md"), "fixture license\n");
    const archive = resolve(root, "source.tar.gz");
    const tarExecutable = process.platform === "win32" && process.env.SystemRoot
      ? resolve(process.env.SystemRoot, "System32", "tar.exe")
      : "tar";
    const tar = spawnSync(tarExecutable, ["-czf", archive, "-C", resolve(root, "content"), archiveRoot], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (tar.error) throw tar.error;
    assert.equal(tar.status, 0, tar.stderr);
    const data = readFileSync(archive);
    const lockPath = resolve(root, "distribution-source.lock.json");
    const lock = {
      schemaVersion: 1,
      bunSource: {
        archive: {
          id: "bun-source-fixture",
          filename: "bun-source-fixture.tar.gz",
          url: "https://github.com/example/project/archive/0123456789abcdef.tar.gz",
          bytes: data.length,
          sha256: createHash("sha256").update(data).digest("hex"),
          archiveRoot,
        },
      },
    };
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    const output = resolve(root, "output");
    mkdirSync(output);
    const target = resolve(output, "bun-source-fixture.tar.gz");
    cpSync(archive, target);

    const result = await materializeDistributionSource({ outputDirectory: output, offline: true, lockPath });
    assert.equal(result.source, "existing");
    assert.equal(result.path, target);

    writeFileSync(target, "drift\n");
    await assert.rejects(
      materializeDistributionSource({ outputDirectory: output, offline: true, lockPath }),
      /expected \d+ bytes, found/,
    );

    writeFileSync(lockPath, `${JSON.stringify({ ...lock, schemaVersion: 2 }, null, 2)}\n`);
    await assert.rejects(
      materializeDistributionSource({ outputDirectory: output, offline: true, lockPath }),
      /Unsupported distribution-source lock schema/,
    );

    writeFileSync(lockPath, `${JSON.stringify({
      ...lock,
      bunSource: {
        archive: { ...lock.bunSource.archive, url: "http://github.com/example/project/archive/0123456789abcdef.tar.gz" },
      },
    }, null, 2)}\n`);
    await assert.rejects(
      materializeDistributionSource({ outputDirectory: output, offline: true, lockPath }),
      /credential-free HTTPS/,
    );

    writeFileSync(lockPath, `${JSON.stringify({
      ...lock,
      bunSource: {
        archive: { ...lock.bunSource.archive, archiveRoot: "../outside" },
      },
    }, null, 2)}\n`);
    await assert.rejects(
      materializeDistributionSource({ outputDirectory: output, offline: true, lockPath }),
      /archive root is invalid/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
