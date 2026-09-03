# Android API 28 patched Bun experiment

This directory is an isolated, non-release supply-chain experiment for a future
AutoJs6 Bun runtime on Android 9 through 12L (API 28-32).

> Status: the complete source, direct-toolchain, Cargo/Bun registry, host-package,
> host-image, license, and corresponding-source input closure is locked and
> `buildReady` is true. Two independent
> clean builds produced byte-for-byte identical ARM64 and x86_64 executables,
> and both passed the locked static ELF audit. The experiment remains
> `distributionReady: false`; no patched executable is stored or packaged here,
> and the unmodified official Bun artifacts remain the plugin's only payloads.

## Safety boundary

- This experiment never writes to `tools/bun-runtime/prebuilt`,
  `app/src/main/jniLibs`, or `tools/bun-runtime/runtime.lock.json`.
- Its variant is `bun-1.4.0-android-api28-patched-experimental`, which is
  intentionally different from the official release-artifact identity.
- Materialized `upstream-reference` patches remain review evidence only. The
  separately locked `downstream` series is applied only to an explicit Bun
  checkout or a temporary verification worktree; it is never substituted into
  the official plugin payload path.
- Built executables remain outside this repository. `runtime-evidence.json`
  records the experimental variant, two-run hashes, build IDs, and ELF facts,
  but is not an APK lock or release approval. Packaging still requires a
  separately named experimental output, publication of the matching source
  set, release-specific legal review, and API 28-32 application-process
  evidence.

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

`host-package-inputs.lock.json` closes the remaining Ubuntu/PPA/apt.llvm.org
layer with 155 exact `.deb` archives totalling 422,223,096 bytes. The installer
uses `dpkg` only against those local files, checks the resulting 243-package
manifest, normalizes Python bytecode, and never resolves packages during the
image build. Two clean no-cache image builds, with the base pull disabled and
the build step on `--network none`, produced the same OCI manifest
`sha256:8f2f92e61f13defcfc91cd4a3722bbb55edced4163c6277fbc6375d05b6731aa`
and config digest. `host-image-evidence.json` records the exact input scripts,
rootfs diff IDs, installed-package manifest, and compiler versions.

The separate `cargo-inputs.lock.json` combines the Bun workspace lock with the
pinned Rust standard-library lock. Their 211 registry references resolve to
206 unique crates.io archives, including 5 shared identities, totalling
28,919,277 bytes. Its materializer safely reproduces a versioned Cargo
directory source with per-file checksums. Pinned Cargo 1.99.0-nightly loaded
both lockfiles with `--locked --offline`, that source replacement, and an
otherwise empty Cargo home.

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
directories and no alias symlinks. Fresh detached checkouts completed all
three exact `bun install --frozen-lockfile` commands in the locked Ubuntu 20.04
host image under `--network none`, with that cache mounted read-only from a
mode-preserving WSL2 ext4 filesystem. Exact executable modes, all three
lockfiles, and the Git tree remained unchanged, and the installed esbuild
reported `0.21.5`.

`run-locked-build.mjs` is the reproducible container boundary. It verifies the
local image ID before launch, disables pulls and networking, makes the root
filesystem read-only, drops capabilities, enables `no-new-privileges`, mounts
every immutable input read-only, disables ccache, fixes the hostname and
`/work/bun` path, and allows writes only to the clean patched checkout. Two
independent checkouts completed both ABI builds. The outputs were identical
across runs: ARM64 is 87,923,304 bytes with SHA-256
`37bb5553c999ba8bc981199dadc5e3cfd9a476a2d4ebb8565132db83728a2dc6`;
x86_64 is 90,449,696 bytes with SHA-256
`b079388f098c8f40cb14be7a6d343cf8fcb56d3d6694885e1b301f2cf7f89036`.
The executables remain external evidence and are not copied into `jniLibs`.

`verify-built-runtime.mjs` independently parses ELF64 bytes without relying on
host `readelf`. It enforces PIE, the Android linker, non-executable stack, no
writable/executable load segment, Android API 28/NDK r27c notes, the exact
`libc.so`/`libm.so`/`libdl.so` dependency order, bionic symbol versions,
Android RELR, 16 KiB minimum `PT_LOAD` alignment, build IDs, dynamic-symbol
fingerprints, retained symbol-table fingerprints, and absence of debug
sections. Both reproducible outputs passed. The ARM64 output also passed five
limited direct-shell probes on real API 28 and API 31 devices; that evidence is
explicitly not a Binder or Android application-process result.

