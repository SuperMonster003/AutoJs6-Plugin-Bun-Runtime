import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ELF_HEADER_BYTES = 64;
const ELF_PROGRAM_HEADER_BYTES = 56;
const ELF_SECTION_HEADER_BYTES = 64;
const ELF_DYNAMIC_ENTRY_BYTES = 16;
const PT_LOAD = 1;
const PT_DYNAMIC = 2;
const PT_INTERP = 3;
const SHT_NOTE = 7;
const DT_NULL = 0n;
const DT_NEEDED = 1n;
const DT_STRTAB = 5n;
const DT_STRSZ = 10n;
const NT_ANDROID_TYPE_IDENT = 1;
const DISTRIBUTED_ABIS = ["arm64-v8a", "x86_64"];

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(toolDirectory, "../..");
const lock = JSON.parse(readFileSync(resolve(toolDirectory, "runtime.lock.json"), "utf8"));

verifyLockSchema(lock);

for (const artifact of lock.artifacts) {
  const file = resolveWithinRoot(artifact.binaryPath, `${artifact.abi}: binaryPath`);
  const stat = statSync(file);
  if (stat.size !== artifact.binaryBytes) {
    throw new Error(`${artifact.abi}: expected ${artifact.binaryBytes} bytes, found ${stat.size}`);
  }
  const digest = await sha256(file);
  if (digest !== artifact.binarySha256) {
    throw new Error(`${artifact.abi}: SHA-256 mismatch: ${digest}`);
  }
  const elf = verifyElf(file, artifact);
  console.log(
    `${artifact.abi}: ${digest} (${stat.size} bytes, Android API ${elf.androidIdentApi}, ` +
      `${elf.interpreter}, NEEDED ${elf.neededLibraries.join(", ")}, ELF alignment OK)`,
  );
}

verifyMinimumApiAlignment(lock.androidBuild);

function sha256(file) {
  return new Promise((resolveDigest, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("error", reject)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolveDigest(hash.digest("hex")));
  });
}

