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

#### v0.2.2

_2026/09/15_

- `Feature` Add multi-file project execution through workspace archives (M6): the shared contract gains the workspaceArchiveVersion, workspaceEntryPoint, workspaceMaxEntries and workspaceMaxBytes request keys plus the SUPPORTS_WORKSPACE_ARCHIVE capability, and runScript expands a bounded ZIP snapshot atomically into the private per-run workspace before running the entry file with the project as its working directory. Rules: relative paths only, rejection of traversal, absolute, backslash, colon and control-character paths, case- and Unicode-form-insensitive duplicate detection, file/directory conflict checks, at most 16384 entries, 64 MiB uncompressed and 16 MiB per file, entry point validation and cancellation cleanup; only regular files and directories are created, and hosts without the key keep the unchanged single-source path. Requires a host that packs the project directory; the AutoJs6 engine change is prepared alongside and not yet released
- `Fix` Read project source archive members through a relative archive name so the Release verifier's exact supervisor-source check also works with GNU tar on Windows; CI and published assets are unchanged
- `Fix` Fix experimental watch reload leaking descriptors when close_range fails: mark actual descriptors CLOEXEC before exec with the existing bounded raw-syscall fallback, and stop on incomplete setup. Preserve stdio, explicit IPC and the existing signal lifecycle. Complete-source GCC/Clang controls cover real exec, high descriptors, lowered hard limits and injected failures; new native builds and unchanged Android suites are recorded separately. Historical failures, official payloads and distribution boundaries remain unchanged
- `Fix` Fix historical experimental JSC candidate verification after Bun source updates: bind the complete immutable build archive while keeping strict current-input checks for new builds
- `Fix` Fix experimental Android epoll waits delivering caller-blocked pending signals early: keep the caller mask and enforce the existing exclusion of optional epoll_pwait2. GCC/Clang regressions compile the complete original and repaired wait function; fresh native builds and unchanged device suites are recorded separately, while the eleven-patch failure archives and official support boundaries remain intact. The unchanged suites pass twice in five native 4 KiB environments: 330/330 application probes and 80/80 Binder tests. Two API 28 ART startup failures remain separately archived; the third identical-APK attempt passes both rounds. The new-source Samsung ARM64 device gates are complete for these fixed suites; the JSC rebase is recorded separately
- `Fix` Historical eleven-patch result: Fix experimental Android spawn delivering a pending SIGSYS too early: preserve the caller mask in the parent, enable setup handling only in the child, and use the existing child cgroup join when the caller blocks SIGSYS. GCC and Clang host regressions cover the complete production function and original failure controls; new-source build and device evidence remain separate from historical acceptance and official support. Device follow-up preserves the signal immediately after spawn but still delivers it during asynchronous waiting; independent read-only epoll register/mask evidence identifies the next blocker, and the full 33-probe gate remains failed
- `Fix` Recover from temporary runtime readiness failures with one on-demand retry after a 30-second cooldown, share concurrent probes, and bound each probe output stream to 4 KiB. Add API, ABI, phase, runtime identity, exit and retry diagnostics while preserving localized summaries; label inferred signals explicitly and keep native payloads and support limits unchanged
- `Fix` Fix experimental Android pidfd probing when asynchronous spawn starts with SIGSYS blocked, preserving the caller mask and pending signals through the existing waiter fallback. The ten-patch runtime passes the unchanged 31-probe suite (310/310) and full eight-test Binder suite (80/80) in five native 4 KiB environments. Record recovered build completion without inventing missing original exit codes, and preserve the initial ART startup failure separately. JSC rebase and Release gates remain open; official payloads are unchanged
- `Fix` Fix the experimental native x86_64 16 KiB JavaScriptCore startup abort by rebuilding pinned WebKit with explicit large-page, JIT and allocator settings and relinking Bun; all eight Binder tests pass twice on both 4 KiB and 16 KiB AVDs (32/32). Official payloads and their 4 KiB guard remain unchanged; Release acceptance is separate
- `Improvement` Add four fixed offline TLS/IPv6 modes through the production Binder service: TLS 1.2/1.3, certificate and hostname rejection, verified HTTPS, and IPv6 TCP/UDP/HTTP. Bind public test certificates, exact sources, APKs and both package UIDs; preserve original suite counts and release boundaries
- `Improvement` Add four fixed offline API modes through the production Binder service: files and directory watching, instance-local DNS, binary TCP half-close, and HTTP redirect/stream/abort. Bind exact source, APKs and both package UIDs; preserve failures and keep original suite counts and release boundaries unchanged
- `Improvement` Add a separate diagnostic that preserves the original seven-mode pressure order, DFG early stop and assertions. Record bounded per-profile data before rethrowing failures, verify exact source and both package UIDs, and keep historical results and compatibility counts unchanged
- `Improvement` Add a separate bounded full-trace and inliner diagnostic with fixed PC-map controls. Preserve the original hot workload and gate, verify finalized extra-profiler options, retain the first complete stack per class with explicit byte-limit omissions, and independently check caller identity and compiler decisions without adding compatibility acceptance
- `Improvement` Add a bounded PC-mapping comparison for JSC sampling: reuse the exact four-phase workload, read back finalized options, retain compiler inline decisions and actual execution tiers, and preserve exit 1. Reverse pair order in the second round; keep original fixtures, limits, native bytes and support claims unchanged
- `Improvement` Add fixed four-phase JSC profiler restart and data-clear diagnostics, plus an explicitly controlled target-absent exit-1 case. Retain phase witnesses, timestamps and raw UID cleanup evidence without changing the original pressure or sampling fixtures or claiming historical failure reproduction
- `Improvement` Add an independent bounded DFG sampling diagnostic with per-capture timing, calls, frame distributions and optimization counters. Preserve low-sample exit outcomes and exact source/APK/UID evidence without changing the original pressure fixture, budgets, runtime payloads or compatibility counts
- `Improvement` Add a contributor guide for reclaiming build-cache and retired-emulator disk space while retaining runtime provenance, test artifacts and failure records
- `Improvement` Lock the thirteen-patch large-page JSC candidate separately: two fresh clean Bun builds retain actual exit 0, identical complete outputs and 21 unchanged build inputs. Reuse the original independent JSC libraries and ICU; bind new APKs and the original Binder/seven-mode pressure regressions separately without transferring historical acceptance or expanding release scope
- `Improvement` Add bounded read-only SIGABRT snapshots to fixed watch/reload diagnostics while preserving signal delivery and budgets. Sixteen plain/traced observations on native ARM64 API 28/31 complete 32 reloads and capture 24 ordinary SIGSYS deliveries; packages and UIDs are cleaned up. The unreproduced original API 28 abort remains unresolved and adds no compatibility passes
- `Improvement` Add fixed native/TRAP watch-reload regression without changing the twelve-patch runtime or original 33 probes. Four native ARM 64 / 4 KiB devices pass the original probes 264/264 but fail 14/16 new modes, exposing 28 inherited-FD leaks across 32 reloads. The Sony 5.15 native control passes and forced TRAP fails. Preserve three source-bound APK batches and early validator corrections, verify package/UID cleanup, and keep native repair, broader compatibility and Release gates open
- `Improvement` Complete twelve-patch Samsung API 32 regression on SM-F936U / native ARM64 / 4 KiB: unchanged probes pass 66/66 and the complete Binder suite passes 16/16 across two rounds. Reuse all three APKs from the API 36 batch; 40 pending-signal checkpoints and 12 child observations pass. Remove all test packages, verify three empty UIDs and close the private ADB server without operating AVDs. Both Samsung device gates for these fixed suites are complete; seven baseline environments total 462/462 probes and 112/112 Binder. Broader runtime, pressure and Release gates remain open
- `Improvement` Validate the unchanged twelve-patch runtime on Samsung SM-A566B / API 36 / native ARM64 / hardware 16 KiB: two rounds pass all 33 probes (66/66) and the complete Binder suite (16/16). Four pending-signal modes preserve 40 checkpoints and 12 child observations before one delivery per caller. Reuse exact APKs without rebuilding native code, verify all three UIDs after uninstall and close the private ADB server without operating AVDs. Six baseline environments now total 396/396 probes and 96/96 Binder; ARM64 API 32, broader runtime and Release gates remain open
- `Improvement` Verify the twelve-patch large-page JSC candidate on native x86_64 API 36 at both 4 KiB and 16 KiB userspace pages: unchanged Binder tests pass 32/32 and fixed pressure modes pass 28/28 with one APK pair bound to 83 inputs. Preserve the initial low-memory service death separately; the full identical-APK retry passes without changed settings or budgets. Check both package UIDs after cleanup and keep x86 page emulation, Samsung baseline and Release gates distinct
- `Improvement` Bind a separate twelve-patch large-page JSC candidate to two matching fresh Bun builds with retained actual driver exits and 21 unchanged build inputs. Reuse the exact original independent JSC libraries and ICU, preserve historical candidates, and route isolated Binder tooling through the new source-bound lock. The original pressure fixture, validator and budgets are unchanged; device and Release acceptance remain separate
- `Improvement` Add fixed pending-SIGSYS spawn probes and independent signal tracing. Native ARM64 API 28/31 each fail both new modes twice while all original 31 cases pass; eight traces confirm early SI_TKILL delivery. Archive failures, source/APK bindings and cleanup without changing native payloads or claiming broader compatibility
- `Improvement` Localize runtime error summaries in all ten languages, preserve stable error codes and bounded technical details, and generate activation, Android requirement, timeout and output-limit help directly from the same Android resources. Render cached page-size refusals in the current plugin language and preserve complete Unicode characters when truncating diagnostics
- `Improvement` Add a generated compatibility evidence matrix with a complete source index, archive hashes and CI drift checks; preserve per-runtime, per-device and per-suite results, including failures and preliminary diagnostics, without adding new device acceptance or broadening official support
- `Improvement` Verify the new ten-patch large-page x86 candidate on API 36 at 4 KiB and 16 KiB userspace pages: unchanged Binder tests pass 32/32 and fixed pressure modes pass 28/28 using one APK pair bound to 77 inputs. Archive exact bytes, raw results and cleanup separately from historical evidence; the x86 16 KiB ABI remains emulated over 4 KiB kernel pages, with no Release or performance claim
- `Improvement` Bind a separate ten-patch large-page JSC candidate, requiring two matching clean Bun builds with retained real driver exits and exact reused JSC inputs. Route isolated Binder tooling through the new source-bound lock while preserving historical and official payloads; device and Release acceptance remain separate
- `Improvement` Add a Chinese troubleshooting guide with a minimal script, symptom/cause/action checks and bounded issue-report guidance; link it from all ten README languages without changing runtime capabilities
- `Improvement` Complete Samsung regression of the unchanged ten-patch runtime: native ARM64 API 32 / 4 KiB and API 36 / 16 KiB each pass two 31-probe rounds (62/62) and two complete eight-test Binder rounds (16/16), using identical APKs across both devices. Seven native environments now total 434/434 probes and 112/112 Binder. Bind exact source, APK and cleanup evidence without rebuilding native code or operating AVDs; JSC rebase, broader runtime and Release gates remain open
- `Improvement` Add a separate test-only SIGSYS observer: four native ARM64 API 28 failures directly identify pidfd_open, with matching untraced failures and passing API 31 controls. Bind raw evidence, preserve the preliminary harness failure, and verify signal forwarding, tamper rejection and cleanup; this diagnosis is not new-runtime, Binder or Release acceptance
- `Improvement` Add two fixed blocked-SIGSYS asynchronous spawn probes without changing the original 29 definitions or native bytes: four native 4 KiB environments pass 248/248, but Sony API 28 fails both new modes twice with exit 159 (58/62 overall). Preserve all four failures in a separate strict archive, keep the compatibility gate open, and clean up test packages, UID processes and the owned AVD; no new Binder, 16 KiB or Release acceptance
- `Improvement` Complete native ARM64 16 KiB coverage of the four hard-FD-limit modes on Samsung SM-A566B / API 36: the identical APK and unchanged 29-probe suite pass twice (58/58), including eight hard-limit cases with native close_range success and forced-TRAP fallback. Verify zero UID processes after uninstall without operating AVDs; seven environments now total 406/406. No native rebuild, Binder rerun or Release acceptance
- `Improvement` Validate Samsung Galaxy Z Fold4 SM-F936U as actual API 32 / Android 12L, native ARM64 with 4 KiB pages: two rounds pass the existing Binder suite (16/16) and unchanged 29 application probes (58/58), including all eight hard-limit cases. Bind exact APK/source/raw evidence, remove all three test packages and verify zero UID processes without operating any AVD. Native bytes stay unchanged; new hard-limit modes on native ARM64 16 KiB, the broader matrix and Release acceptance remain open
- `Improvement` Add four fixed Android hard-FD-limit probes while preserving the original 25 definitions and runtime bytes: two 29/29 rounds in five native 4 KiB environments (290/290), including 40 hard-limit cases. Verify startup CLOEXEC and both spawn APIs after lowering soft/hard limits to 128, with unchanged application/supervisor limits. Bind raw evidence and clean up test packages and the owned AVD; FD 70000, new native 16 KiB coverage and Release gates remain open
- `Improvement` Add separate bounded JSC pressure acceptance on API 36 x86_64: seven offline modes pass twice with both 4 KiB and emulated 16 KiB userspace pages (28/28), with actual LLInt/Baseline/DFG/FTL samples, GC, Wasm and 64 normal worker exits. The identical APKs also pass the unchanged Binder suite (32/32). Record 4 KiB kernel mappings separately, preserve preliminary harness outcomes and clean up owned devices; native bytes, stable support and Release gates remain unchanged
- `Improvement` Complete native x86_64 / 4 KiB validation on API 29 and 32: two rounds each add 32/32 Binder and 100/100 unchanged application probes, completing API 28-32 x86 Binder coverage. Add fail-closed raw-report/source/cleanup archiving; preserve historical evidence, keep ARM64 API 32 and Release gates open, and close only the two AVDs started for this run
- `Improvement` Add an opt-in, separately packaged test-only plugin that reuses the production service and complete eight-test Binder suite with the locked nine-patch Bun: two rounds pass in nine native environments (144/144), including ARM64 16 KiB; retain exact APK/source bindings and cleanup evidence without broadening stable support
- `Improvement` Add a fixed offline CLI probe for internal lchmod/fchmodat2 without changing runtime bytes or the original 24 probes: all 25 pass twice in six native environments (300/300), including ARM64 16 KiB. Verify mode changes, repeated links, no-follow, ignored EIO and SIGSYS reachability with bounded thread cleanup; preserve early harness failures, remove test packages and close the owned AVD. Full experimental Binder and Release gates remain open
- `Improvement` Validate the nine-patch experimental Bun on Samsung native ARM64 / API 36 / 16 KiB with the identical APK and unchanged 24-probe suite: 48/48 across two rounds, all 48 path assertions pass and 12 escape requests reject the sentinel; uninstall the test package with zero UID processes and no AVD launches or shutdowns. Full experimental Binder, Release and x86_64 16 KiB gates remain open
- `Improvement` Build verification of 16 KB page alignment for 64-bit native libraries, including manifest contract checks and JSON reports
- `Dependency` Align the online platform-versions plugin with the repository-pinned 1.8.0; leave the native-alignment plugin unchanged
- `Dependency` Raise compileSdk to 37 so the plugin can consume the shared bun-runtime-api AAR from AutoJs6 host build 5280, whose AAR metadata requires compile SDK 37; minSdk 33 and targetSdk 36 are unchanged

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
