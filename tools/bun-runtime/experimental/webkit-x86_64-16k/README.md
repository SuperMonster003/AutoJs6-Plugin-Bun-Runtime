# Experimental x86_64 large-page JavaScriptCore

This directory does not replace the official Bun lock, production APKs or the
baseline API 28 runtime evidence. The initial candidate is explicitly
diagnostic/incremental; any subsequent clean-build receipt is separate.
`distributionReady=false`. No binaries or source archives belong in this directory.

## Current thirteen-patch workflow

The live `jsc16k` profile now requires `thirteen-patch-candidate.lock.json` for
Bun `e8b1296169a8e6f20c81e926dba6448afb25cd11` (`1.4.0+e8b129616`), including
the reload FD fallback in patch 13. Two fresh independent clean Bun builds have
actual driver exits 0/0 and identical complete 90,609,496-byte x86_64 payloads,
SHA-256 `17c7941a32669e0cf2d6915bf94d8cee8421c3df605eddcf2b493687f20e98a8`.
Both complete ELF audits pass. The [separate build archive](../../../../docs/compatibility/2026-09-13-m5-thirteen-patch-jsc-builds.json)
binds clean source, original driver/log/receipt/final-edge facts and all 21
unchanged build inputs, including their exact physical newline encodings.
The original two independent JSC library/config sets and upstream ICU are reused;
there are zero new WebKit/ICU builds. Historical nine/ten/twelve-patch candidates
and baseline runtime evidence retain their own bytes and acceptance.

Use the same fresh-checkout and offline preflight procedure below, followed by:

```bash
node tools/bun-runtime/experimental/webkit-x86_64-16k/record-thirteen-patch.mjs \
  /absolute/new-bun-1 /absolute/new-bun-2 \
  /absolute/original-jsc-1/build /absolute/original-jsc-2/build \
  /absolute/evidence/driver-run-1.json /absolute/evidence/driver-run-2.json
```

The new lock cannot inherit an older candidate's Binder or pressure results.
Build a separately bound APK pair and run the original eight Binder tests and
seven pressure modes twice at each API 36 x86 page size. Device results and
Release remain separate gates; the original pressure assets and budgets stay exact.

The [2026-09-14 thirteen-patch batch](../../../../docs/compatibility/2026-09-14-m5-thirteen-patch-jsc.md)
now passes 32/32 original Binder tests and 28/28 original pressure modes across
native x86 API36 4KiB/16KiB userspace pages. One APK pair binds 85 inputs to
`ba5418e`. The initial 16 KiB pressure round 2 fails with two DFG samples below the
unchanged three-sample gate; that full attempt is archived separately. One
identical-APK complete retry passes without settings, source or budget changes. Both package UIDs per suite and only the two owned AVDs are cleaned up. The 16KiB x86 userspace ABI is
emulated over 4KiB kernel mappings; baseline 560/128, ARM64 pressure, broader
runtime, long-running stability/performance and Release gates remain separate.

## Historical twelve-patch workflow

The historical `jsc16k` profile required a separate `twelve-patch-candidate.lock.json`
for Bun `06e518f73b4fccc6c3ffb17412ea166bf886bed0` (`1.4.0+06e518f73`). This includes
the caller/pending-signal repairs in patches 11 and 12. The nine-patch
`candidate.lock.json` and ten-patch `rebased-candidate.lock.json` retain their
original build and device evidence. Neither historical binary can accept this source.

Use two fresh twelve-patch Bun checkouts and the exact two original independent
WebKit build directories with `run-clean-bun.mjs`, using the five explicit paths
in the rebuild instructions below. Retain the actual driver exits, clean source
heads/trees, complete logs, final Ninja edges and output receipts. Schema 2 also
binds all sixteen API 28 build inputs alongside the five JSC recipes, requires
their unchanged before/after hashes and records the actual build intervals.
Keep those twenty-one inputs unchanged until both builds finish and are audited.
Driver receipts preserve physical input bytes. A separate exact newline map
reconstructs LF, CRLF or an explicitly recorded mixture from canonical Git text;
the complete reconstructed hash must match the original driver. The recorder
also rechecks the physical files before collecting, preserving both forms.

```bash
node tools/bun-runtime/experimental/webkit-x86_64-16k/record-twelve-patch.mjs \
  /absolute/new-bun-1 /absolute/new-bun-2 \
  /absolute/original-jsc-1/build /absolute/original-jsc-2/build \
  /absolute/evidence/driver-run-1.json /absolute/evidence/driver-run-2.json
```

The recorder refuses an existing lock, missing actual exits, repeated build
directories, source drift, historical bytes, incomplete final edges or changed
JSC libraries/config. Both fresh builds reuse the original ICU; they do not
constitute new WebKit or ICU compilation. Verify both complete ELF files before
building new APKs. The unchanged eight-test Binder and seven-mode pressure
fixtures require fresh, separately bound device results for this candidate.

