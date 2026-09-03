import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_IMAGE = Object.freeze({
  reference: "ubuntu:20.04",
  indexDigest: "sha256:8feb4d8ca5354def3d8fce243717141ce31e2c428701f6682bd2fafe15388214",
  linuxAmd64ManifestDigest: "sha256:c664f8f86ed5a386b0a340d981b8f81714e21a8b9c73f658c4bea56aa179d54a",
});
const SNAPSHOT_ID = "20260902T000000Z";
const EXPECTED_FINGERPRINTS = Object.freeze({
  llvm: "6084F3CF814B57C1CF12EFD515CF4D18AF4F7421",
  toolchainPpa: "C8EC952E2A0E1FBDC5090F6A2C277A0A352154E5",
});
const SOURCE_FILES = Object.freeze([
  "/etc/apt/sources.list",
  "/etc/apt/sources.list.d/llvm.list",
  "/etc/apt/sources.list.d/ubuntu-toolchain-r.list",
]);
const CONTAINER_NDK_ROOT = "/opt/autojs6/android-ndk-r27c";
const NDK_RUNTIME_ROOT = `${CONTAINER_NDK_ROOT}/toolchains/llvm/prebuilt/linux-x86_64/lib/clang/18/lib/linux`;
const LLVM_RUNTIME_ROOT = "/usr/lib/llvm-21/lib/clang/21/lib";
const COMPILER_RUNTIME_LINKS = Object.freeze([
  {
    path: `${LLVM_RUNTIME_ROOT}/aarch64-unknown-linux-android28/libclang_rt.builtins.a`,
    target: `${NDK_RUNTIME_ROOT}/libclang_rt.builtins-aarch64-android.a`,
  },
  {
    path: `${LLVM_RUNTIME_ROOT}/aarch64-unknown-linux-android28/libunwind.a`,
    target: `${NDK_RUNTIME_ROOT}/aarch64/libunwind.a`,
  },
  {
    path: `${LLVM_RUNTIME_ROOT}/x86_64-unknown-linux-android28/libclang_rt.builtins.a`,
    target: `${NDK_RUNTIME_ROOT}/libclang_rt.builtins-x86_64-android.a`,
  },
  {
    path: `${LLVM_RUNTIME_ROOT}/x86_64-unknown-linux-android28/libunwind.a`,
    target: `${NDK_RUNTIME_ROOT}/x86_64/libunwind.a`,
  },
  {
    path: `${LLVM_RUNTIME_ROOT}/linux/libclang_rt.builtins-aarch64-android.a`,
    target: `${NDK_RUNTIME_ROOT}/libclang_rt.builtins-aarch64-android.a`,
  },
  {
    path: `${LLVM_RUNTIME_ROOT}/linux/libclang_rt.builtins-x86_64-android.a`,
    target: `${NDK_RUNTIME_ROOT}/libclang_rt.builtins-x86_64-android.a`,
  },
  {
    path: `${LLVM_RUNTIME_ROOT}/linux/aarch64/libunwind.a`,
    target: `${NDK_RUNTIME_ROOT}/aarch64/libunwind.a`,
  },
  {
    path: `${LLVM_RUNTIME_ROOT}/linux/x86_64/libunwind.a`,
    target: `${NDK_RUNTIME_ROOT}/x86_64/libunwind.a`,
  },
]);

