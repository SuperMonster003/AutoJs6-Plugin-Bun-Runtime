import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deflateRawSync } from "node:zlib";

import { inspectApkRuntime, readBoundedApkEntry } from "./verify-apk-runtime.mjs";
import { root, supervisorArtifacts, verifySupervisorSource } from "./supervisor/supervisor-common.mjs";

const RUNTIME_NAME = "libbun_exec.so";

test("embedded build receipts enforce size, CRC and entry identity", () => {
  const name = "assets/binder-build.json", payload = Buffer.from('{"schemaVersion":1}');
  for (const method of [0, 8]) withApk([{ name, payload, method }], apk => {
    assert.deepEqual(readBoundedApkEntry(apk, name, payload.length), payload);
    assert.throws(() => readBoundedApkEntry(apk, name, payload.length - 1), /exceeds bound/);
    assert.throws(() => readBoundedApkEntry(apk, "assets/missing.json"), /Missing APK entry/);
    for (const bound of [0, -1, 0.5, Infinity]) assert.throws(() => readBoundedApkEntry(apk, name, bound), /bound/);
    const bytes = readFileSync(apk);
    const central = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    bytes.writeUInt32LE(0, 14);
    bytes.writeUInt32LE(0, central + 16);
    writeFileSync(apk, bytes);
    assert.throws(() => readBoundedApkEntry(apk, name), /CRC32/);
  });
});

test("a forged deflated entry length cannot bypass the actual output bound", () => {
  const name = "assets/binder-build.json", payload = Buffer.alloc(4096, 65);
  withApk([{ name, payload, method: 8 }], apk => {
    const bytes = readFileSync(apk);
    const central = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    bytes.writeUInt32LE(16, 22);
    bytes.writeUInt32LE(16, central + 24);
    writeFileSync(apk, bytes);
    assert.throws(() => readBoundedApkEntry(apk, name, 32), /larger than|buffer|length|bound/i);
  });
});

test("supervised APKs bind exact helper bytes, ABI coverage and ELF alignment", () => {
  verifySupervisorSource();
  const runtime = Buffer.from("Bun fixture");
  const helper = readFileSync(join(root, supervisorArtifacts.get("arm64-v8a").binaryPath));
  withApk([
    { name: "lib/arm64-v8a/libbun_exec.so", payload: runtime, method: 0 },
    { name: "lib/arm64-v8a/libbun_supervisor.so", payload: helper, method: 8 },
  ], (apk) => {
    const inspected = inspectApkRuntime(apk, ["arm64-v8a"], artifactMap({ "arm64-v8a": runtime }), supervisorArtifacts);
    assert.equal(inspected[0].supervisor.sha256, supervisorArtifacts.get("arm64-v8a").binarySha256);
    assert.throws(() => inspectApkRuntime(apk, ["arm64-v8a"], artifactMap({ "arm64-v8a": runtime })), /native entries/);
  });
});

test("missing, extra-ABI, corrupt and unrecognized native helpers are rejected", () => {
  const runtime = Buffer.from("Bun fixture");
  const helper = readFileSync(join(root, supervisorArtifacts.get("arm64-v8a").binaryPath));
  const base = { name: "lib/arm64-v8a/libbun_exec.so", payload: runtime, method: 0 };
  const valid = { name: "lib/arm64-v8a/libbun_supervisor.so", payload: helper, method: 0 };
  for (const helpers of [[], [valid, { ...valid, name: "lib/x86_64/libbun_supervisor.so" }],
    [{ ...valid, payload: Buffer.alloc(helper.length) }], [valid, { ...valid, name: "lib/arm64-v8a/libextra.so" }]]) {
    withApk([base, ...helpers], (apk) => assert.throws(() => inspectApkRuntime(apk, ["arm64-v8a"],
      artifactMap({ "arm64-v8a": runtime }), supervisorArtifacts), /native entries|supervisor SHA-256/));
  }
});

test("stored and deflated runtime entries match the locked ABI payloads", () => {
  const arm64 = Buffer.from("locked arm64 runtime payload");
  const x86 = Buffer.from("locked x86_64 runtime payload");
  withApk(
    [
      { name: `lib/arm64-v8a/${RUNTIME_NAME}`, payload: arm64, method: 0 },
      { name: `lib/x86_64/${RUNTIME_NAME}`, payload: x86, method: 8 },
    ],
    (apkPath) => {
      const result = inspectApkRuntime(
        apkPath,
        ["arm64-v8a", "x86_64"],
        artifactMap({ "arm64-v8a": arm64, x86_64: x86 }),
      );
      assert.deepEqual(result.map((runtime) => runtime.abi).sort(), ["arm64-v8a", "x86_64"]);
      assert.deepEqual(result.map((runtime) => runtime.compression).sort(), ["deflated", "stored"]);
    },
  );
});

test("an unexpected nested native runtime entry is rejected", () => {
  const payload = Buffer.from("runtime");
  withApk(
    [
      { name: `lib/arm64-v8a/${RUNTIME_NAME}`, payload, method: 0 },
      { name: `lib/nested/arm64-v8a/${RUNTIME_NAME}`, payload, method: 0 },
    ],
    (apkPath) => assert.throws(
      () => inspectApkRuntime(apkPath, ["arm64-v8a"], artifactMap({ "arm64-v8a": payload })),
      /runtime entries/,
    ),
  );
});

test("a locked payload digest mismatch is rejected", () => {
  const payload = Buffer.from("runtime");
  withApk(
    [{ name: `lib/arm64-v8a/${RUNTIME_NAME}`, payload, method: 0 }],
    (apkPath) => assert.throws(
      () => inspectApkRuntime(
        apkPath,
        ["arm64-v8a"],
        new Map([["arm64-v8a", { binaryBytes: payload.length, binarySha256: "0".repeat(64) }]]),
      ),
      /runtime SHA-256/,
    ),
  );
});

test("duplicate ZIP entry names are rejected", () => {
  const payload = Buffer.from("runtime");
  withApk(
    [
      { name: `lib/arm64-v8a/${RUNTIME_NAME}`, payload, method: 0 },
      { name: `lib/arm64-v8a/${RUNTIME_NAME}`, payload, method: 0 },
    ],
    (apkPath) => assert.throws(
      () => inspectApkRuntime(apkPath, ["arm64-v8a"], artifactMap({ "arm64-v8a": payload })),
      /duplicate ZIP entry/,
    ),
  );
});

function artifactMap(payloads) {
  return new Map(Object.entries(payloads).map(([abi, payload]) => [
    abi,
    {
      binaryBytes: payload.length,
      binarySha256: createHash("sha256").update(payload).digest("hex"),
    },
  ]));
}

function withApk(entries, callback) {
  const directory = mkdtempSync(join(tmpdir(), "autojs6-apk-verifier-test-"));
  const apkPath = join(directory, "fixture.apk");
  try {
    writeFileSync(apkPath, createZip(entries));
    callback(apkPath);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = entry.method === 8 ? deflateRawSync(entry.payload) : entry.payload;
    const checksum = crc32(entry.payload);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(entry.method, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.payload.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(entry.method, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.payload.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

let crcTable;
function crc32(bytes) {
  crcTable ??= Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) === 0 ? 0 : 0xedb88320);
    return crc >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