`distribution-source.lock.json` links those two experimental output hashes to
the exact 64,069,192-byte Bun base-source archive, all six downstream patches,
the pinned WebKit/JSC Git tag, commit, tree and license files, and every locked
native, Cargo, and npm source archive needed by the build. Four matching
JavaScriptCore/WebCore license texts are bundled beside Bun's existing upstream
notice. The full WebKit checkout was verified at 463,115 tracked files; GitHub
codeload refuses to generate an archive for that tree, so the source verifier
uses the immutable Git tag and tree rather than inventing an archive digest.
This closes the auditable input inventory, not the release gate: no matching
source bundle has been published and no legal approval is claimed.

## Directory contract

```text
api28/
  README.md                         this status and workflow
  experiment.lock.json              experiment identity, inputs, and blockers
  source-inputs.lock.json           resolved Android dependency identities
  toolchain-inputs.lock.json        direct toolchain and host-image identities
  build-network-inputs.lock.json    verified Cargo/Bun offline closure
  cargo-inputs.lock.json            exact crates.io archive and directory-source lock
  bun-inputs.lock.json              exact npm archives and minimal Bun cache lock
  host-package-inputs.lock.json     exact Ubuntu/PPA/LLVM .deb closure
  host-image-evidence.json          repeated OCI-image construction evidence
  runtime-evidence.json             repeated binary hashes and ELF audit facts
  distribution-source.lock.json    exact license and corresponding-source inputs
  host-package.Dockerfile           networkless local-package host-image recipe
  install-host-packages.sh          deterministic local .deb installer
  normalize-host-python-bytecode.py reproducible Python-bytecode normalization
  config/*.configure.json           pinned Bun configure inputs for two ABIs
  patches/series.lock.json          immutable PR snapshot and downstream chain
  patches/upstream-reference/       verified immutable upstream patch evidence
  patches/downstream/               reviewed v1.4.0 source and supply-chain patches
  build-experiment.mjs              read-only plan, offline preflight, gated build
  build-host-image.mjs              locked host-image builder and evidence recorder
  run-locked-build.mjs              isolated digest-locked container build entry
  materialize-source-inputs.mjs     exact Bun prefetch-layout source fetcher
  materialize-toolchain-inputs.mjs  exact direct-toolchain download fetcher
  materialize-cargo-inputs.mjs      Cargo archive and offline directory-source tool
  materialize-bun-inputs.mjs        npm archive and minimal offline-cache tool
  materialize-host-package-inputs.mjs exact .deb archive materializer
  materialize-distribution-source.mjs exact Bun base-source materializer
  materialize-upstream-patches.ps1  online, immutable-source patch fetcher
  verify-experiment.mjs             offline static verifier
  verify-built-runtime.mjs          two-run equality and pure-Node ELF auditor
  verify-distribution-source.mjs    source-closure and packaged-license verifier
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
     tools/bun-runtime/experimental/api28/materialize-host-package-inputs.test.mjs `
     tools/bun-runtime/experimental/api28/materialize-distribution-source.test.mjs `
     tools/bun-runtime/experimental/api28/build-host-image.test.mjs `
     tools/bun-runtime/experimental/api28/build-experiment.test.mjs `
     tools/bun-runtime/experimental/api28/run-locked-build.test.mjs `
     tools/bun-runtime/experimental/api28/verify-built-runtime.test.mjs `
     tools/bun-runtime/experimental/api28/verify-distribution-source.test.mjs
   ```

