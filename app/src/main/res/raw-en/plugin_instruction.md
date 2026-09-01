Bun Runtime is a standalone Android plugin that lets AutoJs6 select [Bun](https://bun.sh/) as a separate JavaScript and TypeScript engine. The host sends one source snapshot through a file descriptor, the plugin starts the pinned official Bun Android executable in its own runtime process, and standard output, standard error, completion, timeout, and cancellation events return through Binder. This is real Bun execution and is not an alias for Rhino or Node.js.

This release launches the official Bun 1.4.0 Android executable in an isolated plugin runtime process with `bun run --no-install <source>`. It accepts one JS or TS source snapshot, never installs missing dependencies automatically, and streams stdout, stderr, and the final status back to AutoJs6.

### Quick Start

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

Expected output begins with `Bun 1.4.0` and then prints `android`.

### Version 0.1 Limitations

- One source snapshot only: multi-file project transfer and relative project imports are not implemented in this release.
- No AutoJs6 globals: Rhino globals, Android automation APIs, and host objects do not appear inside Bun.
- No Java bridge: Bun cannot directly access Java classes or objects from the AutoJs6 process.
- No broad toolchain promise: `bunx`, executable output produced on-device, runtime C compilation, and arbitrary native addons are outside the supported scope.
- Not a security sandbox: a Bun script runs as trusted code under the plugin app UID and can use permissions granted to the plugin.

See the [project README](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime) for compatibility, security, package selection, and the complete version 0.1 limitations.
