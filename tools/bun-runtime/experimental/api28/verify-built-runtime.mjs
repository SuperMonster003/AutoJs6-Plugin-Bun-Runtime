import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const defaultEvidencePath = resolve(toolDirectory, "runtime-evidence.json");

const ELF_HEADER_BYTES = 64;
const ELF_PROGRAM_HEADER_BYTES = 56;
const ELF_SECTION_HEADER_BYTES = 64;
const ELF_SYMBOL_BYTES = 24;
const ELF_DYNAMIC_ENTRY_BYTES = 16;
const PT_LOAD = 1;
const PT_DYNAMIC = 2;
const PT_INTERP = 3;
const PT_NOTE = 4;
const PT_GNU_STACK = 0x6474e551;
const PF_X = 1;
const PF_W = 2;
const SHT_SYMTAB = 2;
const SHT_STRTAB = 3;
const SHT_DYNAMIC = 6;
const SHT_NOTE = 7;
const SHT_DYNSYM = 11;
const SHT_GNU_VERDEF = 0x6ffffffd;
const SHT_GNU_VERNEED = 0x6ffffffe;
const SHT_GNU_VERSYM = 0x6fffffff;
const SHN_UNDEF = 0;
const DT_NULL = 0n;
const DT_NEEDED = 1n;
const DT_STRTAB = 5n;
const DT_SYMTAB = 6n;
const DT_STRSZ = 10n;
const DT_SYMENT = 11n;
const DT_RPATH = 15n;
const DT_TEXTREL = 22n;
const DT_FLAGS = 30n;
const DT_RUNPATH = 29n;
const DT_FLAGS_1 = 0x6ffffffbn;
const DT_ANDROID_RELR = 0x6fffe000n;
const DT_ANDROID_RELRSZ = 0x6fffe001n;
const DT_ANDROID_RELRENT = 0x6fffe003n;
const DF_TEXTREL = 0x4n;
const DF_1_PIE = 0x08000000n;
const NT_ANDROID_TYPE_IDENT = 1;
const NT_GNU_BUILD_ID = 3;
const MINIMUM_LOAD_ALIGNMENT = 16 * 1024;
const EXPECTED_NEEDED = Object.freeze(["libc.so", "libm.so", "libdl.so"]);
const EXPECTED_VERSION_NEEDS = Object.freeze([
  Object.freeze({ file: "libc.so", names: Object.freeze(["LIBC", "LIBC_N", "LIBC_O", "LIBC_P"]) }),
  Object.freeze({ file: "libm.so", names: Object.freeze(["LIBC"]) }),
  Object.freeze({ file: "libdl.so", names: Object.freeze(["LIBC"]) }),
]);
const EXPECTED_REPOSITORY_INPUT_PATHS = Object.freeze([
  "run-locked-build.mjs",
  "build-experiment.mjs",
  "config/arm64-v8a.configure.json",
  "config/x86_64.configure.json",
  "source-inputs.lock.json",
  "toolchain-inputs.lock.json",
  "build-network-inputs.lock.json",
  "cargo-inputs.lock.json",
  "bun-inputs.lock.json",
  "patches/series.lock.json",
]);

export function inspectBuiltRuntime(path) {
  const file = existingRegularFile(path, "built runtime");
  const data = readFileSync(file);
  const stat = lstatSync(file);
  return {
    bytes: data.length,
    sha256: sha256(data),
    mode: (stat.mode & 0o777).toString(8).padStart(4, "0"),
    elf: inspectElfBuffer(data),
  };
}

