# Android API 28 patched Bun experiment

This directory is an isolated, non-release supply-chain experiment for a future
AutoJs6 Bun runtime on Android 9 through 12L (API 28-32).

> Status: source backport, Android-release dependency bytes, immutable direct
> toolchain downloads, and Cargo/Bun registry inputs verified; not build ready.
> No patched Bun binary has been built, validated, or approved for distribution
> from this directory. The unmodified official Bun artifacts remain the only
> runtime artifacts used by the plugin.

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
the Android release profile. All 19 exact GitHub archive URLs were downloaded,
checked for a single safe top-level directory, and locked by byte count and
SHA-256. Node.js headers and both Android WebKit prebuilts also carry
authoritative SHA-256 values.

`toolchain-inputs.lock.json` separately locks 17 immutable direct downloads:
12 build artifacts and 5 checksum/provenance documents, totalling
1,024,309,832 bytes. This includes the NDK, CMake, bootstrap Bun, Node, Ninja,
rustup, the minimal pinned Rust host components, `rust-src`, and both Android
Rust standard libraries. The rolling rustup discovery manifest is deliberately
not a reproducible input; the lock uses the versioned rustup 1.29.1 archive and
its versioned checksum instead.

Those direct locks do not make the complete build offline. The separate
`cargo-inputs.lock.json` now locks all 181 crates.io archives by canonical URL,
exact byte count, and Cargo.lock SHA-256, totalling 26,354,160 bytes. Its
materializer safely reproduces a versioned Cargo directory source with
per-file checksums. Pinned Cargo 1.99.0-nightly loaded the full Bun workspace
with `--locked --offline`, that source replacement, and an otherwise empty
Cargo home.

`bun-inputs.lock.json` resolves the three frozen Bun installs from 172 external
lock references to 164 unique identities, then selects exactly 125 unique npm
archives for Linux x64 after excluding 39 platform-only packages. Those
archives total 31,498,870 bytes and are locked by the Bun lockfiles' SHA-512,
project-recorded SHA-256, exact bytes, safe archive root, extracted file-tree
digest, and Bun 1.3.13 cache directory. Both x64 GNU and musl oxlint bindings
are retained because Bun's lockfile records OS and CPU but no libc condition.
Only `esbuild@0.21.5` has an install lifecycle script; Bun reports it as
default-trusted and reports no untrusted scripted dependencies.

The materializer reproduced a minimal cache containing only those 125 version
directories and no alias symlinks. A fresh detached checkout completed all
three exact `bun install --frozen-lockfile` commands in the digest-locked
Ubuntu 20.04 container under `--network none`, with that cache mounted
read-only from a mode-preserving WSL2 ext4 filesystem. Exact executable modes,
all three lockfiles, and the Git tree remained unchanged, and the installed
esbuild reported `0.21.5`. The mutable Ubuntu/PPA/apt.llvm.org package closure
and exact GCC/LLVM package files remain open, as does a full network-disabled
configure and Ninja run.

## Directory contract

```text
api28/
  README.md                         this status and workflow
  experiment.lock.json              experiment identity, inputs, and blockers
  source-inputs.lock.json           resolved Android dependency identities
  toolchain-inputs.lock.json        direct toolchain bytes and host-package gap
  build-network-inputs.lock.json    Cargo/Bun lockfile closure and offline gap
  cargo-inputs.lock.json            exact crates.io archive and directory-source lock
  bun-inputs.lock.json              exact npm archives and minimal Bun cache lock
  config/*.configure.json           pinned Bun configure inputs for two ABIs
  patches/series.lock.json          immutable PR snapshot and downstream chain
  patches/upstream-reference/       verified immutable upstream patch evidence
  patches/downstream/               reviewed v1.4.0 source and supply-chain patches
  build-experiment.mjs              read-only plan, offline preflight, gated build
  materialize-source-inputs.mjs     exact Bun prefetch-layout source fetcher
  materialize-toolchain-inputs.mjs  exact direct-toolchain download fetcher
  materialize-cargo-inputs.mjs      Cargo archive and offline directory-source tool
  materialize-bun-inputs.mjs        npm archive and minimal offline-cache tool
  materialize-upstream-patches.ps1  online, immutable-source patch fetcher
  verify-experiment.mjs             offline static verifier
  *.test.mjs                        verifier/materializer/build-gate regressions
  verify-backport.mjs               clean-checkout deterministic replay verifier
```

## Current workflow

1. Run the offline manifest and policy checks:

   ```powershell
   node tools/bun-runtime/experimental/api28/verify-experiment.mjs
   node tools/bun-runtime/experimental/api28/build-experiment.mjs
   node --test `
     tools/bun-runtime/experimental/api28/verify-experiment.test.mjs `
     tools/bun-runtime/experimental/api28/materialize-bun-inputs.test.mjs `
     tools/bun-runtime/experimental/api28/materialize-cargo-inputs.test.mjs `
     tools/bun-runtime/experimental/api28/materialize-source-inputs.test.mjs `
     tools/bun-runtime/experimental/api28/materialize-toolchain-inputs.test.mjs `
     tools/bun-runtime/experimental/api28/build-experiment.test.mjs
   ```

