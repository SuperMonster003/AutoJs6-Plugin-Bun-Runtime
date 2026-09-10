# Linux spawn FD fallback regression tests

Downstream MIT patch 8 replaces the Linux spawn fallback's current-soft-limit
scan with enumeration of actual descriptors. Descriptors may remain open above
both a subsequently lowered soft limit and hard limit. This patch is separate
from the startup-only, allocating helper and the MPL-2.0 process supervisor.

## Execution and failure policy

The native `bun_close_range` fast path is unchanged. On failure, the child opens
`/proc/self/fd` with `O_DIRECTORY | O_CLOEXEC`, reads `getdents64` into a fixed
4096-byte stack buffer, and marks actual descriptors in the inclusive range
with `F_SETFD(oldFlags | FD_CLOEXEC)`. The helper also supports immediate-close
mode. It preserves descriptors outside the range and closes its owned directory
exactly once. No allocating directory stream, allocator, lock, `sysconf` or
65536 numerical scan ceiling is used in the Linux vfork child.

Directory records, names and numeric overflow are checked before use. Work is
bounded to 1,048,576 entries and eight EINTR retries per open/read/fcntl call.
EBADF for a vanished target is tolerated; other errors fail the operation.
Neither target nor directory close is retried after EINTR. A setup failure
propagates through the existing `childFailed` path before exec; it is not
silently converted to success. Partial marking before an error is permitted
only because that child does not execute user code.

These properties rely on Bun's existing Linux vfork/clone child not sharing the
descriptor table (`CLONE_FILES` is absent). They do not describe a general
concurrent close-range primitive, implement `CLOSE_RANGE_UNSHARE`, or change
watch/reload. Non-Linux fallback behavior is unchanged. The relevant Linux
contracts are [getdents64](https://man7.org/linux/man-pages/man2/getdents.2.html),
[clone flags](https://man7.org/linux/man-pages/man2/clone.2.html) and
[close error semantics](https://man7.org/linux/man-pages/man2/close.2.html).

## Tests

Run on native Linux with Python 3 and a C++17 compiler:

```sh
(ulimit -n 1048576; python3 -B tools/bun-runtime/experimental/api28/spawn-fd/test_spawn_fd.py)
```

`CXX` selects the compiler. The locked Ubuntu build image uses `CXX=g++-13`,
`--network=none`, a read-only root/source mount, non-root UID, `--init`, an
executable disposable `/tmp`, and `--ulimit nofile=1048576:1048576`.
Insufficient FD limits fail setup, not a skipped test.

The harness verifies the patch bytes/SHA-256 and new header's Git blob ID,
then extracts the complete helper, range wrapper and fail-closed call site.
There is no second copy of the production implementation in the fixture.
The wider context in patch 8 also retains the exact old loop for failing
controls. Four test groups cover 57 scenarios (7 real, 45 injected, 4 failing
old-implementation controls and 1 symbol audit):

- Real vfork/exec with fds 256 and 70000, lowered soft or soft-plus-hard limits,
  native syscall success, inclusive marking/closing, and unchanged parent fds.
- Injected open/read/fcntl/close errors, vanished fds, malformed/truncated or
  overflowing records, EINTR retries/exhaustion, exact entry-limit boundaries,
  native-fast-path bypass and actual vfork setup-error propagation.
- A compiled helper-only symbol audit permitting only syscall/errno access
  and compiler-provided stack-protection/linker symbols.
- The extracted old implementation failing the same exec assertions under
  both lowered-limit modes (fd 256 leak), unchanged large limits (fd 70000
  leak), and an exhausted descriptor limit (silent success instead of EMFILE).

These host tests do not substitute for Android application-process tests.
The unchanged behavioral assertions in the [20-probe suite](../app-probe/README.md)
remain the device gate; only its expected runtime revision changes with the
new binary. Native ARM64 16 KiB acceptance must be tied to that new artifact,
not transferred from the previous runtime's device reports.

On 2026-09-10, GCC 13 and Clang 21.1.5 each passed all 57 host scenarios.
LLVM 21.1.5 with the locked NDK r27c API 28 sysroots also compiled the exact
header for both Android ABIs with optimization and stack protection; the only
undefined symbols were `syscall`, `__errno` and `__stack_chk_fail`. Those object
audits are compilation evidence, not Android execution. The new runtime's
separate [device report](../../../../../docs/compatibility/2026-09-10-m3-spawn-fd-fix.json)
records 240/240 application observations, including two 20/20 rounds on native
ARM64 16 KiB, after two byte-identical clean builds per ABI.
