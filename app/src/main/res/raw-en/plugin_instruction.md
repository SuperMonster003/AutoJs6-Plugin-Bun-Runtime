This plugin lets AutoJs6 run JavaScript and TypeScript with the official Bun 1.4.0 engine: put `"bun";` on the first line of a script, and the file is executed by Bun in an isolated plugin process (the actual command is `bun run --no-install <source>`), with output and the final result streamed back to AutoJs6. Each run executes one snapshot of the current file and never installs npm dependencies automatically.

### Install and Use

1. Prepare the environment: install AutoJs6 build 5278 (6.8.0) or later on Android 13 (API 33) or later.
2. Install the plugin: download and install the APK matching the device from [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/releases). Choose `arm64-v8a` for most phones and tablets, `x86_64` for emulators or x86_64 devices, or `universal` when unsure (slightly larger, works on both).
3. Enable the plugin: open the AutoJs6 plugin center and enable Bun Runtime. If the freshly installed plugin shows as stopped, tap the `Activate` action shown by the host.
4. Run a script: put `"bun";` alone on the first line of a JavaScript or TypeScript file (including the quotes and the semicolon), then run the file from AutoJs6 as usual.

### Quick Start

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

If everything works, the first output line is `Bun 1.4.0` and the second line is `android`.

### Current Limitations

- Project files require a host that negotiates workspace archives: scripts under project.json/package.json can then use relative imports. Otherwise only one source snapshot is sent. Dependencies are never installed automatically (--no-install).
- No Rhino globals: use the explicit host client for granted Pinyin/Pinyin4j, coordinates, toast/device information and console controls. Other automation APIs and direct Java objects remain unavailable.
- No Java bridge: Bun scripts cannot directly access Java classes or objects in the AutoJs6 process.
- No full Bun toolchain promise: `bunx`, on-device executable output, runtime C compilation, and arbitrary native addons are outside the supported scope.
- Not a security sandbox: a Bun script runs as trusted code in the plugin process and can use the permissions granted to the plugin, so only run scripts you trust.

### Execution errors and troubleshooting

Messages use the Android language setting for the plugin. Low-level diagnostic details and Bun output may remain in English.

- If Bun Runtime is not activated or enabled, open Plugin Center in AutoJs6, authorize and enable the plugin, and use Activate if the host shows it.
- The official plugin requires Android 13 (API 33) or later. Android 9 through 12L cannot run it; lowering the manifest requirement does not make the runtime compatible.
- `TIMEOUT`: Bun execution timed out. Shorten the task or adjust the execution timeout within the allowed limit.
- `OUTPUT_LIMIT`: Bun output exceeded the configured byte limit. Reduce stdout and stderr output, then run the script again.
- `RUNTIME_UNAVAILABLE`: Bun Runtime is unavailable. Check device compatibility and reinstall the plugin if its files are incomplete.

See the [project README](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) for compatibility, permissions, package selection, and the complete list of current limitations.
