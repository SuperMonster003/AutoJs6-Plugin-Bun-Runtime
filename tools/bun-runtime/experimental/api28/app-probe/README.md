# Isolated application-process probe (test-only, not a plugin)

This tool checks the locked patched Bun runtime in an actual Android application
process. It is independent of the production Gradle app, AutoJs6, AndroidX and
the shared Binder API. Its only shared Java implementation is the production
`SupervisedProcess` control wrapper, compiled directly from its repository source
instead of copied into a second implementation. It does not change the official plugin's API 33 minimum,
runtime files, signing identity, metadata or installed package.

The package is `io.github.supermonster003.autojs6.plugin.bun.runtime.api28probe`.
It has `minSdk=28`, `targetSdk=36`, `testOnly=true`, `debuggable=false`, one
self-targeting instrumentation entry and INTERNET permission for loopback tests.
There are no activities, services, receivers, providers or plugin contracts.
Its label is deliberately different from the production application name.

## Current result and limits

On 2026-09-09, Sony G8441 (API 28), Sony XQ-AT72 (API 31), Redmi 22120RN86C
(API 33) and Xiaomi 23046RP50C (API 35) each passed all 13 probes in two rounds.
All four used native arm64, 4096-byte pages, ordinary application UIDs,
`untrusted_app` SELinux domains and seccomp filter mode 2. Both the instrumentation
parent and the Bun child assert their application execution context.

The timeout, output-limit and new readiness-triggered cancellation fixtures
intentionally ignore SIGTERM. All 24 lifecycle cases observed the handler's
readiness marker, verified the Bun -> supervisor -> instrumentation parent chain
and application UID, then exited with code 137 with both observed PIDs absent.
The supervisor owns termination and reaping; observed PIDs are never signal
targets. Termination-to-supervisor-exit measurements were 301-307 ms. The original
1500 ms timeout, 1024-byte output fixture and 2000 ms reaping gate were not relaxed.
Output readers continue bounded capture/discard until exit instead of closing
before termination. Every successful probe also verifies its workspace removal,
and a final recovery script checks that subsequent execution still works.

The [new device report](../../../../../docs/compatibility/2026-09-09-m3-supervised-application-probe.json)
contains exact APK/runtime/supervisor digests, Git-canonical source fingerprints,
environments, bounded outcomes and UID cleanup results. The
[2026-09-08 failure report](../../../../../docs/compatibility/2026-09-08-m3-application-probe.json)
is preserved unchanged: its old Java termination path passed only 10/12 probes.
The official plugin's separate Binder reproduction/fix is documented in the
[M1 report](../../../../../docs/compatibility/2026-09-08-m1-supervised-termination.json);
it is not a substitute for this patched-runtime result, or vice versa.

Full experimental plugin/Binder execution, forced-syscall/FD-CLOEXEC semantics,
blocked SIGSYS masks, watch/reload, API 29/30/32, native x86_64 and native 16 KiB
execution remain unproven. Only the immediate Bun child is supervised, not
arbitrary detached descendants; this is not a security sandbox.
`distributionReady` remains false. Nothing here is published as a Release asset.

## Build outside the repository

Use Node.js, JDK 21, Android platform 36 and installed Android build tools
(validated locally with 37.0.0). JDK paths are explicit so an older Java on PATH
cannot silently compile or sign the test package. Both independent clean-build
outputs are mandatory; Windows can read them from a WSL ext4 share.

```powershell
node tools/bun-runtime/experimental/api28/app-probe/build-probe.mjs `
  --sdk <absolute-android-sdk> `
  --jdk <absolute-jdk-21> `
  --build-tools 37.0.0 `
  --arm64 <absolute-run-1/bun-arm64-v8a> `
  --x86 <absolute-run-1/bun-x86_64> `
  --repeat-arm64 <absolute-run-2/bun-arm64-v8a> `
  --repeat-x86 <absolute-run-2/bun-x86_64> `
  --output-directory <absolute-new-external-directory>
```

