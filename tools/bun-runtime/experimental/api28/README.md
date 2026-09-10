# Android API 28 patched Bun experiment

This directory is an isolated, non-release supply-chain experiment for a future
AutoJs6 Bun runtime on Android 9 through 12L (API 28-32).

> Status: the complete source, direct-toolchain, Cargo/Bun registry, host-package,
> host-image, license, and corresponding-source input closure is locked and
> `buildReady` is true. Two independent
> clean builds produced byte-for-byte identical ARM64 and x86_64 executables,
> and both passed the locked static ELF audit. The experiment remains
> `distributionReady: false` until a matching experimental APK passes its
> application-process gates and is actually published. Patched executables stay
> outside Git; the opt-in [test-only app probe](app-probe/README.md) packages them
> only into external test APKs. The unmodified official Bun artifacts remain
> the production plugin's only Bun payloads; its separately locked first-party
> supervisor is also reused by the test-only probe.

The current eight-patch revision `1.4.0+a260ef308` fixes the Linux spawn FD
fallback independently of the startup helper. Two clean builds per ABI reproduce
identical bytes. The unchanged **20-probe suite passes twice in all six native
environments, totaling 240/240**: arm64 API 28/31/33/35 and x86_64 API 33 with
4096-byte pages, plus Samsung SM-A566B arm64 API 36 with 16384-byte pages.
All 24 lowered-limit cases now isolate the sentinel in both child APIs; all
36 forcible lifecycle cases pass at 301-329 ms. Packages were uninstalled with
zero UID processes, and the owned AVD was shut down. The pre-existing user AVD
was left running. See the [spawn fix report](../../../../docs/compatibility/2026-09-10-m3-spawn-fd-fix.json).
This is scoped test-only application evidence, not full experimental Binder,
stable Android 9 support, native x86_64 16 KiB support or a published patched APK.

### Historical application evidence

The latest [scoped syscall follow-up](../../../../docs/compatibility/2026-09-10-m3-syscall-fallbacks.md)
keeps those runtime bytes unchanged and expands the fixture suite to 23.
Five native 4 KiB environments pass two rounds, totaling 230/230, including
60 raw TRAP-to-ENOSYS observations and 16 EIO-controlled copy/wait fallbacks.
Four API 28 kernel/policy-gated observations do not count as semantic
reachability. All original 20 assertions remain unchanged. This follow-up
does not add native 16 KiB, full six-syscall semantics or Binder acceptance.

The official v0.2.0 Release now contains the APKs and corresponding-source set,
with all 13 asset digests verified before and after publication. That is not a
patched-runtime release. The separate application-process probe has recorded
native arm64, 4 KiB-page results on API 28/31/33/35: after reusing the locked
supervisor and shared Java wrapper, each device passes 13/13 probes in two rounds,
including SIGTERM-ignoring timeout/output-limit and readiness-triggered cancellation.
All 24 lifecycle cases verify actual child/parent disappearance and workspace
cleanup; see the [2026-09-09 report](../../../../docs/compatibility/2026-09-09-m3-supervised-application-probe.json).
The [original 10/12 failure report](../../../../docs/compatibility/2026-09-08-m3-application-probe.json)
remains unchanged. On 2026-09-10, five new FD/SIGSYS fixtures expanded the suite
to 18. Those four arm64 devices plus an API 33 native x86_64 AVD (all 4 KiB)
each scored 17/18 twice: spawn isolation and signal interactions passed, but
same-PID re-exec consistently exposed a missing startup CLOEXEC fallback.
The [FD semantics report](../../../../docs/compatibility/2026-09-10-m3-fd-semantics.json)
preserves all 10 failures. The subsequent source-locked startup fix at
`c240d6c68` passed the unchanged assertion in all 10 rounds: each of those
five environments scores 18/18 twice, totaling 180/180. Both ABIs reproduce
byte-for-byte across two clean builds. The 30 forcible termination cases still
pass at 301-305 ms, and every probe package was uninstalled with zero UID
processes remaining. The owned AVD was shut down. See the
[startup fix report](../../../../docs/compatibility/2026-09-10-m3-startup-cloexec.json).

Before patch 8, the suite added two lowered-`RLIMIT_NOFILE` cases, for **20 probes**.
The then-unchanged `c240d6c68` runtime scored **18/20 twice on each of the four arm64 devices
and 19/20 twice on the x86_64 AVD**: all original 180 observations still pass,
but 18 of the 20 new observations expose a spawn fallback that misses live fd
256 after the soft limit is lowered to 128. Non-Bun children created by both
spawn APIs inherit the sentinel in each failure; native x86_64 `close_range`
is the passing control.
All limits are restored, all test packages uninstalled with zero UID processes,
and the owned AVD shut down. Existing clean-build pairs were reverified, not
rebuilt. The [new failure report](../../../../docs/compatibility/2026-09-10-m3-spawn-nofile.json)
retains all results and binds sources/APKs without altering earlier reports.
Patch 8 addresses this separately under the spawn child's vfork constraints;
it does not reuse the allocating startup helper. Full experimental Binder, other
syscall semantics and the remaining API/ABI matrix are still open; this is not
stable Android 9 support.

