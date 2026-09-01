# Android API 28 patched Bun experiment

This directory is an isolated, non-release supply-chain experiment for a future
AutoJs6 Bun runtime on Android 9 through 12L (API 28-32).

> Status: scaffolding only. No patched Bun binary has been built, validated, or
> approved for distribution from this directory. The unmodified official Bun
> artifacts remain the only runtime artifacts used by the plugin.

## Safety boundary

- This experiment never writes to `tools/bun-runtime/prebuilt`,
  `app/src/main/jniLibs`, or `tools/bun-runtime/runtime.lock.json`.
- Its variant is `bun-1.4.0-android-api28-patched-experimental`, which is
  intentionally different from the official release-artifact identity.
- Materialized upstream patches are reference text only. They are not an
  application-ready backport and are never applied automatically.
- Any future executable must be staged under a separately named experimental
  output root and must receive its own lock identity, hashes, licenses, static
  ELF audit, and API 28-32 device evidence before packaging is considered.

## Pinned facts

The experiment's application target is Bun `bun-v1.4.0`, commit
`34cbb9a40b4bd1bd767d134a7065e66c2432a676`.

[Bun PR #39775](https://github.com/oven-sh/bun/pull/39775) was still open and
unmerged when this snapshot was recorded on 2026-09-01. Its five commits form a
continuous series from base `01c4e2fd6d94adf2e9157d1e6329c328eb37dfae`
to head `d6171ce7e2efa4f3eb3e6f5a099da922df15bc0c`. The release commit is an
ancestor of the PR base and is four commits behind it. Consequently, the files
listed in `patches/series.lock.json` are immutable upstream references, not a
claim that the PR applies cleanly to Bun v1.4.0.

The Bun source at the pinned release commit supplies the initial toolchain and
target facts:

- `scripts/build/config.ts` sets the Android API default to 28.
- `scripts/build/profiles.ts` defines the `android-release` profile.
- `.buildkite/Dockerfile` uses Android NDK r27c, LLVM 21.1.8, CMake 3.30.5,
  and bootstrap Bun 1.3.13.
- `rust-toolchain.toml` pins Rust `nightly-2026-07-20` and both Android Rust
  targets.
- `scripts/build/flags.ts` targets ARMv8-A plus CRC for AArch64 and Nehalem
  without AVX for baseline x86_64.

Every source URL and Git blob identifier used for those facts is recorded in
`experiment.lock.json` and is anchored to the full Bun commit, not a moving
branch or tag.

## Directory contract

```text
api28/
  README.md                         this status and workflow
  experiment.lock.json              experiment identity, inputs, and blockers
  config/*.configure.json           pinned Bun configure inputs for two ABIs
  patches/series.lock.json          immutable PR snapshot and backport state
  patches/upstream-reference/       optional verified copies of upstream patches
  patches/downstream/               future reviewed v1.4.0 backport patches
  materialize-upstream-patches.ps1  online, immutable-source patch fetcher
  verify-experiment.mjs             offline static verifier
  verify-experiment.test.mjs        verifier regression tests
```

## Current workflow

1. Run the offline manifest and policy checks:

   ```powershell
   node tools/bun-runtime/experimental/api28/verify-experiment.mjs
   node --test tools/bun-runtime/experimental/api28/verify-experiment.test.mjs
   ```

2. If the exact upstream review patches are needed, materialize them from the
   immutable `oven-sh/bun` commit URLs. This is the only networked operation in
   the current scaffold:

   ```powershell
   pwsh -NoProfile -File tools/bun-runtime/experimental/api28/materialize-upstream-patches.ps1
   node tools/bun-runtime/experimental/api28/verify-experiment.mjs
   ```

   Existing files are never overwritten. Their byte count, SHA-256, and
   `From <commit>` header must match the lock before they are accepted.

3. Create a dedicated branch from the exact Bun v1.4.0 commit and manually
   review/backport the upstream behavior. Generate numbered downstream patches
   against that release commit, then add each local path, SHA-256, purpose,
   license impact, and review evidence to `patches/series.lock.json`.

4. Only after the downstream series applies to a clean v1.4.0 checkout may the
   two configure inputs be used. They deliberately use relative build/cache
   paths and expect `ANDROID_NDK_ROOT` to identify an NDK r27c installation:

   ```powershell
   bun scripts/build.ts --config-file=<absolute-path-to-this-directory>/config/arm64-v8a.configure.json
   ninja -C build/autojs6-api28/arm64-v8a

   bun scripts/build.ts --config-file=<absolute-path-to-this-directory>/config/x86_64.configure.json
   ninja -C build/autojs6-api28/x86_64
   ```

   These commands are recorded build intentions, not a report that a build has
   succeeded. Run each ABI from a fresh source checkout for reproducibility
   comparisons.

## Gates that remain open

This first step intentionally leaves `buildReady` and `distributionReady`
false. At minimum, later work must:

- produce and review the v1.4.0-specific downstream patch series;
- pin the host container by digest, the NDK archive by checksum, Ninja and any
  other previously floating tool inputs;
- materialize and audit Bun's dependency/WebKit inputs from the pinned source;
- add an application check against a clean Bun checkout;
- build both ABIs twice and explain every binary difference;
- run the full ELF, symbol-version, dependency, alignment, license, and source
  availability gates; and
- obtain API 28-32 runtime evidence without overwriting or relabeling the
  official runtime.
