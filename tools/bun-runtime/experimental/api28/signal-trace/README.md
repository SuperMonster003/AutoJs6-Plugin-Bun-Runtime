# Test-only SIGSYS observer

This separate diagnostic APK observes the **unchanged** cold async fixtures.
It is not the production plugin, a Binder test, or compatibility acceptance.
Its package ends in `.signaltrace`, with `testOnly=true`, `debuggable=false`,
no exported application components, and three exact read-only PIE payloads:
locked Bun, the unchanged production supervisor, and a small ptrace observer.
The regular production/two-payload APK verifier is not relaxed.

The process chain is:

```text
Instrumentation -> production supervisor -> Bun execve-only launcher
                                            replaces itself with observer
                                            -> fresh Bun -> original fixture
```

The launcher uses `execve`, not Bun.spawn; its caches and threads do not survive
exec. This preserves the production supervisor's executable-name contract and
keeps the observer as the immediate owned child. The observer forks only its
own tracee, requests dumpability for that disposable child, and uses
`PTRACE_CONT`, `PTRACE_GETSIGINFO`, and fork/clone/exec/exit event tracking.
It never writes registers, masks or syscall results. Every real SIGSYS is
forwarded unchanged, including a fatal delivery. Synthetic attach/event stops
are suppressed; these fixed fixtures do not generate user SIGSTOP requests.

The observer has a 12-second alarm, 256-event and 32-signal caps, and
`PTRACE_O_EXITKILL`. The unchanged supervisor bounds observer termination;
instrumentation bounds collection/output and removes its exact private job.
The runner force-stops between two rounds and uninstalls only its own package,
requiring zero processes for that UID. Do not attach this tool to unrelated
applications or turn it into a permissive ptrace service.

## Build and run

```powershell
node tools/bun-runtime/experimental/api28/signal-trace/build-trace.mjs `
  --sdk <sdk> --jdk <jdk> --ndk <ndk-29.0.14206865> --abi arm64-v8a `
  --runtime <verified-first-bun-file> --repeat-runtime <verified-second-bun-file> `
  --output-directory <new-external-apk-directory>

node tools/bun-runtime/experimental/api28/signal-trace/run-trace.mjs `
  --adb <adb-executable> --serial <explicit-serial> --api 28 --page-size 4096 `
  --apk-directory <apk-directory> --output-directory <new-run-directory> `
  --sdk <sdk> --jdk <jdk>
```

The builder compiles the observer twice with NDK 29.0.14206865 and requires
identical bytes, ELF/ZIP alignment and APK signature verification. It binds
canonical source hashes, the original fixture assets, toolchain, and installed
payload hashes. Output `completed=true` means collection completed, **not** that
the fixture passed or a diagnosis was accepted. Use the independent semantic
validator, not that flag, to interpret results.

## Archived baseline diagnosis

The [2026-09-13 archive](../../../../../docs/compatibility/2026-09-13-m3-blocked-pidfd-diagnosis.json)
contains four plain/traced pairs per device, over two process-restarted rounds:
Sony G8441 / API 28 and Sony XQ-AT72 / API 31, both native ARM64 / 4096 bytes.
All four API 28 traced failures end in leader syscall 434 SIGSYS and exit 159;
plain counterparts also fail. All API 31 counterparts pass the unchanged
semantic validator. The syscall identity is directly observed; no instruction
address, call stack, Binder, full-suite or native 16 KiB acceptance is claimed.

`archive-trace.mjs` is specifically for this nine-patch baseline and rechecks
raw reports, source bindings, semantic evidence and cleanup before creating a
new immutable report. Source inputs already tracked at collection time are
bound to project base `fb9fbc6`; new diagnostic source inputs have their own
hashes. The initial direct-observer-launch harness rejection is
[preserved separately](../../../../../docs/compatibility/2026-09-13-m3-signal-trace-harness-failure.json),
not included as a runtime acceptance or a ptrace observation.

`trace-evidence.test.mjs` checks that tampering with syscall, thread, architecture,
signal reason, masks, output, sources, restart or cleanup cannot pass.
`test_trace.py` compiles the actual observer on native Linux x86_64 and compares
handled and fatal kernel SIGSYS outcomes with an untraced target. It also checks
the owned process has been reaped.