export function inspectElfBuffer(data) {
  require(Buffer.isBuffer(data), "ELF input must be a Buffer");
  requireRange(data, 0, ELF_HEADER_BYTES, "ELF header");
  require(data[0] === 0x7f && data.toString("ascii", 1, 4) === "ELF", "not an ELF file");
  require(data[4] === 2, "expected ELF64");
  require(data[5] === 1, "expected little-endian ELF");
  require(data[7] === 0, "expected System V ELF OS/ABI");
  require(data[8] === 0, "expected ELF ABI version 0");
  require(data.readUInt16LE(16) === 3, "expected ET_DYN PIE executable");
  const machine = data.readUInt16LE(18);
  require(machine === 62 || machine === 183, `unexpected ELF machine ${machine}`);
  require(data.readUInt32LE(20) === 1, "unexpected ELF version");
  require(data.readUInt16LE(52) === ELF_HEADER_BYTES, `expected ${ELF_HEADER_BYTES}-byte ELF header`);

  const entryPoint = data.readBigUInt64LE(24);
  require(entryPoint > 0n, "ELF entry point must be nonzero");
  const programHeaders = readProgramHeaders(data);
  const sections = readSections(data);
  const sectionByName = new Map(sections.map((section) => [section.name, section]));
  require(sectionByName.size === sections.length, "ELF contains duplicate section names");

  const loads = programHeaders.filter((header) => header.type === PT_LOAD);
  require(loads.length > 0, "ELF contains no PT_LOAD segment");
  for (const [index, load] of loads.entries()) {
    require(load.alignment >= MINIMUM_LOAD_ALIGNMENT, `PT_LOAD ${index} alignment is below ${MINIMUM_LOAD_ALIGNMENT}`);
    require(isPowerOfTwo(load.alignment), `PT_LOAD ${index} alignment is not a power of two`);
    require(load.fileOffset % load.alignment === load.virtualAddress % load.alignment, `PT_LOAD ${index} offset/address alignment is inconsistent`);
    require(load.fileBytes <= load.memoryBytes, `PT_LOAD ${index} file size exceeds memory size`);
    require((load.flags & (PF_W | PF_X)) !== (PF_W | PF_X), `PT_LOAD ${index} is writable and executable`);
  }

  const interpreterHeaders = programHeaders.filter((header) => header.type === PT_INTERP);
  require(interpreterHeaders.length === 1, `expected one PT_INTERP segment, found ${interpreterHeaders.length}`);
  const interpreterHeader = interpreterHeaders[0];
  const interpreter = readCString(
    data,
    interpreterHeader.fileOffset,
    interpreterHeader.fileOffset + interpreterHeader.fileBytes,
    "PT_INTERP",
  );
  require(interpreter === "/system/bin/linker64", `unexpected program interpreter ${interpreter}`);

  const stackHeaders = programHeaders.filter((header) => header.type === PT_GNU_STACK);
  require(stackHeaders.length === 1, `expected one PT_GNU_STACK segment, found ${stackHeaders.length}`);
  require((stackHeaders[0].flags & PF_X) === 0, "PT_GNU_STACK must not be executable");

  const dynamicHeaders = programHeaders.filter((header) => header.type === PT_DYNAMIC);
  require(dynamicHeaders.length === 1, `expected one PT_DYNAMIC segment, found ${dynamicHeaders.length}`);
  const dynamicSection = requireSection(sectionByName, ".dynamic", SHT_DYNAMIC);
  require(
    dynamicSection.fileOffset >= dynamicHeaders[0].fileOffset &&
      dynamicSection.fileOffset + dynamicSection.fileBytes <= dynamicHeaders[0].fileOffset + dynamicHeaders[0].fileBytes,
    ".dynamic is not contained by PT_DYNAMIC",
  );
  const dynamic = inspectDynamic(data, sections, sectionByName, dynamicSection);
  const notes = inspectNotes(data, sections, programHeaders);
  const versions = inspectVersions(data, sections, sectionByName);
  const dynamicSymbols = inspectDynamicSymbols(data, sections, sectionByName, versions.indexNames);
  const symbolTable = inspectSymbolTable(data, sections, sectionByName);
  const debugSections = sections.map((section) => section.name).filter((name) => name.startsWith(".debug"));
  require(debugSections.length === 0, `ELF retains debug sections: ${debugSections.join(", ")}`);

  require(sameArray(dynamic.neededLibraries, EXPECTED_NEEDED), `unexpected DT_NEEDED set: ${JSON.stringify(dynamic.neededLibraries)}`);
  require(notes.android.api === 28, `expected Android ident API 28, found ${notes.android.api}`);
  require(notes.android.ndkVersion === "r27c", `expected Android NDK r27c, found ${notes.android.ndkVersion}`);
  require(notes.android.ndkBuildNumber === "12479018", `unexpected Android NDK build ${notes.android.ndkBuildNumber}`);
  require(
    JSON.stringify(versions.needs) === JSON.stringify(EXPECTED_VERSION_NEEDS),
    `unexpected bionic symbol-version requirements: ${JSON.stringify(versions.needs)}`,
  );
  require(
    versions.definitions.length === 2 &&
      versions.definitions[0].index === 1 &&
      versions.definitions[0].base === true &&
      versions.definitions[0].name === "bun-profile" &&
      versions.definitions[1].index === 2 &&
      versions.definitions[1].base === false &&
      versions.definitions[1].name === "BUN_1.2",
    `unexpected exported symbol-version definitions: ${JSON.stringify(versions.definitions)}`,
  );

  return {
    class: "ELF64",
    data: "little-endian",
    osAbi: "System V",
    type: "ET_DYN",
    machine,
    machineName: machine === 183 ? "AArch64" : "Advanced Micro Devices X86-64",
    entryPoint: hex(entryPoint),
    programHeaderCount: programHeaders.length,
    sectionHeaderCount: sections.length,
    interpreter,
    loadAlignments: loads.map((load) => load.alignment),
    minimumLoadAlignment: Math.min(...loads.map((load) => load.alignment)),
    writableExecutableLoad: false,
    executableStack: false,
    neededLibraries: dynamic.neededLibraries,
    flags1: hex(dynamic.flags1),
    pie: true,
    androidRelr: dynamic.androidRelr,
    androidIdent: notes.android,
    buildId: notes.buildId,
    versionDefinitions: versions.definitions,
    versionNeeds: versions.needs,
    dynamicSymbols,
    symbolTable,
    debugSections,
  };
}

export function verifyBuiltRuntime({
  arm64Path,
  x86Path,
  repeatArm64Path,
  repeatX86Path,
  evidencePath = defaultEvidencePath,
} = {}) {
  const evidence = readJson(existingRegularFile(evidencePath, "runtime evidence"));
  verifyRuntimeEvidenceManifest(evidence);
  const paths = new Map([
    ["arm64-v8a", [arm64Path, repeatArm64Path]],
    ["x86_64", [x86Path, repeatX86Path]],
  ]);
  const results = [];
  for (const artifact of evidence.artifacts) {
    const selected = paths.get(artifact.abi);
    require(selected !== undefined, `no input mapping for ${artifact.abi}`);
    const primaryPath = existingRegularFile(selected[0], `${artifact.abi} primary runtime`);
    const repeatPath = existingRegularFile(selected[1], `${artifact.abi} repeat runtime`);
    require(basename(primaryPath) === artifact.filename, `${artifact.abi} primary filename must be ${artifact.filename}`);
    require(basename(repeatPath) === artifact.filename, `${artifact.abi} repeat filename must be ${artifact.filename}`);
    const primary = readFileSync(primaryPath);
    const repeat = readFileSync(repeatPath);
    require(primary.equals(repeat), `${artifact.abi} clean-build outputs are not byte-for-byte identical`);
    const inspected = inspectBuiltRuntime(primaryPath);
    require(inspected.bytes === artifact.bytes, `${artifact.abi} byte count drifted`);
    require(inspected.sha256 === artifact.sha256, `${artifact.abi} SHA-256 drifted`);
    require(inspected.mode === artifact.mode, `${artifact.abi} executable mode drifted`);
    require(
      artifact.repeatSha256.length === 2 && artifact.repeatSha256.every((digest) => digest === inspected.sha256),
      `${artifact.abi} repeat SHA-256 evidence drifted`,
    );
    require(
      JSON.stringify(inspected.elf) === JSON.stringify(artifact.elf),
      `${artifact.abi} ELF audit facts drifted`,
    );
    results.push({ abi: artifact.abi, ...inspected });
  }
  return { variant: evidence.identity.variant, results };
}

