******

### Release History

******

# v0.2.0

###### 2026/09/08

* `Hint` This release lowers the minimum system requirement from Android 14 to Android 13 (API 33); Android 9 through 12L (API 28 through 32) remains unsupported until a patched Bun runtime passes portability validation
* `Fix` Harden Release asset verification by checking the WebKit archive directly against its locked size and SHA-256, and accepting the certificate output formats of supported apksigner versions
* `Fix` Identify the installed runtime ABI from the locked payload SHA-256 instead of ABI-table iteration, and make prewarming execute a minimal JavaScript smoke test so an unusable runtime is rejected before user scripts start
* `Fix` Reject the known-incompatible official x86_64 runtime before process launch when Android uses pages larger than 4 KiB after isolating the failure to pinned JavaScriptCore's 4 KiB page-size ceiling, replacing a deterministic Bun abort with a bounded diagnostic
* `Improvement` Lower the minimum system requirement: keep the pinned official Bun 1.4.0 Android payload and relax the support floor from Android 14 (API 34) to Android 13 (API 33) to cover more devices
* `Improvement` Identify the root cause of failures on older Android versions: starting with Android 13 the system seccomp allows the raw `close_range` syscall that Bun invokes, while a real-device failure on API 31 proves that API 28 through 32 require patching Bun itself and cannot be fixed by manifest changes alone
* `Improvement` Lay the groundwork for future Android 9+ support: establish a precisely replayable Bun source patch plan (6 patches) and lock the build inputs (pinned NDK and container, 22 active Android release dependencies); this establishes a separate experimental line and does not alter the official runtime shipped in current packages
* `Improvement` Strengthen package quality checks: every Debug and Release APK verifies 16 KB ZIP alignment, exact ABI contents, and the size and SHA-256 of the pinned Bun payload, with installed payload bytes cross-checked on an Android 13 test device
* `Improvement` Harden the supply chain: lock the exact bytes of 19 Bun source archives and 17 toolchain downloads, inventory 181 Cargo and 172 Bun registry integrity entries, and add an overwrite-refusing materializer plus a dual-ABI build preflight guarded by the `buildReady` gate
* `Improvement` Expand the copy-and-run sample library with annotated network fetch, private-workspace file I/O, stdout/stderr streaming, and richer TypeScript examples; add a documentation gate that enforces the first-line `"bun";` directive and the single-source, no-install boundaries
* `Improvement` Validate 16 KB execution on an Android 16 (API 36) AVD with PAGE_SIZE=16384 enforced: the `arm64-v8a` single-ABI APK passes all 5 Binder instrumentation tests through `libndk_translation`, while the native `x86_64` payload aborts with exit code 134 even for a minimal script; general 16 KB support therefore remains unclaimed
* `Improvement` Close the Cargo portion of the experimental Android 9+ build supply chain: lock and materialize all 181 crates.io archives (26,354,160 bytes), generate a checksum-verified directory source, and prove pinned Cargo can load the full Bun workspace with `--locked --offline` and an empty `CARGO_HOME`; this result covers Cargo inputs only and does not by itself close the other build inputs
* `Improvement` Close the Bun-registry portion of that supply chain: resolve 172 lock references to 125 unique Linux x64 npm archives (31,498,870 bytes), rebuild a minimal cache from the locked tarballs, and pass all three frozen installs in the locked Ubuntu container with networking disabled and the cache read-only; `esbuild@0.21.5` is the only trusted postinstall dependency
* `Improvement` Complete the reproducible patched-runtime build gate without shipping it: lock 155 host `.deb` archives (422,223,096 bytes) into a repeatable OCI image, expand the Cargo closure to 206 unique archives, run two clean networkless builds of both 64-bit ABIs with byte-identical results, and lock pure-Node ELF audits; direct API 28 and 31 shell probes pass, while APK and application-process gates remain open
* `Improvement` Implement verifiable corresponding-source Release assets: keep sources separate from APKs in the same Release; package exact Bun/WebKit/JSC, 19 native, 206 Cargo, and 125 npm source archives plus patches, build/relink instructions, and a public license notice; split large assets at 1.9 GB, bind APK/runtime/source bytes with a machine-readable manifest and SHA256SUMS, and publish the draft only after GitHub SHA-256 digests match; this records automated technical verification, not legal approval
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