export function resolveHostPackageInputs({ baseManifest, provisionedManifest, container }) {
  const baseBytes = readFileSync(baseManifest);
  const provisionedBytes = readFileSync(provisionedManifest);
  const base = parsePackageManifest(baseBytes.toString("utf8"), "base manifest");
  const provisioned = parsePackageManifest(provisionedBytes.toString("utf8"), "provisioned manifest");
  const delta = computePackageDelta(base, provisioned);
  require(delta.length > 0, "The provisioned image has no package delta");

  const specs = delta.map(({ requestedName, version }) => `${requestedName}=${version}`);
  const metadata = parseDeb822(runDocker(container, ["apt-cache", "show", ...specs], "apt-cache show"));
  const uriEntries = parsePrintUris(
    runDocker(container, ["apt-get", "--print-uris", "download", ...specs], "apt-get --print-uris download"),
  );
  const packages = delta.map((entry) => resolvePackage(entry, metadata, uriEntries));

  const sourceLines = SOURCE_FILES.flatMap((path) =>
    runDocker(container, ["cat", path], `read ${path}`)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("deb ")),
  );
  verifyRepositoryConfiguration(sourceLines);
  const llvmFingerprint = readKeyFingerprint(container, "/usr/share/keyrings/llvm-snapshot.gpg");
  const ppaFingerprint = readKeyFingerprint(container, "/usr/share/keyrings/ubuntu-toolchain-r.gpg");
  require(llvmFingerprint === EXPECTED_FINGERPRINTS.llvm, `Unexpected LLVM signing fingerprint: ${llvmFingerprint}`);
  require(ppaFingerprint === EXPECTED_FINGERPRINTS.toolchainPpa, `Unexpected toolchain PPA signing fingerprint: ${ppaFingerprint}`);

  const containerImageId = runCommand("docker", ["inspect", "--format={{.Image}}", container], "docker inspect").trim();
  require(/^sha256:[0-9a-f]{64}$/.test(containerImageId), `Unexpected resolver image ID: ${containerImageId}`);

  const repositoryCounts = Object.fromEntries(
    [...new Set(packages.map((package_) => package_.repository))]
      .sort()
      .map((repository) => [repository, packages.filter((package_) => package_.repository === repository).length]),
  );
  const archiveBytes = packages.reduce((total, package_) => total + package_.bytes, 0);
  return {
    schemaVersion: 1,
    identity: {
      status: "locked",
      purpose: "Exact amd64 Ubuntu package layer used by the Bun Android API 28 downstream build experiment",
      resolutionSnapshot: "2026-09-03",
    },
    baseImage: BASE_IMAGE,
    resolutionEnvironment: {
      containerImageId,
      ubuntuSnapshot: SNAPSHOT_ID,
      aptVersion: runDocker(container, ["apt-get", "--version"], "apt-get version").split(/\r?\n/, 1)[0],
      sourceLines: [...new Set(sourceLines)].sort(),
      signingKeys: [
        {
          repository: "apt-llvm-focal-21",
          keyring: "/usr/share/keyrings/llvm-snapshot.gpg",
          fingerprint: llvmFingerprint,
        },
        {
          repository: "ubuntu-toolchain-r-test",
          keyring: "/usr/share/keyrings/ubuntu-toolchain-r.gpg",
          fingerprint: ppaFingerprint,
        },
      ],
      toolVersions: {
        clang: runDocker(container, ["/usr/lib/llvm-21/bin/clang", "--version"], "Clang version").split(/\r?\n/, 1)[0],
        gcc: runDocker(container, ["gcc-13", "--version"], "GCC version").split(/\r?\n/, 1)[0],
      },
      baseManifest: {
        packageCount: base.length,
        bytes: baseBytes.length,
        sha256: sha256(baseBytes),
      },
      provisionedManifest: {
        packageCount: provisioned.length,
        bytes: provisionedBytes.length,
        sha256: sha256(provisionedBytes),
      },
    },
    containerLayout: {
      androidNdkRoot: CONTAINER_NDK_ROOT,
      pathPrefix: "/usr/lib/llvm-21/bin",
      compilerRuntimeLinks: COMPILER_RUNTIME_LINKS,
    },
    packages,
    readiness: {
      packageCount: packages.length,
      sha256Count: packages.length,
      archiveBytes,
      repositoryCounts,
      packageClosureComplete: true,
      archiveIdentitiesLocked: true,
      offlineInstallReady: true,
      note: "Every package added or upgraded relative to the digest-pinned Ubuntu 20.04 amd64 base is locked by binary package name, version, architecture, canonical HTTPS URL, byte count, and SHA-256.",
    },
  };
}

