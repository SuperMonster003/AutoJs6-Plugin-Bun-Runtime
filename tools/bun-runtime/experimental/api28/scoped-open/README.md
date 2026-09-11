# Read-only scoped directory-open fallback

Project-owned MIT patch 9 implements the selected directory-confinement fallback
for Bun's built-in static directory routes. It does not add a permissive mode,
disable ordinary directory serving, change ordinary `Bun.file`/`node:fs` access,
or turn trusted scripts into a filesystem sandbox.

The existing `openat2` fast path and unavailable-syscall detection remain intact.
Only its former plain-`openat` fallback calls the new C bridge. The implementation
is stored once, in the locked downstream patch, and extracted by the test harness.

## Resolution and ownership

- Duplicate the caller's root into an owned `O_PATH | O_DIRECTORY | O_CLOEXEC` fd.
- Open each component with `O_PATH | O_NOFOLLOW | O_CLOEXEC`. Never ask the kernel
  to follow an untrusted symlink during this walk.
- Read a pinned symlink with `readlinkat(fd, "", ...)`, not by reopening its name.
  Relative targets continue from its saved parent; absolute targets restart at
  the saved root. `..` pops the owned directory stack and is clamped at that root.
- Conservatively reject procfs symlinks, including magic links. Regular symlinks
  on other filesystems are interpreted as path text within the saved root.
- Before returning a result, verify pinned directory-parent identities. Detected
  moves away from saved parents produce `EAGAIN`; user `..` never follows the
  filesystem's changed parent. Repeat the check after reopening the final fd.
- Reopen the still-owned final descriptor through an internally opened, procfs-
  verified `/proc/self/fd` directory. The numeric fd is not user input. Compare
  the resulting inode/device/type with the pinned descriptor and reject drift.
  This avoids a check-then-open of the original, replaceable pathname.
- Keep the caller's root open. Every temporary fd is owned by RAII, is CLOEXEC,
  and is closed once. Cleanup preserves the primary errno; close is not retried
  after EINTR. Success transfers only the final read-only descriptor.

The relevant kernel interfaces are [O_PATH and fd identity](https://man7.org/linux/man-pages/man2/open.2.html),
[empty-path readlinkat](https://man7.org/linux/man-pages/man2/readlink.2.html),
and [openat2 resolution flags](https://man7.org/linux/man-pages/man2/openat2.2.html).

## Explicit limits

This is a **read-only DirectoryRoute fallback**, not a general `openat2` shim.
Only `O_RDONLY`, `O_CLOEXEC`, `O_NONBLOCK`, optional `O_DIRECTORY`, and zero mode
are accepted. Creation, writing, truncation and unrelated open flags fail with
`EINVAL`. Only regular files and directories are reopened; FIFOs, sockets and
devices produce a controlled miss without activating them. Ordinary paths and
root-contained links remain usable, including absolute links rebased at the root.

Input and expanded pending paths must be shorter than 4096 bytes; components
are at most 255 bytes. Traversal permits 40 symlink expansions, 8192 loop steps,
and at most 2049 owned directory fds. Resource exhaustion is an error, not a
fallback to unconstrained access. Each retried syscall allows eight EINTR retries;
there is no automatic whole-request retry on parent changes.

The resolver does not promise identical errno behavior for every Linux filesystem
or every `openat2` flag. In particular, rejection of procfs links is conservative,
special files are rejected before a read-open, and it requires access to the
process's own procfs fd directory. A returned open file can still be renamed or
modified later, as with ordinary open files; this is not an immutable filesystem
snapshot. Privileged mount manipulation, hostile same-process fd-table tampering,
and arbitrary filesystem implementations are not covered by the current tests.
Do not turn finite race tests into a claim of exhaustive kernel equivalence.

## Verification

Run on native Linux with an `openat2`-capable kernel, Python 3 and a C++17 compiler:

```sh
CXX=g++-13 python3 -B tools/bun-runtime/experimental/api28/scoped-open/test_scoped_open.py
CXX=clang++-21 python3 -B tools/bun-runtime/experimental/api28/scoped-open/test_scoped_open.py
```

The harness checks exact patch length/SHA-256, the complete header hunk and Git
blob, the C bridge, and Rust fallback/errno/ownership wiring. It compiles the
extracted production implementation. Four test groups run 20 named cases:

- Stable paths, UTF-8, regular files, directories, relative/absolute root-contained
  links, parent clamping, traversal rejection, and a real native `openat2` oracle.
- Invalid modes/flags, path/component/40-link boundaries, FIFO nonblocking errors,
  known procfs magic links, and preservation of the caller's root/file bytes.
- Deterministic file and symlink replacement after pinning, a directory moved
  away from its saved parent, and 3000 lookups while another thread swaps a link
  between an allowed file and a synthetic outside-root sentinel.
- Injected errors, single/exhausted EINTR retries, procfs refusal/type mismatch,
  exactly-once close and no leftover fds on success or failure. The old plain-openat
  control returns the sentinel that the new resolver rejects.

These are helper/source-integration tests, not Android runtime acceptance.
The separate [new device report](../../../../../docs/compatibility/2026-09-10-m3-scoped-open-fix.md)
records two clean builds per ABI and the unchanged 24-probe application suite
(apart from the expected Bun revision) passing twice in five native 4 KiB
environments, 240/240. It also records the same helper tests passing with GCC
ASan/UBSan and leak detection using the already-locked host runtime libraries.
The previous failed
[`a260ef308` device report](../../../../../docs/compatibility/2026-09-10-m3-openat2-confinement.json)
remains immutable. The [2026-09-11 Samsung follow-up](../../../../../docs/compatibility/2026-09-11-m3-scoped-open-native-arm64-16k.md)
reuses the exact ARM64 APK and all 24 definitions on native ARM64 / API 36 /
16384-byte pages, passing twice (48/48), including all 48 path assertions and
12 rejected escape requests. Packages/UID processes are cleaned up; pre-existing
AVDs are not operated. Raw openat2 is unavailable before filters here too, not
first-entry high-level EIO/TRAP acceptance. Full experimental Binder, remaining
syscall semantics and matching APK/source publication are still separate gates.
