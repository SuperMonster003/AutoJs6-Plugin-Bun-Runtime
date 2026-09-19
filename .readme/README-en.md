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

The plugin works in a straightforward way: AutoJs6 sends the script content to the plugin, the plugin launches the official Bun Android executable in its own isolated process, and the output plus the final result stream back to the AutoJs6 console in real time. This is genuine Bun, not an alias or emulation layer over Rhino or Node.js. On Android 17 or later, allow Nearby devices before enabling this plugin in the AutoJs6 plugin center. You can also manage this permission from the Settings page for this plugin. Without permission, the plugin stays disabled and automatic startup is skipped silently. The grant belongs to this plugin, independently of AutoJs6.

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

Bun runs in a separate process and is a completely different JavaScript engine from Rhino, so the AutoJs6 globals do not appear inside Bun scripts. Letting Bun scripts call automation capabilities requires a host bridge that exposes each capability explicitly; the current version deliberately provides no automation interface. The first read-only capability (a host info snapshot: a JSON file pointed to by the `AUTOJS6_HOST_INFO_FILE` environment variable with the host and plugin versions) is implemented on the plugin side, and so is the second part: runtime calls (`ui.toast` and `device.info`) that scripts reach through `fetch(url, { unix })` on the unix socket named by the `AUTOJS6_HOST_BRIDGE_SOCKET` environment variable. Both become usable once AutoJs6 ships the matching host release, and each capability can be switched off in the plugin's settings page of the AutoJs6 plugin center. See the roadmap for plans.

#### Can I use npm packages?

Not by installing them on the device. The plugin always runs with `--no-install` and never downloads dependencies. If a third-party library is really needed, bundle the script and its pure-JS dependencies into a single file on a computer first, for example with `bun build`, then run that file on the device; packages that rely on native addons cannot be used this way.

#### Can a script `import` other files from the project?

Not with the currently released AutoJs6. Since plugin 0.2.2 the runtime accepts a project snapshot (a bounded ZIP workspace archive) and expands it into the private per-run workspace, so relative imports inside the project resolve. The host must pack the project directory and declare the capability; that host change is prepared but not released yet. Until then only single-file snapshots are transferred, and ESM syntax inside the single file works normally.

#### Why is Android 13 the minimum?

Bun invokes the Linux `close_range` system call (syscall 436), which the app seccomp allowlist on Android 12L and earlier does not include, so the Bun process is killed with `SIGSYS` (reproduced on a real API 31 device). Android 13 allows the call, and real-device tests on API 33 and API 35 passed. Supporting older versions requires patching Bun; see the roadmap for progress.

#### What happens when a script times out or prints too much?

A run is limited to 60 seconds by default; on timeout the Bun process is terminated and the result is marked as timed out. When combined stdout and stderr output exceeds 8 MiB, the run ends with an output-limit error instead of being silently truncated. In either case, split the task or reduce the amount of output.

#### Are 16 KB page-size devices supported?

16 KB: ELF and APK alignment checks pass. On Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), the v0.2.1 development arm64-only APK with official Bun passed all 8 Binder tests twice without translation. The earlier ARM64-on-x86_64 AVD result remains translation-only; native x86_64 aborts even on a minimal script with exit code 134. This is device-scoped development evidence, not acceptance of a published Release APK or general 16 KB support.

#### Which APK should I install?

Most phones and tablets use `arm64-v8a`. Use baseline `x86_64` for emulators or x86_64 devices. When unsure, install `universal`, which contains both ABIs and is slightly larger but the safest choice.

#### Where can I troubleshoot installation and execution problems?

See the [troubleshooting guide (Chinese)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/troubleshooting.md) for a minimal script, symptom-based checks for activation, Android/ABI/page size, timeouts, output limits and imports, and the information needed in a bug report.

******

### Compatibility

******

- Engine: official Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- System: Android 13 (API 33) or later, with official 64-bit executables for `arm64-v8a` and baseline `x86_64`. Android 9 through 12L (API 28 through 32) are not supported yet; the FAQ above explains why. Real-device tests on API 33 and API 35 passed.
- Host: AutoJs6 build 5278 or later, with Bun runtime contract version 1.
- Per-run bounds: source up to 16 MiB, combined stdout and stderr output up to 8 MiB, and a default timeout of 60 seconds.
- Packages: single-ABI APKs keep installs smaller, while the larger `universal` APK contains both supported ABIs.
- Test evidence: the [generated compatibility matrix (Chinese)](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/compatibility/MATRIX.md) lists devices, API levels, ABIs, page sizes and results for each recorded suite. Official, experimental, translated and failed runs retain their own scope; these records do not broaden published support.

