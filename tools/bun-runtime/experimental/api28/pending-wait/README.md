# Android epoll signal-mask regression

Patch 12 keeps the caller's complete signal mask during Android epoll waits.
Passing an empty mask to `epoll_pwait` temporarily releases blocked signals:
restoring the caller mask on return cannot undo delivery of a pending SIGSYS.
Android now passes NULL, so the kernel keeps the calling thread's existing mask.
There is no signal-mask query, modification, early delivery or cache warm-up.

The pinned `src/analytics/lib.rs` already returns zero unconditionally for
Android's `Bun__isEpollPwait2SupportedOnLinuxKernel`; `us_create_loop` uses that
result to disable the optional syscall. Patch 12 enforces this same exclusion
at the C call site. A forced unknown/available capability value therefore cannot
issue `epoll_pwait2` with SIGSYS blocked. It does not probe a syscall or write
capability state. Normal Linux builds retain both original wait paths, temporary
empty masks, error fallbacks and sticky availability behavior. Existing deadline,
EINTR, rounding and saturation calculations remain unchanged.

`test_epoll_mask.py` verifies the complete before/after file's patch hash, Git
blob IDs and line counts, then extracts its entire production function, global
and raw ABI declaration. The test compiles these bytes directly; its wrapper
observes calls and controls errors/time without copying the wait implementation.
The bundled uSockets file and this fixture retain Apache-2.0 licensing, separately
from Bun's MIT repository license.

Run on Linux x86_64 with a kernel providing `epoll_pwait2`, GCC or Clang, and
permission to install a test-only seccomp filter:

```sh
CC=gcc python3 -B tools/bun-runtime/experimental/api28/pending-wait/test_epoll_mask.py
CC=clang python3 -B tools/bun-runtime/experimental/api28/pending-wait/test_epoll_mask.py
```

Each compiler runs 17 Android candidate modes: queued SIGSYS and a second blocked
signal, all three capability states, a TRAP filter on the excluded syscall,
unblocked waiting, zero/finite/infinite waits, eventfd wakeup, actual EINTR,
argument errors, timeout rounding/saturation/remaining deadline and an independent
thread. Complete masks and pending signals remain unchanged until the caller
explicitly restores its mask, when exactly one delivery per signal is required.
Two original-source controls must fail that same pending assertion with exit 90.

Thirteen Linux modes run against both original and candidate functions, covering
both real wait paths, their original signal delivery, event/EINTR handling and
controlled raw errors/remaining deadlines. Time/error injection is explicit and
separate from real syscall observations. These 45 bounded executions per compiler
are host controls, not new Android, Binder, cgroup, watch/reload, OEM or Release
acceptance. The unchanged 33-probe and eight-test Binder suites need newly built
runtime bytes and separate device evidence.
