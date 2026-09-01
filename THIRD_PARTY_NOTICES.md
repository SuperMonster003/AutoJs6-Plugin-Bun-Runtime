# Third-Party Notices

AutoJs6 Plugin Bun Runtime redistributes unmodified official Bun Android executables. The plugin project license does not replace the licenses of Bun or any component linked into those executables.

## Bun 1.4.0

| Field | Value |
|---|---|
| Upstream | <https://github.com/oven-sh/bun> |
| Release | [`bun-v1.4.0`](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0) |
| Commit | [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676) |
| Runtime revision | `1.4.0+34cbb9a40` |
| Upstream license and linked-library list | [`LICENSE.md`](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md) |
| Bundled copy of upstream notice | [`app/src/main/assets/doc/licenses/BUN-LICENSE.md`](app/src/main/assets/doc/licenses/BUN-LICENSE.md) |
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

Both packaged executables are ELF64 Android PIE programs. Their PT_LOAD alignment is at least 16 KB. This structural check does not replace execution on a real 16 KB Android runtime, which has not yet been completed for this project.

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

The authoritative build configuration, dependency revisions, and platform profiles are in the pinned Bun source tree. Anyone redistributing a release should preserve this notice, the bundled upstream license, the machine-readable runtime lock, and the corresponding-source links.

## Project code

Code written specifically for AutoJs6 Plugin Bun Runtime is licensed under the repository's Mozilla Public License 2.0. No statement in this file grants additional rights to Bun, WebKit, JavaScriptCore, or their bundled dependencies.

This notice is provided for attribution and reproducibility and is not legal advice.
