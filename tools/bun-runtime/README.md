# Bun runtime provenance

`runtime.lock.json` fixes the exact official Bun v1.4.0 Android release assets and the unpacked executables used by this plugin. This is a pinned binary materialization workflow, not a claim that Gradle rebuilds Bun or JavaScriptCore from source.

Run `node verify-runtime.mjs` before every build. On Windows, `materialize-runtime.ps1` downloads each fixed archive into a unique temporary directory, verifies its archive digest, copies only the `bun` executable into the controlled `jniLibs` path, verifies the unpacked digest and ELF layout, and removes the temporary directory.

The files are named `libbun_exec.so` solely so Android installs them into the read-only, executable `nativeLibraryDir`. They are PIE executables and must never be passed to `System.loadLibrary`.

The verifier requires every `PT_LOAD` segment to be aligned to at least 16 KB. This is a structural packaging gate, not a substitute for execution on a real 16 KB page-size Android device.