function readProgramHeaders(data) {
  const offset = readUnsigned64(data, 32, "program-header offset");
  const size = data.readUInt16LE(54);
  const count = data.readUInt16LE(56);
  require(size >= ELF_PROGRAM_HEADER_BYTES && count > 0 && count !== 0xffff, "unsupported program-header table");
  requireRange(data, offset, size * count, "program-header table");
  const headers = [];
  for (let index = 0; index < count; index += 1) {
    const headerOffset = offset + index * size;
    const header = {
      type: data.readUInt32LE(headerOffset),
      flags: data.readUInt32LE(headerOffset + 4),
      fileOffset: readUnsigned64(data, headerOffset + 8, `program header ${index} file offset`),
      virtualAddress: readUnsigned64(data, headerOffset + 16, `program header ${index} virtual address`),
      fileBytes: readUnsigned64(data, headerOffset + 32, `program header ${index} file size`),
      memoryBytes: readUnsigned64(data, headerOffset + 40, `program header ${index} memory size`),
      alignment: readUnsigned64(data, headerOffset + 48, `program header ${index} alignment`),
    };
    requireRange(data, header.fileOffset, header.fileBytes, `program header ${index} contents`);
    headers.push(header);
  }
  return headers;
}

function readSections(data) {
  const offset = readUnsigned64(data, 40, "section-header offset");
  const size = data.readUInt16LE(58);
  const count = data.readUInt16LE(60);
  const namesIndex = data.readUInt16LE(62);
  require(
    size >= ELF_SECTION_HEADER_BYTES && count > 0 && count !== 0xffff && namesIndex < count,
    "unsupported section-header table",
  );
  requireRange(data, offset, size * count, "section-header table");
  const sections = [];
  for (let index = 0; index < count; index += 1) {
    const sectionOffset = offset + index * size;
    const section = {
      index,
      nameOffset: data.readUInt32LE(sectionOffset),
      type: data.readUInt32LE(sectionOffset + 4),
      flags: data.readBigUInt64LE(sectionOffset + 8),
      virtualAddress: readUnsigned64(data, sectionOffset + 16, `section ${index} virtual address`),
      fileOffset: readUnsigned64(data, sectionOffset + 24, `section ${index} file offset`),
      fileBytes: readUnsigned64(data, sectionOffset + 32, `section ${index} file size`),
      link: data.readUInt32LE(sectionOffset + 40),
      info: data.readUInt32LE(sectionOffset + 44),
      alignment: readUnsigned64(data, sectionOffset + 48, `section ${index} alignment`),
      entryBytes: readUnsigned64(data, sectionOffset + 56, `section ${index} entry size`),
    };
    if (section.type !== 8) requireRange(data, section.fileOffset, section.fileBytes, `section ${index} contents`);
    sections.push(section);
  }
  const names = sections[namesIndex];
  require(names.type === SHT_STRTAB, "section-name table is not SHT_STRTAB");
  requireRange(data, names.fileOffset, names.fileBytes, "section-name string table");
  for (const section of sections) {
    section.name = readCString(
      data,
      names.fileOffset + section.nameOffset,
      names.fileOffset + names.fileBytes,
      `section ${section.index} name`,
    );
  }
  return sections;
}