******

### Permissions and Integrity

******

- A separately locked, read-only supervisor handles timeout, cancellation and output limits, including scripts that ignore SIGTERM. It reaps the direct Bun child; it is not a sandbox or a manager for arbitrary detached descendants.
- The exported activation (Wake), info, and runtime components are protected by `org.autojs.permission.PLUGIN`, and AutoJs6 still performs its normal plugin authorization checks.
- The script snapshot is staged in a private per-run directory, and the Bun executable is launched from Android's read-only native library directory instead of being copied to writable storage.
- The repository lock records both the official release archives and the binaries packaged into the APK; CI rejects any drift in size, SHA-256, or ELF properties before building.
- The plugin declares Internet access because trusted Bun scripts may use network APIs such as `fetch`. The plugin is not a sandbox; only run scripts you trust.

******

### Execution errors and troubleshooting

******

Messages use the Android language setting for the plugin. Low-level diagnostic details and Bun output may remain in English.

- If Bun Runtime is not activated or enabled, open Plugin Center in AutoJs6, authorize and enable the plugin, and use Activate if the host shows it.
- The official plugin requires Android 13 (API 33) or later. Android 9 through 12L cannot run it; lowering the manifest requirement does not make the runtime compatible.
- `TIMEOUT`: Bun execution timed out. Shorten the task or adjust the execution timeout within the allowed limit.
- `OUTPUT_LIMIT`: Bun output exceeded the configured byte limit. Reduce stdout and stderr output, then run the script again.
- `RUNTIME_UNAVAILABLE`: Bun Runtime is unavailable. Check device compatibility and reinstall the plugin if its files are incomplete.

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

16 KB: ELF and APK alignment checks pass. On Samsung SM-A566B (Android 16 / API 36, PAGE_SIZE=16384), the v0.2.1 development arm64-only APK with official Bun passed all 8 Binder tests twice without translation. The earlier ARM64-on-x86_64 AVD result remains translation-only; native x86_64 aborts even on a minimal script with exit code 134. This is device-scoped development evidence, not acceptance of a published Release APK or general 16 KB support.

******

### Roadmap

******

The roadmap answers two questions: what works now and what comes next. Checked items describe the actual behavior of the current version; unchecked items (multi-file projects, an AutoJs6 capability bridge, broader Android version support, Bun upgrades, and more) are plans, not promises of current support.

