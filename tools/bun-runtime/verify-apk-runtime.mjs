import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { inflateRawSync } from "node:zlib";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const runtimeLockPath = resolve(toolDirectory, "runtime.lock.json");
const runtimeLock = JSON.parse(readFileSync(runtimeLockPath, "utf8"));
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_EOCD_SEARCH = 65_557;
const ZIP_STORED = 0;
const ZIP_DEFLATED = 8;
const RUNTIME_NAME = "libbun_exec.so";
const SHA256 = /^[0-9a-f]{64}$/;

export function verifyApkRuntimeSet({ apkDirectory, variant, zipalignPath } = {}) {
  require(typeof apkDirectory === "string" && apkDirectory.length > 0, "An APK directory is required");
  require(variant === "debug" || variant === "release", "Variant must be debug or release");
  const directory = realpathSync(resolve(apkDirectory));
  require(lstatSync(directory).isDirectory(), `APK path is not a directory: ${directory}`);

  const expectedApks = new Map([
    [`app-arm64-v8a-${variant}.apk`, ["arm64-v8a"]],
    [`app-universal-${variant}.apk`, ["arm64-v8a", "x86_64"]],
    [`app-x86_64-${variant}.apk`, ["x86_64"]],
  ]);
  const actualApks = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".apk"))
    .map((entry) => entry.name)
    .sort();
  requireSameArray(actualApks, [...expectedApks.keys()].sort(), "APK set");

  const artifacts = new Map(runtimeLock.artifacts.map((artifact) => [artifact.abi, artifact]));
  const zipalign = resolveZipalign(zipalignPath);
  const results = [];
  for (const [name, expectedAbis] of expectedApks) {
    const apkPath = resolve(directory, name);
    const stat = lstatSync(apkPath);
    require(stat.isFile() && !stat.isSymbolicLink(), `${name}: APK must be a regular file`);
    verifyZipalign(zipalign, apkPath);
    const inspected = inspectApkRuntime(apkPath, expectedAbis, artifacts);
    results.push({ name, bytes: stat.size, runtimes: inspected });
  }
  return { variant, zipalign, apks: results };
}

export function inspectApkRuntime(apkPath, expectedAbis, artifacts) {
  const apk = readFileSync(apkPath);
  const entries = readCentralDirectory(apk, basename(apkPath));
  const runtimeEntries = [...entries.values()].filter(
    (entry) => entry.name.startsWith("lib/") && entry.name.endsWith(`/${RUNTIME_NAME}`),
  );
  const expectedNames = expectedAbis.map((abi) => `lib/${abi}/${RUNTIME_NAME}`).sort();
  requireSameArray(runtimeEntries.map((entry) => entry.name).sort(), expectedNames, `${basename(apkPath)} runtime entries`);

  return runtimeEntries.map((entry) => {
    const abi = entry.name.split("/")[1];
    const artifact = artifacts.get(abi);
    require(artifact !== undefined, `${basename(apkPath)}: no runtime lock record for ${abi}`);
    require(SHA256.test(artifact.binarySha256), `${abi}: runtime lock SHA-256 is invalid`);
    const payload = extractEntry(apk, entry, basename(apkPath));
    requireEqual(payload.length, artifact.binaryBytes, `${basename(apkPath)} ${abi}: runtime byte count`);
    const digest = createHash("sha256").update(payload).digest("hex");
    requireEqual(digest, artifact.binarySha256, `${basename(apkPath)} ${abi}: runtime SHA-256`);
    requireEqual(crc32(payload), entry.crc32, `${basename(apkPath)} ${abi}: runtime CRC32`);
    return {
      abi,
      entry: entry.name,
      compression: entry.method === ZIP_STORED ? "stored" : "deflated",
      bytes: payload.length,
      sha256: digest,
    };
  });
}

