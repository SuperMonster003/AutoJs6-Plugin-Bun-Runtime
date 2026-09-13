# Android spawn signal-mask regression

Patch 11 preserves a caller-blocked, possibly pending SIGSYS throughout the
parent's `posix_spawn_bun` setup. Android adds the temporary blocked signals with
`SIG_BLOCK`, retaining the original mask for restoration. Only the vfork child
installs the setup mask that permits the existing SIGSYS seccomp handler, then
restores the requested child mask before exec. The new mask calls propagate errors
through the existing spawn failure paths. The existing final parent restoration
is unchanged.

A blocked Android caller also avoids the optional parent `clone3` probe. Its cgroup
request takes the existing child join path without setting the global
`clone3Unavailable` flag. A later unblocked call can still probe clone3. No pending
signal is cleared, no waiter cache is warmed, and Linux rustix is unchanged.

`test_spawn_mask.py` extracts the complete before/after production C++ file from
the locked full-context patch. It checks patch bytes, Git blob IDs and line counts,
then compiles that production function with the unchanged patch-8 FD helper and a
minimal Linux/Android platform header. It does not copy the spawn implementation.
The two initializer warning exclusions only accommodate the unchanged production
`struct sigaction sa = { 0 }` spelling; other warnings remain errors.

Run on Linux x86_64 with GCC or Clang:

```sh
CXX=g++ python3 -B tools/bun-runtime/experimental/api28/pending-mask/test_spawn_mask.py
CXX=clang++ python3 -B tools/bun-runtime/experimental/api28/pending-mask/test_spawn_mask.py
```

Fourteen fixed candidate modes cover pending and blocked/unblocked callers,
close_range/clone3 TRAP-to-ENOSYS controls, repeated calls, another live thread,
complete mask restoration, exactly one explicitly requested later signal delivery,
exec-child mask/disposition/pending state and descriptor cleanup. Controlled failures
cover the three new mask calls, exec and child cgroup join, including reaping and
not publishing a PID on failure. The two original-source controls must fail the
same pending-signal assertion after reaping their child. They are regression
controls, not successful runtime acceptance.

These are finite host tests, using real Linux signals/vfork/exec with test syscall
handlers. The cgroup directory contains a regular test `cgroup.procs` file: it
checks branch selection and child join/error handling, not a real Android cgroup
controller or successful clone3 creation. Error injection wraps only mask calls;
it is not a claim about naturally occurring bionic failures. Android application,
Binder, OEM, watch/reload and Release acceptance require their own new-source runs.
