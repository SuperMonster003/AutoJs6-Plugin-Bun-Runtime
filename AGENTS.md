# AutoJs6 Plugin Bun Runtime Repository Guide

This repository contains the standalone Bun Runtime plugin for AutoJs6. Keep every implementation, contract, resource, test, and document aligned with the facts below.

## Repository identity

- Project directory: `AutoJs6-Plugin-Bun-Runtime`
- Gradle root name: `autojs6-plugin-bun-runtime`
- Application name: `Bun Runtime`, always English and non-translatable
- Application ID: `io.github.supermonster003.autojs6.plugin.bun.runtime`
- Plugin ID: `bun-runtime`
- Engine: `bun`
- Variant: `bun-1.4.0-android`
- Runtime service action: `org.autojs.plugin.bun.RUNTIME`
- Runtime service category: `bun`
- Capability API: `bun-runtime-api`
- Minimum host build: `5278`

Do not add compatibility aliases for unpublished names or identifiers. Update the AutoJs6 host and the shared API contract together when an identity or protocol value changes.

## Session and Git safety

- At the start of work, run `git status --short`, check the current branch and latest commit, and look for more specific `AGENTS.md` files.
- Treat all pre-existing changes as user work. Do not overwrite, reset, revert, or reorganize unrelated changes.
- Do not use destructive Git commands such as `git reset --hard` or `git checkout -- <path>` without explicit authorization.
- Before committing, review `git diff --check`, `git diff --cached`, and `git status --short`. Do not commit secrets, local SDK paths, temporary APKs, caches, or debug output.
- Unless the user explicitly requests no commit, finish scoped work with one or more logical Conventional Commits.

## Bun runtime provenance

- The runtime is the official Bun `bun-v1.4.0` Android release at commit `34cbb9a40b4bd1bd767d134a7065e66c2432a676`, revision `1.4.0+34cbb9a40`.
- Supported ABIs are exactly `arm64-v8a` and baseline `x86_64`. Do not advertise 32-bit ABIs.
- Runtime files under `app/src/main/jniLibs/*/libbun_exec.so` are Android PIE executables renamed for package extraction. They are not JNI libraries and must never be loaded with `System.loadLibrary`.
- The executable must run directly from the read-only `nativeLibraryDir`. Never copy an executable into `filesDir`, `cacheDir`, or another writable app directory and execute it there.
- Treat `tools/bun-runtime/runtime.lock.json` as the machine-readable source of truth for release URLs, archive sizes and hashes, binary sizes and hashes, ELF machines, and minimum PT_LOAD alignment.
- Runtime binaries are Git LFS objects. Use `tools/bun-runtime/materialize-runtime.ps1` to reproduce them from official archives and `node tools/bun-runtime/verify-runtime.mjs` to verify checked-in bytes.
- The separate first-party `libbun_supervisor.so` payloads are also read-only PIE executables, never JNI libraries. Their C source, fixed NDK build and per-ABI bytes are locked in `tools/bun-runtime/supervisor/supervisor.lock.json`; verify with `node tools/bun-runtime/supervisor/verify-supervisor.mjs`. They do not change the official Bun lock or variant.
- Any Bun upgrade must update the lock, binaries, variant, shared contract constants, tests, README, changelog, and `THIRD_PARTY_NOTICES.md` in one reviewed change.
- The separate API 28 experiment locks nine patches at `7b9ac266888abda7ee6ec0b8ac11a74236420030`, revision `1.4.0+7b9ac2668`. Patch 8 still enumerates actual Linux spawn fds through bounded raw syscalls and a fixed stack buffer, without allocation or locks in the vfork child; setup failures must propagate before exec. Do not restore the current-RLIMIT/65536 scan, reuse the allocating startup helper there, or treat this as `CLOSE_RANGE_UNSHARE` support. Patch 9 implements the selected bounded read-only descriptor-relative directory fallback, preserving root-contained links without changing ordinary file APIs or adding a permissive mode/dependency. Two clean builds per ABI are identical; historical eight-patch artifacts cannot accept this source. Experimental bytes remain outside the official payload paths and `distributionReady` remains false.
- Preserve the bundled upstream notice at `app/src/main/assets/doc/licenses/BUN-LICENSE.md`. Bun includes MIT code, statically linked JavaScriptCore and WebKit under LGPL-2, and other third-party components under their own licenses.

