# Runtime message regression

For readiness retry, concurrent inspection and bounded command output, see the
separate [probe lifecycle regression](PROBES.md).

This suite checks presentation separately from the unchanged eight-test Binder
suite. It uses the real production service, API AARs, official Bun and supervisor
in an isolated `.diagnostics` Debug package. It does not build native Bun, broaden
Android support, or produce Release acceptance.

`BunRuntimeMessagesInstrumentedTest` has three methods:

- Resources: all 17 message/help keys and all 10 error codes resolve in ten locales;
  compiled plugin help agrees with the same Android strings; diagnostic summaries
  are bounded, preserve Unicode, and render cached failure facts in the requested language.
- Errors: six actual failures per locale (invalid request, timeout, output limit,
  nonzero exit, cancellation before dispatch and source size) have matching terminal
  and `finished` messages. This is 60 observations per round, not 60 JUnit tests.
- Page refusal: on the official x86_64 build at 16384-byte process pages, cached
  `prewarmRuntime`, `getRuntimeInfo`, and `runScript` failures follow all ten locales.
  Bun is refused before execution. This is not x86_64 16 KiB runtime acceptance.

Language tests change only the isolated plugin's app locale and restore it in
`finally`. They do not change the system or AutoJs6 language. Android's
[LocaleManager contract](https://developer.android.com/reference/android/app/LocaleManager#setApplicationLocales(android.os.LocaleList))
applies app locale changes through configuration updates. The service caches
failure facts, then formats messages using its current resource configuration.

## Build and run

Set `JAVA_HOME` to the repository-compatible JDK and use the existing Android SDK.
Check for active builds and existing evidence before creating a new batch. Use a
new output directory outside the repository; the tools refuse to overwrite one.

```powershell
node tools/diagnostics/build-runtime-messages.mjs ABSOLUTE_NEW_APK_DIRECTORY
node tools/diagnostics/run-runtime-messages.mjs --sdk SDK_DIRECTORY --jdk JDK_DIRECTORY --serial SERIAL --abi arm64-v8a --api 33 --pages 4096 --apks ABSOLUTE_NEW_APK_DIRECTORY --output ABSOLUTE_NEW_DEVICE_DIRECTORY
```

The build helper snapshots repository inputs before and after the fixed Gradle
tasks, retains their actual exit/log, and saves the APK bytes with a receipt. The
runner rechecks the snapshot, signatures, package names, 16 KiB ZIP alignment,
contained payloads, installed APK hashes, actual API/ABI/pages and the raw JUnit
results. It refuses an already installed target package. Two rounds include a
process stop between rounds. Every owned install attempt is cleaned up, with
package absence and both UID process counts checked even after failures.

For page-refusal checks, use a native x86_64 API 36 AVD with `--abi x86_64 --api 36
--pages 16384`. The runner checks resources and refusal, and does not run the
eight-test success suite there. Kernel mapping pages are recorded separately.
The tools do not launch or stop AVDs; callers own that lifecycle.

## Archive

The `binder` scope archives the historical eight-test suite; `workspace` archives the
same runner output as kind `workspace-archive-binder` once the suite carries the M6
`workspaceArchiveProjectRoundTrip` method (nine tests). Both bind the same raw rounds.

```powershell
node tools/diagnostics/archive-runtime-messages.mjs binder NEW_BINDER.json ARM_DEVICE_DIRECTORY...
node tools/diagnostics/archive-runtime-messages.mjs workspace NEW_WORKSPACE_BINDER.json ARM_DEVICE_DIRECTORY...
node tools/diagnostics/archive-runtime-messages.mjs messages NEW_MESSAGES.json ARM_DEVICE_DIRECTORY...
node tools/diagnostics/archive-runtime-messages.mjs page-refusal NEW_REFUSAL.json X86_DEVICE_DIRECTORY...
```

Each directory argument is a separate token; `...` denotes additional directories.
The archiver revalidates every suite, raw log, input snapshot, installed APK binding
and cleanup record before creating an immutable JSON file. Register new compatibility
reports in `tools/compatibility/matrix-sources.json` and regenerate the matrix.
Refusal evidence is indexed as a diagnostic; it must not be counted as Bun execution.

The initial 2026-09-13 batch used the same fixed Gradle tasks and a retained external
receipt captured after that controlled build. The new build helper formalizes the
before/after snapshot for future batches; that helper was added after these APKs
were built. Do not attribute its execution to the initial batch.

```powershell
node --test tools/diagnostics/runtime-message-common.test.mjs
```