export function parsePackageManifest(text, label = "package manifest") {
  const packages = [];
  const identities = new Set();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (line.length === 0) continue;
    const fields = line.split("\t");
    require(fields.length === 2, `${label} line ${index + 1} must contain package and version`);
    const [requestedName, version] = fields;
    require(/^[a-z0-9][a-z0-9+.-]*(?::[a-z0-9][a-z0-9-]*)?$/.test(requestedName), `${label} line ${index + 1} has an invalid package name`);
    require(version.length > 0 && !/[\0\r\n\t]/.test(version), `${label} line ${index + 1} has an invalid version`);
    const identity = `${requestedName}\t${version}`;
    require(!identities.has(identity), `${label} contains duplicate ${identity}`);
    identities.add(identity);
    packages.push({ requestedName, version, identity });
  }
  return packages;
}

export function computePackageDelta(base, provisioned) {
  const baseIdentities = new Set(base.map(({ identity }) => identity));
  return provisioned.filter(({ identity }) => !baseIdentities.has(identity));
}

export function parseDeb822(text) {
  return text
    .split(/\r?\n\r?\n/)
    .map((paragraph) => {
      const fields = Object.create(null);
      let currentKey = null;
      for (const line of paragraph.split(/\r?\n/)) {
        if (line.startsWith(" ")) {
          if (currentKey !== null) fields[currentKey] += `\n${line}`;
          continue;
        }
        const match = /^([^:]+):\s*(.*)$/.exec(line);
        if (match === null) continue;
        currentKey = match[1];
        fields[currentKey] = match[2];
      }
      return fields;
    })
    .filter((fields) => fields.Package !== undefined);
}

export function parsePrintUris(text) {
  const entries = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^'([^']+)'\s+(\S+)\s+(\d+)\s+([A-Z0-9]+):([0-9a-fA-F]+)$/.exec(line.trim());
    if (match === null) continue;
    const url = new URL(match[1]);
    require(url.protocol === "https:" && url.username === "" && url.password === "", "APT emitted an unsafe package URL");
    entries.push({
      url: url.href,
      aptFilename: match[2],
      bytes: Number(match[3]),
      digestAlgorithm: match[4],
      digest: match[5].toLowerCase(),
    });
  }
  require(entries.length > 0, "APT did not emit any package URIs");
  return entries;
}

function resolvePackage(entry, metadata, uriEntries) {
  const requestedBaseName = entry.requestedName.split(":", 1)[0];
  const matches = metadata.filter((fields) => fields.Package === requestedBaseName && fields.Version === entry.version);
  const identities = new Map();
  for (const fields of matches) {
    const identity = [fields.Package, fields.Version, fields.Architecture, fields.Filename, fields.Size, fields.SHA256].join("\0");
    identities.set(identity, fields);
  }
  require(identities.size === 1, `${entry.identity}: expected one exact apt-cache record, found ${identities.size}`);
  const fields = identities.values().next().value;
  require(/^[0-9a-f]{64}$/.test(fields.SHA256), `${entry.identity}: apt-cache SHA-256 is missing`);
  require(/^\d+$/.test(fields.Size), `${entry.identity}: apt-cache size is invalid`);
  require(fields.Architecture === "amd64" || fields.Architecture === "all", `${entry.identity}: unexpected architecture ${fields.Architecture}`);
  const filename = basename(fields.Filename);
  const uriMatches = uriEntries.filter(({ url, bytes }) => {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname).endsWith(`/${fields.Filename}`) && bytes === Number(fields.Size);
  });
  require(uriMatches.length === 1, `${entry.identity}: expected one exact download URI, found ${uriMatches.length}`);
  const uri = uriMatches[0];
  if (uri.digestAlgorithm === "SHA256") {
    require(uri.digest === fields.SHA256, `${entry.identity}: apt-get and apt-cache SHA-256 disagree`);
  }
  return {
    name: fields.Package,
    version: fields.Version,
    architecture: fields.Architecture,
    sourcePackage: fields.Source?.split(/\s+/, 1)[0] ?? fields.Package,
    repository: classifyRepository(uri.url),
    filename,
    url: uri.url,
    bytes: Number(fields.Size),
    sha256: fields.SHA256,
  };
}