function inspectDynamic(data, sections, sectionByName, dynamicSection) {
  require(dynamicSection.fileBytes % ELF_DYNAMIC_ENTRY_BYTES === 0, ".dynamic has an invalid size");
  const entries = [];
  let terminated = false;
  for (let relative = 0; relative < dynamicSection.fileBytes; relative += ELF_DYNAMIC_ENTRY_BYTES) {
    const offset = dynamicSection.fileOffset + relative;
    const tag = data.readBigInt64LE(offset);
    const value = data.readBigUInt64LE(offset + 8);
    entries.push({ tag, value });
    if (tag === DT_NULL) {
      terminated = true;
      break;
    }
  }
  require(terminated, ".dynamic contains no DT_NULL terminator");
  const dynstr = requireSection(sectionByName, ".dynstr", SHT_STRTAB);
  const dynsym = requireSection(sectionByName, ".dynsym", SHT_DYNSYM);
  require(singleDynamicValue(entries, DT_STRTAB, "DT_STRTAB") === BigInt(dynstr.virtualAddress), "DT_STRTAB does not address .dynstr");
  require(singleDynamicValue(entries, DT_STRSZ, "DT_STRSZ") === BigInt(dynstr.fileBytes), "DT_STRSZ does not match .dynstr");
  require(singleDynamicValue(entries, DT_SYMTAB, "DT_SYMTAB") === BigInt(dynsym.virtualAddress), "DT_SYMTAB does not address .dynsym");
  require(singleDynamicValue(entries, DT_SYMENT, "DT_SYMENT") === BigInt(ELF_SYMBOL_BYTES), "DT_SYMENT is not 24");
  const neededLibraries = entries
    .filter((entry) => entry.tag === DT_NEEDED)
    .map((entry) => readStringAtOffset(data, dynstr, toSafeNumber(entry.value, "DT_NEEDED string offset"), "DT_NEEDED"));
  require(entries.every((entry) => entry.tag !== DT_RPATH && entry.tag !== DT_RUNPATH), "RPATH/RUNPATH is forbidden");
  require(entries.every((entry) => entry.tag !== DT_TEXTREL), "DT_TEXTREL is forbidden");
  const flags = optionalSingleDynamicValue(entries, DT_FLAGS, "DT_FLAGS") ?? 0n;
  require((flags & DF_TEXTREL) === 0n, "DF_TEXTREL is forbidden");
  const flags1 = singleDynamicValue(entries, DT_FLAGS_1, "DT_FLAGS_1");
  require((flags1 & DF_1_PIE) !== 0n, "DF_1_PIE is missing");
  const relrAddress = singleDynamicValue(entries, DT_ANDROID_RELR, "DT_ANDROID_RELR");
  const relrBytes = singleDynamicValue(entries, DT_ANDROID_RELRSZ, "DT_ANDROID_RELRSZ");
  const relrEntryBytes = singleDynamicValue(entries, DT_ANDROID_RELRENT, "DT_ANDROID_RELRENT");
  require(relrAddress > 0n && relrBytes > 0n && relrEntryBytes === 8n, "Android packed RELR metadata is invalid");
  require(sections.some((section) => section.name === ".relr.dyn"), "Android RELR section is missing");
  return {
    neededLibraries,
    flags1,
    androidRelr: {
      address: hex(relrAddress),
      bytes: toSafeNumber(relrBytes, "DT_ANDROID_RELRSZ"),
      entryBytes: toSafeNumber(relrEntryBytes, "DT_ANDROID_RELRENT"),
    },
  };
}

function inspectNotes(data, sections, programHeaders) {
  const noteSections = sections.filter((section) => section.type === SHT_NOTE);
  require(noteSections.length > 0, "ELF contains no SHT_NOTE section");
  require(programHeaders.some((header) => header.type === PT_NOTE), "ELF contains no PT_NOTE segment");
  const androidNotes = [];
  const buildIds = [];
  for (const section of noteSections) {
    const end = section.fileOffset + section.fileBytes;
    for (let offset = section.fileOffset; offset < end; ) {
      requireRange(data, offset, 12, `${section.name} note header`);
      const nameBytes = data.readUInt32LE(offset);
      const descriptionBytes = data.readUInt32LE(offset + 4);
      const type = data.readUInt32LE(offset + 8);
      const nameOffset = offset + 12;
      const descriptionOffset = align4(nameOffset + nameBytes);
      const nextOffset = align4(descriptionOffset + descriptionBytes);
      require(nextOffset <= end && nextOffset > offset, `${section.name} contains a malformed note`);
      const owner = data.toString("ascii", nameOffset, nameOffset + nameBytes).replace(/\0+$/, "");
      if (owner === "Android" && type === NT_ANDROID_TYPE_IDENT) {
        require(descriptionBytes === 132, "Android ident note must contain the API and two 64-byte strings");
        androidNotes.push({
          api: data.readUInt32LE(descriptionOffset),
          ndkVersion: readFixedCString(data, descriptionOffset + 4, 64, "Android NDK version"),
          ndkBuildNumber: readFixedCString(data, descriptionOffset + 68, 64, "Android NDK build number"),
        });
      }
      if (owner === "GNU" && type === NT_GNU_BUILD_ID) {
        require(descriptionBytes === 20, "GNU build ID must be SHA-1 sized");
        buildIds.push(data.subarray(descriptionOffset, descriptionOffset + descriptionBytes).toString("hex"));
      }
      offset = nextOffset;
    }
  }
  require(androidNotes.length === 1, `expected one Android ident note, found ${androidNotes.length}`);
  require(buildIds.length === 1, `expected one GNU build ID, found ${buildIds.length}`);
  return { android: androidNotes[0], buildId: buildIds[0] };
}

function inspectVersions(data, sections, sectionByName) {
  const dynstr = requireSection(sectionByName, ".dynstr", SHT_STRTAB);
  const definitionsSection = requireSection(sectionByName, ".gnu.version_d", SHT_GNU_VERDEF);
  const needsSection = requireSection(sectionByName, ".gnu.version_r", SHT_GNU_VERNEED);
  const indexNames = new Map([[0, "LOCAL"], [1, "GLOBAL"]]);
  const definitions = [];
  for (let relative = 0; relative < definitionsSection.fileBytes; ) {
    const offset = definitionsSection.fileOffset + relative;
    requireRange(data, offset, 20, "version definition");
    require(data.readUInt16LE(offset) === 1, "unsupported version-definition revision");
    const flags = data.readUInt16LE(offset + 2);
    const index = data.readUInt16LE(offset + 4);
    const count = data.readUInt16LE(offset + 6);
    const auxRelative = data.readUInt32LE(offset + 12);
    const next = data.readUInt32LE(offset + 16);
    require(count > 0 && auxRelative >= 20, "invalid version-definition auxiliaries");
    const auxOffset = offset + auxRelative;
    requireRange(data, auxOffset, 8, "version-definition auxiliary");
    const name = readStringAtOffset(data, dynstr, data.readUInt32LE(auxOffset), "version definition name");
    definitions.push({ index, name, base: (flags & 1) !== 0 });
    indexNames.set(index, name);
    if (next === 0) break;
    require(next >= 20 && relative + next < definitionsSection.fileBytes, "invalid next version definition");
    relative += next;
  }

  const needs = [];
  for (let relative = 0; relative < needsSection.fileBytes; ) {
    const offset = needsSection.fileOffset + relative;
    requireRange(data, offset, 16, "version need");
    require(data.readUInt16LE(offset) === 1, "unsupported version-need revision");
    const count = data.readUInt16LE(offset + 2);
    const file = readStringAtOffset(data, dynstr, data.readUInt32LE(offset + 4), "version-need file");
    let auxRelative = data.readUInt32LE(offset + 8);
    const next = data.readUInt32LE(offset + 12);
    const names = [];
    for (let index = 0; index < count; index += 1) {
      require(auxRelative >= 16 && auxRelative < needsSection.fileBytes - relative, "invalid version-need auxiliary");
      const auxOffset = offset + auxRelative;
      requireRange(data, auxOffset, 16, "version-need auxiliary");
      const versionIndex = data.readUInt16LE(auxOffset + 6) & 0x7fff;
      const name = readStringAtOffset(data, dynstr, data.readUInt32LE(auxOffset + 8), "version-need name");
      names.push(name);
      indexNames.set(versionIndex, name);
      const auxNext = data.readUInt32LE(auxOffset + 12);
      if (index + 1 < count) require(auxNext >= 16, "version-need auxiliary chain ended early");
      auxRelative += auxNext;
    }
    needs.push({ file, names });
    if (next === 0) break;
    require(next >= 16 && relative + next < needsSection.fileBytes, "invalid next version need");
    relative += next;
  }
  return { definitions, needs, indexNames };
}