function readCentralDirectory(apk, label) {
  const minimumOffset = Math.max(0, apk.length - MAX_EOCD_SEARCH);
  let eocdOffset = -1;
  for (let offset = apk.length - 22; offset >= minimumOffset; offset -= 1) {
    if (apk.readUInt32LE(offset) !== EOCD_SIGNATURE) continue;
    const commentBytes = apk.readUInt16LE(offset + 20);
    if (offset + 22 + commentBytes === apk.length) {
      eocdOffset = offset;
      break;
    }
  }
  require(eocdOffset >= 0, `${label}: ZIP end-of-central-directory record is missing`);
  const diskNumber = apk.readUInt16LE(eocdOffset + 4);
  const centralDisk = apk.readUInt16LE(eocdOffset + 6);
  const diskEntries = apk.readUInt16LE(eocdOffset + 8);
  const totalEntries = apk.readUInt16LE(eocdOffset + 10);
  const centralBytes = apk.readUInt32LE(eocdOffset + 12);
  const centralOffset = apk.readUInt32LE(eocdOffset + 16);
  require(diskNumber === 0 && centralDisk === 0, `${label}: multi-disk ZIP files are not supported`);
  require(diskEntries === totalEntries, `${label}: central-directory entry counts disagree`);
  require(totalEntries !== 0xffff && centralBytes !== 0xffffffff && centralOffset !== 0xffffffff, `${label}: ZIP64 is not supported`);
  requireRange(apk, centralOffset, centralBytes, `${label}: central directory`);
  require(centralOffset + centralBytes === eocdOffset, `${label}: central-directory range is inconsistent`);

  const entries = new Map();
  let offset = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    requireRange(apk, offset, 46, `${label}: central entry ${index}`);
    requireEqual(apk.readUInt32LE(offset), CENTRAL_SIGNATURE, `${label}: central entry ${index} signature`);
    const flags = apk.readUInt16LE(offset + 8);
    const method = apk.readUInt16LE(offset + 10);
    const compressedBytes = apk.readUInt32LE(offset + 20);
    const uncompressedBytes = apk.readUInt32LE(offset + 24);
    const nameBytes = apk.readUInt16LE(offset + 28);
    const extraBytes = apk.readUInt16LE(offset + 30);
    const commentBytes = apk.readUInt16LE(offset + 32);
    const diskStart = apk.readUInt16LE(offset + 34);
    const localOffset = apk.readUInt32LE(offset + 42);
    const entryBytes = 46 + nameBytes + extraBytes + commentBytes;
    requireRange(apk, offset, entryBytes, `${label}: central entry ${index}`);
    require((flags & 1) === 0, `${label}: encrypted ZIP entries are not supported`);
    require(diskStart === 0, `${label}: central entry ${index} begins on another disk`);
    require(
      compressedBytes !== 0xffffffff && uncompressedBytes !== 0xffffffff && localOffset !== 0xffffffff,
      `${label}: ZIP64 entry ${index} is not supported`,
    );
    const encoding = (flags & 0x0800) === 0 ? "latin1" : "utf8";
    const name = apk.toString(encoding, offset + 46, offset + 46 + nameBytes);
    require(name.length > 0 && !name.includes("\0"), `${label}: central entry ${index} has an invalid name`);
    require(!entries.has(name), `${label}: duplicate ZIP entry ${name}`);
    entries.set(name, {
      name,
      flags,
      method,
      crc32: apk.readUInt32LE(offset + 16),
      compressedBytes,
      uncompressedBytes,
      localOffset,
      centralOffset,
    });
    offset += entryBytes;
  }
  requireEqual(offset, centralOffset + centralBytes, `${label}: central-directory size`);
  return entries;
}

