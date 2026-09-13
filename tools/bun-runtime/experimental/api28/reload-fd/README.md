# Linux reload descriptor regression

Patch 13 checks `close_range(3, UINT_MAX, CLOSE_RANGE_CLOEXEC)` before a watch
reload exec. On failure it uses the unchanged patch-8 raw syscall enumerator's
CLOEXEC arm over actual `/proc/self/fd` entries. No live descriptor is closed
while other threads still run. Enumeration or marking errors stop the process
with exit 1 and a bounded errno diagnostic before IPC restoration, signal reset
or exec. Standard descriptors 0-2 and the explicitly parsed `NODE_CHANNEL_FD`
retain the original preservation rules. FreeBSD and Darwin behavior is unchanged.

The fixed 4 KiB stack buffer, 1,048,576-entry budget and eight EINTR retries
come from the existing helper; neither current `RLIMIT_NOFILE` nor an arbitrary
descriptor-number ceiling controls enumeration. There is no new allocation,
directory stream, lock or dependency. The allocating startup helper is not used.
The enumeration is not an atomic operation over a shared descriptor table:
descriptors created or reused by concurrent threads remain a separate boundary.
This does not implement `CLOSE_RANGE_UNSHARE` or a sandbox.

On Linux x86_64 with Python 3 and a C++17 compiler:

```sh
(ulimit -n 1048576; CXX=g++ python3 -B tools/bun-runtime/experimental/api28/reload-fd/test_reload_fd.py)
(ulimit -n 1048576; CXX=clang++ python3 -B tools/bun-runtime/experimental/api28/reload-fd/test_reload_fd.py)
```

The test verifies the complete patch's size/hash, both complete source blobs
and line counts, then compiles the actual `unset_cloexec` and full
`on_before_reload_process_posix` functions. The existing spawn test extractor
supplies the exact unchanged helper. The original IPC/signal section is also
byte-compared. No copy of the production function is maintained in the fixture.

Each compiler runs 25 fixed cases: twelve successful Linux modes, three expected
original-source failures, six setup error modes, and four original/candidate
FreeBSD/Darwin policy controls compiled on Linux. The latter are preprocessor
policy controls, not execution on those operating systems. The successful
Linux modes use real descriptor, signal and exec operations, including FD 70000
above a lowered hard/soft limit of 128 with EPERM on restoration, ordinary and
explicit CLOEXEC descriptors, IPC at 3/256/70000, invalid IPC values, and reload
from another thread. Real raw `close_range` must succeed in its native control;
ENOSYS/EINVAL/EIO and enumeration failures are explicitly injected boundaries.

Failure cases require exact exit/diagnostic, unchanged caught signal and caller
mask, retained live descriptors, bounded retries and cleanup of only the owned
enumeration directory. The original implementation must fail the same descriptor
marking assertion under each injected unavailable/error raw control. The shared
[spawn helper tests](../spawn-fd/README.md) separately exercise malformed dirents,
EBADF races, budgets and the no-allocation symbol audit.

These finite host cases do not accept Android FD 70000, IPC messaging across
watch reload, concurrent FD creation, pending signals across exec, or hardware
16 KiB. The unchanged 35-probe application suite and complete eight-test Binder
suite require new APKs bound to the independently rebuilt runtime. Historical
twelve-patch failed watch records remain immutable. The official payloads and
`distributionReady=false` remain unchanged.
