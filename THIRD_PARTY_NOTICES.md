# Third-Party Notices

AutoJs6 Plugin Bun Runtime redistributes unmodified official Bun Android executables. The plugin project license does not replace the licenses of Bun or any component linked into those executables. A separately identified patched runtime is under application-process compatibility review but is not stored in this repository or packaged by the current plugin.

## Bun 1.4.0

| Field | Value |
|---|---|
| Upstream | <https://github.com/oven-sh/bun> |
| Release | [`bun-v1.4.0`](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0) |
| Commit | [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676) |
| Runtime revision | `1.4.0+34cbb9a40` |
| Upstream license and linked-library list | [`LICENSE.md`](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) |
| Bundled copy of upstream notice | [`app/src/main/assets/doc/licenses/BUN-LICENSE.md`](app/src/main/assets/doc/licenses/BUN-LICENSE.md) |
| Bundled JavaScriptCore license | [`app/src/main/assets/doc/licenses/WEBKIT-JAVASCRIPTCORE-COPYING.LIB`](app/src/main/assets/doc/licenses/WEBKIT-JAVASCRIPTCORE-COPYING.LIB) |
| Bundled WebCore license set | [`LICENSE-LGPL-2`](app/src/main/assets/doc/licenses/WEBKIT-WEBCORE-LICENSE-LGPL-2), [`LICENSE-LGPL-2.1`](app/src/main/assets/doc/licenses/WEBKIT-WEBCORE-LICENSE-LGPL-2.1), and [`LICENSE-APPLE`](app/src/main/assets/doc/licenses/WEBKIT-WEBCORE-LICENSE-APPLE) |
| Delivery | Unmodified Android PIE executable, renamed to `libbun_exec.so` only so Android extracts it into the read-only native library directory |

Bun itself is MIT-licensed. The official Bun executable statically links JavaScriptCore and WebKit under LGPL-2 and incorporates additional libraries and polyfills under their own licenses. The complete upstream linked-library and polyfill notice is bundled verbatim in `app/src/main/assets/doc/licenses/BUN-LICENSE.md` and is included in the APK documentation assets.

The executable is not a JNI shared library and is never loaded with `System.loadLibrary`. It remains a separable child-process program and is not relinked with plugin code.

## First-party lifecycle supervisor

Starting with the v0.2.1 development line, the plugin also packages a separate first-party `libbun_supervisor.so` for each ABI. Its source is covered by the project's [MPL-2.0 license](LICENSE), not Bun's license. It forks and directly execs the unmodified Bun executable and manages termination/reaping through a private control pipe; it is not linked into Bun or loaded as JNI. The fixed NDK 29 build, source digest and helper digests are recorded in [the supervisor lock](tools/bun-runtime/supervisor/supervisor.lock.json), with [reproduction and lifecycle documentation](tools/bun-runtime/supervisor/README.md). The resulting helper dynamically uses Android's system bionic libraries.

Corresponding-source manifest schema 2 includes the supervisor binding. Its C source, Java control wrapper and exact build instructions are verified inside the same Release's project-source archive, alongside the existing Bun/WebKit dependency sources. This is automated technical verification, not a legal opinion or approval. Published v0.2.0 assets remain unchanged.

## Android runtime compatibility

Although the official Bun Android build targets Android API 28 at link time, that does not make it executable under every Android app seccomp policy. On a real API 31 device, Bun 1.4.0 was terminated with `SIGSYS` when it invoked syscall 436, `close_range`. AOSP Android 12 and earlier app syscall allowlists lack `close_range`, while Android 13 (T, API 33) allowlists the raw syscall. Android 14 (U, API 34) adds the public bionic `close_range` wrapper, but Bun invokes the raw syscall and does not require that API 34 libc symbol. A real Sony API 33 runtime run passed consistently with this AOSP boundary, and a real API 35 device completed JavaScript and TypeScript Binder round trips successfully.

The plugin therefore requires Android 13 (API 33) or later. API 28 through 32 remain outside the supported range until a patched Bun runtime handles the Android seccomp traps and passes portable validation across those releases. The API 28 ELF build target alone is not sufficient evidence, and a manifest-only minSdk change cannot make the unmodified runtime portable there.

