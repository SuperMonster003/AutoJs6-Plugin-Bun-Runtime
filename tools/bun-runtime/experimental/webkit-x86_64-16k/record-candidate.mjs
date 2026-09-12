import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { inspectElfBuffer } from "../api28/verify-built-runtime.mjs";

export const REQUIRED_CONFIG = Object.freeze({ USE_64KB_PAGE_BLOCK: 1, ENABLE_JIT: 1,
    ENABLE_DFG_JIT: 1, ENABLE_FTL_JIT: 1, ENABLE_C_LOOP: 0, ENABLE_SAMPLING_PROFILER: 1,
    USE_MIMALLOC: 1, USE_EXTERNAL_MIMALLOC: 1, USE_SYSTEM_MALLOC: 0, USE_ISO_MALLOC: 1,
    ENABLE_WEBASSEMBLY: 1, ENABLE_WEBASSEMBLY_BBQJIT: 1, ENABLE_WEBASSEMBLY_OMGJIT: 1 });
export function verifyJscConfig(text) {
    for (const [key, value] of Object.entries(REQUIRED_CONFIG)) {
        const definitions = [...text.matchAll(new RegExp(`^#define ${key} (\\d+)\\r?$`, "gm"))];
        assert.equal(definitions.length, 1, `Exactly one ${key} definition required`);
        assert.equal(Number(definitions[0][1]), value, `Wrong large-page JIT setting: ${key}`);
    }
    return REQUIRED_CONFIG;
}
const facts = path => {
    const data = readFileSync(path);
    return { bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [runtime, build] = process.argv.slice(2);
    assert(runtime && build && process.argv.length === 4);
    const here = dirname(fileURLToPath(import.meta.url));
    const configPath = join(build, "cmakeconfig.h");
    const config = verifyJscConfig(readFileSync(configPath, "utf8"));
    const elf = inspectElfBuffer(readFileSync(runtime));
    assert.equal(elf.machine, 62);
    assert.equal(elf.pie, true);
    assert(elf.minimumLoadAlignment >= 16384);
    writeFileSync(join(here, "candidate.lock.json"), JSON.stringify({ schemaVersion: 1,
        kind: "diagnostic-incremental-large-page-jsc-candidate", distributionReady: false,
        officialArtifact: false, cleanBunBuilds: 0, evidenceDate: "2026-09-12",
        variant: "bun-1.4.0-android-api28-webkit64k-experimental",
        bunCommit: "7b9ac266888abda7ee6ec0b8ac11a74236420030", revision: "1.4.0+7b9ac2668",
        webkitCommit: "0f966e81b78c84bb23213e391bc679c4ef83e56b",
        hostImage: "sha256:8f2f92e61f13defcfc91cd4a3722bbb55edced4163c6277fbc6375d05b6731aa",
        sourceDateEpoch: 1788278400, x86PageSizeCeiling: 65536, config,
        generatedConfig: facts(configPath), libraries: Object.fromEntries(["libJavaScriptCore.a", "libWTF.a", "libbmalloc.a"].map(name => [name, facts(join(build, "lib", name))])),
        recipes: ["build-webkit.sh", "relink-bun.sh"].map(path => ({ path, ...facts(join(here, path)) })),
        artifact: { abi: "x86_64", ...facts(runtime), elf },
        limits: ["JSC and its generated configuration rebuilt; unchanged upstream ICU reused", "Bun C/C++ recompiled and relinked in a dedicated copy; not a clean reproducibility gate", "No device or Binder success inferred from compilation", "Official and nine-patch runtime locks unchanged"]
    }, null, 2) + "\n", { flag: "wx" });
}