- [View ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Release History

******

#### v0.2.5

_2026/09/19_

- `Hint` Development snapshot, not yet published; the official plugin still requires Android 13 (API 33) or later
- `Fix` SDK XML v4 parsing warnings with AGP 9.1 and APK native alignment checks incorrectly triggered by JVM unit-test assembly tasks, using shared build plugins 1.8.3
- `Improvement` Archive the published v0.2.4 APK/source asset verification and the signed final-APK acceptance in four environments on the final release bytes: in-place upgrades from the published v0.2.3 on Sony API 33 arm64 and Xiaomi API 35 universal, fresh installs on Redmi API 33 arm64 and an x86_64 API 33 AVD, each passing 11/11 groups before and after force-stop (the eleventh group is the dynamic capability bridge with an in-process broker); no 16 KiB device was available and the runtime payloads are unchanged since v0.2.2; the released tag is not rewritten and Android/16 KB compatibility is not expanded

#### v0.2.4

_2026/09/16_

- `Feature` M7 second part: the runtime capability bridge for dynamic calls and the first two dynamic capabilities `ui.toast` / `device.info`. When the host puts `hostCapabilityBridgeVersion = 1`, `hostCapabilityBroker` (an IBinder) and `hostCapabilities` (the granted capability IDs) into the runScript request, the plugin opens a per-run unix socket in its private cache directory (environment variable `AUTOJS6_HOST_BRIDGE_SOCKET`); scripts send `GET /v1/info` and `POST /v1/<capability ID>` through `fetch(url, { unix })` (JSON requests up to 64 KiB, results up to 256 KiB, at most 1024 calls per run, 4 in flight, 10 s per call), and the plugin relays them over the oneway AIDL `IBunHostCapabilityBroker`, accepting callbacks only from the host UID for this execution. Bridge-level error codes (INVALID_REQUEST 400, NOT_GRANTED 403, UNKNOWN_CAPABILITY 404, PAYLOAD_TOO_LARGE 413, TOO_MANY_REQUESTS/QUOTA_EXCEEDED 429, HOST_UNAVAILABLE 503, TIMEOUT 504, INTERNAL 500) appear only in the JSON replies; the runScript terminal error codes are unchanged and the terminal Bundle gains `hostBridgeDelivered` and `hostCalls`; the socket and every pending call are closed when the run ends. Capability key `SUPPORTS_HOST_CAPABILITY_BRIDGE`, shared contract AAR now 22437 bytes; hosts that offer no bridge see no change
- `Improvement` Android 17 local network authorization moves to plugin-center enablement and plugin settings, with no launcher permission page; missing permission keeps the plugin disabled and automatic startup silent
- `Improvement` Archive the published v0.2.3 APK/source asset verification and the signed final-APK acceptance in five environments on the final release bytes: in-place upgrades from the published v0.2.2 on Sony API 33 arm64 and Xiaomi API 35 universal, fresh installs on Redmi API 33 arm64, an x86_64 API 33 AVD and a Samsung SM-A566B API 36 native arm64 16 KiB device, each passing 10/10 groups before and after force-stop (the tenth group is the host info snapshot); the released tag is not rewritten and Android/16 KB compatibility is not expanded
- `Improvement` Target Android 17 (SDK 37) with separate local network permission controls and recovery guidance

#### v0.2.3

_2026/09/16_

- `Feature` First M7 host capability: a read-only host info snapshot. When the host sends `hostInfoVersion = 1` and `hostInfo` (package name, optional versionDate and languageTag) in the runScript request, the plugin checks that the package belongs to the Binder caller UID, resolves the host version itself through PackageManager, writes the host/plugin/execution facts as a JSON document of at most 16 KiB to `autojs6/host-info.json` inside the run directory (outside `project`, deleted with the run) and points the script at it through the `AUTOJS6_HOST_INFO_FILE` environment variable; the terminal Bundle gains `hostInfoDelivered`. Capability `SUPPORTS_HOST_INFO`; the `AUTOJS6_` environment prefix is reserved for the plugin (a host request carrying it is rejected with INVALID_REQUEST), and a spoofed package or unknown version is rejected before Bun starts. The shared contract AAR grows to 14073 bytes; hosts that do not offer the snapshot behave exactly as before
- `Improvement` Archive the published v0.2.2 APK/source asset verification and the signed final-APK acceptance in four environments: in-place upgrades from the published v0.2.0 on Sony API 33 arm64 and Xiaomi API 35 universal, fresh installs on Redmi API 33 arm64 and an x86_64 API 33 AVD, each passing 9/9 groups before and after force-stop; the released tag is not rewritten and Android/16 KB compatibility is not expanded
- `Improvement` Verify the real host-to-plugin project round trip with an AutoJs6 host built locally from its master (7c31269cc) against the published v0.2.2 x86_64 plugin on an API 33 AVD: a project.json project with relative and JSON imports, a package.json TypeScript project, and a bare-file control that still fails closed; the host release itself is still pending
- `Improvement` Supplement the v0.2.2 release evidence with signed final-APK acceptance on native arm64 16 KiB hardware: the published arm64-v8a APK was freshly installed on Samsung SM-A566B (API 36, Remote Test Lab), passed 9/9 groups before and after force-stop with the installed bytes bound to the release asset, and was uninstalled afterwards; the record now covers five environments
- `Improvement` Repeat the real host-to-plugin project round trip on two native ARM64 devices with the same locally built AutoJs6 host (master 7c31269cc) and the published v0.2.2 arm64-v8a plugin: Samsung SM-A566B (API 36, 16 KiB pages) and Redmi 22120RN86C (API 33) each ran the project.json project twice, the package.json TypeScript project once and the bare-file control, all with the expected outcome; the host release remains the user's decision
- `Improvement` Run the instrumentation suite with the two new tests (snapshot delivered and verified only when offered, host globals fail with ReferenceError) on Redmi 22120RN86C (API 33) and Samsung SM-A566B (API 36, 16 KiB pages), OK (17 tests) each, and complete a host-to-plugin snapshot round trip on both devices with a locally built AutoJs6 host (master d9b4033bd plus attachHostInfo) and the local 0.2.3 release plugin: single-source and project.json launches read the verified host/plugin/execution facts, the script sees no snapshot after the host grant is revoked and receives it again once restored, and the host was restored to the user's original APK; recorded in docs/compatibility/2026-09-16-m7-host-info-snapshot

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


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/16kb.md)