## Redistributed artifacts

The checked-in runtime lock is the machine-readable source of truth. Archive hashes below are the official release asset hashes; binary hashes cover the exact decompressed bytes committed through Git LFS and packaged in the APK.

| Android ABI | Official release asset | Archive size | Archive SHA-256 | Packaged binary size | Packaged binary SHA-256 |
|---|---|---:|---|---:|---|
| `arm64-v8a` | [`bun-linux-aarch64-android.zip`](https://github.com/oven-sh/bun/releases/download/bun-v1.4.0/bun-linux-aarch64-android.zip) | 35,184,745 | `42544d7438bb92c7e7df7d30b9a5858cb7a834636608e5b850f59138283567fc` | 87,914,400 | `44a83a9b716a2df09c7c62cfee94f99b4d0b389f9326c6318c4831d888e2a250` |
| `x86_64` | [`bun-linux-x64-android-baseline.zip`](https://github.com/oven-sh/bun/releases/download/bun-v1.4.0/bun-linux-x64-android-baseline.zip) | 36,577,224 | `1b917b67209ae4b90da619e95167b9fe958a412130f399482b65bf9823998944` | 90,420,592 | `2884ee9a0f0828661977b17b08324e640f024585e48357cc3fc24ee700d192df` |

Both packaged Bun executables are ELF64 Android PIE programs. Their PT_LOAD alignment is at least 16 KB. This structural check does not replace native execution on a 16 KB Android runtime. On the Android 16 x86_64 AVD with 16 KB pages, the ARM64 APK passed through `libndk_translation`, while the native x86_64 executable aborted before running a minimal script. On 2026-09-10, the official Bun plus locked supervisor in the v0.2.1 development arm64-only Debug APK passed all 8 Binder tests twice on a Samsung SM-A566B physical device (API 36, native arm64-v8a, PAGE_SIZE=16384, no translation), including installed payload hashes, process restart and cleanup; see the [native ARM64 report](docs/compatibility/2026-09-10-m5-native-arm64-16k.json). This is scoped development-build evidence, not acceptance of a published Release APK, native x86_64 support or full acceptance of the separate experimental runtime. General 16 KB support is not claimed.

## Experimental API 28 patched build (not distributed)

The source-build experiment under `tools/bun-runtime/experimental/api28` uses a distinct identity and does not alter the official runtime above.

| Field | Value |
|---|---|
| Variant | `bun-1.4.0-android-api28-patched-experimental` |
| Upstream base | `34cbb9a40b4bd1bd767d134a7065e66c2432a676` |
| Deterministic downstream head | `c240d6c6895db4241dc324f260ee3ee4d0da9889` |
| Downstream tree | `e7740b5decafdfa2ec4a5804057190e31e3c4820` |
| Patch series | Five byte-equivalent backports at the compatibility prefix, one project-owned dependency pin and one MIT startup CLOEXEC fix; all seven are stored and hashed in [`patches/series.lock.json`](tools/bun-runtime/experimental/api28/patches/series.lock.json) |
| ARM64 reproducible output | 87,923,312 bytes; SHA-256 `b35db60bff4c1a9e9e056aed8853e5c3f5486133b106a9ebb4128ffd359ff99d` |
| x86_64 reproducible output | 90,449,712 bytes; SHA-256 `da4a1a681016e2b1c90d20032e3a5d9c4049266d3ad9aafd2b3761c04609ae1d` |
| Runtime evidence | [`runtime-evidence.json`](tools/bun-runtime/experimental/api28/runtime-evidence.json) |
| Source and license lock | [`distribution-source.lock.json`](tools/bun-runtime/experimental/api28/distribution-source.lock.json) |
| Reproducible build and relink instructions | [`experimental/api28/README.md`](tools/bun-runtime/experimental/api28/README.md) |
| Distribution status | Not ready; patched executables remain outside Git and production APKs, and are packaged only in external test-only probe APKs |

The exact Bun base source is locked as the 64,069,192-byte commit archive with SHA-256 `d44cad3fc8a3ab2e59308af42b022d2401b3425b98ffde535bfc02387dac4771`. Applying the checked-in seven-patch series produces the recorded downstream commit and tree. The first five patches preserve the MIT license of their pinned upstream commits; the sixth changes only the Brotli dependency reference from its movable tag to the same MIT-licensed source revision by immutable commit. The seventh adds project-owned MIT-licensed startup CLOEXEC handling. Upstream byte-equivalence is checked at the five-patch prefix, not claimed for the final startup code. The previous six-patch build evidence is retained in the [historical record](docs/compatibility/2026-09-03-m2-runtime-evidence.json).

The matching WebKit/JavaScriptCore source is the `oven-sh/WebKit` tag `autobuild-0f966e81b78c84bb23213e391bc679c4ef83e56b`, commit `0f966e81b78c84bb23213e391bc679c4ef83e56b`, tree `e9590edf1ab6c32e20f83b70daec7314e0bfe261`. GitHub does not generate a codeload archive for this tree, so the verifier requires a clean Git checkout at that exact tag, commit, tree, and 463,115-file inventory. The four matching JavaScriptCore/WebCore license files are bundled alongside Bun's pinned notice.

The source lock also traces all build inputs that can contribute source or generated code: 19 fixed native dependency archives, the pinned Node.js header archive, 206 unique Cargo archives, and 125 selected Bun registry archives. Those exact inputs, the WebKit checkout, the Bun base archive, and all downstream patches must accompany or be published with any future patched binary; a distributor must not rely only on continued availability of upstream links. Toolchain and host-package locks remain part of the reproducible build record.

`distribution-source.lock.json` is a mechanical provenance and completeness gate. Project policy does not make a separate legal-review step a prerequisite for publishing; it instead requires the public notices, matching source assets, build/relink instructions, APK/payload binding, and automated digest checks described below. Those technical checks do not claim a legal opinion or approval. The patched profile remains `distributionReady=false` until a matching patched APK is actually published with all source assets and passes its application-process release gates.

## Corresponding source and relinking information

The exact Bun source is available from the pinned commit and tag above:

```text
https://github.com/oven-sh/bun/tree/34cbb9a40b4bd1bd767d134a7065e66c2432a676
https://github.com/oven-sh/bun/archive/refs/tags/bun-v1.4.0.tar.gz
```

Bun's pinned WebKit revision for this release is:

```text
0f966e81b78c84bb23213e391bc679c4ef83e56b
```

Patched WebKit source is available from <https://github.com/oven-sh/WebKit>. Bun's upstream license explains the relinking workflow:

```text
git clone https://github.com/oven-sh/WebKit vendor/WebKit
bun sync-webkit-source
bun run build:local
```

The authoritative build configuration, dependency revisions, and platform profiles are in the pinned Bun source tree. Bun's upstream notice explains that recipients must be able to relink modified LGPL-covered WebKit/JavaScriptCore code; because Bun's application code is itself available as source, this project publishes that exact application source, the matching WebKit/JSC source, all locked source inputs, downstream patches when applicable, and the complete rebuild/relink instructions rather than relying only on upstream links.

For each applicable plugin release, `tools/bun-runtime/release/assemble-corresponding-source.mjs` emits these materials as assets separate from the APKs but destined for the same GitHub Release. A machine-readable manifest binds the three signed APK hashes and the runtime payload hashes found inside them to every logical source archive and split part. `SHA256SUMS` covers the exact Release asset set. `verify-corresponding-source-release.mjs` performs the offline checks; `publish-github-release.mjs` uploads to a draft, requires GitHub's returned `sha256:` digest to match every local asset, rejects missing or extra files, and publishes only after the full set agrees. The standalone `CORRESPONDING_SOURCE_NOTICE.md` makes this license and relinking information visible on the Release page.

## Project code

Code written specifically for AutoJs6 Plugin Bun Runtime is licensed under the repository's Mozilla Public License 2.0 unless a file explicitly states otherwise. The project-owned Bun startup changes in downstream patch 7, its `SPDX-License-Identifier: MIT` header, and the matching standalone C++ test fixture are provided under Bun's MIT license. The Java wrapper and lifecycle supervisor remain MPL-2.0. No statement in this file grants additional rights to Bun, WebKit, JavaScriptCore, or their bundled dependencies.

This notice is provided for attribution and reproducibility and is not legal advice.