function inspectDynamicSymbols(data, sections, sectionByName, indexNames) {
  const symbols = requireSection(sectionByName, ".dynsym", SHT_DYNSYM);
  const strings = sections[symbols.link];
  require(strings?.type === SHT_STRTAB && strings.name === ".dynstr", ".dynsym does not link to .dynstr");
  require(symbols.entryBytes === ELF_SYMBOL_BYTES && symbols.fileBytes % ELF_SYMBOL_BYTES === 0, ".dynsym has an invalid entry size");
  const versions = requireSection(sectionByName, ".gnu.version", SHT_GNU_VERSYM);
  require(versions.link === symbols.index, ".gnu.version does not link to .dynsym");
  const entryCount = symbols.fileBytes / ELF_SYMBOL_BYTES;
  require(versions.fileBytes === entryCount * 2, ".gnu.version count does not match .dynsym");
  const records = [];
  for (let index = 0; index < entryCount; index += 1) {
    const offset = symbols.fileOffset + index * ELF_SYMBOL_BYTES;
    const name = readStringAtOffset(data, strings, data.readUInt32LE(offset), `dynamic symbol ${index}`);
    const info = data[offset + 4];
    const visibility = data[offset + 5] & 0x3;
    const sectionIndex = data.readUInt16LE(offset + 6);
    const value = data.readBigUInt64LE(offset + 8);
    const bytes = data.readBigUInt64LE(offset + 16);
    const rawVersion = data.readUInt16LE(versions.fileOffset + index * 2);
    const versionIndex = rawVersion & 0x7fff;
    require(indexNames.has(versionIndex), `dynamic symbol ${index} references unknown version index ${versionIndex}`);
    records.push([
      index,
      name,
      info >> 4,
      info & 0xf,
      visibility,
      sectionIndex,
      hex(value),
      bytes.toString(),
      indexNames.get(versionIndex),
      (rawVersion & 0x8000) !== 0,
    ]);
  }
  const named = records.filter((record) => record[1] !== "");
  const defined = named.filter((record) => record[5] !== SHN_UNDEF);
  const undefined_ = named.filter((record) => record[5] === SHN_UNDEF);
  return {
    entryCount,
    definedCount: defined.length,
    undefinedCount: undefined_.length,
    tableSha256: sha256(data.subarray(symbols.fileOffset, symbols.fileOffset + symbols.fileBytes)),
    recordsSha256: hashRecords(records),
    definedRecordsSha256: hashRecords(defined),
    undefinedRecordsSha256: hashRecords(undefined_),
  };
}

function inspectSymbolTable(data, sections, sectionByName) {
  const symbols = requireSection(sectionByName, ".symtab", SHT_SYMTAB);
  require(symbols.entryBytes === ELF_SYMBOL_BYTES && symbols.fileBytes % ELF_SYMBOL_BYTES === 0, ".symtab has an invalid entry size");
  const strings = sections[symbols.link];
  require(strings?.type === SHT_STRTAB && strings.name === ".strtab", ".symtab does not link to .strtab");
  return {
    present: true,
    entryCount: symbols.fileBytes / ELF_SYMBOL_BYTES,
    bytes: symbols.fileBytes,
    sha256: sha256(data.subarray(symbols.fileOffset, symbols.fileOffset + symbols.fileBytes)),
  };
}