## Supported Android range

- The plugin requires Android 13, API 33, or later even though the upstream binary is linked for API 28.
- A real API 31 run was terminated by app seccomp with `SIGSYS` on syscall 436, `close_range`. AOSP Android 12 and earlier app allowlists lack this syscall, while Android 13 (T, API 33) allowlists the raw `close_range` syscall.
- Android 14 (U, API 34) adds the public bionic `close_range` wrapper, but Bun 1.4.0 invokes the raw syscall and does not require that API 34 libc symbol.
- A real Sony API 33 runtime run passed, consistent with the AOSP Android 13 seccomp boundary.
- Real API 35 JavaScript and TypeScript Binder round trips have passed.
- API 28 through 32 remain unsupported until a patched Bun runtime handles Android seccomp traps and portable lower-version validation passes. A manifest-only minSdk change cannot make the unmodified runtime portable on those releases.
- Both packaged ELF files meet at least 16 KB PT_LOAD alignment, and every debug/release APK passes the 16 KB ZIP alignment gate.
- On an Android 16 / API 36 x86_64 AVD with `PAGE_SIZE=16384` hard-asserted, the official `arm64-v8a` payload passed the full 5-test Binder suite through `libndk_translation`, while the native `x86_64` payload aborted with exit code 134 on the minimal `--eval "void 0"` probe.
- On Samsung Remote Test Lab SM-A566B (Android 16 / API 36, native arm64-v8a, PAGE_SIZE=16384, native bridge disabled), the official Bun plus supervisor in the v0.2.1 development arm64-only Debug APK passed the full 8-test Binder suite twice with a process restart. Installed payload hashes and cleanup passed; see `docs/compatibility/2026-09-10-m5-native-arm64-16k.json`. This is not acceptance of a published Release APK.
- The previous experimental `1.4.0+a260ef308` runtime passed the unchanged 20-probe test-only application suite twice in six native environments: arm64 API 28/31/33/35 and x86_64 API 33 at 4096-byte pages, plus Samsung SM-A566B arm64 API 36 at 16384-byte pages. All 240 observations, 24 lowered-RLIMIT_NOFILE cases and 36 forcible lifecycle cases passed; all test packages were uninstalled with zero UID processes. See `docs/compatibility/2026-09-10-m3-spawn-fd-fix.json`. The previous `c240d6c68` 18/20 and 19/20 failures remain archived; do not rewrite them or claim full experimental Binder acceptance.
- The same experimental bytes subsequently passed two 23-probe rounds in five native 4 KiB environments (arm64 API 28/31/33/35, x86_64 API 33), totaling 230/230. The original 20 definitions are unchanged. Six raw syscall targets yield 60 TRAP-to-ENOSYS observations; copy_file_range and pidfd_open yield 16 EIO-controlled semantic observations, excluding four explicitly kernel/policy-gated API 28 cases. See `docs/compatibility/2026-09-10-m3-syscall-fallbacks.json`. Raw controls are not six high-level fallback acceptances; the new fixtures have no native 16 KiB evidence.
- The historical 24-probe suite exposes an openat2 directory-confinement blocker in the same eight-patch bytes: all five native 4 KiB environments score 23/24 twice. Original 23 cases pass, but relative/absolute/magic symlinks return a synthetic outside-root sentinel in both native and post-TRAP phases (60 failed path assertions). Raw openat2 is already unavailable before test filters, so do not claim EIO/first-entry high-level reachability. See `docs/compatibility/2026-09-10-m3-openat2-confinement.json`; that historical failed gate has no native fix applied. Keep it and the successful narrower suites unchanged. `fchmodat2` is directly called through uppercase `SYS_FCHMODAT2` in internal `sys::lchmod`; Android public node:fs lchmod exports are absent, and the internal CLI fallback has not been exercised.
- The new nine-patch `1.4.0+7b9ac2668` runtime passes the same 24-probe suite twice in five native 4 KiB environments (arm64 API 28/31/33/35 and x86_64 API 33), totaling 240/240. Only the expected revision changes; fixture sources, validators and resource limits remain unchanged. All 240 directory-path assertions pass, including rejection of the 60 previously failing outside-root sentinel reads while normal serving works. GCC/Clang helper tests, GCC ASan/UBSan, two clean builds per ABI, 20 lowered-limit and 30 forcible lifecycle cases pass; packages/UID processes and the owned AVD are cleaned up. See `docs/compatibility/2026-09-10-m3-scoped-open-fix.json`. All raw openat2 controls are unavailable before filters, not first-entry high-level EIO/TRAP acceptance. Finite helper race tests are not exhaustive kernel equivalence; these new bytes/fixtures have no native ARM64 16 KiB or full experimental Binder evidence yet.
- Do not claim general end-to-end 16 KB support: native x86_64 remains blocked, final Release-APK acceptance is separate, and the experimental runtime still needs its full Binder/syscall/API matrix. Android FD 70000 and hard-limit-lowering execution are not covered by the native Linux host tests. Keep native ARM64, translated ARM64 and native x86_64 evidence distinct.

