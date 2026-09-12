# Optional Android pidfd probe with blocked SIGSYS

Project-owned MIT patch 10 changes only Android's `pidfd_open` shim in
`src/sys/linux_syscall.rs`. Linux's rustix implementation and patches 1-9 are
unchanged. The deterministic source head is
`a9c76a599bacb75c72d3c00fc6f99c5cc9483b47`.

The original nine-patch runtime's two cold asynchronous spawn fixtures fail on
Sony G8441 / API 28 / native ARM64 / 4 KiB. A separate
[diagnostic observer](../signal-trace/README.md) directly records four leader
SIGSYS deliveries with `si_code=SYS_SECCOMP`, `si_syscall=434` and
`si_arch=AUDIT_ARCH_AARCH64`, followed by exit 159. Untraced controls also exit
159. On Sony XQ-AT72 / API 31 / native ARM64 / 4 KiB, both modes pass twice,
with and without tracing, and no pidfd SIGSYS is observed. See the
[immutable diagnostic record](../../../../../docs/compatibility/2026-09-13-m3-blocked-pidfd-diagnosis.json).

Source analysis places this optional first-entry probe in
`PosixSpawnResult::pifd_from_pid`, after `posix_spawn` has restored the caller's
mask. The asynchronous path attempts the probe; the synchronous fast path does
not. This caller attribution is source analysis, not a captured stack trace.
The kernel documents that TRAP exposes the attempted syscall and architecture
through SIGSYS siginfo fields in its
[seccomp documentation](https://docs.kernel.org/userspace-api/seccomp_filter.html#return-values).

## Behavior and tradeoff

For a valid PID, query the calling thread's current mask with a null input set
to `pthread_sigmask`. If SIGSYS is blocked, return ENOSYS without issuing the
optional syscall. The existing spawn caller then selects its existing waiter
thread. Invalid PIDs and query errors remain controlled errors. With SIGSYS
unblocked, the original syscall/error/FD ownership path is unchanged.

This deliberately does not temporarily unblock SIGSYS: doing so could deliver a
user's pending signal before the script requested it. No waiter cache is warmed
in the fixture, no kernel-version guess is used, and neither the script's mask
nor its FFI capabilities are restricted. The existing process-wide waiter flag
is sticky: even a pidfd-capable Android system will keep the waiter fallback
after its first blocked-mask probe. That modest monitoring tradeoff preserves
the caller's signal semantics. This is not a general solution for arbitrary
raw syscalls made while SIGSYS is blocked.

## Exact-source host regression

`test_blocked_pidfd.py` verifies the patch length and SHA-256, extracts the full
Android function from its `--unified=20` postimage, and compiles it unchanged.
Only the Fd wrapper and libc fault-injection seams are supplied by the harness.
It uses the same libc crate version, `0.2.186`; CI supplies the already verified
offline vendor source from the normal Cargo materializer.

```sh
PIDFD_LIBC_SOURCE=/absolute/verified/vendor/libc-0.2.186 \
  python3 -B tools/bun-runtime/experimental/api28/blocked-pidfd/test_blocked_pidfd.py
```

Ten cases cover unblocked success, repeated blocked fallback, preservation and
explicit later delivery of a pending thread-directed SIGSYS, thread-local mask
independence, invalid PID, query and membership errors, syscall errno, a real
Linux pidfd positive control, and an actual pidfd TRAP filter that must never be
entered by the blocked path. Each also checks an unrelated blocked signal.
The positive kernel control requires native Linux x86_64 with pidfd support.
These host tests do not replace Android application-process or Binder gates.
