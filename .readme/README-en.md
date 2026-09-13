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

#### v0.2.2

_2026/09/12_

- `Fix` Fix experimental Android epoll waits delivering caller-blocked pending signals early: keep the caller mask and enforce the existing exclusion of optional epoll_pwait2. GCC/Clang regressions compile the complete original and repaired wait function; fresh native builds and unchanged device suites are recorded separately, while the eleven-patch failure archives and official support boundaries remain intact. The unchanged suites pass twice in five native 4 KiB environments: 330/330 application probes and 80/80 Binder tests. Two API 28 ART startup failures remain separately archived; the third identical-APK attempt passes both rounds. The new-source Samsung ARM64 device gates are complete for these fixed suites; the JSC rebase is recorded separately
- `Fix` Historical eleven-patch result: Fix experimental Android spawn delivering a pending SIGSYS too early: preserve the caller mask in the parent, enable setup handling only in the child, and use the existing child cgroup join when the caller blocks SIGSYS. GCC and Clang host regressions cover the complete production function and original failure controls; new-source build and device evidence remain separate from historical acceptance and official support. Device follow-up preserves the signal immediately after spawn but still delivers it during asynchronous waiting; independent read-only epoll register/mask evidence identifies the next blocker, and the full 33-probe gate remains failed
- `Fix` Recover from temporary runtime readiness failures with one on-demand retry after a 30-second cooldown, share concurrent probes, and bound each probe output stream to 4 KiB. Add API, ABI, phase, runtime identity, exit and retry diagnostics while preserving localized summaries; label inferred signals explicitly and keep native payloads and support limits unchanged
- `Fix` Fix experimental Android pidfd probing when asynchronous spawn starts with SIGSYS blocked, preserving the caller mask and pending signals through the existing waiter fallback. The ten-patch runtime passes the unchanged 31-probe suite (310/310) and full eight-test Binder suite (80/80) in five native 4 KiB environments. Record recovered build completion without inventing missing original exit codes, and preserve the initial ART startup failure separately. JSC rebase and Release gates remain open; official payloads are unchanged
- `Fix` Fix the experimental native x86_64 16 KiB JavaScriptCore startup abort by rebuilding pinned WebKit with explicit large-page, JIT and allocator settings and relinking Bun; all eight Binder tests pass twice on both 4 KiB and 16 KiB AVDs (32/32). Official payloads and their 4 KiB guard remain unchanged; Release acceptance is separate
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
- `Dependency` Align the online platform-versions plugin with the repository-pinned 1.7.4; leave the native-alignment plugin unchanged

#### v0.2.1

_2026/09/10_