2. Materialize immutable source, direct-toolchain, Cargo, and Bun registry
   inputs only into explicit cache directories. Existing files are accepted
   only after exact verification and are never overwritten:

   ```powershell
   node tools/bun-runtime/experimental/api28/materialize-source-inputs.mjs `
     --output-directory <absolute-source-prefetch-directory> `
     --group github-archives

   node tools/bun-runtime/experimental/api28/materialize-toolchain-inputs.mjs `
     --output-directory <absolute-toolchain-directory> `
     --group provenance

   node tools/bun-runtime/experimental/api28/materialize-cargo-inputs.mjs `
     --output-directory <absolute-cargo-input-directory> `
     --prepare-directory-source

   wsl node tools/bun-runtime/experimental/api28/materialize-bun-inputs.mjs `
     --output-directory <absolute-bun-input-directory> `
     --prepare-cache
   ```

   Source groups are `github-archives`, `source-prebuilts`, and `all-source`.
   Toolchain groups are `bootstrap`, `android-ndk`, `build`, `provenance`, and
   `all`. Add `--offline` to prove that a previously populated cache is
   complete without making a network request. Source inputs use Bun's exact
   `by-url/<first-32-URL-SHA256>` prefetch layout. The Cargo and Bun tools reject
   unsafe tar paths, links, and special files. The Cargo tool creates
   `vendor/<name>-<version>` plus `.cargo-checksum.json` and writes a relative
   source-replacement config under `cargo-home/config.toml`. Bun cache creation
   requires a mode-preserving Linux filesystem (for WSL, use the distro
   filesystem such as `/home/...`, not DrvFS `/mnt/<drive>`); it creates only
   the locked version directories under `cache/`. None of these tools writes to
   a plugin runtime directory.

   When intentionally refreshing a registry lock after an upstream change, the
   explicit `--resolve` mode requires a clean checkout at the deterministic
   downstream commit and writes its candidate lock to a new caller-selected
   path. Bun resolution additionally requires a cache populated once by the
   pinned bootstrap Bun so every extracted archive can be compared with Bun's
   observed cache layout. Review that external candidate and repeat the
   network-disabled replay before updating the checked-in lock.

3. Re-materialize upstream review evidence from immutable `oven-sh/bun` commit
   URLs when auditing a fresh checkout:

   ```powershell
   pwsh -NoProfile -File tools/bun-runtime/experimental/api28/materialize-upstream-patches.ps1
   node tools/bun-runtime/experimental/api28/verify-experiment.mjs
   ```

   Existing files are never overwritten. Their byte count, SHA-256, and
   `From <commit>` header must match the lock before they are accepted.

4. Fetch the exact Bun release commit and fixed PR head into a dedicated Bun
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

5. Generate the recorded two-ABI build plan. This is read-only and succeeds
   even while the open gates are being worked through:

   ```powershell
   node tools/bun-runtime/experimental/api28/build-experiment.mjs
   node tools/bun-runtime/experimental/api28/build-experiment.mjs --abi x86_64
   ```

6. The same entry has a non-mutating full-input preflight. It requires a clean
   Bun checkout at the deterministic downstream head, no existing experimental
   build root, all 22 source inputs, all 17 direct toolchain inputs, all 181
   Cargo archives and their checksum-verified directory source, all 125 Bun
   registry archives and their verified minimal cache, and an installed NDK
   r27c:

   ```powershell
   node tools/bun-runtime/experimental/api28/build-experiment.mjs --preflight `
     --bun-repository <absolute-clean-patched-bun-repository> `
     --bun-input-directory <absolute-bun-input-directory> `
     --cargo-input-directory <absolute-cargo-input-directory> `
     --source-prefetch-directory <absolute-source-prefetch-directory> `
     --toolchain-directory <absolute-toolchain-directory> `
     --android-ndk-root <absolute-installed-ndk-r27c-directory>
   ```

   `--execute` additionally checks Linux x86_64 plus exact Node, bootstrap Bun,
   CMake, Ninja, Clang, Rust, and Cargo versions before it can configure or run
   Ninja. It is hard-locked while `buildReady` is false, so no current command
   can accidentally turn this incomplete supply chain into an untracked Bun
   executable. The future execution path sets the locked source prefetch, Bun
   install cache, Cargo home and offline policy, NDK, Rust toolchain,
   `SOURCE_DATE_EPOCH`, locale, and timezone for both ABIs.

## Gates that remain open

The experiment intentionally leaves `buildReady` and `distributionReady` false.
At minimum, later work must:

- snapshot-pin every Ubuntu/PPA/apt.llvm.org package and the exact GCC/LLVM
  package closure, then lock the resulting Linux amd64 OCI image;
- run the full preflight and prove configure plus Ninja make no unrecorded
  network request;
- build both ABIs twice and explain every binary difference;
- run the full ELF, symbol-version, dependency, alignment, license, and source
  availability gates; and
- obtain API 28-32 runtime evidence without overwriting or relabeling the
  official runtime.
