import { once } from "node:events";
import { createHash } from "node:crypto";
import {
  closeSync,
  createReadStream,
  createWriteStream,
  lstatSync,
  openSync,
  readSync,
  statSync,
  writeSync,
} from "node:fs";
import { basename, join } from "node:path";
import { finished } from "node:stream/promises";
import { createGunzip } from "node:zlib";

export const RELEASE_MANIFEST_SCHEMA_VERSION = 2;
export const DEFAULT_MAX_PART_BYTES = 1_900_000_000;
export const GITHUB_MAX_ASSET_BYTES = 2_147_483_648;
export const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const TAR_BLOCK_BYTES = 512;
const ZERO_TAR_BLOCK = Buffer.alloc(TAR_BLOCK_BYTES);

export function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function requireSafeAssetName(value, label = "asset name") {
  requireCondition(typeof value === "string" && value.length > 0, `${label} is missing`);
  requireCondition(
    basename(value) === value && !/[\\/\0\r\n]/.test(value) && value !== "." && value !== "..",
    `${label} is unsafe: ${JSON.stringify(value)}`,
  );
  return value;
}

export async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

let crc32Table;
export async function crc32File(path) {
  crc32Table ??= Uint32Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) === 0 ? 0 : 0xedb88320);
    return crc >>> 0;
  });
  let crc = 0xffffffff;
  for await (const chunk of createReadStream(path)) {
    for (const byte of chunk) crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xff];
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export async function inspectRegularFile(path, label = basename(path)) {
  const stat = lstatSync(path);
  requireCondition(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular non-symlink file`);
  return { bytes: stat.size, sha256: await sha256File(path) };
}

export async function verifyRegularFile(path, expected, label = basename(path)) {
  const actual = await inspectRegularFile(path, label);
  requireCondition(actual.bytes === expected.bytes, `${label}: expected ${expected.bytes} bytes, found ${actual.bytes}`);
  requireCondition(actual.sha256 === expected.sha256, `${label}: expected SHA-256 ${expected.sha256}, found ${actual.sha256}`);
  return actual;
}

export async function writeDeterministicTar(target, entries) {
  requireCondition(Array.isArray(entries) && entries.length > 0, "tar entry list must not be empty");
  const sorted = [...entries].sort((left, right) => compareAscii(left.path, right.path));
  const seen = new Set();
  const output = createWriteStream(target, { flags: "wx", mode: 0o644 });
  const completion = finished(output);
  try {
    for (const entry of sorted) {
      validateTarPath(entry.path);
      requireCondition(!seen.has(entry.path), `duplicate tar entry: ${entry.path}`);
      seen.add(entry.path);
      const source = normalizeTarEntry(entry);
      await writeChunk(output, makeTarHeader(entry.path, source.bytes));
      if (source.buffer !== undefined) {
        await writeChunk(output, source.buffer);
      } else {
        for await (const chunk of createReadStream(source.file)) await writeChunk(output, chunk);
      }
      const padding = (TAR_BLOCK_BYTES - (source.bytes % TAR_BLOCK_BYTES)) % TAR_BLOCK_BYTES;
      if (padding > 0) await writeChunk(output, ZERO_TAR_BLOCK.subarray(0, padding));
    }
    await writeChunk(output, ZERO_TAR_BLOCK);
    await writeChunk(output, ZERO_TAR_BLOCK);
    output.end();
    await completion;
  } catch (error) {
    output.destroy();
    throw error;
  }
  return inspectRegularFile(target);
}

export async function inspectDeterministicTar(path) {
  const descriptor = openSync(path, "r");
  const totalBytes = statSync(path).size;
  const entries = [];
  let offset = 0;
  let zeroBlocks = 0;
  try {
    while (offset + TAR_BLOCK_BYTES <= totalBytes) {
      const header = Buffer.alloc(TAR_BLOCK_BYTES);
      readExactly(descriptor, header, 0, TAR_BLOCK_BYTES, offset, `${path}: tar header`);
      offset += TAR_BLOCK_BYTES;
      if (header.equals(ZERO_TAR_BLOCK)) {
        zeroBlocks += 1;
        if (zeroBlocks === 2) break;
        continue;
      }
      requireCondition(zeroBlocks === 0, `${path}: non-zero tar header follows an end marker`);
      verifyTarHeaderChecksum(header, path);
      const name = readTarString(header, 0, 100);
      validateTarPath(name);
      requireCondition(header[156] === 0 || header[156] === 0x30, `${path}: ${name} is not a regular tar file`);
      requireCondition(readTarString(header, 257, 6) === "ustar", `${path}: ${name} is not a ustar entry`);
      const bytes = readTarOctal(header, 124, 12, `${path}: ${name} size`);
      requireCondition(offset + bytes <= totalBytes, `${path}: ${name} payload exceeds the archive`);
      const hash = createHash("sha256");
      const buffer = Buffer.alloc(Math.min(1024 * 1024, Math.max(1, bytes)));
      let consumed = 0;
      while (consumed < bytes) {
        const count = Math.min(buffer.length, bytes - consumed);
        readExactly(descriptor, buffer, 0, count, offset + consumed, `${path}: ${name}`);
        hash.update(buffer.subarray(0, count));
        consumed += count;
      }
      entries.push({ path: name, bytes, sha256: hash.digest("hex") });
      offset += bytes;
      offset += (TAR_BLOCK_BYTES - (bytes % TAR_BLOCK_BYTES)) % TAR_BLOCK_BYTES;
    }
    requireCondition(zeroBlocks === 2, `${path}: tar end markers are missing`);
    requireCondition(offset === totalBytes, `${path}: trailing bytes follow the deterministic tar end markers`);
    return entries;
  } finally {
    closeSync(descriptor);
  }
}

export async function splitFileIntoAssets({ source, logicalName, outputDirectory, maxPartBytes = DEFAULT_MAX_PART_BYTES }) {
  requireSafeAssetName(logicalName, "logical asset name");
  requireCondition(Number.isSafeInteger(maxPartBytes) && maxPartBytes > 0, "maxPartBytes must be a positive safe integer");
  requireCondition(maxPartBytes < GITHUB_MAX_ASSET_BYTES, `maxPartBytes must be below GitHub's ${GITHUB_MAX_ASSET_BYTES}-byte limit`);
  const sourceStat = lstatSync(source);
  requireCondition(sourceStat.isFile() && !sourceStat.isSymbolicLink(), `${logicalName}: logical source must be a regular non-symlink file`);
  requireCondition(sourceStat.size > 0, `${logicalName}: logical source must not be empty`);
  const partCount = Math.ceil(sourceStat.size / maxPartBytes);
  requireCondition(partCount <= 999, `${logicalName}: too many release-asset parts (${partCount})`);
  const width = Math.max(3, String(partCount).length);
  const sourceDescriptor = openSync(source, "r");
  const logicalHash = createHash("sha256");
  const parts = [];
  let sourceOffset = 0;
  try {
    for (let index = 0; index < partCount; index += 1) {
      const filename = partCount === 1
        ? logicalName
        : `${logicalName}.part${String(index + 1).padStart(width, "0")}-of-${String(partCount).padStart(width, "0")}`;
      requireSafeAssetName(filename);
      const target = join(outputDirectory, filename);
      const targetDescriptor = openSync(target, "wx", 0o644);
      const partHash = createHash("sha256");
      let partBytes = 0;
      try {
        const expectedPartBytes = Math.min(maxPartBytes, sourceStat.size - sourceOffset);
        const buffer = Buffer.alloc(Math.min(1024 * 1024, expectedPartBytes));
        while (partBytes < expectedPartBytes) {
          const count = Math.min(buffer.length, expectedPartBytes - partBytes);
          const read = readSync(sourceDescriptor, buffer, 0, count, sourceOffset);
          requireCondition(read === count, `${logicalName}: unexpected end of logical source`);
          const chunk = buffer.subarray(0, read);
          writeAllSync(targetDescriptor, chunk, `${filename}: release part`);
          partHash.update(chunk);
          logicalHash.update(chunk);
          partBytes += read;
          sourceOffset += read;
        }
      } finally {
        closeSync(targetDescriptor);
      }
      parts.push({
        index: index + 1,
        count: partCount,
        filename,
        bytes: partBytes,
        sha256: partHash.digest("hex"),
      });
    }
  } finally {
    closeSync(sourceDescriptor);
  }
  requireCondition(sourceOffset === sourceStat.size, `${logicalName}: logical source split is incomplete`);
  return {
    logicalFilename: logicalName,
    logicalBytes: sourceStat.size,
    logicalSha256: logicalHash.digest("hex"),
    parts,
  };
}

export async function verifyLogicalAssetParts(directory, component) {
  requireCondition(typeof component.logicalFilename === "string", "component logicalFilename is missing");
  requireCondition(Number.isSafeInteger(component.logicalBytes) && component.logicalBytes > 0, `${component.logicalFilename}: invalid logical byte count`);
  requireCondition(SHA256_PATTERN.test(component.logicalSha256), `${component.logicalFilename}: invalid logical SHA-256`);
  requireCondition(Array.isArray(component.parts) && component.parts.length > 0, `${component.logicalFilename}: release parts are missing`);
  const hash = createHash("sha256");
  let bytes = 0;
  for (let index = 0; index < component.parts.length; index += 1) {
    const part = component.parts[index];
    requireCondition(part.index === index + 1, `${component.logicalFilename}: part index is out of order`);
    requireCondition(part.count === component.parts.length, `${component.logicalFilename}: part count disagrees`);
    requireSafeAssetName(part.filename);
    const path = `${directory}/${part.filename}`;
    await verifyRegularFile(path, part, part.filename);
    for await (const chunk of createReadStream(path)) {
      hash.update(chunk);
      bytes += chunk.length;
    }
  }
  requireCondition(bytes === component.logicalBytes, `${component.logicalFilename}: expected ${component.logicalBytes} logical bytes, found ${bytes}`);
  const digest = hash.digest("hex");
  requireCondition(digest === component.logicalSha256, `${component.logicalFilename}: expected logical SHA-256 ${component.logicalSha256}, found ${digest}`);
  return { bytes, sha256: digest };
}

export async function readGitArchiveCommit(path) {
  const source = createReadStream(path);
  const gunzip = createGunzip();
  source.pipe(gunzip);
  let prefix = Buffer.alloc(0);
  try {
    for await (const chunk of gunzip) {
      prefix = Buffer.concat([prefix, chunk]);
      if (prefix.length < 1024) continue;
      const sizeRaw = prefix.toString("ascii", 124, 136).replace(/\0.*$/, "").trim();
      requireCondition(/^[0-7]+$/.test(sizeRaw), "Git archive pax header has an invalid size");
      const size = Number.parseInt(sizeRaw, 8);
      if (prefix.length < 512 + size) continue;
      requireCondition(prefix.toString("utf8", 0, 100).replace(/\0.*$/, "") === "pax_global_header", "Git archive has no global pax header");
      requireCondition(prefix[156] === 0x67, "Git archive first entry is not a global pax header");
      const pax = prefix.toString("utf8", 512, 512 + size);
      const match = /(?:^|\n)\d+ comment=([0-9a-f]{40})\n/.exec(pax);
      requireCondition(match !== null, "Git archive does not embed a source commit");
      source.destroy();
      gunzip.destroy();
      return match[1];
    }
    throw new Error("Git archive ended before its source commit was found");
  } finally {
    source.destroy();
    gunzip.destroy();
  }
}

export function formatSha256Sums(records) {
  const sorted = [...records].sort((left, right) => compareAscii(left.filename, right.filename));
  const names = new Set();
  for (const record of sorted) {
    requireSafeAssetName(record.filename);
    requireCondition(SHA256_PATTERN.test(record.sha256), `${record.filename}: invalid SHA-256`);
    requireCondition(!names.has(record.filename), `duplicate SHA-256 manifest entry: ${record.filename}`);
    names.add(record.filename);
  }
  return `${sorted.map((record) => `${record.sha256}  ${record.filename}`).join("\n")}\n`;
}

export function parseSha256Sums(contents) {
  requireCondition(typeof contents === "string" && contents.endsWith("\n"), "SHA256SUMS must end with LF");
  const records = [];
  const names = new Set();
  for (const line of contents.slice(0, -1).split("\n")) {
    requireCondition(!line.includes("\r"), "SHA256SUMS must use LF line endings");
    const match = /^([0-9a-f]{64})  ([^\\/\0\r\n]+)$/.exec(line);
    requireCondition(match !== null, `invalid SHA256SUMS line: ${JSON.stringify(line)}`);
    const [, sha256, filename] = match;
    requireSafeAssetName(filename);
    requireCondition(!names.has(filename), `duplicate SHA256SUMS filename: ${filename}`);
    names.add(filename);
    records.push({ filename, sha256 });
  }
  const expected = [...records].sort((left, right) => compareAscii(left.filename, right.filename));
  requireCondition(JSON.stringify(records) === JSON.stringify(expected), "SHA256SUMS entries must be sorted by filename");
  return records;
}

function normalizeTarEntry(entry) {
  requireCondition(entry && typeof entry === "object", "tar entry is invalid");
  const hasBuffer = Buffer.isBuffer(entry.buffer);
  const hasFile = typeof entry.file === "string" && entry.file.length > 0;
  requireCondition(hasBuffer !== hasFile, `${entry.path}: tar entry must provide exactly one of buffer or file`);
  if (hasBuffer) return { buffer: entry.buffer, bytes: entry.buffer.length };
  const stat = lstatSync(entry.file);
  requireCondition(stat.isFile() && !stat.isSymbolicLink(), `${entry.path}: tar source must be a regular non-symlink file`);
  return { file: entry.file, bytes: stat.size };
}

function makeTarHeader(name, bytes) {
  const header = Buffer.alloc(TAR_BLOCK_BYTES);
  writeTarString(header, name, 0, 100);
  writeTarOctal(header, 0o644, 100, 8, "mode");
  writeTarOctal(header, 0, 108, 8, "uid");
  writeTarOctal(header, 0, 116, 8, "gid");
  writeTarOctal(header, bytes, 124, 12, "size");
  writeTarOctal(header, 0, 136, 12, "mtime");
  header.fill(0x20, 148, 156);
  header[156] = 0x30;
  writeTarString(header, "ustar", 257, 6);
  writeTarString(header, "00", 263, 2);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  const encoded = checksum.toString(8).padStart(6, "0");
  header.write(encoded, 148, 6, "ascii");
  header[154] = 0;
  header[155] = 0x20;
  return header;
}

function validateTarPath(value) {
  requireCondition(typeof value === "string" && value.length > 0, "tar path is missing");
  const encoded = Buffer.from(value, "utf8");
  requireCondition(encoded.length <= 100, `tar path exceeds the ustar name field: ${value}`);
  requireCondition(!value.startsWith("/") && !value.includes("\\") && !value.includes("\0"), `unsafe tar path: ${value}`);
  requireCondition(!value.split("/").some((segment) => segment === "" || segment === "." || segment === ".."), `unsafe tar path: ${value}`);
}

function writeTarString(header, value, offset, length) {
  const encoded = Buffer.from(value, "utf8");
  requireCondition(encoded.length <= length, `tar string is too long: ${value}`);
  encoded.copy(header, offset);
}

function writeTarOctal(header, value, offset, length, label) {
  requireCondition(Number.isSafeInteger(value) && value >= 0, `invalid tar ${label}`);
  const encoded = value.toString(8);
  requireCondition(encoded.length <= length - 1, `tar ${label} exceeds the field width`);
  header.write(encoded.padStart(length - 1, "0"), offset, length - 1, "ascii");
  header[offset + length - 1] = 0;
}

function readTarString(header, offset, length) {
  const end = header.indexOf(0, offset);
  const limit = end < 0 || end > offset + length ? offset + length : end;
  return header.toString("utf8", offset, limit);
}

function readTarOctal(header, offset, length, label) {
  const raw = header.toString("ascii", offset, offset + length).replace(/\0.*$/, "").trim();
  requireCondition(/^[0-7]+$/.test(raw), `${label} is not octal`);
  const value = Number.parseInt(raw, 8);
  requireCondition(Number.isSafeInteger(value), `${label} exceeds the safe integer range`);
  return value;
}

function verifyTarHeaderChecksum(header, path) {
  const expected = readTarOctal(header, 148, 8, `${path}: tar checksum`);
  const copy = Buffer.from(header);
  copy.fill(0x20, 148, 156);
  const actual = copy.reduce((sum, byte) => sum + byte, 0);
  requireCondition(actual === expected, `${path}: tar header checksum mismatch`);
}

function readExactly(descriptor, buffer, bufferOffset, length, position, label) {
  let total = 0;
  while (total < length) {
    const count = readSync(descriptor, buffer, bufferOffset + total, length - total, position + total);
    requireCondition(count > 0, `${label}: unexpected end of file`);
    total += count;
  }
}

function writeAllSync(descriptor, buffer, label) {
  let offset = 0;
  while (offset < buffer.length) {
    const count = writeSync(descriptor, buffer, offset, buffer.length - offset);
    requireCondition(count > 0, `${label}: write made no progress`);
    offset += count;
  }
}

async function writeChunk(stream, chunk) {
  if (!stream.write(chunk)) await once(stream, "drain");
}

export function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