export function verifyRuntimeEvidenceManifest(evidence) {
  require(evidence?.schemaVersion === 3, "unsupported runtime evidence schema");
  require(evidence.identity?.status === "reproducible-static-audit-complete", "runtime evidence status is incomplete");
  require(evidence.identity?.variant === "bun-1.4.0-android-api28-patched-experimental", "runtime evidence variant is invalid");
  require(evidence.identity?.officialArtifact === false, "experimental runtime cannot be an official artifact");
  require(evidence.identity?.distributionReady === false, "experimental runtime cannot be distribution-ready");
  require(evidence.source?.upstreamCommit === "34cbb9a40b4bd1bd767d134a7065e66c2432a676", "runtime evidence upstream commit drifted");
  require(evidence.source?.downstreamHeadCommit === "06e518f73b4fccc6c3ffb17412ea166bf886bed0", "runtime evidence downstream commit drifted");
  require(evidence.build?.hostImageManifestDigest === "sha256:8f2f92e61f13defcfc91cd4a3722bbb55edced4163c6277fbc6375d05b6731aa", "runtime evidence host image drifted");
  require(evidence.build?.hostImageConfigDigest === "sha256:5bcfc00215b7f44236d009a7c3e7a53495fe8c8488908dd4e896e9da9a9c035b", "runtime evidence host config drifted");
  require(evidence.build?.entry === "run-locked-build.mjs", "runtime evidence build entry drifted");
  require(evidence.build?.cleanBuildCount === 2, "runtime evidence requires two clean builds");
  verifyCapturedBuildCompletion(evidence);
  require(evidence.build?.byteForByteIdentical === true, "runtime evidence is not byte-for-byte reproducible");
  require(evidence.build?.containerPolicy?.pull === "never", "runtime evidence pull policy drifted");
  require(evidence.build?.containerPolicy?.network === "none", "runtime evidence network policy drifted");
  require(evidence.build?.containerPolicy?.rootFilesystem === "read-only", "runtime evidence root filesystem policy drifted");
  require(evidence.build?.containerPolicy?.immutableInputs === "read-only", "runtime evidence input mount policy drifted");
  require(evidence.build?.containerPolicy?.ccache === "disabled", "runtime evidence ccache policy drifted");
  require(evidence.build?.containerPolicy?.canonicalWorkDirectory === "/work/bun", "runtime evidence work directory drifted");
  require(/^\d{4}-\d{2}-\d{2}$/.test(evidence.build?.evidenceDate), "runtime evidence date is invalid");
  require(typeof evidence.build?.notes === "string" && evidence.build.notes.length > 0, "runtime evidence build notes are missing");
  require(
    Array.isArray(evidence.build?.repositoryInputs) &&
      sameArray(evidence.build.repositoryInputs.map((input) => input.path), EXPECTED_REPOSITORY_INPUT_PATHS),
    "runtime evidence repository-input paths drifted",
  );
  for (const input of evidence.build.repositoryInputs) {
    require(Number.isSafeInteger(input.bytes) && input.bytes > 0, `${input.path}: invalid repository-input byte count`);
    require(/^[0-9a-f]{64}$/.test(input.sha256), `${input.path}: invalid repository-input SHA-256`);
  }
  require(Array.isArray(evidence.artifacts) && evidence.artifacts.length === 2, "runtime evidence must contain two artifacts");
  require(sameArray(evidence.artifacts.map((artifact) => artifact.abi), ["arm64-v8a", "x86_64"]), "runtime evidence ABI order drifted");
  const expectedArtifacts = new Map([
    ["arm64-v8a", { filename: "bun-arm64-v8a", machine: 183, machineName: "AArch64" }],
    ["x86_64", { filename: "bun-x86_64", machine: 62, machineName: "Advanced Micro Devices X86-64" }],
  ]);
  for (const artifact of evidence.artifacts) {
    const expected = expectedArtifacts.get(artifact.abi);
    require(artifact.filename === expected.filename && basename(artifact.filename) === artifact.filename, `${artifact.abi}: invalid evidence filename`);
    require(Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0, `${artifact.abi}: invalid evidence byte count`);
    require(/^[0-9a-f]{64}$/.test(artifact.sha256), `${artifact.abi}: invalid evidence SHA-256`);
    require(artifact.mode === "0755", `${artifact.abi}: invalid executable mode`);
    require(
      Array.isArray(artifact.repeatSha256) &&
        artifact.repeatSha256.length === 2 &&
        artifact.repeatSha256.every((digest) => digest === artifact.sha256),
      `${artifact.abi}: repeat SHA-256 evidence drifted`,
    );
    require(artifact.elf && typeof artifact.elf === "object" && !Array.isArray(artifact.elf), `${artifact.abi}: ELF evidence is missing`);
    require(artifact.elf.class === "ELF64", `${artifact.abi}: ELF class drifted`);
    require(artifact.elf.data === "little-endian", `${artifact.abi}: ELF data encoding drifted`);
    require(artifact.elf.osAbi === "System V", `${artifact.abi}: ELF OS/ABI drifted`);
    require(artifact.elf.type === "ET_DYN", `${artifact.abi}: ELF type drifted`);
    require(artifact.elf.machine === expected.machine, `${artifact.abi}: ELF machine drifted`);
    require(artifact.elf.machineName === expected.machineName, `${artifact.abi}: ELF machine name drifted`);
    require(artifact.elf.interpreter === "/system/bin/linker64", `${artifact.abi}: ELF interpreter drifted`);
    require(
      Array.isArray(artifact.elf.loadAlignments) &&
        artifact.elf.loadAlignments.length > 0 &&
        artifact.elf.loadAlignments.every((alignment) => alignment >= MINIMUM_LOAD_ALIGNMENT && isPowerOfTwo(alignment)),
      `${artifact.abi}: ELF PT_LOAD alignment evidence drifted`,
    );
    require(artifact.elf.minimumLoadAlignment >= MINIMUM_LOAD_ALIGNMENT, `${artifact.abi}: minimum PT_LOAD alignment drifted`);
    require(artifact.elf.writableExecutableLoad === false, `${artifact.abi}: writable/executable segment evidence drifted`);
    require(artifact.elf.executableStack === false, `${artifact.abi}: executable-stack evidence drifted`);
    require(sameArray(artifact.elf.neededLibraries, EXPECTED_NEEDED), `${artifact.abi}: needed-library evidence drifted`);
    require(artifact.elf.flags1 === "0x8000000" && artifact.elf.pie === true, `${artifact.abi}: PIE evidence drifted`);
    require(artifact.elf.androidIdent?.api === 28, `${artifact.abi}: Android API note drifted`);
    require(artifact.elf.androidIdent?.ndkVersion === "r27c", `${artifact.abi}: Android NDK note drifted`);
    require(artifact.elf.androidIdent?.ndkBuildNumber === "12479018", `${artifact.abi}: Android NDK build note drifted`);
    require(/^[0-9a-f]{40}$/.test(artifact.elf.buildId), `${artifact.abi}: GNU build ID is invalid`);
    require(
      JSON.stringify(artifact.elf.versionNeeds) === JSON.stringify(EXPECTED_VERSION_NEEDS),
      `${artifact.abi}: bionic symbol-version evidence drifted`,
    );
    require(Number.isSafeInteger(artifact.elf.dynamicSymbols?.definedCount) && artifact.elf.dynamicSymbols.definedCount > 0, `${artifact.abi}: defined dynamic-symbol count is invalid`);
    require(Number.isSafeInteger(artifact.elf.dynamicSymbols?.undefinedCount) && artifact.elf.dynamicSymbols.undefinedCount > 0, `${artifact.abi}: undefined dynamic-symbol count is invalid`);
    for (const field of ["tableSha256", "recordsSha256", "definedRecordsSha256", "undefinedRecordsSha256"]) {
      require(/^[0-9a-f]{64}$/.test(artifact.elf.dynamicSymbols?.[field]), `${artifact.abi}: ${field} is invalid`);
    }
    require(artifact.elf.symbolTable?.present === true, `${artifact.abi}: symbol-table evidence is missing`);
    require(Array.isArray(artifact.elf.debugSections) && artifact.elf.debugSections.length === 0, `${artifact.abi}: debug-section evidence drifted`);
  }
  require(evidence.boundaries?.storedBinaryInRepository === false, "runtime evidence cannot store the binary in this repository");
  require(evidence.boundaries?.officialRuntimeReplaced === false, "runtime evidence cannot replace the official runtime");
  require(evidence.boundaries?.packagingValidated === false, "runtime evidence cannot claim packaging validation");
  require(evidence.boundaries?.applicationProcessValidated === false, "runtime evidence cannot claim application-process validation");
  require(evidence.boundaries?.api28Through32SupportClaimed === false, "runtime evidence cannot claim API 28-32 support");
  require(evidence.boundaries?.licenseAndSourceDistributionComplete === false, "runtime evidence cannot claim distribution compliance");
  require(typeof evidence.boundaries?.note === "string" && evidence.boundaries.note.length > 0, "runtime evidence boundary note is missing");
  return evidence;
}