function classifyRepository(value) {
  const url = new URL(value);
  if (url.hostname === "snapshot.ubuntu.com" && url.pathname.startsWith(`/ubuntu/${SNAPSHOT_ID}/pool/`)) {
    return "ubuntu-focal-snapshot";
  }
  if (url.hostname === "ppa.launchpadcontent.net" && url.pathname.startsWith("/ubuntu-toolchain-r/test/ubuntu/pool/")) {
    return "ubuntu-toolchain-r-test";
  }
  if (url.hostname === "apt.llvm.org" && url.pathname.startsWith("/focal/pool/")) return "apt-llvm-focal-21";
  throw new Error(`Unexpected host-package repository URL: ${value}`);
}

function verifyRepositoryConfiguration(lines) {
  require(lines.some((line) => line.includes(`[snapshot=${SNAPSHOT_ID}]`) && line.includes("archive.ubuntu.com/ubuntu/ focal ")), "Ubuntu focal snapshot source is missing");
  require(lines.some((line) => line.includes(`[snapshot=${SNAPSHOT_ID}]`) && line.includes(" focal-updates ")), "Ubuntu focal-updates snapshot source is missing");
  require(lines.some((line) => line.includes(`[snapshot=${SNAPSHOT_ID}]`) && line.includes(" focal-security ")), "Ubuntu focal-security snapshot source is missing");
  require(lines.includes("deb [signed-by=/usr/share/keyrings/llvm-snapshot.gpg] https://apt.llvm.org/focal/ llvm-toolchain-focal-21 main"), "Pinned LLVM 21 source is missing");
  require(lines.includes("deb [signed-by=/usr/share/keyrings/ubuntu-toolchain-r.gpg] https://ppa.launchpadcontent.net/ubuntu-toolchain-r/test/ubuntu focal main"), "Toolchain PPA source is missing");
}

function readKeyFingerprint(container, path) {
  const output = runDocker(container, ["gpg", "--batch", "--show-keys", "--with-colons", path], `inspect ${path}`);
  const fingerprints = output
    .split(/\r?\n/)
    .filter((line) => line.startsWith("fpr:"))
    .map((line) => line.split(":")[9]);
  require(fingerprints.length > 0, `${path}: no signing fingerprint found`);
  return fingerprints[0];
}

function runDocker(container, arguments_, label) {
  return runCommand("docker", ["exec", container, ...arguments_], label);
}

function runCommand(executable, arguments_, label) {
  const result = spawnSync(executable, arguments_, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error(`${label} failed to start: ${result.error.message}`, { cause: result.error });
  require(result.status === 0, `${label} failed (${result.status}): ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseArguments(argv) {
  const values = Object.create(null);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    require(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), "Arguments must be --name value pairs");
    require(values[key] === undefined, `Duplicate argument: ${key}`);
    values[key] = value;
  }
  const allowed = new Set(["--base-manifest", "--provisioned-manifest", "--container", "--output"]);
  for (const key of Object.keys(values)) require(allowed.has(key), `Unknown argument: ${key}`);
  for (const key of allowed) require(values[key], USAGE.trim());
  return {
    baseManifest: values["--base-manifest"],
    provisionedManifest: values["--provisioned-manifest"],
    container: values["--container"],
    output: values["--output"],
  };
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const USAGE = `
Usage: node resolve-host-package-inputs.mjs --base-manifest <tsv> --provisioned-manifest <tsv> --container <name> --output <json>
`;

const invokedPath = process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const lock = resolveHostPackageInputs(options);
    writeFileSync(options.output, `${JSON.stringify(lock, null, 2)}\n`, { flag: "wx" });
    console.log(`OK ${lock.readiness.packageCount} host packages (${lock.readiness.archiveBytes} bytes): ${options.output}`);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  }
}