function extractEntry(apk, entry, label) {
  requireRange(apk, entry.localOffset, 30, `${label}: ${entry.name} local header`);
  requireEqual(apk.readUInt32LE(entry.localOffset), LOCAL_SIGNATURE, `${label}: ${entry.name} local signature`);
  const localFlags = apk.readUInt16LE(entry.localOffset + 6);
  const localMethod = apk.readUInt16LE(entry.localOffset + 8);
  requireEqual(localFlags, entry.flags, `${label}: ${entry.name} flags`);
  requireEqual(localMethod, entry.method, `${label}: ${entry.name} compression method`);
  require(
    entry.method === ZIP_STORED || entry.method === ZIP_DEFLATED,
    `${label}: ${entry.name} uses unsupported compression method ${entry.method}`,
  );
  const nameBytes = apk.readUInt16LE(entry.localOffset + 26);
  const extraBytes = apk.readUInt16LE(entry.localOffset + 28);
  const dataOffset = entry.localOffset + 30 + nameBytes + extraBytes;
  requireRange(apk, entry.localOffset + 30, nameBytes + extraBytes, `${label}: ${entry.name} local metadata`);
  const encoding = (entry.flags & 0x0800) === 0 ? "latin1" : "utf8";
  const localName = apk.toString(encoding, entry.localOffset + 30, entry.localOffset + 30 + nameBytes);
  requireEqual(localName, entry.name, `${label}: ${entry.name} local name`);
  requireRange(apk, dataOffset, entry.compressedBytes, `${label}: ${entry.name} compressed payload`);
  require(dataOffset + entry.compressedBytes <= entry.centralOffset, `${label}: ${entry.name} overlaps the central directory`);
  const compressed = apk.subarray(dataOffset, dataOffset + entry.compressedBytes);
  const payload = entry.method === ZIP_STORED ? compressed : inflateRawSync(compressed);
  requireEqual(payload.length, entry.uncompressedBytes, `${label}: ${entry.name} uncompressed byte count`);
  return payload;
}

function resolveZipalign(explicitPath) {
  if (explicitPath !== undefined) {
    const path = realpathSync(resolve(explicitPath));
    require(lstatSync(path).isFile(), `zipalign is not a file: ${path}`);
    return path;
  }
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  require(sdkRoot, "zipalign was not provided and ANDROID_HOME/ANDROID_SDK_ROOT is unset");
  const buildTools = resolve(sdkRoot, "build-tools");
  require(existsSync(buildTools), `Android SDK build-tools directory is missing: ${buildTools}`);
  const executable = process.platform === "win32" ? "zipalign.exe" : "zipalign";
  const candidates = readdirSync(buildTools, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ version: entry.name, path: join(buildTools, entry.name, executable) }))
    .filter((entry) => existsSync(entry.path))
    .sort((left, right) => compareVersion(right.version, left.version));
  require(candidates.length > 0, `No ${executable} was found under ${buildTools}`);
  return realpathSync(candidates[0].path);
}

function verifyZipalign(zipalign, apkPath) {
  const result = spawnSync(zipalign, ["-c", "-P", "16", "4", apkPath], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`zipalign failed for ${basename(apkPath)} with exit ${result.status}${detail ? `: ${detail}` : ""}`);
  }
}

function compareVersion(left, right) {
  const leftParts = left.split(/[^0-9]+/).filter(Boolean).map(Number);
  const rightParts = right.split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return left.localeCompare(right);
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

function parseArguments(argv) {
  const values = Object.create(null);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined, "Arguments must be --name value pairs");
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
  }
  const allowed = new Set(["--apk-directory", "--variant", "--zipalign"]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  require(values["--apk-directory"], "Usage: node verify-apk-runtime.mjs --apk-directory <dir> --variant <debug|release> [--zipalign <path>]");
  require(values["--variant"], "Usage: node verify-apk-runtime.mjs --apk-directory <dir> --variant <debug|release> [--zipalign <path>]");
  return {
    apkDirectory: values["--apk-directory"],
    variant: values["--variant"],
    zipalignPath: values["--zipalign"],
  };
}

function requireRange(bytes, offset, length, label) {
  require(Number.isSafeInteger(offset) && offset >= 0, `${label}: invalid offset`);
  require(Number.isSafeInteger(length) && length >= 0, `${label}: invalid length`);
  require(offset <= bytes.length && length <= bytes.length - offset, `${label}: range exceeds the APK`);
}

function requireSameArray(actual, expected, label) {
  requireEqual(JSON.stringify(actual), JSON.stringify(expected), label);
}

function requireEqual(actual, expected, label) {
  require(Object.is(actual, expected), `${label}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyApkRuntimeSet(parseArguments(process.argv.slice(2)));
    for (const apk of result.apks) {
      console.log(
        `OK ${apk.name}: ${apk.runtimes.map((runtime) => `${runtime.abi} ${runtime.sha256}`).join(", ")}`,
      );
    }
    console.log(`OK zipalign -c -P 16 4 (${result.zipalign})`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