function verifyElf(file, artifact) {
  const data = readFileSync(file);
  requireRange(data, 0, ELF_HEADER_BYTES, `${artifact.abi}: ELF header`);
  if (data[0] !== 0x7f || data.toString("ascii", 1, 4) !== "ELF") {
    throw new Error(`${artifact.abi}: not an ELF file`);
  }
  if (data[4] !== 2 || data[5] !== 1) {
    throw new Error(`${artifact.abi}: expected little-endian ELF64`);
  }
  if (data.readUInt16LE(52) !== ELF_HEADER_BYTES) {
    throw new Error(`${artifact.abi}: expected a ${ELF_HEADER_BYTES}-byte ELF header`);
  }
  if (data.readUInt16LE(16) !== 3) {
    throw new Error(`${artifact.abi}: expected ET_DYN Android PIE executable`);
  }
  const elfMachine = data.readUInt16LE(18);
  if (elfMachine !== artifact.elfMachine) {
    throw new Error(`${artifact.abi}: expected ELF machine ${artifact.elfMachine}, found ${elfMachine}`);
  }

  const programHeaderOffset = readUnsigned64(data, 32, `${artifact.abi}: program-header offset`);
  const programHeaderSize = data.readUInt16LE(54);
  const programHeaderCount = data.readUInt16LE(56);
  if (programHeaderSize < ELF_PROGRAM_HEADER_BYTES || programHeaderCount === 0 || programHeaderCount === 0xffff) {
    throw new Error(`${artifact.abi}: unsupported ELF program-header table`);
  }
  requireRange(
    data,
    programHeaderOffset,
    programHeaderSize * programHeaderCount,
    `${artifact.abi}: program-header table`,
  );

  const programHeaders = [];
  let loadCount = 0;
  let dynamicHeader = null;
  let interpreter = null;
  for (let index = 0; index < programHeaderCount; index += 1) {
    const offset = programHeaderOffset + index * programHeaderSize;
    const header = {
      type: data.readUInt32LE(offset),
      fileOffset: readUnsigned64(data, offset + 8, `${artifact.abi}: program header ${index} file offset`),
      virtualAddress: readUnsigned64(data, offset + 16, `${artifact.abi}: program header ${index} virtual address`),
      fileBytes: readUnsigned64(data, offset + 32, `${artifact.abi}: program header ${index} file size`),
      alignment: readUnsigned64(data, offset + 48, `${artifact.abi}: program header ${index} alignment`),
    };
    programHeaders.push(header);
    requireRange(data, header.fileOffset, header.fileBytes, `${artifact.abi}: program header ${index} contents`);

    if (header.type === PT_LOAD) {
      loadCount += 1;
      if (
        header.alignment < artifact.minimumLoadAlignment ||
        header.alignment % artifact.minimumLoadAlignment !== 0
      ) {
        throw new Error(
          `${artifact.abi}: PT_LOAD alignment ${header.alignment} is below ${artifact.minimumLoadAlignment}`,
        );
      }
    } else if (header.type === PT_DYNAMIC) {
      if (dynamicHeader !== null) throw new Error(`${artifact.abi}: ELF contains multiple PT_DYNAMIC segments`);
      dynamicHeader = header;
    } else if (header.type === PT_INTERP) {
      if (interpreter !== null) throw new Error(`${artifact.abi}: ELF contains multiple PT_INTERP segments`);
      interpreter = readCString(
        data,
        header.fileOffset,
        header.fileOffset + header.fileBytes,
        `${artifact.abi}: PT_INTERP`,
      );
    }
  }
  if (loadCount === 0) throw new Error(`${artifact.abi}: ELF contains no PT_LOAD segment`);
  if (interpreter === null) throw new Error(`${artifact.abi}: ELF contains no PT_INTERP segment`);
  if (interpreter !== artifact.interpreter) {
    throw new Error(`${artifact.abi}: expected interpreter ${artifact.interpreter}, found ${interpreter}`);
  }
  if (dynamicHeader === null) throw new Error(`${artifact.abi}: ELF contains no PT_DYNAMIC segment`);

  const neededLibraries = readNeededLibraries(data, programHeaders, dynamicHeader, artifact.abi);
  if (!sameArray(neededLibraries, artifact.neededLibraries)) {
    throw new Error(
      `${artifact.abi}: expected DT_NEEDED ${JSON.stringify(artifact.neededLibraries)}, ` +
        `found ${JSON.stringify(neededLibraries)}`,
    );
  }

  const androidIdentApi = readAndroidIdentApi(data, artifact.abi);
  if (androidIdentApi !== artifact.androidIdentApi) {
    throw new Error(
      `${artifact.abi}: expected Android ident API ${artifact.androidIdentApi}, found ${androidIdentApi}`,
    );
  }

  return { androidIdentApi, interpreter, neededLibraries };
}

function readNeededLibraries(data, programHeaders, dynamicHeader, abi) {
  if (dynamicHeader.fileBytes % ELF_DYNAMIC_ENTRY_BYTES !== 0) {
    throw new Error(`${abi}: PT_DYNAMIC size is not a multiple of ${ELF_DYNAMIC_ENTRY_BYTES}`);
  }
  const dynamicEnd = dynamicHeader.fileOffset + dynamicHeader.fileBytes;
  const neededOffsets = [];
  let stringTableAddress = null;
  let stringTableBytes = null;
  let terminated = false;

  for (let offset = dynamicHeader.fileOffset; offset < dynamicEnd; offset += ELF_DYNAMIC_ENTRY_BYTES) {
    const tag = data.readBigInt64LE(offset);
    const value = data.readBigUInt64LE(offset + 8);
    if (tag === DT_NULL) {
      terminated = true;
      break;
    }
    if (tag === DT_NEEDED) {
      neededOffsets.push(toSafeNumber(value, `${abi}: DT_NEEDED string offset`));
    } else if (tag === DT_STRTAB) {
      stringTableAddress = toSafeNumber(value, `${abi}: DT_STRTAB virtual address`);
    } else if (tag === DT_STRSZ) {
      stringTableBytes = toSafeNumber(value, `${abi}: DT_STRSZ`);
    }
  }
  if (!terminated) throw new Error(`${abi}: PT_DYNAMIC contains no DT_NULL terminator`);
  if (stringTableAddress === null || stringTableBytes === null) {
    throw new Error(`${abi}: PT_DYNAMIC is missing DT_STRTAB or DT_STRSZ`);
  }

  const stringTableOffset = virtualAddressToFileOffset(
    programHeaders,
    stringTableAddress,
    stringTableBytes,
    abi,
  );
  requireRange(data, stringTableOffset, stringTableBytes, `${abi}: dynamic string table`);
  return neededOffsets.map((neededOffset) => {
    if (neededOffset >= stringTableBytes) {
      throw new Error(`${abi}: DT_NEEDED string offset ${neededOffset} exceeds DT_STRSZ ${stringTableBytes}`);
    }
    return readCString(
      data,
      stringTableOffset + neededOffset,
      stringTableOffset + stringTableBytes,
      `${abi}: DT_NEEDED`,
    );
  });
}