The [2026-09-13 twelve-patch batch](../../../../docs/compatibility/2026-09-13-m5-twelve-patch-jsc.md)
now records both actual successful clean builds and the new `34edd4b9...a75b1ad`
payload's device results: 32/32 original Binder tests and 28/28 unchanged pressure
modes on native x86_64 API 36 with 4 KiB/16 KiB userspace pages. One APK pair binds
83 inputs to project commit `0210e82`. The initial 16 KiB low-memory service death
is archived separately; the identical-APK full retry passes without changed
settings or budgets. Both package UIDs and only the two owned AVDs are cleaned up.
The x86 16 KiB userspace ABI is emulated over 4 KiB kernel mappings. Samsung
twelve-patch baseline, broader pressure/runtime and Release gates remain separate.

## Historical ten-patch workflow

The commands in this section require their matching historical project revision.
The current build plan and live Binder profile use the thirteen-patch source above.

The historical isolated `jsc16k` Binder profile used a separate
`rebased-candidate.lock.json` for Bun `a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`
(`1.4.0+a9c76a599`). The original `candidate.lock.json`, its diagnostic origin and
all nine-patch reports remain unchanged. The new loader rejects historical Bun
bytes, a different source/tree, JSC input drift, incomplete or repeated build
receipts, and missing/nonzero actual driver exits.

Use two fresh ten-patch Bun checkouts and the two already verified independent
WebKit build directories. `run-clean-bun.mjs` uses the current API 28 build plan
and full offline preflight; run it once for each new checkout, with the five
explicit paths shown below. Preserve each actual driver exit, start/end times,
source head/tree/clean status, recipe hashes, complete log and output receipts.
The current local handoff records the capture commands and paths. Neither a
read-only Ninja check nor an old Bun output can replace this new build evidence.

After both succeed, the recorder takes six explicit paths:

```bash
node tools/bun-runtime/experimental/webkit-x86_64-16k/record-rebased.mjs \
  /absolute/new-bun-1 /absolute/new-bun-2 \
  /absolute/original-jsc-1/build /absolute/original-jsc-2/build \
  /absolute/evidence/driver-run-1.json /absolute/evidence/driver-run-2.json
```

It refuses to overwrite the new lock, checks both complete Bun binaries and ELF,
binds the actual retained driver/native/Ninja logs and final link/map/strip edges,
and validates the exact reused JSC libraries/config. The lock records **two new
clean Bun builds, zero new WebKit builds**, and two reused independent JSC builds.
ICU remains the exact original upstream input. Device and Release gates are
separate from this build evidence.

On 2026-09-13 both new builds completed with actual exit 0 and clean unchanged
Bun source. Both complete x86_64 binaries are 90,609,488 bytes, SHA-256
`a237dc8c13fbef6366a36769ea9a6d729fd24307b0df93bb051be8d997f8dcd5`.
The [new lock](rebased-candidate.lock.json) retains the two log/driver/Ninja/native
receipts and exact reused WebKit inputs. The ELF is an x86_64 PIE with at least
16 KiB PT_LOAD alignment. This build record alone does not accept any device run.

The subsequent [2026-09-13 device batch](../../../../docs/compatibility/2026-09-13-m5-ten-patch-jsc.md)
accepts these new bytes separately: 32/32 unchanged Binder tests and 28/28 original
pressure modes across API 36 native x86_64 4 KiB/16 KiB userspace pages. Both suites
reuse one APK pair whose 77 inputs match project commit `5738129`. The x86 16 KiB
userspace ABI is emulated over 4 KiB kernel mappings. No new ARM64, baseline matrix,
long-running soak, performance or Release acceptance is inferred.

The candidate fixes the pinned WebKit x86 page-size ceiling by compiling
`USE_64KB_PAGE_BLOCK=1`, keeping JIT/DFG/FTL and Wasm JIT enabled and retaining
Bun's external mimalloc integration. `record-candidate.mjs` validates every
required generated-config definition and records ELF, library, recipe and binary
hashes. `jsc-common.mjs` rejects recipe/byte/config/identity drift. A runtime JIT-off
switch cannot repair the compile-time page ceiling; C-loop-only builds are not
accepted as this candidate.

## Rebuild WebKit

Use the existing digest-locked Linux x86_64 API 28 builder under WSL2. The inputs
are the clean pinned WebKit Git checkout at
`0f966e81b78c84bb23213e391bc679c4ef83e56b`, the original extracted Android x86_64
WebKit bundle (ICU/headers), and the locked toolchain installation. Check the bundle
against `../api28/source-inputs.lock.json`: its source archive is
`bun-webkit-linux-amd64-android.tar.gz`, 466336923 bytes, SHA-256
`00f989d360d129a82aecedbe72d1e92eff0c5c539e825c283ac009f88a83095b`.
Do not use a previously modified large-page bundle as the upstream ICU input.
`verify-experiment.mjs`, the source materializer and the Bun clean-build preflight
provide the existing immutable input gates. No new package/toolchain download is
needed inside the container.

For two independent runs choose two new output directories; all container paths
remain identical. The following Bash variables denote explicit absolute paths:
`webkit_source`, `icu_bundle`, `jsc_output`, `toolchains`, `repository`.
Create `jsc_output` outside the source tree, with no existing build output.

