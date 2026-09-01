# Android API 28 patched Bun experiment

This directory is an isolated, non-release supply-chain experiment for a future
AutoJs6 Bun runtime on Android 9 through 12L (API 28-32).

> Status: source backport and Android-release dependency identities verified;
> not build ready. No patched Bun binary has been built, validated, or approved
> for distribution from this directory. The unmodified official Bun artifacts
> remain the only runtime artifacts used by the plugin.

## Safety boundary

- This experiment never writes to `tools/bun-runtime/prebuilt`,
  `app/src/main/jniLibs`, or `tools/bun-runtime/runtime.lock.json`.
- Its variant is `bun-1.4.0-android-api28-patched-experimental`, which is
  intentionally different from the official release-artifact identity.
- Materialized `upstream-reference` patches remain review evidence only. The
  separately locked `downstream` series is applied only to an explicit Bun
  checkout or a temporary verification worktree; it is never substituted into
  the official plugin payload path.
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
ancestor of the PR base and is four commits behind it. All five immutable
compatibility commits were nevertheless found to apply cleanly to exact Bun
v1.4.0. Their deterministic downstream patch IDs match upstream, and the five
affected compatibility paths match the fixed PR head exactly. A sixth,
project-owned patch replaces Bun's movable Brotli `v1.1.0` input with resolved
commit `ed738e842d2fbdf2d6459e39267a633c4a9b2f5d`.

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
- The Ubuntu 20.04 OCI index and Linux amd64 manifest are digest-locked.
- The 663,987,688-byte NDK r27c archive matches Android's official SHA-1 and is
  additionally locked by locally verified SHA-256.

Every source URL and Git blob identifier used for those facts is recorded in
`experiment.lock.json` and is anchored to the full Bun commit, not a moving
branch or tag. `source-inputs.lock.json` expands all 22 dependencies enabled by
the Android release profile. Node.js headers and both Android WebKit prebuilts
also carry authoritative SHA-256 values. GitHub-generated source archive bytes
and the remaining toolchain downloads are not yet fully byte-locked.

## Directory contract

```text
api28/
  README.md                         this status and workflow
  experiment.lock.json              experiment identity, inputs, and blockers
  source-inputs.lock.json           resolved Android dependency identities
  config/*.configure.json           pinned Bun configure inputs for two ABIs
  patches/series.lock.json          immutable PR snapshot and downstream chain
  patches/upstream-reference/       verified immutable upstream patch evidence
  patches/downstream/               reviewed v1.4.0 source and supply-chain patches
  materialize-upstream-patches.ps1  online, immutable-source patch fetcher
  verify-experiment.mjs             offline static verifier
  verify-experiment.test.mjs        verifier regression tests
  verify-backport.mjs               clean-checkout deterministic replay verifier
```

## Current workflow

1. Run the offline manifest and policy checks:

   ```powershell
   node tools/bun-runtime/experimental/api28/verify-experiment.mjs
   node --test tools/bun-runtime/experimental/api28/verify-experiment.test.mjs
   ```

2. Re-materialize upstream review evidence from immutable `oven-sh/bun` commit
   URLs when auditing a fresh checkout:

   ```powershell
   pwsh -NoProfile -File tools/bun-runtime/experimental/api28/materialize-upstream-patches.ps1
   node tools/bun-runtime/experimental/api28/verify-experiment.mjs
   ```

   Existing files are never overwritten. Their byte count, SHA-256, and
   `From <commit>` header must match the lock before they are accepted.

3. Fetch the exact Bun release commit and fixed PR head into a dedicated Bun
   repository, then replay the reviewed series in a disposable worktree:

   ```powershell
   node tools/bun-runtime/experimental/api28/verify-backport.mjs `
     --bun-repository <absolute-path-to-bun-repository>
   ```

   The verifier rejects a wrong base, missing PR head, patch-ID drift,
   nondeterministic commit/tree output, a dirty replay, or any difference from
   the upstream head in the five compatibility paths. It also checks the 28
   locked build/dependency definition blobs against the replayed tree, verifies
   Brotli's pre-patch blob, and confirms that neither endpoint has a
   `.gitmodules` entry.

4. Once the remaining toolchain byte locks are complete, the two configure
   inputs are the recorded build entry. They use relative build/cache paths and
   expect `ANDROID_NDK_ROOT` to identify the locked NDK r27c installation:

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

The experiment intentionally leaves `buildReady` and `distributionReady` false.
At minimum, later work must:

- pin Ninja and every remaining APT, LLVM, rustup, bootstrap, and generated
  GitHub source archive byte input;
- materialize the locked dependencies and confirm their downloaded bytes;
- build both ABIs twice and explain every binary difference;
- run the full ELF, symbol-version, dependency, alignment, license, and source
  availability gates; and
- obtain API 28-32 runtime evidence without overwriting or relabeling the
  official runtime.
