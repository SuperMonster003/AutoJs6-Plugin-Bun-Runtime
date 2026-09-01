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
- Any Bun upgrade must update the lock, binaries, variant, shared contract constants, tests, README, changelog, and `THIRD_PARTY_NOTICES.md` in one reviewed change.
- Preserve the bundled upstream notice at `app/src/main/assets/doc/licenses/BUN-LICENSE.md`. Bun includes MIT code, statically linked JavaScriptCore and WebKit under LGPL-2, and other third-party components under their own licenses.

## Supported Android range

- The plugin requires Android 14, API 34, or later even though the upstream binary is linked for API 28.
- A real API 31 run was terminated by app seccomp with `SIGSYS` on syscall 436, `close_range`. The standard AOSP Android 13 app allowlist lacks this syscall and Android 14 adds it.
- One Sony API 33 device passed unexpectedly. Treat that as a vendor-specific result, not evidence of portable API 33 support.
- Real API 35 JavaScript and TypeScript Binder round trips have passed.
- API 28 through 33 remain unsupported until Bun has a suitable upstream fallback and portable lower-version validation passes.
- Both packaged ELF files meet at least 16 KB PT_LOAD alignment. Do not claim verified end-to-end 16 KB support until execution passes on a real 16 KB Android environment and APK ZIP alignment is also checked.

## Execution contract

- Bun is an independent engine, not a Rhino or Node.js alias. The AutoJs6 host routes the standalone `"bun";` directive to this plugin.
- Version 0.1 accepts one immutable JavaScript or TypeScript source snapshot through `ParcelFileDescriptor`.
- Execute with the argument vector equivalent to `bun run --no-install <source>`. Do not invoke a shell, concatenate an untrusted command, or install missing dependencies automatically.
- Version 0.1 does not transfer a multi-file project tree and does not support relative project imports.
- Bun does not expose AutoJs6 globals, Rhino objects, Android automation APIs, or a Java bridge. Add future host capabilities only through narrow, versioned, permission-aware contracts.
- The default timeout is 60 seconds, the maximum source size is 16 MiB, and the maximum combined stdout and stderr streaming budget is 8 MiB. Keep request, argument, environment, and name limits synchronized with `BunRuntimeContract`.
- Send stdout and stderr only as bounded chunks through the oneway callback. The returned terminal Bundle and the `finished` event contain status and diagnostic summaries and must never carry complete output streams, so Binder transactions remain below the platform limit.
- Keep cancellation deterministic: destroy the process, apply the bounded forcible fallback, close descriptors, remove execution state, and clean only the exact private job directory.
- A Bun child process is isolation for lifecycle and crashes, not a security sandbox. Run scripts as trusted code under the plugin UID.

## Binder, activation, and metadata

- Use the exact shared `common-plugin-api.aar` and `bun-runtime-api.aar` contracts. Do not copy `PluginInfo`, AIDL, or contract constants into a second implementation.
- Preserve existing AIDL transaction order. Append compatible methods only at the end and negotiate new behavior with the contract version or capabilities.
- Keep Binder work bounded and cancellable. Validate every Bundle key, enum, count, byte length, timeout, execution ID, and file descriptor before use.
- Keep `BunRuntimeService` in the `:bun_runtime` process and protect all exported plugin components with `org.autojs.permission.PLUGIN`.
- Preserve the no-display Wake activity, `org.autojs.plugin.WAKE_ACTIVITY` metadata, `org.autojs.plugin.action.WAKE` action, and default category.
- `PluginInfo` must report the installed package version, localized description and instruction, exact identity fields, the ABIs actually packaged in the installed APK, minimum host build, protocol version, runtime version and revision, and truthful capabilities.

## Gradle and packaging

- Use the online `io.github.supermonster003.autojs6-platform-versions` plugin at version `1.6.0`. Do not add `mavenLocal()` or a copied local platform-version implementation.
- Read compileSdk, minSdk, targetSdk, versionCode, versionName, JDK, and Gradle compatibility from the repository conventions and `version.properties`.
- Keep AIDL and `resValue` build features enabled. `app_name` and stable identity strings must remain non-translatable build resources.
- Keep native library extraction enabled and legacy JNI packaging configured so Android installs the PIE executable into `nativeLibraryDir` without changing its bytes.
- Release outputs must include the two single-ABI APKs and one `universal` APK, use valid release signing, and use stable version, ABI, and digest file names.
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
- Documentation must state the single-source, no-install, no-relative-import, no-AutoJs6-global, no-Java-bridge, Android 14, Binder-output, and unverified-16-KB boundaries accurately.

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
py .python/generate_markdown.py --check
py -B -m unittest discover -s .python -p "test_*.py"
.\gradlew.bat :app:testDebugUnitTest
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest
.\gradlew.bat :app:lintDebug
```

Run instrumentation on available supported devices or emulators. Before a signed release, also verify release signing, all expected APK variants, runtime versions, package installation, discovery, activation, Binder execution, and checksums.
