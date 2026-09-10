# Linux startup CLOEXEC regression tests

Downstream patch 7 fixes the ignored startup result of
`bun_close_range(4, ~0U, CLOSE_RANGE_CLOEXEC)`. A seccomp trap converted to
ENOSYS is a failed syscall, not a successful close-on-exec operation.
The project-owned patch is MIT-licensed and does not alter the official Bun
payload or the separate MPL-2.0 lifecycle supervisor.

## Scope and failure policy

The native fast path is unchanged. On failure, the startup-only helper opens
`/proc/self/fd`, enumerates actual descriptors, and uses `F_GETFD` followed by
`F_SETFD(oldFlags | FD_CLOEXEC)`. It preserves existing fds 0-3 and skips the
owned directory fd. It marks descriptors; it does not close them. Only its
own directory is closed, exactly once, including error paths.

The helper does not use `_SC_OPEN_MAX` or the old spawn helper's 65536 ceiling.
An inherited fd can remain open above a subsequently lowered `RLIMIT_NOFILE`.
Work is bounded to 1,048,576 directory entries and at most eight EINTR retries
per open/read/fcntl call. Disappearing fds with EBADF are tolerated; other
enumeration/marking errors fail startup with exit 1 and a bounded errno
diagnostic. `closedir` is not retried after EINTR, because Linux may already
have released that descriptor number.

This is early startup handling, not an atomic all-thread operation or a
security sandbox. Patch 7 leaves the spawn fallback and watch/reload unchanged.
Directory iteration may allocate and must not be reused inside a signal handler
or vfork child. The subsequent, separate [patch 8 spawn helper](../spawn-fd/README.md)
uses fixed-stack raw syscall enumeration with its own high-FD host tests.
Android high-FD coverage, `CLOSE_RANGE_UNSHARE`, watch/reload and other syscall
fallbacks remain separate validation work. No 16 KiB execution claim follows
from these host tests.

## Run the exact locked code

On Linux with Python 3 and a C++17 compiler:

```sh
(
  ulimit -n 1048576
  python3 -B tools/bun-runtime/experimental/api28/startup-cloexec/test_startup_cloexec.py
)
```

`CXX` selects the compiler. Local validation uses GCC 13 in the existing
digest-locked build image, with `--network=none`, a read-only source/root,
non-root UID, `--init`, a disposable executable `/tmp`, and
`--ulimit nofile=1048576:1048576`. The high-fd setup is mandatory, not skipped
when a container's default fd limit is too low. CI runs the same Python entry.

The harness verifies the patch's size/SHA-256, extracts its complete new-file
header hunk, and checks the header's Git blob ID before compiling. It also
compiles the actual added startup branch from the patch. No second copy of
the production helper is maintained in the test fixture.

Three test groups cover 27 scenarios:

- A real Linux fd/exec test creates descriptors 256 and 70000, lowers the
  soft fd limit to 1024, verifies retained readable descriptors with CLOEXEC
  and unchanged fds 0-3, then execs the same test executable and checks that
  both marked descriptors are absent and fd 3 remains open.
- A 23-case injected syscall matrix covers already-marked descriptors,
  preservation of low/directory fds, open/dirfd/readdir/fcntl/closedir errors,
  EBADF races, invalid/overflow names, one-shot and exhausted EINTR retries,
  and success at the entry budget versus failure one entry beyond it.
- Three startup-branch cases verify fallback success, no fallback on native
  success, and exit 1 with the exact errno diagnostic when opening procfs
  fails, before continuation into user code.

The Android counterpart remains the unchanged `fd-startup-trap` assertion
in the [20-probe application suite](../app-probe/README.md). It execs the
installed read-only Bun at the same PID under a real seccomp TRAP filter;
passing standalone host tests does not replace that device gate.