The same old experimental APK subsequently scored **19/20 twice** on a
Samsung Remote Test Lab SM-A566B physical device (API 36, native arm64-v8a,
16384-byte pages, no translation). The native lowered-limit control passes;
only its forced-TRAP counterpart still leaks the sentinel through both child
APIs. All six forcible lifecycle cases pass, and the package was uninstalled
with zero UID processes. See the [native 16 KiB application report](../../../../docs/compatibility/2026-09-10-m3-native-arm64-16k.json).
Those historical failures remain unchanged. The new revision's 20/20-twice
result is recorded separately above; neither observation is full experimental
Binder acceptance. The official runtime's separate 8/8-twice Binder result
cannot replace experimental testing. The working remote-device route is described
in the [x64 Windows guide](../../../../docs/compatibility/16k-arm64-test-environments.md).

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
  but is not an APK lock. Packaging still requires a separately named
  experimental output, same-Release publication of the matching source set,
  automated APK/source/digest verification, and API 28-32 application-process
  evidence. These are technical gates and do not claim a legal conclusion.

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
affected compatibility paths at the five-patch prefix match the fixed PR head
exactly. A sixth,
project-owned patch replaces Bun's movable Brotli `v1.1.0` input with resolved
commit `ed738e842d2fbdf2d6459e39267a633c4a9b2f5d`.

Project-owned patch 7 adds the MIT-licensed [startup CLOEXEC fallback](startup-cloexec/README.md).
Patch 8 adds a separate MIT-licensed, allocation-free [spawn FD fallback](spawn-fd/README.md).
The final head is `a260ef3085eccca9076569b1fd5d32fbb3e8c87d`; its startup and
spawn code intentionally differ from the upstream PR. The replay verifier checks every
patch's actual affected paths and the exact final commit/tree while retaining
the complete upstream equivalence check at prefix
`373d612de197f05bb5a7abdbd09d421ea0e8c02c`. No upstream comparison path is dropped.

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
across runs: ARM64 is 87,923,312 bytes with SHA-256
`186968ad26f1753675b3782cfa87c954530d47cd593e26b701e6d2ce02b4e333`;
x86_64 is 90,449,712 bytes with SHA-256
`f27375423557dcb61c7d5e66b71de0beb8431f20f6393e78aba34ee23dfda8d3`.
The executables remain external evidence and are not copied into `jniLibs`.

Build preparation uses `verifyBuildInputs`, which checks the source, patch,
toolchain and offline-input gates but explicitly returns
`runtimeEvidenceVerified: false`. It cannot approve a runtime or distribution.
The default `verifyExperiment` additionally requires completed, current
two-build evidence and its matching distribution-source binding.

When changing source, set `runtimeProduced: false` and status
`source-locked-awaiting-runtime-evidence` until both independent ABI builds
finish and their actual bytes and ELF audits agree. Archive the previous
evidence rather than rebinding old binaries to the new source. Only then
update `runtime-evidence.json`, `distribution-source.lock.json`, the experimental
revision and acceptance tests, and restore the completed runtime status.

`verify-built-runtime.mjs` independently parses ELF64 bytes without relying on
host `readelf`. It enforces PIE, the Android linker, non-executable stack, no
writable/executable load segment, Android API 28/NDK r27c notes, the exact
`libc.so`/`libm.so`/`libdl.so` dependency order, bionic symbol versions,
Android RELR, 16 KiB minimum `PT_LOAD` alignment, build IDs, dynamic-symbol
fingerprints, retained symbol-table fingerprints, and absence of debug
sections. Both reproducible outputs passed. The prior six-patch ARM64 output
also passed five limited direct-shell probes on API 28 and API 31; those older
observations are not execution evidence for the new spawn-fix revision.
The [six-patch build record](../../../../docs/compatibility/2026-09-03-m2-runtime-evidence.json)
and [seven-patch startup-fix record](../../../../docs/compatibility/2026-09-10-m2-startup-runtime-evidence.json)
are retained unchanged and cannot satisfy the current source gate.

