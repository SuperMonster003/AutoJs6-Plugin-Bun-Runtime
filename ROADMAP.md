# Bun Runtime Roadmap

This roadmap distinguishes delivered behavior from planned work. An unchecked item is not available in the current release and is not a compatibility promise.

## 0.1 foundation

- [x] Register `bun` as an independent AutoJs6 script engine selected by the standalone `"bun";` directive.
- [x] Run the pinned official Bun 1.4.0 Android executable in the plugin runtime process instead of aliasing Rhino or Node.js.
- [x] Transfer one JavaScript or TypeScript source snapshot through `ParcelFileDescriptor` and execute it with `bun run --no-install <source>` without automatic dependency installation.
- [x] Stream bounded stdout and stderr chunks through the oneway callback and keep complete output streams out of the terminal Bundle and `finished` event.
- [x] Provide explicit cancellation, runtime information, and prewarming.
- [x] Package official `arm64-v8a` and baseline `x86_64` payloads with reproducible size, SHA-256, ELF, and alignment verification.
- [x] Require Android 14 (API 34) or later after an API 31 real-device run was terminated by app seccomp on Bun syscall 436 `close_range`; the standard AOSP allowlist includes that syscall from API 34. One Sony API 33 device passed unexpectedly, but that device-specific result is not portable support evidence.
- [x] Provide Wake activation, PluginInfo metadata, 10-language resources, generated documentation, and CI integrity checks.

## Android validation

- [ ] Complete the release Binder test matrix on physical `arm64-v8a` Android 14 (API 34) and current Android devices.
- [x] Complete JavaScript and TypeScript Binder round trips on a physical `arm64-v8a` API 35 device.
- [ ] Complete a Binder round trip on an `x86_64` Android emulator using the baseline runtime payload.
- [ ] Run JS, TS, Unicode output, timeout, cancellation, and process-restart cases on every supported ABI.
- [ ] Validate installation, activation, discovery, and execution on a ColorOS device without manually opening the plugin app.
- [ ] Complete end-to-end execution on a real 16 KB page-size Android device or emulator. The current release verifies ELF PT_LOAD alignment only.
- [ ] Verify APK ZIP alignment and installed native payload extraction in the signed release pipeline.
- [ ] Track an upstream Bun fallback for `close_range` under the Android app seccomp policy and reconsider a lower minSdk only after API 28 through 33 execution tests pass.

## Project execution

- [ ] Define a bounded, versioned project-snapshot archive contract with path traversal protection and deterministic ownership rules.
- [ ] Transfer and stage multi-file projects so relative ESM imports can resolve inside a private per-run workspace.
- [ ] Add a project entry-point contract, source maps, arguments, controlled environment variables, and working-directory semantics.
- [ ] Add cleanup recovery for process death and interrupted project extraction.
- [ ] Add compatibility tests for JS, TS, JSON, assets, nested imports, Unicode paths, and rejected unsafe archive entries.

## AutoJs6 capability bridge

- [ ] Design a narrow, permission-aware host bridge instead of exposing the AutoJs6 Java object graph.
- [ ] Version and negotiate every host capability independently.
- [ ] Define cancellation, backpressure, size limits, and error semantics for calls from Bun to the host.
- [ ] Add end-to-end tests before exposing the first automation capability.
- [ ] Keep unimplemented Rhino globals explicit. Bun must not silently fall back to Rhino behavior.

## Runtime lifecycle and upgrades

- [ ] Track stable Bun Android releases and update only through reviewed lock-file changes.
- [ ] Verify tag, commit, release archive, decompressed binary, runtime version, and runtime revision before each upgrade.
- [ ] Review Bun and WebKit licensing, linked-library notices, Android regressions, and minimum API changes for every upgrade.
- [ ] Benchmark startup, warm execution, memory use, streaming throughput, and cancellation without weakening correctness tests.
- [ ] Investigate an optional long-lived worker only if Bun exposes a stable, testable lifecycle that preserves isolation between runs.

## Explicit non-goals for 0.1

- Embedding Bun or JavaScriptCore through an undocumented JNI or C API.
- Pretending that Bun is compatible with Rhino globals or the AutoJs6 Java bridge.
- Claiming support for arbitrary native addons, `bunx`, runtime C compilation, or executables produced in app-writable storage.
- Treating Bun execution as a security sandbox.
- Claiming verified 16 KB runtime support before a real 16 KB Android execution passes.