- `Hint` Development snapshot, not yet published; the official plugin still requires Android 13 (API 33) or later
- `Fix` Preserve experimental static-directory serving without openat2 using a locked MIT descriptor-relative fallback: pin path components, resolve root-contained links, reject outside-root and magic links, and bound traversal, errors and FD ownership; ordinary Bun.file/node:fs access, official runtime bytes and the Android 13 minimum are unchanged
- `Fix` Fix the experimental Linux spawn FD fallback with a locked MIT patch: enumerate actual descriptors using fixed-stack raw syscalls, handle descriptors above lowered soft/hard limits and the old 65536 ceiling, and fail before exec on incomplete isolation; add vfork/exec, error, symbol and old-implementation regression controls without changing the official Bun payload or Android 13 minimum
- `Fix` Fix the experimental Bun startup CLOEXEC fallback with a locked MIT patch: enumerate open descriptors without an fd-number ceiling, preserve fds 0-3, and exit on incomplete marking; add native error/boundary tests and separate build-input verification from runtime acceptance, without changing the official runtime or Android 13 minimum
- `Fix` Fix timeout, cancellation and output-limit cleanup in the official plugin with a locked read-only supervisor: escalate ignored SIGTERM to SIGKILL, wait for the direct Bun child to exit, and preserve output for draining; Bun 1.4.0 and the Android 13 minimum are unchanged
- `Fix` Fix the isolated patched Bun probe's termination by compiling the shared SupervisedProcess wrapper and packaging the locked supervisor; bind source/toolchain/helper bytes in schema-2 receipts and keep output readers open until termination
- `Improvement` Validate the directory fallback with two byte-identical clean builds per ABI and unchanged 24-probe assertions twice in five native 4 KiB environments (240/240): all 60 previously failing escape assertions now reject the sentinel while normal serving works. Native GCC/Clang and GCC ASan/UBSan tests pass; test packages and the owned AVD are cleaned up. Preserve old failures; new native ARM64 16 KiB, full Binder and Release gates remain open
- `Improvement` Previous failure baseline (a260ef308): Add a 24th probe for openat2 directory confinement without changing the experimental runtime: five native 4 KiB environments score 23/24 twice. The original 230 observations pass, but 10 new failures record 60 synthetic sentinel reads outside the configured root through relative, absolute and magic symlinks. Archive the failed gate without relaxing assertions; no crash, hang or leftover test-UID process is observed, and the owned AVD is closed. A native fix is still pending
- `Improvement` Correct the fchmodat2 source audit: uppercase SYS_FCHMODAT2 is used by internal sys::lchmod, while both public Android node:fs lchmod exports are absent in all 10 rounds. No internal package-bin fallback or dependency installation was executed; preserve the historical report and keep distribution blocked
- `Improvement` Extend the unchanged experimental runtime to a 23-probe syscall suite: five native 4 KiB environments pass twice (230/230), including 60 raw TRAP-to-ENOSYS observations and 16 EIO-controlled copy/wait fallbacks; explicitly exclude four API 28 kernel/policy-gated cases from semantic reachability, preserve all original assertions and historical evidence, and clean up test packages and the owned AVD. Full syscall/Binder and new native 16 KiB gates remain open
- `Improvement` Validate the spawn fix in six native environments: the unchanged 20-probe suite passes twice on arm64 API 28/31/33/35 and x86_64 API 33 (4 KiB), plus Samsung arm64 API 36 (16 KiB), totaling 240/240; both ABIs reproduce in two clean builds, all 36 forcible lifecycle cases pass, and test packages and the owned AVD are cleaned up. Preserve old failures; full experimental Binder and Release gates remain open
- `Improvement` Validate native ARM64 16 KiB execution on Samsung Remote Test Lab SM-A566B (API 36): the v0.2.1 development arm64-only APK with official Bun and the locked supervisor passes all 8 Binder tests twice, including process restart, installed hashes and 10 forced lifecycle cases; archive exact source/APK/log bindings, uninstall test packages and retain the separate Release and x86_64 gates
- `Improvement` Previous failure baseline (c240d6c68): Record the unchanged experimental runtime on the same native ARM64 16 KiB device at 19/20 twice: native close_range, startup marking and lifecycle checks pass, while the known forced-TRAP lowered-RLIMIT_NOFILE spawn leak remains; preserve both failures without claiming full experimental Binder or runtime acceptance
- `Improvement` Previous failure baseline (c240d6c68): Expand the experimental suite to 20 probes with lowered RLIMIT_NOFILE controls: four native arm64 devices (API 28/31/33/35) score 18/20 twice and an API 33 native x86_64 AVD scores 19/20 twice, all on 4 KiB pages. The original 180 observations still pass; 18 new failures expose fd 256 inherited by both spawn APIs after the soft limit falls to 128. Archive failures and restored limits/cleanup without changing runtime bytes or claiming the defect is fixed
- `Improvement` Document ARM64 16 KiB test options for x64 Windows: VMware and WSL alone cannot provide a native ARM64 Android guest; distinguish full-system software emulation and propose Samsung remote 16 KiB devices with RDB/ADB, subject to actual availability and permissions, without claiming new device acceptance
- `Improvement` Previous 18-probe baseline: Add five FD/SIGSYS probes and validate the startup fix: four native arm64 devices (API 28/31/33/35) and an API 33 native x86_64 AVD pass 18/18 twice, totaling 180/180; both ABIs reproduce identically in two clean builds. Preserve the previous 17/18 failure reports, keep official runtime bytes and the Android 13 minimum unchanged, and leave full experimental Binder and native 16 KB validation open
- `Improvement` Bind the supervisor source, fixed NDK build instructions and per-ABI helper hashes in corresponding-source manifest schema 2, with exact archive-member checks and legacy v0.2.0 assets left unchanged
- `Improvement` Add an isolated test-only APK builder and explicit-device runner for the reproducible patched Bun runtime, with exact source/APK/runtime checks, temporary test signing and bounded machine-readable reports
- `Improvement` Pass all 13 application-process probes twice on native arm64 devices with API 28, 31, 33 and 35: 24 SIGTERM-ignoring timeout, output-limit and readiness-triggered cancellation cases confirm child/parent exit and workspace cleanup; preserve the original 10/12 failure report without claiming full experimental Binder or broader Android support
- `Improvement` Archive the published v0.2.0 APK/source asset verification and signed-device acceptance evidence, without rewriting the released tag or expanding Android/16 KB compatibility
- `Dependency` Upgrade the online autojs6-platform-versions build plugin from 1.7.3 to 1.7.4 and synchronize the repository's version requirement

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
