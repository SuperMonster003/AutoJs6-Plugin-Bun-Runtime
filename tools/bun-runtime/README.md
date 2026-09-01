# Bun runtime provenance

`runtime.lock.json` fixes the exact official Bun v1.4.0 Android release assets and the unpacked executables used by this plugin. This is a pinned binary materialization workflow, not a claim that Gradle rebuilds Bun or JavaScriptCore from source.

The lock deliberately records two different Android boundaries. `minimumSupportedApi` is the plugin's tested product floor, currently Android 13 / API 33. Each artifact's `androidIdentApi` is the upstream ELF link target, currently API 28. The latter does not imply that the unmodified executable is portable to API 28-32 because those app seccomp policies can terminate Bun's raw `close_range` syscall with `SIGSYS`.

Run `node verify-runtime.mjs` before every build. On Windows, `materialize-runtime.ps1` downloads each fixed archive into a unique temporary directory, verifies its archive digest, copies only the `bun` executable into the controlled `jniLibs` path, verifies the unpacked digest and ELF layout, and removes the temporary directory.

The files are named `libbun_exec.so` solely so Android installs them into the read-only, executable `nativeLibraryDir`. They are PIE executables and must never be passed to `System.loadLibrary`.

The verifier checks the lock schema, repository-relative paths, cross-file minimum Android metadata, archive and binary hashes, ELF type and machine, `.note.android.ident`, interpreter, ordered system-library dependencies, and every `PT_LOAD` alignment. These are structural and provenance gates, not substitutes for execution on each supported Android version or on a real 16 KB page-size Android environment.

The separate `experimental/api28` directory starts the auditable source-build path for Android 9-12L. Its lock, immutable upstream patch references, two ABI configure inputs, offline verifier, and negative tests are intentionally isolated from the official artifacts. That experiment currently reports `buildReady: false`, `distributionReady: false`, and `runtimeProduced: false`; nothing in it is packaged by the plugin.