// Schema 3 requires actual exits from two new independent build drivers. It
// cannot reinterpret historical no-work checks as original build-driver exits.
function verifyCapturedBuildCompletion(evidence) {
  const build = evidence.build;
  require(build.bothRunsExitCode === 0, "both original build-driver exits must be captured as zero");
  require(!Object.hasOwn(build, "completionRecovery"), "recovery checks cannot replace captured build exits");
  const completion = build.completion;
  require(completion?.method === "captured-build-driver-exits", "runtime completion method drifted");
  require(JSON.stringify(completion.originalDriverExitCodes) === "[0,0]", "both original driver exits required");
  require(Array.isArray(completion.runs) && completion.runs.length === 2, "two independent clean driver records required");
  const facts = (value, label) => require(Number.isSafeInteger(value?.bytes) && value.bytes > 0 && /^[0-9a-f]{64}$/.test(value.sha256), `${label}: missing byte/digest binding`);
  facts(completion.driverSource, "build driver source");
  const digests = new Set();
  for (const [index, run] of completion.runs.entries()) {
    require(run.run === index + 1 && run.exitCode === 0, "captured run order or driver exit drifted");
    require(run.head === evidence.source.downstreamHeadCommit && run.headAfter === run.head, "driver source head drifted");
    require(run.tree === "1eb8d5ea945001f018bdf14bd00c261d40b02573" && run.treeAfter === run.tree, "driver source tree drifted");
    require(run.freshCheckout === true && run.cleanBefore === true && run.cleanAfter === true && run.recipesUnchanged === true, "driver source/recipe cleanliness missing");
    require(run.entry === "run-locked-build.mjs" && run.execute === true && run.abi === "all", "full dual-ABI driver invocation required");
    const start = Date.parse(run.buildStartedAt), end = Date.parse(run.buildFinishedAt);
    require(Number.isFinite(start) && Number.isFinite(end) && end >= start, "driver build interval invalid");
    facts(run.receipt, "original driver receipt"); facts(run.log, "complete build log");
    require(!digests.has(run.receipt.sha256), "independent driver receipts required"); digests.add(run.receipt.sha256);
    require(Array.isArray(run.repositoryInputs) && JSON.stringify(run.repositoryInputs) === JSON.stringify(build.repositoryInputs), "driver recipe input binding drifted");
    require(Array.isArray(run.artifacts) && sameArray(run.artifacts.map(a => a.abi), ["arm64-v8a", "x86_64"]), "both driver ABI outputs required");
    for (const output of run.artifacts) {
      const artifact = evidence.artifacts?.find(a => a.abi === output.abi);
      require(artifact && output.bytes === artifact.bytes && output.sha256 === artifact.sha256, "driver output/runtime binding drifted");
      facts(output.ninjaLog, "successful Ninja log");
      require(Array.isArray(output.finalEdges) && ["bun-profile", "bun-profile.linker-map", "bun"].every(target => output.finalEdges.some(line => {
        const fields = typeof line === "string" ? line.split("\t") : [];
        return fields.length === 5 && /^\d+$/.test(fields[0]) && /^\d+$/.test(fields[1]) && Number(fields[1]) >= Number(fields[0]) && /^\d+$/.test(fields[2]) && fields[3] === target && /^[0-9a-f]{16}$/.test(fields[4]);
      })), "successful final Ninja edges are missing");
    }
  }
}

