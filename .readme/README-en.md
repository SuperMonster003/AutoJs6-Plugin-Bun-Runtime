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

Bun Runtime is a standalone Android plugin that lets AutoJs6 select [Bun](https://bun.sh/) as a separate JavaScript and TypeScript engine. The host sends one source snapshot through a file descriptor, the plugin starts the pinned official Bun Android executable in its own runtime process, and standard output, standard error, completion, timeout, and cancellation events return through Binder. This is real Bun execution and is not an alias for Rhino or Node.js.

******

### Features

******

- Independent engine: runs the official Bun 1.4.0 Android executable instead of forwarding code to another AutoJs6 engine.
- JavaScript and TypeScript: Bun parses and runs a single JS or TS source snapshot, including ESM syntax and Bun APIs available in the pinned Android build.
- Observable execution: stdout and stderr stream back to the host, while the final result reports the exit status, duration, timeout, cancellation, and bounded diagnostics.
- Controlled runtime payloads: release binaries are pinned by tag, commit, size, SHA-256, ELF machine, and minimum PT_LOAD alignment for `arm64-v8a` and `x86_64`.
- Localized delivery: plugin metadata, plugin-center instructions, README, and changelog cover 10 languages from one validated source set.

******

### Install and Use

******

1. Use AutoJs6 build 5278 (6.8.0) or later on Android 13 (API 33) or later.
2. Install the release APK matching the device ABI. Choose `arm64-v8a` for most phones and tablets, `x86_64` for a compatible emulator or device, or `universal` when unsure.
3. Open the AutoJs6 plugin center and enable Bun Runtime. If the newly installed plugin remains stopped, use the `Activate` action shown by the host.
4. Put the standalone directive `"bun";` at the beginning of a JavaScript or TypeScript file, then run it normally from AutoJs6.

> Version 0.1 executes one immutable source snapshot per request with `bun run --no-install <source>`, so it never installs missing dependencies automatically. Read the limitations below before moving an existing Rhino or Node.js project to Bun.

******

### Quick Start

******

Run this file to confirm the host selected Bun and the Android runtime started:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

Expected output begins with `Bun 1.4.0` and then prints `android`.

Bun handles TypeScript directly, so no host-side TypeScript compilation is needed:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

******

### Compatibility

******

- Runtime: official Bun 1.4.0, tag `bun-v1.4.0`, revision `1.4.0+34cbb9a40`, commit [`34cbb9a40b4bd1bd767d134a7065e66c2432a676`](https://github.com/oven-sh/bun/commit/34cbb9a40b4bd1bd767d134a7065e66c2432a676).
- Platform: Android 13 (API 33) or later, with official 64-bit payloads for `arm64-v8a` and baseline `x86_64`. An API 31 real-device run failed with app seccomp `SIGSYS` on Bun syscall 436 `close_range`. AOSP Android 12 and earlier app allowlists lack that syscall, while Android 13 (T, API 33) allowlists the raw syscall. Android 14 adds the public bionic wrapper, but Bun invokes the raw syscall and does not require that API 34 libc symbol. Real API 33 and API 35 runtime tests passed. API 28 through 32 remain unsupported until a patched Bun runtime handles the seccomp traps and passes portable validation.
- Host contract: AutoJs6 build 5278 or later and Bun runtime contract version 1.
- Request bounds: source up to 16 MiB, a combined stdout and stderr streaming budget up to 8 MiB, and a default timeout of 60 seconds.
- Packages: single-ABI APKs keep installs smaller, while the larger `universal` APK contains both supported ABIs.

******

### Version 0.1 Limitations

******

- One source snapshot only: multi-file project transfer and relative project imports are not implemented in this release.
- No AutoJs6 globals: Rhino globals, Android automation APIs, and host objects do not appear inside Bun.
- No Java bridge: Bun cannot directly access Java classes or objects from the AutoJs6 process.
- No broad toolchain promise: `bunx`, executable output produced on-device, runtime C compilation, and arbitrary native addons are outside the supported scope.
- Not a security sandbox: a Bun script runs as trusted code under the plugin app UID and can use permissions granted to the plugin.

******

### Permissions and Integrity

******

- The exported Wake, info, and runtime components are protected by `org.autojs.permission.PLUGIN`; AutoJs6 still performs its normal plugin authorization checks.
- The source snapshot is staged in a private per-run directory. The executable is launched from Android's read-only native library directory rather than copied to writable storage.
- The repository lock records both official release archives and packaged binaries. CI rejects size, SHA-256, ELF type, machine, or alignment drift before building.
- The plugin declares Internet access because trusted Bun scripts may use network APIs such as `fetch`. The plugin is not a sandbox and should only run scripts you trust.

******

### FAQ

******

#### Why are AutoJs6 globals missing in Bun?

Bun is a separate process and JavaScript engine, not a Rhino compatibility layer. A future host bridge must expose each automation capability explicitly; version 0.1 deliberately provides no such bridge.

#### Can a script import another local project file?

Not in version 0.1. The contract transfers one source snapshot and does not yet transfer a project tree, so relative project imports cannot be resolved. Single-file ESM syntax remains supported.

#### Does the plugin support 16 KB page-size devices?

Both packaged ELF executables have PT_LOAD alignment of at least 16 KB. A real 16 KB Android runtime test has not yet been completed, so this release does not claim verified end-to-end 16 KB support.

#### Which APK should I install?

Most physical Android devices use `arm64-v8a`. Use baseline `x86_64` for compatible emulators or x86_64 devices. The `universal` package includes both and is the safe choice when the ABI is unknown.

******

### Plugin Interface

******

These stable identifiers and limits are for AutoJs6 host and plugin developers:

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

16 KB status: the packaged `arm64-v8a` and `x86_64` ELF PT_LOAD segments meet the 16 KB alignment requirement. No real 16 KB Android device or emulator run has been completed yet, so only ELF alignment is verified.

******

### Roadmap

******

The roadmap separates current behavior from planned project snapshots, a narrow AutoJs6 capability bridge, broader Android validation, and future Bun upgrades. Unchecked items are plans, not promises of current support.

- [View ROADMAP.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/ROADMAP.md)

******

### Release History

******

#### v0.2.0

_2026/09/01_

- `Hint` Android 13 (API 33) is now the official minimum target; API 28 through 32 remain unsupported until a patched Bun runtime passes portable validation
- `Improvement` Lower the supported Android floor from Android 14 (API 34) to Android 13 (API 33) while retaining the pinned official Bun 1.4.0 Android payloads
- `Improvement` Document the AOSP T seccomp boundary: Android 13 allowlists Bun's raw `close_range` syscall, while the API 31 failure shows API 28 through 32 require a Bun compatibility patch rather than a manifest-only change
- `Improvement` Prepare the Android 9+ experiment with a deterministic six-patch Bun source backport, pinned NDK and container inputs, and immutable identities for 22 active Android-release dependencies, while keeping the unbuilt runtime explicitly unavailable
- `Improvement` Verify every Debug and Release APK for 16 KB ZIP alignment, exact ABI contents, locked Bun payload sizes and SHA-256 digests, and verify the installed payload bytes on the Android 13 test device
- `Dependency` Add the Kotlin Parcelize runtime required by Release R8 to retain the shared Parcelable contract classes

#### v0.1.0

_2026/09/01_

- `Hint` The first release runs one source snapshot and does not expose AutoJs6 globals, a Java bridge, multi-file projects, or relative project imports
- `Feature` Run JavaScript and TypeScript with the official Bun 1.4.0 Android executable as an independent `bun` engine selected by the `"bun";` directive, using `bun run --no-install <source>` without automatic dependency installation
- `Feature` Stream stdout and stderr only as bounded oneway Binder callback chunks, while terminal results report status and diagnostics without carrying the complete output streams
- `Feature` Support explicit cancellation, a 60-second default timeout, runtime information, and prewarming in the isolated `:bun_runtime` plugin process
- `Feature` Ship official 64-bit Android payloads for `arm64-v8a` and baseline `x86_64`, plus single-ABI and `universal` packages
- `Feature` Provide plugin discovery, protected Wake activation, complete PluginInfo metadata, and user documentation in 10 languages
- `Improvement` Use a versioned Binder contract with ParcelFileDescriptor source transport, a 16 MiB source limit, and an 8 MiB combined output limit
- `Improvement` Launch Bun from Android's read-only native library directory and verify the pinned release archive and packaged binary sizes, SHA-256 digests, ELF type, machine, and alignment
- `Improvement` Verify at least 16 KB PT_LOAD alignment for both packaged executables while explicitly recording that no real 16 KB Android runtime test has been completed
- `Improvement` Generate README, plugin-center instructions, and built-in changelog assets from validated JSON sources, with build, Markdown, and runtime artifact CI checks
- `Improvement` Require Android 14 (API 34) after a real API 31 run hit app seccomp `SIGSYS` on Bun syscall 436 `close_range`; one Sony API 33 device unexpectedly passed but is not portable evidence, while API 35 JS and TS Binder round trips passed and lower versions await an upstream fallback

##### For more release history

- [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/app/src/main/assets/doc/CHANGELOG-en.md)

******

### Build and Verification

******

Git LFS must materialize both pinned runtime binaries before verification or Gradle packaging. The standard local checks are shown below; building requires JDK 17 or later, Node.js, and Android SDK 36.

```powershell
node tools\bun-runtime\verify-runtime.mjs
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

Plugin code is licensed under the [Mozilla Public License 2.0](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/LICENSE). The bundled official Bun executable contains Bun's MIT-licensed code plus statically linked JavaScriptCore and WebKit under LGPL-2 and other third-party components under their own licenses. See [Third-Party Notices](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md) and Bun's pinned [LICENSE.md](https://github.com/oven-sh/bun/blob/bun-v1.4.0/LICENSE.md).

******

### Links

******

- AutoJs6 project: https://github.com/SuperMonster003/AutoJs6
- Bun official site: https://bun.sh/
- Pinned Bun release: https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0
- Third-party notices: https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/THIRD_PARTY_NOTICES.md