## Execution contract

- Bun is an independent engine, not a Rhino or Node.js alias. The AutoJs6 host routes the standalone `"bun";` directive to this plugin.
- Version 0.1 accepts one immutable JavaScript or TypeScript source snapshot through `ParcelFileDescriptor`.
- Execute with the argument vector equivalent to `bun run --no-install <source>`. Do not invoke a shell, concatenate an untrusted command, or install missing dependencies automatically.
- Version 0.1 does not transfer a multi-file project tree and does not support relative project imports.
- Bun does not expose AutoJs6 globals, Rhino objects, Android automation APIs, or a Java bridge. Add future host capabilities only through narrow, versioned, permission-aware contracts.
- The default timeout is 60 seconds, the maximum source size is 16 MiB, and the maximum combined stdout and stderr streaming budget is 8 MiB. Keep request, argument, environment, and name limits synchronized with `BunRuntimeContract`.
- Send stdout and stderr only as bounded chunks through the oneway callback. The returned terminal Bundle and the `finished` event contain status and diagnostic summaries and must never carry complete output streams, so Binder transactions remain below the platform limit.
- Keep cancellation deterministic: destroy the process, apply the bounded forcible fallback, close descriptors, remove execution state, and clean only the exact private job directory.
- Launch probes and scripts through `SupervisedProcess`: its private control-pipe EOF makes the supervisor send SIGTERM, wait 200 ms, send SIGKILL if needed, and reap its owned immediate Bun child. Do not revert to Android's inherited `Process.destroyForcibly()`, guess a PID, or close output readers before requesting termination. Arbitrary detached descendants are not supervised.
- A Bun child process is isolation for lifecycle and crashes, not a security sandbox. Run scripts as trusted code under the plugin UID.

## Binder, activation, and metadata

- Use the exact shared `common-plugin-api.aar` and `bun-runtime-api.aar` contracts. Do not copy `PluginInfo`, AIDL, or contract constants into a second implementation.
- Preserve existing AIDL transaction order. Append compatible methods only at the end and negotiate new behavior with the contract version or capabilities.
- Keep Binder work bounded and cancellable. Validate every Bundle key, enum, count, byte length, timeout, execution ID, and file descriptor before use.
- Keep `BunRuntimeService` in the `:bun_runtime` process and protect all exported plugin components with `org.autojs.permission.PLUGIN`.
- Preserve the no-display Wake activity, `org.autojs.plugin.WAKE_ACTIVITY` metadata, `org.autojs.plugin.action.WAKE` action, and default category.
- `PluginInfo` must report the installed package version, localized description and instruction, exact identity fields, the ABIs actually packaged in the installed APK, minimum host build, protocol version, runtime version and revision, and truthful capabilities.

## Gradle and packaging

