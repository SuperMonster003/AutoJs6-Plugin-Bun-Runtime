******

### Release History

******

# v0.2.0

###### 2026/09/01

* `Hint` This release lowers the minimum system requirement from Android 14 to Android 13 (API 33); Android 9 through 12L (API 28 through 32) remains unsupported until a patched Bun runtime passes portability validation
* `Improvement` Lower the minimum system requirement: keep the pinned official Bun 1.4.0 Android payload and relax the support floor from Android 14 (API 34) to Android 13 (API 33) to cover more devices
* `Improvement` Identify the root cause of failures on older Android versions: starting with Android 13 the system seccomp allows the raw `close_range` syscall that Bun invokes, while a real-device failure on API 31 proves that API 28 through 32 require patching Bun itself and cannot be fixed by manifest changes alone
* `Improvement` Lay the groundwork for future Android 9+ support: establish a precisely replayable Bun source patch plan (6 patches) and lock the build inputs (pinned NDK and container, 22 active Android release dependencies); the patched runtime is not built yet and does not ship in current packages
* `Improvement` Strengthen package quality checks: every Debug and Release APK verifies 16 KB ZIP alignment, exact ABI contents, and the size and SHA-256 of the pinned Bun payload, with installed payload bytes cross-checked on an Android 13 test device
* `Improvement` Harden the supply chain: lock the exact bytes of 19 Bun source archives and 17 toolchain downloads, inventory 181 Cargo and 172 Bun registry integrity entries, and add an overwrite-refusing materializer plus a dual-ABI build preflight guarded by the `buildReady` gate
* `Dependency` Add the Kotlin Parcelize runtime so that R8 in Release builds keeps the shared Parcelable contract class

# v0.1.0

###### 2026/09/01

* `Hint` First release: each run executes one standalone script file; AutoJs6 built-in functions, the Java bridge, multi-file projects, and relative imports are not available yet
* `Feature` Add the standalone `bun` engine: put `"bun";` on the first line of a script to run JavaScript and TypeScript with the official Bun 1.4.0 Android executable; the actual command is `bun run --no-install <source>`, so dependencies are never installed automatically
* `Feature` Stream run output in real time: stdout and stderr come back in bounded oneway Binder callback chunks, while the final result reports only status and diagnostics without carrying the complete output stream
* `Feature` Keep runs under control: scripts execute in the isolated `:bun_runtime` plugin process, with explicit cancellation, a 60-second default timeout, runtime information queries, and prewarming
* `Feature` Ship official 64-bit Android payloads for `arm64-v8a` and baseline `x86_64`, plus single-ABI and `universal` packages
* `Feature` Deliver the full plugin experience: plugin discovery, permission-protected activation (Wake), complete PluginInfo metadata, and user documentation in 10 languages
* `Improvement` Adopt a versioned Binder contract that transfers source code over ParcelFileDescriptor, with a 16 MiB source limit and an 8 MiB combined output limit
* `Improvement` Launch Bun from Android's read-only native library directory and verify the size, SHA-256, and ELF properties of the pinned release archives and packaged binaries
* `Improvement` Verify that both packaged executables have PT_LOAD alignment of at least 16 KB, while honestly noting that testing in a real 16 KB Android environment is not complete yet
* `Improvement` Generate the README, plugin center instructions, and built-in changelog from validated JSON copy sources, and add CI checks for the build, Markdown, and runtime artifacts
* `Improvement` Set the provisional minimum to Android 14 (API 34): on a real API 31 device Bun's `close_range` syscall was killed by seccomp with `SIGSYS`, one Sony API 33 device passed unexpectedly but that does not prove portability, and real-device JS and TS Binder round-trip tests passed on API 35