function virtualAddressToFileOffset(programHeaders, address, bytes, abi) {
  for (const header of programHeaders) {
    if (header.type !== PT_LOAD) continue;
    const relativeAddress = address - header.virtualAddress;
    if (relativeAddress >= 0 && relativeAddress + bytes <= header.fileBytes) {
      return header.fileOffset + relativeAddress;
    }
  }
  throw new Error(`${abi}: virtual address 0x${address.toString(16)} is not backed by a PT_LOAD segment`);
}

function readAndroidIdentApi(data, abi) {
  const sectionHeaderOffset = readUnsigned64(data, 40, `${abi}: section-header offset`);
  const sectionHeaderSize = data.readUInt16LE(58);
  const sectionHeaderCount = data.readUInt16LE(60);
  const sectionNameIndex = data.readUInt16LE(62);
  if (
    sectionHeaderSize < ELF_SECTION_HEADER_BYTES ||
    sectionHeaderCount === 0 ||
    sectionNameIndex === 0xffff ||
    sectionNameIndex >= sectionHeaderCount
  ) {
    throw new Error(`${abi}: unsupported ELF section-header table`);
  }
  requireRange(
    data,
    sectionHeaderOffset,
    sectionHeaderSize * sectionHeaderCount,
    `${abi}: section-header table`,
  );

  const sectionHeaders = [];
  for (let index = 0; index < sectionHeaderCount; index += 1) {
    const offset = sectionHeaderOffset + index * sectionHeaderSize;
    sectionHeaders.push({
      nameOffset: data.readUInt32LE(offset),
      type: data.readUInt32LE(offset + 4),
      fileOffset: readUnsigned64(data, offset + 24, `${abi}: section ${index} file offset`),
      fileBytes: readUnsigned64(data, offset + 32, `${abi}: section ${index} file size`),
    });
  }

  const sectionNames = sectionHeaders[sectionNameIndex];
  requireRange(data, sectionNames.fileOffset, sectionNames.fileBytes, `${abi}: section-name string table`);
  const androidIdent = sectionHeaders.find((section) => {
    const name = readCString(
      data,
      sectionNames.fileOffset + section.nameOffset,
      sectionNames.fileOffset + sectionNames.fileBytes,
      `${abi}: section name`,
    );
    return name === ".note.android.ident";
  });
  if (androidIdent === undefined) throw new Error(`${abi}: ELF contains no .note.android.ident section`);
  if (androidIdent.type !== SHT_NOTE) throw new Error(`${abi}: .note.android.ident is not an SHT_NOTE section`);
  requireRange(data, androidIdent.fileOffset, androidIdent.fileBytes, `${abi}: .note.android.ident`);

  const end = androidIdent.fileOffset + androidIdent.fileBytes;
  const androidApis = [];
  for (let offset = androidIdent.fileOffset; offset < end; ) {
    requireRange(data, offset, 12, `${abi}: Android note header`);
    const nameBytes = data.readUInt32LE(offset);
    const descriptionBytes = data.readUInt32LE(offset + 4);
    const type = data.readUInt32LE(offset + 8);
    const nameOffset = offset + 12;
    const descriptionOffset = align4(nameOffset + nameBytes);
    const nextOffset = align4(descriptionOffset + descriptionBytes);
    if (nextOffset > end) throw new Error(`${abi}: malformed .note.android.ident entry`);
    const owner = data.toString("ascii", nameOffset, nameOffset + nameBytes).replace(/\0+$/, "");
    if (owner === "Android" && type === NT_ANDROID_TYPE_IDENT) {
      if (descriptionBytes < 4) throw new Error(`${abi}: Android ident description is too short`);
      androidApis.push(data.readUInt32LE(descriptionOffset));
    }
    offset = nextOffset;
  }
  if (androidApis.length !== 1) {
    throw new Error(`${abi}: expected one Android ident note, found ${androidApis.length}`);
  }
  return androidApis[0];
}

