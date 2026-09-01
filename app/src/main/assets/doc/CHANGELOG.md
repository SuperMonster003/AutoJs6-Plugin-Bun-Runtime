******

### Release History

******

# v0.1.0

###### 2026/09/01

* `Hint` The first release runs one source snapshot and does not expose AutoJs6 globals, a Java bridge, multi-file projects, or relative project imports
* `Feature` Run JavaScript and TypeScript with the official Bun 1.4.0 Android executable as an independent `bun` engine selected by the `"bun";` directive, using `bun run --no-install <source>` without automatic dependency installation
* `Feature` Stream stdout and stderr only as bounded oneway Binder callback chunks, while terminal results report status and diagnostics without carrying the complete output streams
* `Feature` Support explicit cancellation, a 60-second default timeout, runtime information, and prewarming in the isolated `:bun_runtime` plugin process
* `Feature` Ship official 64-bit Android payloads for `arm64-v8a` and baseline `x86_64`, plus single-ABI and `universal` packages
* `Feature` Provide plugin discovery, protected Wake activation, complete PluginInfo metadata, and user documentation in 10 languages
* `Improvement` Use a versioned Binder contract with ParcelFileDescriptor source transport, a 16 MiB source limit, and an 8 MiB combined output limit
* `Improvement` Launch Bun from Android's read-only native library directory and verify the pinned release archive and packaged binary sizes, SHA-256 digests, ELF type, machine, and alignment
* `Improvement` Verify at least 16 KB PT_LOAD alignment for both packaged executables while explicitly recording that no real 16 KB Android runtime test has been completed
* `Improvement` Generate README, plugin-center instructions, and built-in changelog assets from validated JSON sources, with build, Markdown, and runtime artifact CI checks
* `Improvement` Require Android 14 (API 34) after a real API 31 run hit app seccomp `SIGSYS` on Bun syscall 436 `close_range`; one Sony API 33 device unexpectedly passed but is not portable evidence, while API 35 JS and TS Binder round trips passed and lower versions await an upstream fallback
