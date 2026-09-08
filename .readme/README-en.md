<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://bun.sh/logo.svg" alt="Bun Runtime" border="0" width="128" />
  </p>

  <p>Runs JavaScript and TypeScript with the independent Bun engine in an isolated Android process</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=A24232&label=Issues"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-Bun-Runtime?color=534BAE&label=License"/></a>
  </p>
</div>

******

### Languages

******

The current README.md supports the following languages:

- English [en] # current
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ar.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-es.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-fr.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-ru.md)
- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/.readme/README-zh-Hant-TW.md)

******

### Introduction

******

Bun Runtime is a standalone plugin that adds an optional modern script engine to AutoJs6: [Bun](https://bun.sh/). Once the plugin is installed and enabled, putting `"bun";` on the first line of a JavaScript or TypeScript file hands that file to a real Bun 1.4.0 engine instead of the built-in Rhino engine, so modern JavaScript syntax, TypeScript, and built-in Bun APIs such as `fetch` become directly usable on Android devices.

The plugin works in a straightforward way: AutoJs6 sends the script content to the plugin, the plugin launches the official Bun Android executable in its own isolated process, and the output plus the final result stream back to the AutoJs6 console in real time. This is genuine Bun, not an alias or emulation layer over Rhino or Node.js.

******

### Install and Use

******

1. Prepare the environment: install AutoJs6 build 5278 (6.8.0) or later on Android 13 (API 33) or later.
2. Install the plugin: download and install the APK matching the device from [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). Choose `arm64-v8a` for most phones and tablets, `x86_64` for emulators or x86_64 devices, or `universal` when unsure (slightly larger, works on both).
3. Enable the plugin: open the AutoJs6 plugin center and enable Bun Runtime. If the freshly installed plugin shows as stopped, tap the `Activate` action shown by the host.
4. Run a script: put `"bun";` alone on the first line of a JavaScript or TypeScript file (including the quotes and the semicolon), then run the file from AutoJs6 as usual.

> Each run executes one snapshot of the current file (the actual command is `bun run --no-install <source>`); the plugin never installs npm dependencies automatically and never reads other files in the project. Read the current limitations below before moving an existing Rhino or Node.js project to Bun.

******

### Quick Start

******

Save the following content as a script file and run it to confirm that the Bun engine has taken over execution:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

If everything works, the first output line is `Bun 1.4.0` and the second line is `android`.

TypeScript files run directly as well, with no ahead-of-time compilation or extra configuration:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

More annotated, copy-and-run examples for network requests, private-workspace file I/O, stdout/stderr, and TypeScript types are available in [samples/](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/tree/master/samples). Every example stays within the current single-source and `--no-install` boundaries.

******

### Features

******

- A real Bun engine: scripts are executed directly by the official Bun 1.4.0 Android executable, with no transpilation and no forwarding to other AutoJs6 engines.
- TypeScript out of the box: TS files run directly without a compile step or extra configuration, and modern JavaScript syntax, single-file ESM syntax, and the Bun APIs available in the pinned Android build all work.
- Transparent execution: output such as `console.log` streams back to the AutoJs6 console in real time, and the final result reports the exit status, duration, and whether the run timed out or was cancelled.
- Stable and controllable: each script runs in an isolated plugin process, can be cancelled at any time, and is terminated automatically on timeout, so a misbehaving script never takes AutoJs6 down with it.
- Verifiable engine provenance: the bundled Bun executable corresponds byte for byte to the official release, and its tag, commit, size, SHA-256, and ELF properties are enforced during build and CI.
- Fully localized delivery: plugin metadata, plugin-center instructions, README, and changelog cover 10 languages, all generated from one validated source set.

******

### Current Limitations

******

- One file per run: the plugin receives and executes a single source snapshot without the project directory, so relative imports such as `import './utils.js'` cannot be resolved. ESM syntax inside the single file is unaffected; when multiple modules are needed, bundle them into one file on a computer first (see the FAQ).
- No AutoJs6 built-ins: automation APIs such as `click()` and `toast()` and the Rhino globals do not exist inside Bun scripts, so Bun scripts currently suit tasks that do not depend on host capabilities, such as computation, text processing, and network requests.
- No Java bridge: Bun scripts cannot directly access Java classes or objects in the AutoJs6 process.
- No full Bun toolchain promise: `bunx`, on-device executable output, runtime C compilation, and arbitrary native addons are outside the supported scope.
- Not a security sandbox: a Bun script runs as trusted code in the plugin process and can use the permissions granted to the plugin, so only run scripts you trust.

******

### FAQ

******

#### Why are AutoJs6 functions such as `click()` and `toast()` unavailable in Bun scripts?

Bun runs in a separate process and is a completely different JavaScript engine from Rhino, so the AutoJs6 globals do not appear inside Bun scripts. Letting Bun scripts call automation capabilities requires a host bridge that exposes each capability explicitly; the current version deliberately provides no such bridge yet. See the roadmap for plans.

#### Can I use npm packages?

Not by installing them on the device. The plugin always runs with `--no-install` and never downloads dependencies. If a third-party library is really needed, bundle the script and its pure-JS dependencies into a single file on a computer first, for example with `bun build`, then run that file on the device; packages that rely on native addons cannot be used this way.

#### Can a script `import` other files from the project?

Not currently. The plugin contract transfers one source snapshot without the project directory, so relative imports cannot be resolved. Multi-file project support is on the roadmap, and ESM syntax inside the single file works normally.

#### Why is Android 13 the minimum?

Bun invokes the Linux `close_range` system call (syscall 436), which the app seccomp allowlist on Android 12L and earlier does not include, so the Bun process is killed with `SIGSYS` (reproduced on a real API 31 device). Android 13 allows the call, and real-device tests on API 33 and API 35 passed. Supporting older versions requires patching Bun; see the roadmap for progress.

#### What happens when a script times out or prints too much?

A run is limited to 60 seconds by default; on timeout the Bun process is terminated and the result is marked as timed out. When combined stdout and stderr output exceeds 8 MiB, the run ends with an output-limit error instead of being silently truncated. In either case, split the task or reduce the amount of output.

#### Are 16 KB page-size devices supported?

Both packaged ELF executables and all APK entries pass the 16 KB alignment gates. On an Android 16 (API 36) 16 KB AVD, the `arm64-v8a` APK passed the full Binder suite through `libndk_translation`, but the native `x86_64` payload aborts with exit code 134 even for a minimal script; native arm64 has not been tested. This is partial evidence, so this release still does not claim general 16 KB support.

#### Which APK should I install?

Most phones and tablets use `arm64-v8a`. Use baseline `x86_64` for emulators or x86_64 devices. When unsure, install `universal`, which contains both ABIs and is slightly larger but the safest choice.

******

### Compatibility

******

- Engine: official Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- System: Android 13 (API 33) or later, with official 64-bit executables for `arm64-v8a` and baseline `x86_64`. Android 9 through 12L (API 28 through 32) are not supported yet; the FAQ above explains why. Real-device tests on API 33 and API 35 passed.
- Host: AutoJs6 build 5278 or later, with Bun runtime contract version 1.
- Per-run bounds: source up to 16 MiB, combined stdout and stderr output up to 8 MiB, and a default timeout of 60 seconds.
- Packages: single-ABI APKs keep installs smaller, while the larger `universal` APK contains both supported ABIs.

******

### Permissions and Integrity

******

- The exported activation (Wake), info, and runtime components are protected by `org.autojs.permission.PLUGIN`, and AutoJs6 still performs its normal plugin authorization checks.
- The script snapshot is staged in a private per-run directory, and the Bun executable is launched from Android's read-only native library directory instead of being copied to writable storage.
- The repository lock records both the official release archives and the binaries packaged into the APK; CI rejects any drift in size, SHA-256, or ELF properties before building.
- The plugin declares Internet access because trusted Bun scripts may use network APIs such as `fetch`. The plugin is not a sandbox; only run scripts you trust.

******

### Plugin Interface

******

This section is for AutoJs6 host and plugin developers; regular users can skip it. The stable identifiers and limits are:

```text
application id: io.github.supermonster003.autojs6.plugin.bun.runtime
plugin id: bun-runtime
engine: bun
variant: bun-1.4.0-android
service action: org.autojs.plugin.bun.RUNTIME
service category: bun
aidl interface: org.autojs.plugin.bun.runtime.api.IBunRuntimePlugin
contract version: 1
aidl methods: getInfo(), getRuntimeInfo(), runScript(request, source, callback), cancelScript(executionId), prewarmRuntime()
minimum host build: 5278 (6.8.0)
source limit: 16 MiB
combined stdout/stderr streaming budget: 8 MiB
default timeout: 60 seconds
```

`BunRuntimeService` is discovered by action `org.autojs.plugin.bun.RUNTIME` and category `bun`. It accepts the source through `ParcelFileDescriptor` and an execution ID in the request, then runs `bun run --no-install <source>` while the synchronous `runScript` call remains active. Stdout and stderr are sent only as bounded chunks through the oneway callback. The returned terminal Bundle and `finished` event contain status and diagnostic summary fields, never the complete output streams, which keeps each Binder transaction below its size limit. The service supports explicit cancellation and runtime prewarming and runs in `:bun_runtime`.

16 KB status: both ELF payloads and their APK entries pass the alignment gates. On an Android 16 (API 36) 16 KB AVD, `arm64-v8a` passed all 5 Binder tests through `libndk_translation`, while native `x86_64` aborts with exit code 134 on a minimal script; native arm64 remains untested. General 16 KB support is not claimed.

******

### Roadmap

******

The roadmap answers two questions: what works now and what comes next. Checked items describe the actual behavior of the current version; unchecked items (multi-file projects, an AutoJs6 capability bridge, broader Android version support, Bun upgrades, and more) are plans, not promises of current support.

- [View ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Release History

******

#### v0.2.0

_2026/09/08_

- `Hint` This release lowers the minimum system requirement from Android 14 to Android 13 (API 33); Android 9 through 12L (API 28 through 32) remains unsupported until a patched Bun runtime passes portability validation
- `Fix` Harden Release asset verification by checking the WebKit archive directly against its locked size and SHA-256, and accepting the certificate output formats of supported apksigner versions
- `Fix` Identify the installed runtime ABI from the locked payload SHA-256 instead of ABI-table iteration, and make prewarming execute a minimal JavaScript smoke test so an unusable runtime is rejected before user scripts start
- `Fix` Reject the known-incompatible official x86_64 runtime before process launch when Android uses pages larger than 4 KiB after isolating the failure to pinned JavaScriptCore's 4 KiB page-size ceiling, replacing a deterministic Bun abort with a bounded diagnostic
- `Improvement` Lower the minimum system requirement: keep the pinned official Bun 1.4.0 Android payload and relax the support floor from Android 14 (API 34) to Android 13 (API 33) to cover more devices
- `Improvement` Identify the root cause of failures on older Android versions: starting with Android 13 the system seccomp allows the raw `close_range` syscall that Bun invokes, while a real-device failure on API 31 proves that API 28 through 32 require patching Bun itself and cannot be fixed by manifest changes alone
- `Improvement` Lay the groundwork for future Android 9+ support: establish a precisely replayable Bun source patch plan (6 patches) and lock the build inputs (pinned NDK and container, 22 active Android release dependencies); this establishes a separate experimental line and does not alter the official runtime shipped in current packages
- `Improvement` Strengthen package quality checks: every Debug and Release APK verifies 16 KB ZIP alignment, exact ABI contents, and the size and SHA-256 of the pinned Bun payload, with installed payload bytes cross-checked on an Android 13 test device
- `Improvement` Harden the supply chain: lock the exact bytes of 19 Bun source archives and 17 toolchain downloads, inventory 181 Cargo and 172 Bun registry integrity entries, and add an overwrite-refusing materializer plus a dual-ABI build preflight guarded by the `buildReady` gate
- `Improvement` Expand the copy-and-run sample library with annotated network fetch, private-workspace file I/O, stdout/stderr streaming, and richer TypeScript examples; add a documentation gate that enforces the first-line `"bun";` directive and the single-source, no-install boundaries
- `Improvement` Validate 16 KB execution on an Android 16 (API 36) AVD with PAGE_SIZE=16384 enforced: the `arm64-v8a` single-ABI APK passes all 5 Binder instrumentation tests through `libndk_translation`, while the native `x86_64` payload aborts with exit code 134 even for a minimal script; general 16 KB support therefore remains unclaimed
- `Improvement` Close the Cargo portion of the experimental Android 9+ build supply chain: lock and materialize all 181 crates.io archives (26,354,160 bytes), generate a checksum-verified directory source, and prove pinned Cargo can load the full Bun workspace with `--locked --offline` and an empty `CARGO_HOME`; this result covers Cargo inputs only and does not by itself close the other build inputs
- `Improvement` Close the Bun-registry portion of that supply chain: resolve 172 lock references to 125 unique Linux x64 npm archives (31,498,870 bytes), rebuild a minimal cache from the locked tarballs, and pass all three frozen installs in the locked Ubuntu container with networking disabled and the cache read-only; `esbuild@0.21.5` is the only trusted postinstall dependency
- `Improvement` Complete the reproducible patched-runtime build gate without shipping it: lock 155 host `.deb` archives (422,223,096 bytes) into a repeatable OCI image, expand the Cargo closure to 206 unique archives, run two clean networkless builds of both 64-bit ABIs with byte-identical results, and lock pure-Node ELF audits; direct API 28 and 31 shell probes pass, while APK and application-process gates remain open
- `Improvement` Implement verifiable corresponding-source Release assets: keep sources separate from APKs in the same Release; package exact Bun/WebKit/JSC, 19 native, 206 Cargo, and 125 npm source archives plus patches, build/relink instructions, and a public license notice; split large assets at 1.9 GB, bind APK/runtime/source bytes with a machine-readable manifest and SHA256SUMS, and publish the draft only after GitHub SHA-256 digests match; this records automated technical verification, not legal approval
- `Dependency` Add the Kotlin Parcelize runtime so that R8 in Release builds keeps the shared Parcelable contract class

#### v0.1.0

_2026/09/01_

- `Hint` First release: each run executes one standalone script file; AutoJs6 built-in functions, the Java bridge, multi-file projects, and relative imports are not available yet
- `Feature` Add the standalone `bun` engine: put `"bun";` on the first line of a script to run JavaScript and TypeScript with the official Bun 1.4.0 Android executable; the actual command is `bun run --no-install <source>`, so dependencies are never installed automatically
- `Feature` Stream run output in real time: stdout and stderr come back in bounded oneway Binder callback chunks, while the final result reports only status and diagnostics without carrying the complete output stream
- `Feature` Keep runs under control: scripts execute in the isolated `:bun_runtime` plugin process, with explicit cancellation, a 60-second default timeout, runtime information queries, and prewarming
- `Feature` Ship official 64-bit Android payloads for `arm64-v8a` and baseline `x86_64`, plus single-ABI and `universal` packages
- `Feature` Deliver the full plugin experience: plugin discovery, permission-protected activation (Wake), complete PluginInfo metadata, and user documentation in 10 languages
- `Improvement` Adopt a versioned Binder contract that transfers source code over ParcelFileDescriptor, with a 16 MiB source limit and an 8 MiB combined output limit
- `Improvement` Launch Bun from Android's read-only native library directory and verify the size, SHA-256, and ELF properties of the pinned release archives and packaged binaries
- `Improvement` Verify that both packaged executables have PT_LOAD alignment of at least 16 KB, while honestly noting that testing in a real 16 KB Android environment is not complete yet
- `Improvement` Generate the README, plugin center instructions, and built-in changelog from validated JSON copy sources, and add CI checks for the build, Markdown, and runtime artifacts
- `Improvement` Set the provisional minimum to Android 14 (API 34): on a real API 31 device Bun's `close_range` syscall was killed by seccomp with `SIGSYS`, one Sony API 33 device passed unexpectedly but that does not prove portability, and real-device JS and TS Binder round-trip tests passed on API 35

##### For more release history

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-en.md)

******

### Build and Verification

******

Git LFS must materialize both pinned runtime binaries before verification or Gradle packaging. The standard local checks are shown below; building requires JDK 17 or later, Node.js, and Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### Localization and Docs Generation

******

Edit the JSON and Markdown templates, then run `py .python/generate_markdown.py`. Do not edit generated README, changelog, or plugin-instruction files by hand. `--check` validates language shape, version alignment, localized resources, orphan artifacts, and generated-file drift without writing files.

```text
.readme/common.json
.readme/lang_*.json
.readme/template_readme.md
.readme/template_plugin_instruction.md
.changelog/lang_*.json
.changelog/template_changelog.md
.python/generate_markdown.py
app/src/main/assets/doc/CHANGELOG-*.md
app/src/main/res/values*/strings.xml
app/src/main/res/raw*/plugin_instruction.md
```

******

### License

******

Plugin code is licensed under the [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). The bundled official Bun executable contains Bun's MIT-licensed code plus statically linked JavaScriptCore and WebKit under LGPL-2 and other third-party components under their own licenses. Applicable Releases publish a public license/relinking notice and the matching corresponding-source assets separately from the APKs in the same Release, with a machine-readable manifest and SHA256SUMS verified by automated technical checks. See [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) and Bun's pinned [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md).

******

### Links

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Bun official site: https://bun.sh/
- Pinned Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- Third-party notices: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