function verifyLockSchema(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("runtime lock root must be an object");
  }
  if (value.schemaVersion !== 2) {
    throw new Error(`runtime lock schemaVersion must be 2, found ${JSON.stringify(value.schemaVersion)}`);
  }
  requireObject(value.upstream, "upstream");
  for (const key of ["repository", "tag", "commit", "license", "releasePage"]) {
    requireNonEmptyString(value.upstream[key], `upstream.${key}`);
  }
  if (!/^[0-9a-f]{40}$/.test(value.upstream.commit)) {
    throw new Error("upstream.commit must be a lowercase 40-character Git commit");
  }
  const androidBuild = value.androidBuild;
  requireObject(androidBuild, "androidBuild");
  requirePositiveInteger(androidBuild.minimumSupportedApi, "androidBuild.minimumSupportedApi");
  for (const key of ["minimumSupportedAndroidVersion", "delivery", "execution", "note"]) {
    requireNonEmptyString(androidBuild[key], `androidBuild.${key}`);
  }
  if (!Array.isArray(value.artifacts) || value.artifacts.length === 0) {
    throw new Error("runtime lock artifacts must be a non-empty array");
  }
  const abis = new Set();
  const binaryPaths = new Set();
  for (const [index, artifact] of value.artifacts.entries()) {
    const prefix = `artifacts[${index}]`;
    requireObject(artifact, prefix);
    if (typeof artifact.abi !== "string" || artifact.abi.length === 0 || abis.has(artifact.abi)) {
      throw new Error(`${prefix}.abi must be a unique non-empty string`);
    }
    abis.add(artifact.abi);
    for (const key of ["asset", "url", "archiveSha256", "binaryPath", "binarySha256", "interpreter"]) {
      requireNonEmptyString(artifact[key], `${prefix}.${key}`);
    }
    for (const key of ["archiveSha256", "binarySha256"]) {
      if (!/^[0-9a-f]{64}$/.test(artifact[key])) {
        throw new Error(`${prefix}.${key} must be a lowercase SHA-256 digest`);
      }
    }
    for (const key of ["archiveBytes", "binaryBytes", "elfMachine", "androidIdentApi", "minimumLoadAlignment"]) {
      requirePositiveInteger(artifact[key], `${prefix}.${key}`);
    }
    if ((BigInt(artifact.minimumLoadAlignment) & (BigInt(artifact.minimumLoadAlignment) - 1n)) !== 0n) {
      throw new Error(`${prefix}.minimumLoadAlignment must be a power of two`);
    }
    if (binaryPaths.has(artifact.binaryPath)) {
      throw new Error(`${prefix}.binaryPath must be unique`);
    }
    binaryPaths.add(artifact.binaryPath);
    if (
      !Array.isArray(artifact.neededLibraries) ||
      artifact.neededLibraries.length === 0 ||
      artifact.neededLibraries.some((library) => typeof library !== "string" || library.length === 0) ||
      new Set(artifact.neededLibraries).size !== artifact.neededLibraries.length
    ) {
      throw new Error(`${prefix}.neededLibraries must be a non-empty array of unique strings`);
    }
    if (artifact.androidIdentApi > androidBuild.minimumSupportedApi) {
      throw new Error(
        `${prefix}.androidIdentApi ${artifact.androidIdentApi} exceeds minimumSupportedApi ` +
          `${androidBuild.minimumSupportedApi}`,
      );
    }
  }
  const actualAbis = [...abis].sort();
  const expectedAbis = [...DISTRIBUTED_ABIS].sort();
  if (!sameArray(actualAbis, expectedAbis)) {
    throw new Error(
      `runtime lock ABIs must be ${JSON.stringify(expectedAbis)}, found ${JSON.stringify(actualAbis)}`,
    );
  }
}