`distribution-source.lock.json` links those two experimental output hashes to
the exact 64,069,192-byte Bun base-source archive, all eight downstream patches,
the pinned WebKit/JSC Git tag, commit, tree and license files, and every locked
native, Cargo, and npm source archive needed by the build. Four matching
JavaScriptCore/WebCore license texts are bundled beside Bun's existing upstream
notice. The full WebKit checkout was verified at 463,115 tracked files; GitHub
codeload refuses to generate an archive for that tree, so the source verifier
uses the immutable Git tag and tree rather than inventing an archive digest.
This closes the auditable input inventory. The same-Release source-asset,
SHA-256 manifest, draft-upload, and GitHub digest-verification workflow now
lives under `tools/bun-runtime/release`; no matching patched APK/source set has
yet been published, and automated technical validation does not claim a legal
conclusion.

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
  startup-cloexec/                  exact-patch Linux native fallback regressions
  spawn-fd/                        exact-patch vfork FD regressions and old failure controls
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
   the upstream head in all five compatibility paths at the five-patch prefix.
   It also checks the 28
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
   native/Cargo/npm source closures. The release tools additionally publish the
   complete matching set beside all three APKs, bind it with `SHA256SUMS`, and
   compare GitHub's asset digests. These automated checks are technical
   verification, not a legal opinion or approval.

## Assemble, verify, and publish Release assets

Use Linux or WSL to materialize the locked WebKit archive because its exact
checkout must preserve Unix paths and file identities. After the archive hash
is locked, the final assembler can run on Windows, Linux, or WSL. It requires a
clean project checkout, exactly three signed APKs, Java, and `apksigner.jar`.
Choose
`official` for the unmodified Bun payload or `api28-patched-experimental` for a
separately identified prerelease whose APKs contain the two hashes in
`runtime-evidence.json`.

```bash
node tools/bun-runtime/release/materialize-webkit-source-archive.mjs \
  --output-directory /absolute/path/to/empty-webkit-archive-dir \
  --bun-source-archive /absolute/path/to/bun-base-source.tar.gz \
  --webkit-repository /absolute/path/to/clean-webkit-checkout

node tools/bun-runtime/release/assemble-corresponding-source.mjs \
  --profile api28-patched-experimental \
  --version 0.2.0 \
  --tag v0.2.0-api28-experimental.1 \
  --repository SuperMonster003/AutoJs6-Plugin-Bun-Runtime \
  --apk-directory /absolute/path/to/signed-apks \
  --bun-source-archive /absolute/path/to/bun-base-source.tar.gz \
  --webkit-source-archive /absolute/path/to/locked-webkit-source.tar.gz \
  --native-source-cache /absolute/path/to/source-prefetch \
  --cargo-source-cache /absolute/path/to/cargo-inputs \
  --bun-registry-source-cache /absolute/path/to/bun-inputs \
  --output-directory /absolute/path/to/empty-release-assets \
  --java-executable /absolute/path/to/java \
  --apksigner-jar /absolute/path/to/apksigner.jar

node tools/bun-runtime/release/verify-corresponding-source-release.mjs \
  --asset-directory /absolute/path/to/release-assets \
  --java-executable /absolute/path/to/java \
  --apksigner-jar /absolute/path/to/apksigner.jar

# Read-only remote/tag preflight; omit --publish until the tag is pushed.
node tools/bun-runtime/release/publish-github-release.mjs \
  --asset-directory /absolute/path/to/release-assets \
  --java-executable /absolute/path/to/java \
  --apksigner-jar /absolute/path/to/apksigner.jar

# Explicitly authorized publication: draft -> upload -> remote SHA-256 check -> public.
node tools/bun-runtime/release/publish-github-release.mjs \
  --asset-directory /absolute/path/to/release-assets \
  --java-executable /absolute/path/to/java \
  --apksigner-jar /absolute/path/to/apksigner.jar \
  --publish
```

The output directory contains the three APKs, six logical source components,
the public license/relinking notice, the machine-readable binding manifest,
and `SHA256SUMS`. Logical components over 1,900,000,000 bytes are split into
ordered parts. Reassemble them by concatenating the part files in numeric order;
the manifest records both each part digest and the digest of the complete
logical archive. The publisher refuses an absent/mismatched remote tag, a dirty
checkout, a non-draft existing Release, an extra asset, or any local/remote
size or SHA-256 difference.

## Gates that remain open

The experiment now has `buildReady: true`, `runtimeProduced: true`, and
`distributionReady: false`. Build-input closure, two-run binary reproducibility,
and static ELF auditing are complete. At minimum, later work must:

- publish the patched binary with the already locked matching Bun/WebKit/JSC
  and dependency source set, downstream patches, license texts, build/relink
  instructions, machine-readable manifest, and `SHA256SUMS` in the same
  Release; the implemented publisher keeps the Release in draft until every
  GitHub asset digest agrees;
- create a separately identified experimental APK without replacing or
  relabeling the official runtime;
- run installed-payload and full Binder instrumentation from the application
  process on API 28, 29, 30, 31, and 32 for the intended ABIs;
- validate timeout, cancellation, output limits, process recovery, spawn/FD
  isolation, and every relevant syscall fallback; and
- repeat ELF, APK ZIP, installed-payload, and native 16 KiB execution gates for
  any artifact proposed for distribution.
