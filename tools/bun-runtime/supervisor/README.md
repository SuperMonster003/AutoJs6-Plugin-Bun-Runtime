# Bun lifecycle supervisor

This first-party helper fixes the Android `Process.destroyForcibly()` limitation without changing the official Bun payload. The Android implementations exercised here inherit a default method that delegates to `destroy()`, which sends SIGTERM. A Bun script can ignore that signal. See the [Android Process implementation](https://android.googlesource.com/platform/libcore/+/837b789147d8f67538be3cfac95aea1343eaf36d/ojluni/src/main/java/java/lang/Process.java) and [native destroy implementation](https://android.googlesource.com/platform/libcore/+/837b789147d8f67538be3cfac95aea1343eaf36d/ojluni/src/main/native/UNIXProcess_md.c).

## Ownership and control

`SupervisedProcess` starts the read-only installed `libbun_supervisor.so`, which forks and directly execs its read-only sibling `libbun_exec.so`. Bun still receives exactly `bun run --no-install <source>` and the supplied argument vector, cwd and environment. Neither executable is a JNI library. Neither is copied to writable app storage or passed to a shell.

- The Java process's stdin pipe is a private termination channel. Closing it requests termination; any unexpected data also fails closed. Bun receives `/dev/null` as stdin and never inherits this control channel.
- The single-threaded supervisor is the only owner/reaper of its immediate Bun child. On control EOF it sends SIGTERM, allows 200 ms of grace, then sends SIGKILL and waits for the actual exit. It never signals after a successful `waitpid`; an unreaped child cannot have its PID reused. No Java private field, `/proc` scan, textual Process representation or script-supplied PID is used to target termination.
- Bun sets `PR_SET_PDEATHSIG(SIGKILL)` before exec, with a parent check to close the fork/setup death race. The supervisor is single-threaded, avoiding the parent-thread lifetime ambiguity of setting this flag against an arbitrary JVM worker thread. A crashed service closes its control pipe; an abruptly killed supervisor triggers the child's parent-death signal. See [Linux parent-death semantics](https://man7.org/linux/man-pages/man2/PR_SET_PDEATHSIG.2const.html) and [waitpid ownership/reaping](https://man7.org/linux/man-pages/man2/waitpid.2.html).
- The supervisor forwards ordinary exit status, or `128 + signal`. The Java wrapper leaves stdout/stderr open for bounded draining and considers `waitFor`/`isAlive` authoritative, not the fact that termination was requested.

This is lifecycle management for the immediate Bun process, not a security sandbox or an arbitrary descendant/process-tree supervisor. Trusted scripts remain responsible for their own detached descendants. Linux tasks stuck in uninterruptible kernel sleep cannot be promised immediate death even after SIGKILL; failures must not be described as successful execution.

## Reproduce and verify

`supervisor.lock.json` separately pins first-party C source, NDK 29.0.14206865, Android API 28 link target, compiler flags, and both ABI payloads. This link target does not lower the official plugin's Android 13/API 33 minimum. Both helpers are PIE executables with at least 16 KiB PT_LOAD alignment. Alignment alone is not native 16 KiB Bun execution evidence.

The checked-in helpers are Git LFS objects. Ordinary Gradle builds verify them and do not require an NDK. Reproduction requires the pinned Android NDK, Node.js, and a new absolute output directory:

```powershell
node tools/bun-runtime/supervisor/build-supervisor.mjs --ndk "$env:ANDROID_HOME/ndk/29.0.14206865" --output-directory "$env:TEMP/bun-supervisor-reproduction-new"
node tools/bun-runtime/supervisor/verify-supervisor.mjs
```

Set `ANDROID_HOME` to your SDK location and use a new absolute output directory. The builder has no network access logic, refuses an existing output directory and checks byte equality. `--candidate` is an explicit maintainer-only mode for reviewing a new source/toolchain build; it skips only the expected output digest comparison and never installs or publishes the result. After review, update the source/output locks and Git LFS objects together, repeat a clean build without that flag, and rerun device tests. Windows x64 reproduction has been exercised; Linux x64 is supported by the builder but cross-host Android byte equality has not yet been exercised locally.

On Linux, `python3 -B tools/bun-runtime/supervisor/test_supervisor.py` compiles a temporary host helper with `cc` (or `$CC`) and checks control EOF, graceful/forcible exit, reaping, parent death, startup cancellation, exec failure and argv/stdio. These tests are not Android compatibility evidence. Android instrumentation uses the real installed Bun via Binder, confirms SIGTERM-handler readiness, checks that each reported child PID is absent after completion, checks workspace cleanup and executes recovery scripts.

## Release sources

The helper is first-party project code, covered by the repository license; Bun's upstream notices remain unchanged. Corresponding-source manifest schema 2 binds its source/toolchain lock and the exact helper in every ABI APK. The same Release's project-source archive contains this directory, the Java control wrapper, and build/relink instructions. The verifier requires `tar` on PATH to read exact archive members to stdout without extracting files to disk. It rejects omitted/extra/drifted native entries and schema downgrades for new versions. Legacy v0.2.0 assets remain unchanged. These are automated technical checks, not a legal opinion or approval.
