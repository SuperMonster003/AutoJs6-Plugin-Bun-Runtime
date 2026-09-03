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

## Android runtime compatibility

Although the official Bun Android build targets Android API 28 at link time, that does not make it executable under every Android app seccomp policy. On a real API 31 device, Bun 1.4.0 was terminated with `SIGSYS` when it invoked syscall 436, `close_range`. AOSP Android 12 and earlier app syscall allowlists lack `close_range`, while Android 13 (T, API 33) allowlists the raw syscall. Android 14 (U, API 34) adds the public bionic `close_range` wrapper, but Bun invokes the raw syscall and does not require that API 34 libc symbol. A real Sony API 33 runtime run passed consistently with this AOSP boundary, and a real API 35 device completed JavaScript and TypeScript Binder round trips successfully.

The plugin therefore requires Android 13 (API 33) or later. API 28 through 32 remain outside the supported range until a patched Bun runtime handles the Android seccomp traps and passes portable validation across those releases. The API 28 ELF build target alone is not sufficient evidence, and a manifest-only minSdk change cannot make the unmodified runtime portable there.

## Redistributed artifacts

The checked-in runtime lock is the machine-readable source of truth. Archive hashes below are the official release asset hashes; binary hashes cover the exact decompressed bytes committed through Git LFS and packaged in the APK.

| Android ABI | Official release asset | Archive size | Archive SHA-256 | Packaged binary size | Packaged binary SHA-256 |
|---|---|---:|---|---:|---|
| `arm64-v8a` | [`bun-linux-aarch64-android.zip`](https://github.com/oven-sh/bun/releases/download/bun-v1.4.0/bun-linux-aarch64-android.zip) | 35,184,745 | `42544d7438bb92c7e7df7d30b9a5858cb7a834636608e5b850f59138283567fc` | 87,914,400 | `44a83a9b716a2df09c7c62cfee94f99b4d0b389f9326c6318c4831d888e2a250` |
| `x86_64` | [`bun-linux-x64-android-baseline.zip`](https://github.com/oven-sh/bun/releases/download/bun-v1.4.0/bun-linux-x64-android-baseline.zip) | 36,577,224 | `1b917b67209ae4b90da619e95167b9fe958a412130f399482b65bf9823998944` | 90,420,592 | `2884ee9a0f0828661977b17b08324e640f024585e48357cc3fc24ee700d192df` |

Both packaged executables are ELF64 Android PIE programs. Their PT_LOAD alignment is at least 16 KB. This structural check does not replace native execution on a 16 KB Android runtime. On the available Android 16 x86_64 AVD with 16 KB pages, the ARM64 APK passed through `libndk_translation`, while the native x86_64 executable aborted before running a minimal script; native ARM64 remains untested. General 16 KB support is therefore not claimed.

## Experimental API 28 patched build (not distributed)

The source-build experiment under `tools/bun-runtime/experimental/api28` uses a distinct identity and does not alter the official runtime above.

| Field | Value |
|---|---|
| Variant | `bun-1.4.0-android-api28-patched-experimental` |
| Upstream base | `34cbb9a40b4bd1bd767d134a7065e66c2432a676` |
| Deterministic downstream head | `778ce669a38888457c36cab0f2231c3f25592b7d` |
| Downstream tree | `8cfb6a060e87fcdbbf1191b344387291f1476cf4` |
| Patch series | Five byte-equivalent backports from fixed Bun commits plus one project-owned dependency-pin patch; all six are stored and hashed in [`patches/series.lock.json`](tools/bun-runtime/experimental/api28/patches/series.lock.json) |
| ARM64 reproducible output | 87,923,304 bytes; SHA-256 `37bb5553c999ba8bc981199dadc5e3cfd9a476a2d4ebb8565132db83728a2dc6` |
| x86_64 reproducible output | 90,449,696 bytes; SHA-256 `b079388f098c8f40cb14be7a6d343cf8fcb56d3d6694885e1b301f2cf7f89036` |
| Runtime evidence | [`runtime-evidence.json`](tools/bun-runtime/experimental/api28/runtime-evidence.json) |
| Source and license lock | [`distribution-source.lock.json`](tools/bun-runtime/experimental/api28/distribution-source.lock.json) |
| Reproducible build and relink instructions | [`experimental/api28/README.md`](tools/bun-runtime/experimental/api28/README.md) |
| Distribution status | Not ready; no patched executable is included in the repository or APK |

The exact Bun base source is locked as the 64,069,192-byte commit archive with SHA-256 `d44cad3fc8a3ab2e59308af42b022d2401b3425b98ffde535bfc02387dac4771`. Applying the checked-in six-patch series produces the recorded downstream commit and tree. The first five patches preserve the MIT license of their pinned upstream commits; the sixth changes only the Brotli dependency reference from its movable tag to the same MIT-licensed source revision by immutable commit.

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

Code written specifically for AutoJs6 Plugin Bun Runtime is licensed under the repository's Mozilla Public License 2.0. No statement in this file grants additional rights to Bun, WebKit, JavaScriptCore, or their bundled dependencies.

This notice is provided for attribution and reproducibility and is not legal advice.