2. Materialize immutable source, direct-toolchain, Cargo, Bun registry, and
   host-package inputs only into explicit cache directories. Existing files
   are accepted
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

   node tools/bun-runtime/experimental/api28/materialize-host-package-inputs.mjs `
     --output-directory <absolute-host-package-directory>
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
   build root, all 22 source inputs, all 17 direct toolchain inputs, all 206
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
   Ninja. It sets the locked source prefetch, Bun install cache, Cargo home and
   offline policy, NDK, Rust toolchain, `SOURCE_DATE_EPOCH`, locale, and
   timezone for both ABIs. Prefer the container entry below for a recorded
   build because it also enforces the host-image and mount boundary.

7. Reproduce the host image only from the exact local `.deb` set, then run a
   clean build through the locked container boundary. The image command writes
   a candidate evidence file outside the repository; compare it with
   `host-image-evidence.json` before intentionally updating a lock.

   ```powershell
   node tools/bun-runtime/experimental/api28/build-host-image.mjs `
     --repository-root <absolute-repository-root> `
     --host-package-directory <absolute-host-package-directory> `
     --image-tag <local-image-tag> `
     --evidence-output <absolute-candidate-json> `
     --no-cache

   wsl node tools/bun-runtime/experimental/api28/run-locked-build.mjs `
     --execute --abi all `
     --bun-repository <absolute-clean-patched-bun-repository> `
     --bun-input-directory <absolute-bun-input-directory> `
     --cargo-input-directory <absolute-cargo-input-directory> `
     --source-prefetch-directory <absolute-source-prefetch-directory> `
     --toolchain-input-directory <absolute-toolchain-input-directory> `
     --toolchain-install-directory <absolute-toolchain-install-directory> `
     --android-ndk-root <absolute-installed-ndk-r27c-directory>
   ```

   Use an independent clean patched checkout for each repeat. `--pull=never`,
   `--network=none`, read-only root/input mounts, disabled ccache, and the fixed
   `/work/bun` path are mandatory and emitted in the plan before execution.

8. Compare two completed output sets against the checked-in evidence and rerun
   the full byte-level ELF audit:

   ```powershell
   wsl node tools/bun-runtime/experimental/api28/verify-built-runtime.mjs `
     --arm64 <absolute-run-1/bun-arm64-v8a> `
     --x86 <absolute-run-1/bun-x86_64> `
     --repeat-arm64 <absolute-run-2/bun-arm64-v8a> `
     --repeat-x86 <absolute-run-2/bun-x86_64>
   ```

9. Materialize the exact Bun base source and verify it together with a clean
   checkout of the fixed WebKit/JSC tag. The latter is intentionally a Git
   checkout because GitHub codeload returns HTTP 422 for this WebKit tree:

   ```powershell
   node tools/bun-runtime/experimental/api28/materialize-distribution-source.mjs `
     --output-directory <absolute-distribution-source-directory>

   git clone --depth 1 --single-branch `
     --branch autobuild-0f966e81b78c84bb23213e391bc679c4ef83e56b `
     https://github.com/oven-sh/WebKit.git `
     <absolute-clean-webkit-checkout>

   wsl node tools/bun-runtime/experimental/api28/verify-distribution-source.mjs `
     --bun-source-archive <absolute-bun-base-source.tar.gz> `
     --webkit-repository <absolute-clean-webkit-checkout>
   ```

   The verifier checks the Bun archive bytes/root/license, WebKit remote/tag/
   commit/tree/cleanliness/file count, source license hashes, packaged license
   copies, downstream patch licensing records, runtime hashes, and the exact
   native/Cargo/npm source closures. A release process must additionally copy
   or publish the complete matching source set; passing this command alone is
   not legal approval.

## Gates that remain open

The experiment now has `buildReady: true`, `runtimeProduced: true`, and
`distributionReady: false`. Build-input closure, two-run binary reproducibility,
and static ELF auditing are complete. At minimum, later work must:

- publish or accompany the patched binary with the already locked matching
  Bun/WebKit/JSC and dependency source set, downstream patches, license texts,
  and complete build instructions, then perform a release-specific legal
  review;
- create a separately identified experimental APK without replacing or
  relabeling the official runtime;
- run installed-payload and full Binder instrumentation from the application
  process on API 28, 29, 30, 31, and 32 for the intended ABIs;
- validate timeout, cancellation, output limits, process recovery, spawn/FD
  isolation, and every relevant syscall fallback; and
- repeat ELF, APK ZIP, installed-payload, and native 16 KiB execution gates for
  any artifact proposed for distribution.
