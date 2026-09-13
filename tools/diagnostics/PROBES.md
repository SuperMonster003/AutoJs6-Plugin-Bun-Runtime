# Readiness probe lifecycle regression

The production readiness probe validates installed Bun/supervisor hashes and page
size, then runs `--version`, `--revision` and `--eval "void 0"` through
`SupervisedProcess`. Its two output readers retain at most 4096 bytes each. An
overflow requests termination; each command has a 10-second timeout and a bounded
cleanup. It never executes user source during readiness inspection.

One cache serializes inspection for `getRuntimeInfo`, `prewarmRuntime` and script
dispatch. Success and fixed integrity/version/page-size failures last until service
recreation. A fully cleaned-up launch, timeout, output/read or nonzero-exit failure
may retry on the first request at least 30 seconds after completion. There is no
background retry and concurrent requests share the completed attempt. Incomplete
reaping or draining disables retries to avoid accumulating processes/readers.

Diagnostics preserve the localized summary and append fixed API, verified ABI,
phase, expected/observed identity, retry policy and command outcome facts. Stderr
comes only from fixed probes and is bounded. Exit values 129-192 are explicitly
labelled possible signals inferred from the supervisor exit convention; an explicit
`process.exit(159)` is indistinguishable from SIGSYS by that code alone. These
messages do not report a captured signal or `si_syscall`. Exception messages, user
source, device fingerprints and arbitrary environment values are not collected.

`BunRuntimeProbeInstrumentedTest` is separate from the unchanged eight-test Binder
suite. It uses internal Kotlin constructor injection for one launch IOException
and one version mismatch, then executes the real installed payload. The synthetic
clock tests the exact 30-second cache boundary without waiting 30 wall-clock
seconds. There is no Binder key, production preference or runtime flag that
enables injection. Other commands check real bounded output, a SIGTERM-ignoring
timeout, reaping, reader completion and subsequent execution. The fixed exit 159
is a diagnostic control, not an Android seccomp observation.
For a failed launch that returns no Process, the cleanup flags mean that no owned
Process handle or output readers were created; the exit code remains unknown.

## Build and run

Use a new directory for each build/run; existing directories are never overwritten.
Set `JAVA_HOME` to the repository-compatible JDK. Existing native products are
verified and repackaged, never rebuilt by these helpers.

```powershell
node tools/diagnostics/build-runtime-probes.mjs official NEW_APK_DIRECTORY
node tools/diagnostics/build-runtime-probes.mjs experimental NEW_APK_DIRECTORY LOCKED_RUNTIME_DIRECTORY LOCKED_REPEAT_DIRECTORY
node tools/diagnostics/run-runtime-probes.mjs --mode official --sdk SDK --jdk JDK --serial SERIAL --abi arm64-v8a --api 33 --pages 4096 --apks NEW_APK_DIRECTORY --output NEW_DEVICE_DIRECTORY
node tools/diagnostics/run-runtime-probes.mjs --mode experimental --sdk SDK --jdk JDK --serial SERIAL --abi arm64-v8a --api 28 --pages 4096 --apks NEW_APK_DIRECTORY --output NEW_DEVICE_DIRECTORY
```

The official package is isolated as `.diagnostics`; the existing minSdk-28 opt-in
module uses `.api28binder`. Both retain the real service permission and matching
APK signatures. Inputs are hashed before/after the build and before/after device
runs; the experimental APK's embedded receipt is checked too. Every device uses
two rounds with process stops between them, exact API/ABI/page assertions,
installed APK hashes and both package UID cleanup checks. Tools do not start or
stop AVDs or replace existing installed packages.

The official batch also repeats the ten-language resource/error tests. Its x86
16 KiB refusal is checked separately with the existing message runner and an
independently bound build. The experimental runtime remains test-only, with
`distributionReady=false`. This suite does not rerun the 31 native application
probes, general syscall/FD/OEM coverage, JSC pressure or signed Release acceptance.

```powershell
node --test tools/diagnostics/probe-lifecycle-common.test.mjs
```

Archive successful batches before changing their compiled inputs:

```powershell
node tools/diagnostics/archive-runtime-probes.mjs official binder NEW_BINDER.json DEVICE_DIRECTORY...
node tools/diagnostics/archive-runtime-probes.mjs official probe NEW_PROBES.json DEVICE_DIRECTORY...
node tools/diagnostics/archive-runtime-probes.mjs official messages NEW_MESSAGES.json DEVICE_DIRECTORY...
node tools/diagnostics/archive-runtime-probes.mjs experimental binder NEW_BINDER.json DEVICE_DIRECTORY...
node tools/diagnostics/archive-runtime-probes.mjs experimental probe NEW_PROBES.json DEVICE_DIRECTORY...
```

Each directory is a separate argument. The archiver rechecks source snapshots,
signatures, installed APKs, all raw suites and both cleanup UIDs. It refuses a
mixed-runtime batch, incomplete rounds, failed tests and an existing output.
Register the resulting reports in the compatibility matrix; controlled probe
tests remain separate from the original Binder and native syscall suites.