The parent directory must exist; the output directory must not. The builder
refuses repository/ancestor outputs, existing outputs, symlink input files,
identical primary/repeat input paths, mismatched hashes or ELF evidence.
Windows mount permission bits are not treated as Unix-mode evidence; the exact
locked bytes are rechecked and installed executable permissions are tested on
Android. No input binary is copied into a tracked production payload directory.

The builder also verifies and packages the checked-in, separately locked
`libbun_supervisor.so` for each ABI. Both Bun and its supervisor execute only
from read-only `nativeLibraryDir`; the external patched Bun inputs and the
official Bun/supervisor payloads in Git are not modified. Reproducing the helper
itself uses the [fixed NDK 29 recipe](../../../supervisor/README.md); this does not
change the patched Bun's independent NDK 27 toolchain.

`javac`, D8, AAPT2, the JDK jar utility, zipalign and apksigner create two
single-ABI APKs and schema-2 `probe-build.json`. The receipt binds the shared Java
source, supervisor source/toolchain lock, both helpers, probe sources and runtime
evidence using UTF-8/LF source bytes. Schema 1 is rejected; rebuild old probes.
Each build uses an ephemeral local RSA
test certificate with APK Signature Scheme v2. The temporary key and build
staging are removed after building; no release signing configuration is read.
The five bundled Bun/WebKit license texts and the project's MPL-2.0 license
for the first-party wrapper/helper accompany the probe. Build results
are not claimed to be byte-reproducible APKs: the *runtime* inputs are reproducible,
while the temporary certificate and APK metadata can differ between invocations.

## Run on an explicitly selected device

```powershell
node tools/bun-runtime/experimental/api28/app-probe/run-probe.mjs `
  --adb <absolute-adb-executable> `
  --serial <explicit-device-serial> `
  --abi arm64-v8a `
  --required-api 28 `
  --required-page-size 4096 `
  --apk-directory <absolute-builder-output-directory> `
  --output-directory <absolute-new-external-report-directory> `
  --sdk <absolute-android-sdk> `
  --jdk <absolute-jdk-21> `
  --build-tools 37.0.0
```

The runner rechecks current source fingerprints, APK signature/digests, the
actual packaged Manifest, native entries and ZIP alignment before installation.
It refuses an already-installed probe package rather than replacing it. It also
rejects ABI translation as native evidence and refuses the known-incompatible
x86_64 runtime with 16 KiB pages. The instrumented process asserts the requested
API/page size, native kernel architecture, application UID/context, exact installed
APK SHA-256 and both executable bytes/permissions in read-only `nativeLibraryDir`.

Only fixed test fixtures run, via direct argument vectors. JavaScript and
TypeScript use `bun run --no-install <private-source>`; only the two metadata
probes use `--version` or `--revision`. The executable never runs from a writable
application directory. Scripts, files and loopback HTTP are local test data.
No remote dependency installation or network service is needed.

Each process uses the shared wrapper's private control pipe: EOF requests
SIGTERM, 200 ms grace, SIGKILL if necessary, and reaping of the immediate child.
Bun stdin is already EOF and does not inherit that control pipe. Closing the
wrapper's script stdin is not a cancellation request.

Each process has a bounded timeout and combined stdout/stderr budget; reports
retain only bounded stream summaries. The runner force-stops the exact probe
package between rounds, verifies both its named process and every process with
its exact installed UID are absent, repeats the suite, then
uninstalls only the package installed by this invocation. Reports and raw bounded
instrumentation output remain in the requested external report directory,
including on failed tests. The final cleanup also checks the exact UID for
residual children after uninstall. If device connectivity is lost, inspect `cleanupError`
and remove only this exact test package after reconnecting.

## Development checks

```powershell
node --test tools/bun-runtime/experimental/api28/app-probe/probe-common.test.mjs
```

Build CI runs these fail-closed validator tests and compiles the Java runner
and shared process wrapper
against Android platform 36. CI does not have the external patched binaries and
does not claim to run this device suite. A future distributable experimental
plugin still needs its own reviewed identity, full Binder matrix and the matching
same-Release corresponding-source assets through the existing draft-first flow.
