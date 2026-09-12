# Experimental x86_64 large-page JavaScriptCore

This directory does not replace the official Bun lock, production APKs or the
nine-patch API 28 runtime evidence. The initial candidate is explicitly
diagnostic/incremental; any subsequent clean-build receipt is separate.
`distributionReady=false`. No binaries or source archives belong in this directory.

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

## Rebuild Bun from a clean checkout

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
Require real native x86_64 API 36 devices with 4096 and 16384-byte pages, two
process-restarted rounds of all eight tests, installed payload hashes, bounded
output/lifecycle behavior and cleanup. The first matrix is
[32/32](../../../../docs/compatibility/2026-09-12-m5-x86-16k-jsc.md).
This does not verify every JIT tier, all Wasm, stress/performance, 64 KiB Android,
remaining syscall/FD boundaries or a published signed Release/source asset set.
The official x86 runtime still has its 4 KiB guard, and the official minimum
Android version remains 13 (API 33).