function verifyMinimumApiAlignment(androidBuild) {
  const properties = readProperties(resolve(rootDirectory, "version.properties"));
  const versionMinimumApi = parseCanonicalInteger(properties.MIN_SDK_VERSION, "version.properties MIN_SDK_VERSION");
  const readmeCommon = JSON.parse(readFileSync(resolve(rootDirectory, ".readme/common.json"), "utf8"));
  const readmeMinimumApi = parseCanonicalInteger(readmeCommon.android_min_sdk, ".readme/common.json android_min_sdk");
  const supportedApi = androidBuild.minimumSupportedApi;
  if (versionMinimumApi !== supportedApi || readmeMinimumApi !== supportedApi) {
    throw new Error(
      `minimum API mismatch: runtime lock=${supportedApi}, version.properties=${versionMinimumApi}, ` +
        `.readme/common.json=${readmeMinimumApi}`,
    );
  }
  if (readmeCommon.min_android_version !== androidBuild.minimumSupportedAndroidVersion) {
    throw new Error(
      `minimum Android version mismatch: runtime lock=${androidBuild.minimumSupportedAndroidVersion}, ` +
        `.readme/common.json=${JSON.stringify(readmeCommon.min_android_version)}`,
    );
  }
  console.log(
    `Android compatibility: API ${supportedApi} / Android ${androidBuild.minimumSupportedAndroidVersion} ` +
      "aligned across runtime lock, version.properties, and README sources",
  );
}

function readProperties(file) {
  const properties = Object.create(null);
  for (const [index, line] of readFileSync(file, "utf8").split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (Object.hasOwn(properties, key)) {
      throw new Error(`${file}:${index + 1}: duplicate property ${key}`);
    }
    properties[key] = trimmed.slice(separator + 1).trim();
  }
  return properties;
}

function parseCanonicalInteger(value, label) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${label} must be a canonical non-negative integer, found ${JSON.stringify(value)}`);
  }
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error(`${label} exceeds the JavaScript safe-integer range`);
  return result;
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer, found ${JSON.stringify(value)}`);
  }
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function resolveWithinRoot(path, label) {
  const resolved = resolve(rootDirectory, path);
  const fromRoot = relative(rootDirectory, resolved);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`${label} resolves outside the repository root`);
  }
  return resolved;
}

function readUnsigned64(data, offset, label) {
  requireRange(data, offset, 8, label);
  return toSafeNumber(data.readBigUInt64LE(offset), label);
}

function toSafeNumber(value, label) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} exceeds the JavaScript safe-integer range`);
  }
  return Number(value);
}

function requireRange(data, offset, bytes, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(bytes) || offset < 0 || bytes < 0) {
    throw new Error(`${label} has an invalid byte range`);
  }
  if (offset > data.length || bytes > data.length - offset) {
    throw new Error(`${label} extends beyond the ELF file`);
  }
}

function readCString(data, offset, end, label) {
  if (!Number.isSafeInteger(end) || end < offset) throw new Error(`${label} has an invalid string range`);
  requireRange(data, offset, end - offset, label);
  const terminator = data.indexOf(0, offset);
  if (terminator < 0 || terminator >= end) throw new Error(`${label} is not null-terminated`);
  return data.toString("utf8", offset, terminator);
}

function align4(value) {
  return Math.ceil(value / 4) * 4;
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