function requireSection(sectionByName, name, type) {
  const section = sectionByName.get(name);
  require(section !== undefined, `required ELF section is missing: ${name}`);
  if (type !== undefined) require(section.type === type, `${name} has unexpected section type ${section.type}`);
  return section;
}

function singleDynamicValue(entries, tag, label) {
  const values = entries.filter((entry) => entry.tag === tag).map((entry) => entry.value);
  require(values.length === 1, `expected one ${label}, found ${values.length}`);
  return values[0];
}

function optionalSingleDynamicValue(entries, tag, label) {
  const values = entries.filter((entry) => entry.tag === tag).map((entry) => entry.value);
  require(values.length <= 1, `expected at most one ${label}, found ${values.length}`);
  return values[0];
}

function readStringAtOffset(data, table, relative, label) {
  require(Number.isSafeInteger(relative) && relative >= 0 && relative < table.fileBytes, `${label} string offset is invalid`);
  return readCString(data, table.fileOffset + relative, table.fileOffset + table.fileBytes, label);
}

function readFixedCString(data, offset, bytes, label) {
  requireRange(data, offset, bytes, label);
  const value = data.subarray(offset, offset + bytes);
  const terminator = value.indexOf(0);
  require(terminator >= 0, `${label} is not null-terminated`);
  require(value.subarray(terminator).every((byte) => byte === 0), `${label} contains data after its terminator`);
  return value.toString("ascii", 0, terminator);
}

function hashRecords(records) {
  return sha256(Buffer.from(`${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8"));
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function readUnsigned64(data, offset, label) {
  requireRange(data, offset, 8, label);
  return toSafeNumber(data.readBigUInt64LE(offset), label);
}

function toSafeNumber(value, label) {
  require(value <= BigInt(Number.MAX_SAFE_INTEGER), `${label} exceeds the JavaScript safe-integer range`);
  return Number(value);
}

function requireRange(data, offset, bytes, label) {
  require(Number.isSafeInteger(offset) && Number.isSafeInteger(bytes) && offset >= 0 && bytes >= 0, `${label} has an invalid byte range`);
  require(offset <= data.length && bytes <= data.length - offset, `${label} extends beyond the ELF file`);
}

function readCString(data, offset, end, label) {
  require(Number.isSafeInteger(end) && end >= offset, `${label} has an invalid string range`);
  requireRange(data, offset, end - offset, label);
  const terminator = data.indexOf(0, offset);
  require(terminator >= offset && terminator < end, `${label} is not null-terminated`);
  return data.toString("utf8", offset, terminator);
}

function align4(value) {
  return Math.ceil(value / 4) * 4;
}

function isPowerOfTwo(value) {
  return Number.isSafeInteger(value) && value > 0 && (BigInt(value) & (BigInt(value) - 1n)) === 0n;
}

function hex(value) {
  return `0x${value.toString(16)}`;
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function existingRegularFile(value, label) {
  require(typeof value === "string" && value.length > 0, `${label} is required`);
  require(isAbsolute(value) || win32.isAbsolute(value), `${label} must be absolute`);
  const path = resolve(value);
  const stat = lstatSync(path);
  require(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular non-symlink file: ${path}`);
  return path;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`, { cause: error });
  }
}

function parseArguments(argv) {
  const values = Object.create(null);
  let inspect = false;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--inspect") {
      require(!inspect, "Duplicate argument: --inspect");
      inspect = true;
      continue;
    }
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), USAGE.trim());
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
    index += 1;
  }
  const allowed = new Set(["--binary", "--arm64", "--x86", "--repeat-arm64", "--repeat-x86", "--evidence"]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  if (inspect) {
    require(values["--binary"] && Object.keys(values).length === 1, "--inspect requires exactly --binary <path>");
    return { inspect: true, binary: values["--binary"] };
  }
  for (const key of ["--arm64", "--x86", "--repeat-arm64", "--repeat-x86"]) require(values[key], `${key} is required`);
  require(values["--binary"] === undefined, "--binary is only valid with --inspect");
  return {
    inspect: false,
    arm64Path: values["--arm64"],
    x86Path: values["--x86"],
    repeatArm64Path: values["--repeat-arm64"],
    repeatX86Path: values["--repeat-x86"],
    evidencePath: values["--evidence"] ?? defaultEvidencePath,
  };
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const USAGE = `
Usage:
  node verify-built-runtime.mjs --inspect --binary <absolute-file>
  node verify-built-runtime.mjs --arm64 <absolute-file> --x86 <absolute-file> \\
    --repeat-arm64 <absolute-file> --repeat-x86 <absolute-file> [--evidence <absolute-json>]
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.inspect) {
      console.log(JSON.stringify(inspectBuiltRuntime(options.binary), null, 2));
    } else {
      const result = verifyBuiltRuntime(options);
      for (const artifact of result.results) {
        console.log(
          `OK ${artifact.abi}: ${artifact.sha256} (${artifact.bytes} bytes, build-id ${artifact.elf.buildId}, ` +
            `Android API ${artifact.elf.androidIdent.api}, PT_LOAD ${artifact.elf.loadAlignments.join("/")})`,
        );
      }
      console.log(`OK BYTE-FOR-BYTE REPRODUCIBLE AND STATIC-AUDITED: ${result.variant}`);
    }
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