- Use the online `io.github.supermonster003.autojs6-platform-versions` plugin at version `1.7.4`. Do not add `mavenLocal()` or a copied local platform-version implementation.
- Read compileSdk, minSdk, targetSdk, versionCode, versionName, JDK, and Gradle compatibility from the repository conventions and `version.properties`.
- Keep AIDL and `resValue` build features enabled. `app_name` and stable identity strings must remain non-translatable build resources.
- Keep native library extraction enabled and legacy JNI packaging configured so Android installs the PIE executable into `nativeLibraryDir` without changing its bytes.
- Release outputs must include the two single-ABI APKs and one `universal` APK, use valid release signing, and use stable version, ABI, and digest file names.
- Applicable releases must publish the matching corresponding-source set as assets separate from the APKs in the same GitHub Release. Keep every part below 2 GiB, publish the machine-readable binding manifest and `SHA256SUMS`, and make the public Bun/WebKit license and relinking notice easy to find.
- Use the release publisher's draft-first flow. It must bind APK hashes and contained runtime hashes to the exact Bun, WebKit/JSC, native, Cargo, npm, project, patch, and build-instruction sources, reject missing/extra/drifted assets, and compare GitHub's returned SHA-256 digests before publication. Describe this as automated technical verification, not a legal opinion or approval; a separate legal-review step is not a project release prerequisite.
- New corresponding-source manifests use schema 2 and additionally bind supervisor source/toolchain and per-ABI helpers, checking their exact source members in the project archive. Schema 1 is legacy-only and must not bypass the helper gate for v0.2.1 or later.
- Never commit signing secrets, `local.properties`, APK build outputs, or release artifacts unless an established release workflow explicitly tracks them.

## Localization and generated documentation

- Maintain these 10 languages: default English plus explicit English, Arabic, Spanish, French, Japanese, Korean, Russian, Simplified Chinese, Hong Kong Traditional Chinese, and Taiwan Traditional Chinese.
- Locale `strings.xml` files contain no `app_name`. Keep default `values/strings.xml` and `values-en/strings.xml` identical, sort string names, use ASCII punctuation, and keep `plugin_description` free of terminal punctuation.
- Treat `.readme/lang_*.json`, `.readme/common.json`, `.changelog/lang_*.json`, and the Markdown templates as the source of truth.
- Do not hand-edit generated `README.md`, `.readme/README-*.md`, `app/src/main/res/raw*/plugin_instruction.md`, or `app/src/main/assets/doc/CHANGELOG*.md` files.
- After changing documentation or localized resources, run:

```powershell
py .python/generate_markdown.py
py .python/generate_markdown.py --check
py -B -m unittest discover -s .python -p "test_*.py"
```

- Update the current changelog entry in every language for each feature, fix, improvement, or dependency change. Keep the newest changelog version aligned with `VERSION_NAME`.
- Documentation must state the single-source, no-install, no-relative-import, no-AutoJs6-global, no-Java-bridge, Android 13, Binder-output, and unverified-16-KB boundaries accurately.

## Tests and CI

- Unit tests must cover PluginInfo mapping, request normalization and limits, Unicode, timeout and output policy, capability negotiation, runtime lock parsing, and generator validation.
- Android instrumentation must cover action and category discovery, explicit binding and descriptor, Wake and permission metadata, `getInfo`, runtime prewarm, real JS and TS execution, stdout and stderr streaming, invalid requests, output limits, timeout, cancellation, repeated binding, and process restart.
- Verify each APK contains only the expected ABI payload and that `PluginInfo.supportedAbis` matches it.
- Keep the build, Markdown, and runtime artifact GitHub Actions workflows green. Runtime artifact CI must materialize Git LFS files, reproduce official archives, verify hashes and ELF structure, and reject byte drift.
- Do not claim tests that were not run. Report device model, API, ABI, page size, and exact scope for real-device results.

## Standard verification

Run the smallest sufficient set first, then the complete relevant set before delivery:

```powershell
node tools/bun-runtime/verify-runtime.mjs
node tools/bun-runtime/supervisor/verify-supervisor.mjs
node --test tools/bun-runtime/verify-apk-runtime.test.mjs
node --test tools/bun-runtime/release/release-asset-common.test.mjs
py .python/generate_markdown.py --check
py -B -m unittest discover -s .python -p "test_*.py"
.\gradlew.bat :app:testDebugUnitTest
.\gradlew.bat :app:verifyDebugApkRuntimeIntegrity :app:assembleDebugAndroidTest
.\gradlew.bat :app:lintDebug
```

Run instrumentation on available supported devices or emulators. Before a signed release, also verify release signing, all expected APK variants, runtime versions, package installation, discovery, activation, Binder execution, and checksums.
