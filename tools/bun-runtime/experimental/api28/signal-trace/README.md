# Test-only signal observer

This separate diagnostic APK observes fixed cold async and watch fixtures.
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

The CLI requires an explicit `--fixture-set`: `blocked-async` keeps the original
cold async assets, `pending-async` selects the two fixed pending-signal assets,
and `watch-reload` uses the unchanged native/TRAP two-reload fixtures.
This choice is bound into the APK receipt and instrumentation report.
No arbitrary source or command is accepted. `SYS_SECCOMP` records retain their
syscall/architecture fields. Other SIGSYS records instead contain sender PID/UID
under `TRACE_USER_SIGSYS`; those siginfo union fields must not be read as a syscall.

For ordinary SIGSYS stops, the observer now reads registers with PTRACE_GETREGSET.
Only an epoll wait register context triggers one word of PTRACE_PEEKDATA at its
signal-mask argument. This read-only context is separate from siginfo union fields;
no registers, masks, syscall results or signal deliveries are changed. The
[eleven-patch wait diagnosis](../../../../../docs/compatibility/2026-09-13-m3-pending-wait.md)
captures eight ARM64 syscall-22/empty-mask contexts after child close_range,
with matching plain controls. Earlier ten-patch traces remain unchanged.

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
  --output-directory <new-external-apk-directory> --fixture-set blocked-async

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

## Watch abort observations

The [2026-09-13 watch observation report](../../../../../docs/compatibility/2026-09-13-m3-watch-reload-trace.md)
records two native/TRAP plain/traced rounds on each Sony ARM64 API 28/31 device
at 4 KiB pages. All 16 observations complete the original two reloads and three
images, with 24 directly observed ordinary SIGSYS deliveries in eight traces.
These runs do not reproduce or resolve the original API 28 SIGABRT/clone EAGAIN.
They add zero compatibility passes and do not establish stability.

SIGABRT stops now capture bounded read-only registers, up to eight frame-pointer
address candidates, mappings and process/resource facts. Missing reads and mapping
or path caps are explicit. At most two fatal stops are sampled; the original
12-second/256-event/32-SIGSYS limits and signal forwarding are preserved.
Frame candidates are not a complete unwind or proof of a clone/resource cause.
No SIGABRT occurs in the Android observations, so the snapshot is validated only
by the separate Linux plain/traced abort control, which preserves exit 134 and reaps.
The observer sees only its kernel-attached tracees; extra close_range TIDs do not
establish a detailed thread/parent relationship. No arbitrary process is attached.

```powershell
node tools/bun-runtime/experimental/api28/signal-trace/archive-watch-trace.mjs docs/compatibility/NEW.json DEVICE_DIRECTORY...
```

The archiver requires unchanged fixture semantics, exact source/APK/raw bindings,
two complete rounds, sender identities and cleanup. A fatal or incomplete trace
must be retained separately and cannot use the non-reproduction result shape.

## Historical pending-signal diagnosis

The [new ten-patch diagnosis](../../../../../docs/compatibility/2026-09-13-m3-pending-sigsys.md)
uses `--fixture-set pending-async`. Two rounds on each native ARM64 API 28/31
device pair every native/TRAP case with a plain control: eight traced and eight
plain cases reproduce the controlled failure. All eight traces capture SI_TKILL
on the main thread before child close_range. The parent mask setup in pinned
posix_spawn_bun explains the early delivery; the observer does not capture the
rt_sigprocmask arguments or a call stack. The runtime remains unfixed.

```powershell
node tools/bun-runtime/experimental/api28/signal-trace/archive-pending-trace.mjs NEW_DIAGNOSIS.json DEVICE_DIRECTORY...
```

This separate archiver checks the pending profile, exact source/native/APK
bindings, complete raw pairs, sender/receiver identities, event order and UID
cleanup. The historical nine-patch archiver remains specific to its old source.
The Linux observer control now compares handled/fatal seccomp and handled/fatal
ordinary user signals with plain execution, preserving each outcome and reaping.

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