```bash
docker run --rm --pull=never --network=none --read-only --cap-drop=ALL \
  --security-opt=no-new-privileges --hostname=autojs6-bun-build \
  --user "$(id -u):$(id -g)" --workdir /work \
  --tmpfs /tmp:rw,exec,nosuid,nodev,mode=1777 \
  --mount "type=bind,src=$webkit_source,dst=/webkit,readonly" \
  --mount "type=bind,src=$icu_bundle,dst=/icu,readonly" \
  --mount "type=bind,src=$jsc_output,dst=/work" \
  --mount "type=bind,src=$toolchains,dst=/opt/toolchains,readonly" \
  --mount "type=bind,src=$toolchains/android-ndk-r27c,dst=/opt/ndk,readonly" \
  --mount "type=bind,src=$repository/tools/bun-runtime/experimental/webkit-x86_64-16k,dst=/recipe,readonly" \
  autojs6/bun-host-locked@sha256:8f2f92e61f13defcfc91cd4a3722bbb55edced4163c6277fbc6375d05b6731aa \
  bash /recipe/build-webkit.sh
```

Verify the Docker image ID equals that digest before running. `build-webkit.sh`
sets the deterministic epoch, locale, prefix maps, API 28/Nehalem/no-AVX flags,
NDK resource links and explicit JIT/allocator options. It builds the same three
static libraries Bun consumes. It does not link the standalone `jsc` executable,
which would lack Bun's external mimalloc. Reused ICU is not claimed as a new ICU
source build. Compare all three libraries and `cmakeconfig.h`, not just Bun's
eventual exit status. The two WebKit output sets from this session match exactly.

## Historical nine-patch Bun rebuilds

The commands and results in this section describe the original nine-patch batch.
Use the matching historical project revision to reproduce that batch; the current
build plan pins thirteen patches and its results belong in the separate current lock above.

Use a fresh replay-verified nine-patch Bun checkout at
`7b9ac266888abda7ee6ec0b8ac11a74236420030`, with no `build/autojs6-api28` output.
The cache root must contain `source-prefetch`, `toolchain` and `cargo-build-std`
(the latter includes all 206 locked Cargo archives and its verified vendor/config).
Pass the separately prepared Bun registry cache with all 125 locked archives.

```bash
node tools/bun-runtime/experimental/webkit-x86_64-16k/run-clean-bun.mjs \
  /absolute/fresh-bun-checkout /absolute/offline-cache-root \
  /absolute/bun-input-cache /absolute/toolchains /absolute/jsc-output/build
```

This reuses the existing network-disabled container plan and complete source,
toolchain, Cargo and npm preflight. It configures the original Bun build, runs its
offline `WebKit` extraction target, replaces only the three locked JSC libraries
and generated config inside that new checkout, compiles all Bun/native/Rust
objects and rechecks those JSC members after linking. No original cache or
previous build is modified. A new `jsc-clean-build.json` is written only after
successful completion. Repeat with a second fresh Bun checkout and the second
independent WebKit build. Then:

```bash
node tools/bun-runtime/experimental/webkit-x86_64-16k/record-rebuilds.mjs \
  /absolute/new-rebuild-receipt.json /absolute/jsc-1/build /absolute/jsc-2/build \
  /absolute/clean-bun-1 /absolute/clean-bun-2
```

That gate requires both full Bun binaries to match each other **and** the exact
Binder-tested diagnostic candidate. `relink-bun.sh` is retained only to reproduce
the original incremental diagnostic workflow; it cannot be called a clean build.
The [2026-09-12 clean-build receipt](../../../../docs/compatibility/2026-09-12-m5-x86-16k-clean-builds.json)
passes that gate: both WebKit and full Bun builds match, including the exact
Binder-tested binary. The candidate lock's original `cleanBunBuilds: 0` is a
historical origin field, not a replacement for this subsequent two-build receipt.

## Device acceptance

Use the [isolated Binder module](../api28/binder/README.md) and its `jsc16k` profile.
Require native x86_64 API 36 execution with 4096 and 16384-byte userspace page ABIs, two
process-restarted rounds of all eight tests, installed payload hashes, bounded
output/lifecycle behavior and cleanup. The first matrix is
[32/32](../../../../docs/compatibility/2026-09-12-m5-x86-16k-jsc.md).
That original Binder suite does not verify every JIT tier, all Wasm, stress/performance, 64 KiB Android,
remaining syscall/FD boundaries or a published signed Release/source asset set.
The official x86 runtime still has its 4 KiB guard, and the official minimum
Android version remains 13 (API 33).

The separate [bounded pressure suite](pressure/README.md) now passes seven modes
twice in both environments (28/28), with actual LLInt/Baseline/DFG/FTL sampled
frames, GC, Wasm execution/memory growth and 64 normal worker exits. The same APKs
also repeat the original Binder suite (32/32). See the
[pressure report](../../../../docs/compatibility/2026-09-12-m5-x86-jsc-pressure.md).
The x86 16 KiB userspace ABI is emulated over 4 KiB kernel mappings; the new fixture
records both, requiring ELF AT_PAGESZ, Android sysconf and getconf to agree. Native
x86 execution is distinct from native ARM64 hardware 16 KiB acceptance.
