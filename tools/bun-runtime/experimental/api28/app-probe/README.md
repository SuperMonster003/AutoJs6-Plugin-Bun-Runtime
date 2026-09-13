# Isolated application-process probe (test-only, not a plugin)

This tool checks the locked patched Bun runtime in an actual Android application
process. It is independent of the production Gradle app, AutoJs6, AndroidX and
the shared Binder API. Its only shared Java implementation is the production
`SupervisedProcess` control wrapper, compiled directly from its repository source
instead of copied into a second implementation. It does not change the official plugin's API 33 minimum,
runtime files, signing identity, metadata or installed package.

The package is `io.github.supermonster003.autojs6.plugin.bun.runtime.api28probe`.
It has `minSdk=28`, `targetSdk=36`, `testOnly=true`, `debuggable=false`, one
self-targeting instrumentation entry and INTERNET permission for loopback tests.
There are no activities, services, receivers, providers or plugin contracts.
Its label is deliberately different from the production application name.

## Current result and limits

The new fixed **33-probe** suite preserves all original 31 definitions and old
fixture bytes, adding two pending-SIGSYS asynchronous spawn modes. On native
ARM64 API 28 and 31 / 4 KiB, both modes fail twice: original 31 pass **124/124**,
but the new gate is **0/8**, overall **124/132**. The caller's pending signal is
delivered early during spawn, before the final mask restoration. Independent
plain/ptrace pairs confirm SI_TKILL delivery to the original main thread; this
is a controlled exit 1, not the earlier fatal pidfd SIGSYS. See the
[failure and diagnosis](../../../../../docs/compatibility/2026-09-13-m3-pending-sigsys.md).
The ten-patch bytes remain unchanged and this gate is open.

The two new fixed assets alone receive a 12 KiB source cap. All old source,
time, output and lifecycle limits remain unchanged. Queueing uses thread-directed
tgkill after blocking SIGSYS; parent/child pending state, original mask/TID,
delayed single JS delivery and listener removal are required, never bypassed.
The current failure occurs before those later success assertions can complete.

```powershell
node tools/bun-runtime/experimental/api28/app-probe/archive-pending-signal-failure.mjs NEW_FAILURE.json DEVICE_DIRECTORY...
```

This failure-only archiver independently checks both failed raw rounds, the
successful original 31, exact pending observations, source/APK bindings and UID
cleanup. It cannot create acceptance. The legacy blocked-async failure archiver
is explicitly limited to its original 31-case shape and rejects expanded runs.

### Historical ten-patch 31-probe acceptance

The [ten-patch pidfd repair](../../../../../docs/compatibility/2026-09-13-m3-blocked-pidfd-fix.md)
passes the same 31 probes twice in five native 4 KiB environments: ARM64
API 28/31/33/35 and x86_64 API 33, **310/310**. Only the expected revision changes
to `1.4.0+a9c76a599`; all fixtures, semantic validators, Java instrumentation
and budgets are unchanged. All 20 blocked-async and 60 child observations pass.
The independent full Binder suite also passes 80/80 with separately bound APKs.
All packages/UID processes and only the owned AVD are cleaned up. The identical
probe APK subsequently passes twice on Samsung ARM64 API 32/4 KiB and API 36/native
16 KiB, adding 124/124 and bringing the seven-environment total to **434/434**.
The same two devices add 32/32 Binder observations (112/112 overall) in a separately
bound APK batch, with all packages/execution UIDs cleaned up and no AVD operations.
See the [API 32](../../../../../docs/compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api32.md)
and [native 16 KiB](../../../../../docs/compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api36.md)
reports. Historical nine-patch results and the separate JSC candidate remain separate.

### Historical nine-patch blocked-async failure

The new [blocked asynchronous SIGSYS gate](../../../../../docs/compatibility/2026-09-13-m3-blocked-async.md)
extends the suite to **31 probes**, keeping all original 29 definitions and
fixture bytes. ARM64 API 31/33/35 and native x86_64 API 33 (all 4 KiB) pass two
rounds, **248/248**. Sony G8441 API 28 / ARM64 / 4 KiB instead scores **29/31
twice**: both new modes exit 159 without a semantic record, four failures.
Original 29 still pass 58/58. This is an **open failed gate**, not an expected
failure counted as acceptance. `pidfd_open` is the source-review hypothesis,
not a dynamically confirmed syscall number. All packages/UIDs and the owned
AVD are cleaned up. New API 32, native 16 KiB, Binder and Release coverage is
not inferred from the historical narrower suites below.

### Historical 29-probe acceptance

The [Android hard-limit follow-up](../../../../../docs/compatibility/2026-09-12-m3-hard-nofile.md)
extends the suite to **29 probes**, preserving all original 25 definitions and
fixture bytes. Two rounds in five native 4 KiB environments (arm64 API
28/31/33/35 and x86_64 API 33) pass **290/290**. The subsequent
[Samsung Fold4 API 32 ARM64 follow-up](../../../../../docs/compatibility/2026-09-12-m3-native-arm64-api32.md)
reuses the identical ARM64 probe APK for **58/58**, totaling **348/348** in six
native 4 KiB environments. The same APK then passes **58/58** on
[Samsung SM-A566B native ARM64 / API 36 / 16 KiB](../../../../../docs/compatibility/2026-09-12-m3-hard-nofile-native-arm64-16k.md),
including all eight hard-limit observations. The complete 29-probe suite now
totals **406/406** in seven native environments, with 56 hard-limit observations.
Startup retains/marks FD 256 after soft AND hard limits become 128; both spawn
APIs exclude it from non-Bun children. Instrumentation and supervisor limits
remain unchanged. Native close_range succeeds on this Samsung device; forced
TRAP fallback also passes. These bounded modes do not cover Android FD 70000,
UNSHARE, watch/reload or the complete Binder/API/Release matrix. Runtime bytes,
fixtures and resource bounds stay exact; the native 16 KiB device gap for these
four modes is closed, not the broader matrix.

### API 29/32 25-probe follow-up

The subsequent [API 29/32 follow-up](../../../../../docs/compatibility/2026-09-12-m3-api29-api32.md)
adds **100/100** unchanged application probes in two native x86_64 / 4 KiB AVD
environments. Its test APK is rebuilt only to bind the current APK verifier;
the 25 definitions, fixtures, Java runner, native bytes and resource bounds do
not change. API 29 pidfd remains policy-gated, not EIO-controlled reachability.
The independent real plugin Binder suite now has API 28-32 x86 version coverage;
neither suite implies all syscall/FD/CLI/OEM or final Release acceptance. That
session had no ARM64 API 32 evidence; the later Fold4 result above closes that
device gap for the existing suites. These per-session observations are historical.

### Six-environment 25-probe baseline

The fixed 25th probe exercises internal `sys::lchmod` through bare, offline
`bun link --ignore-scripts --config=<owned-file>`. The unchanged nine-patch
runtime passes **25/25 twice in six native environments (300/300)**: arm64
API 28/31/33/35 and x86_64 API 33 on 4 KiB pages, plus Samsung SM-A566B native
arm64 API 36 on 16 KiB pages, native bridge=0. All original 24 definitions and
fixture bytes remain unchanged. This is a new test APK, not the historical
24-probe APK. See the [lchmod report and exact bindings](../../../../../docs/compatibility/2026-09-11-m3-lchmod-bin-link.md).

Seven fixed children per round verify no-bin registration, syscall reachability,
native/TRAP mode repair, a second link against an existing bin, ignored fallback
EIO, and a symlink whose referent must not be chmodded. Every child uses owned
private package/global/bin/cache/temp paths, denies IPv4/IPv6 socket creation,
and never executes a package bin or installs a dependency. A successful CLI
exit alone is insufficient: the upstream bin linker intentionally ignores
`lchmod` errors. Repeating the CLI uses a new process, not a cached-call claim.

The reachability control applies `KILL_THREAD` only to syscall 452. If sibling
threads remain, the parent first requires the owned child's `/proc/PID/stat`
leader state `Z` and raw exit status 31, then kills through its existing child
handle and reaps the process. `SIGKILL` alone never passes. All children retain
the 1500 ms / 4096-byte limits; the new fixed lchmod source asset alone has a
12 KiB cap, while the original openat2 asset keeps its 8 KiB cap. Each semantic
JSON remains at most 2048 bytes. Early BigInt/CLI-argument/report-format issues
and the old-kernel `KILL_PROCESS` timeout remain separate diagnostics, not
runtime regressions or accepted observations. Packages and UID processes are
cleaned up, the owned AVD is closed, and the two pre-existing AVDs are untouched.
Full experimental Binder, other syscall/API/FD boundaries and Release stay open.

### Previous nine-patch 24-probe baseline

The new nine-patch runtime passes the same **24 probes twice in five native
4 KiB environments (240/240)**, changing only the expected revision to `1.4.0+7b9ac2668`. Fixture
sources, validators, HTTP/path assertions and all resource bounds are unchanged.
The selected [descriptor-relative fallback](../scoped-open/README.md) preserves
normal directory serving; it does not change ordinary Bun.file/node:fs access.
Both ABIs reproduce in two clean builds. All 240 directory-path assertions pass,
including the 60 formerly failing escape assertions; 30 forcible lifecycle cases
complete in 300-306 ms. All test packages are uninstalled with zero UID processes,
and the owned AVD is closed. See the [new source/APK/device evidence](../../../../../docs/compatibility/2026-09-10-m3-scoped-open-fix.md).
The identical ARM64 APK subsequently passes **24/24 twice (48/48)** on Samsung
SM-A566B, API 36, native arm64-v8a / 16384-byte pages, native bridge=0, on
2026-09-11. All 48 path assertions pass, including 12 rejected escape requests;
four lowered-limit and six forcible lifecycle cases pass (302-304 ms). The
package is uninstalled with zero UID processes. Both pre-existing AVDs remain
online and are not operated. See the [native ARM64 16 KiB follow-up](../../../../../docs/compatibility/2026-09-11-m3-scoped-open-native-arm64-16k.md).
This is new device evidence, not rebuilt runtime/APK bytes, full experimental
Binder or production v0.2.2 acceptance. Remaining syscall/API and Release gates
stay open. Previous results are never reassigned.

### Previous failed 24-probe baseline

The preceding `1.4.0+a260ef308` suite fails at **23/24 twice in each of
five native 4 KiB environments**. The unchanged original 23 probes pass, but
directory routes return a synthetic outside-root sentinel through relative,
absolute and magic symlinks, before and after adding TRAP. All 10 confinement
probes fail, with 60 failed path assertions. See the [openat2 blocker report](../../../../../docs/compatibility/2026-09-10-m3-openat2-confinement.md).
That report used unchanged runtime bytes and included no native fix or Release.
Historical success below is narrower coverage and must not override that failure.

### Previous 23-probe syscall baseline

The preceding suite contained **23 probes**, preserving all original 20 definitions
and assertions. The unchanged `1.4.0+a260ef308` bytes passed twice in five native
4 KiB environments (arm64 API 28/31/33/35 and x86_64 API 33), totaling **230/230**.
The three new syscall fixtures verify 60 raw TRAP-to-ENOSYS calls and 16
EIO-controlled copy/wait fallbacks; four API 28 kernel/policy-gated observations
are explicitly excluded from semantic reachability. All 30 forcible lifecycle
cases pass at 301-307 ms, packages are removed with zero UID processes, and the
owned AVD is shut down. See the [syscall report and scope](../../../../../docs/compatibility/2026-09-10-m3-syscall-fallbacks.md).
That historical report has no native ARM64 16 KiB execution. The later nine-patch
24-probe follow-up above adds such evidence without rewriting this baseline;
full six-syscall semantics and experimental Binder acceptance remain open.

### Previous six-environment spawn-fix baseline

The source-locked spawn fix `1.4.0+a260ef308` passes the unchanged **20 probes
twice in all six native environments (240/240)**: arm64 API 28/31/33/35 and
x86_64 API 33 at 4096-byte pages, plus Samsung SM-A566B arm64 API 36 at
16384-byte pages, without a native bridge. Only the expected revision changed
in the probe definitions; no fixture, assertion, timeout or output bound was
relaxed. All 24 lowered-limit probes exclude the sentinel from both non-Bun
child APIs while preserving the parent descriptor and restoring the limits.

The [spawn fix report](../../../../../docs/compatibility/2026-09-10-m3-spawn-fd-fix.json)
binds the new two-clean-build runtime pair, exact source/APK/helper hashes,
all 240 observations and cleanup. All 36 forcible lifecycle cases pass at
301-329 ms; all test packages were uninstalled with zero UID processes.
The owned API 33 AVD was shut down, and the pre-existing API 24 AVD was left
running. This is full coverage of these **test-only application probes**, not
the full experimental plugin/Binder contract, a Release APK, stable Android 9
support or native x86_64 16 KiB acceptance.

Patch 8's [native regression suite](../spawn-fd/README.md) additionally checks
FD 70000, lowering both soft and hard limits, bounded failure before exec,
and the exact old implementation as a failing control. Those Linux host tests
do not add Android high-FD or hard-limit-lowering execution evidence.

### Previous lowered-limit failure baseline

The suite expanded to **20 probes**. Two lowered-`RLIMIT_NOFILE` cases exposed a
spawn fallback defect in the unchanged startup-fix revision `1.4.0+c240d6c68`:
native arm64 API 28/31/33/35 each score **18/20 twice**, and the native x86_64
API 33 AVD scores **19/20 twice**, all with 4096-byte pages. The original
180/180 observations still pass, including all 10 startup-CLOEXEC assertions.
Of the 20 new observations, 18 fail and only the two native x86_64 controls pass.
All five device runners correctly exit nonzero. This is not a passing runtime gate.

After opening fd 256, each new case lowers only its Bun process's soft limit
from 32768 to 128; the hard limit remains 32768. The fallback scans only below
the current `sysconf(_SC_OPEN_MAX)`, so both non-Bun toybox children can still
resolve the sentinel's path through fd 256. All 18 failures identify the same sentinel
in both `spawnSync` and asynchronous `spawn`, totaling 36 leaked child-FD
observations. Native x86_64 `close_range` succeeds; forcing a TRAP reproduces
the leak there too. Each case restores the original limit and retains the
parent descriptor unchanged before reporting its verdict.

The [lowered-limit report](../../../../../docs/compatibility/2026-09-10-m3-spawn-nofile.json)
binds the exact sources, test APKs, all 200 bounded outcomes and cleanup. The
builder reverified the existing two-clean-build runtime pair; no new Bun build,
runtime patch or official payload change occurred in this run. All 30 forcible
termination cases still pass at 301-306 ms. Every test package was uninstalled
with zero UID processes remaining, and the owned API 33 AVD was shut down.
The fix described above handles live fds above a lowered soft limit **without
allocating or taking locks in the spawn child**; the startup helper is not a
drop-in replacement. Full Binder and broader native 16 KiB acceptance remain open;
see the [x64 Windows environment guide](../../../../../docs/compatibility/16k-arm64-test-environments.md).

### Previous native ARM64 16 KiB observation

On 2026-09-10 the same unchanged test APK scored **19/20 twice** on Samsung
Remote Test Lab SM-A566B (Android 16 / API 36, native arm64-v8a, 16384-byte
pages, no native bridge). Native `close_range` succeeds and the lowered-native
control passes; only `fd-spawn-lowered-trap` fails, with the known sentinel
leak in both child APIs. Both rounds restore the original limits. All six
forcible lifecycle cases pass at 302-306 ms, and uninstall leaves zero UID
processes. The [16 KiB report](../../../../../docs/compatibility/2026-09-10-m3-native-arm64-16k.json)
retains all 40 observations and the failed verdict. This is the first native
ARM64 16 KiB application evidence for these experimental probes, not a passed
experimental runtime/Binder gate. The official runtime's separate 8/8-twice
Binder result must not be substituted for this 19/20 result.

### Previous startup-fix baseline

Before adding the lowered-limit cases, revision `1.4.0+c240d6c68` passed **18/18 twice on each of
five environments**, totaling 180/180: native arm64 API 28/31/33/35 and native
x86_64 API 33, all with 4096-byte pages. The unchanged same-PID startup assertion
now confirms a retained sentinel with CLOEXEC in all 10 rounds. All 30 forcible
termination cases also pass at 301-305 ms. Every test package was uninstalled
with no UID processes remaining, and the owned API 33 AVD was shut down.
The [startup-fix report](../../../../../docs/compatibility/2026-09-10-m3-startup-cloexec.json)
binds the two-clean-build runtime pair, APKs, sources, helpers and all bounded
results. This remains test-only application evidence, not full plugin Binder
or general Android 9/16 KiB support.

### Previous FD failure baseline

Earlier on 2026-09-10, the suite expanded to 18 probes. The same four native arm64
devices listed below plus `AVD_API_33` (Google `sdk_gphone64_x86_64`, API 33,
native x86_64), all with 4096-byte pages, each scored **17/18 in two rounds**.
The 40 new spawn-native, spawn-trap, blocked-SIGSYS and listener cases passed.
All 10 `fd-startup-trap` cases failed: a same-PID re-exec retained the sentinel
FD but Bun did not set `FD_CLOEXEC` after the trapped startup `close_range`.
The runner correctly exits nonzero; this is not a passing release gate.

The [FD semantics report](../../../../../docs/compatibility/2026-09-10-m3-fd-semantics.json)
binds all 18 source inputs, both APKs and unchanged runtime/helper bytes, and
retains every bounded result, including failures. All 30 SIGTERM-ignoring
lifecycle cases still passed, with 301-319 ms termination-to-exit measurements;
all test packages were uninstalled with no processes left under their UIDs.
The AVD started for this run was shut down without saving a snapshot or wiping
its data. No physical-device serials or local signing secrets are archived.

The previous `1.4.0+778ce669a` startup code ignored the result of
`bun_close_range(4, ~0U, CLOSE_RANGE_CLOEXEC)`; unlike `bun-spawn.cpp`, it did
not call a fallback. Project-owned patch 7 now enumerates actual open fds and
marks them CLOEXEC, or fails startup if it cannot complete that operation;
see the [native regression tests and scope](../startup-cloexec/README.md).
The old failure record remains unchanged. Neither the old failure nor the new
pass establishes an actual production Binder/PFD leak, and official bytes remain unchanged.

### Previous lifecycle baseline

On 2026-09-09, Sony G8441 (API 28), Sony XQ-AT72 (API 31), Redmi 22120RN86C
(API 33) and Xiaomi 23046RP50C (API 35) each passed all 13 probes in two rounds.
All four used native arm64, 4096-byte pages, ordinary application UIDs,
`untrusted_app` SELinux domains and seccomp filter mode 2. Both the instrumentation
parent and the Bun child assert their application execution context.

The timeout, output-limit and new readiness-triggered cancellation fixtures
intentionally ignore SIGTERM. All 24 lifecycle cases observed the handler's
readiness marker, verified the Bun -> supervisor -> instrumentation parent chain
and application UID, then exited with code 137 with both observed PIDs absent.
The supervisor owns termination and reaping; observed PIDs are never signal
targets. Termination-to-supervisor-exit measurements were 301-307 ms. The original
1500 ms timeout, 1024-byte output fixture and 2000 ms reaping gate were not relaxed.
Output readers continue bounded capture/discard until exit instead of closing
before termination. Every successful probe also verifies its workspace removal,
and a final recovery script checks that subsequent execution still works.

The [new device report](../../../../../docs/compatibility/2026-09-09-m3-supervised-application-probe.json)
contains exact APK/runtime/supervisor digests, Git-canonical source fingerprints,
environments, bounded outcomes and UID cleanup results. The
[2026-09-08 failure report](../../../../../docs/compatibility/2026-09-08-m3-application-probe.json)
is preserved unchanged: its old Java termination path passed only 10/12 probes.
The official plugin's separate Binder reproduction/fix is documented in the
[M1 report](../../../../../docs/compatibility/2026-09-08-m1-supervised-termination.json);
it is not a substitute for this patched-runtime result, or vice versa.

Full experimental plugin/Binder execution, other
forced-syscall paths, watch/reload, API 29/30/32 and complete native 16 KiB
acceptance remain open despite the scoped application results above.
That preceding paragraph records the earlier baseline's limits, not the later
Binder/API 29/32 follow-up. The 25-probe suite still lacks API 30 observations;
its application evidence must not be inferred from the separate Binder suite.
Only the immediate Bun child is supervised, not
arbitrary detached descendants; this is not a security sandbox.
`distributionReady` remains false. Nothing here is published as a Release asset.

## FD and SIGSYS fixture design

The FD entries in `probes.json` name only the fixed `fd-probes.mjs` source and seven exact modes.
The builder inlines a constant mode plus canonical UTF-8/LF source into the
APK, rejecting arbitrary paths, mixed source/arguments and oversized assets.
The fixed fixture has a 16 KiB source cap; existing inline fixtures keep their
8 KiB cap. Timeouts, output limits and production execution limits are unchanged.

The fixture uses built-in `bun:ffi` to call libc; it does not install an npm
dependency, package another native helper or invoke a shell:

- Duplicate a private sentinel to a bounded FD in `[256, 512)` without CLOEXEC.
  Observe the raw CLOEXEC result, verify that the FD stays open, then clear its
  flag before testing child isolation. On the x86_64 AVD, the unfiltered call
  succeeds and sets the flag; older tested kernels return ENOSYS or EINVAL.
- Add a thread-local, ABI-checked seccomp BPF filter that traps syscall 436 and
  one invalid `prctl` option. The latter changes from EINVAL to ENOSYS, proving
  that a real TRAP is handled even when `close_range` already returns ENOSYS.
  The report binds the exact ABI-specific filter digest. This adds restrictions
  to the Bun calling thread and inherited children; it does not weaken Android
  policy, change pre-existing sibling threads or affect the supervisor.
- Check the sentinel with a non-Bun `/system/bin/toybox readlink` child through
  both spawn APIs. A positive child stdout-FD control supports Bun's pipe,
  socketpair and memfd implementations; the sentinel must be absent while the
  parent's descriptor and identity remain intact.
- In `lowered-native` and `lowered-trap`, require an original soft limit of at
  least 512, then lower it to 128 while the sentinel remains open. Bind
  `getrlimit(RLIMIT_NOFILE)` and Android `sysconf(_SC_OPEN_MAX)` before, during
  and after; never lower the hard limit. Collect both child results even if
  the first leaks, compare the actual sentinel identity, and restore the exact
  original limits in `finally` before asserting isolation. Setup or restoration
  failure is a failure, never a skipped pass. These modes do not claim blocked
  signal-mask coverage.
- Block SIGSYS on the spawning thread, verify spawnSync child/caller masks,
  then restore the original mask before the asynchronous case. Register and
  remove a JavaScript SIGSYS listener around forced traps, separately checking
  exactly one ordinary user-signal delivery.
- Re-exec the installed read-only Bun at the same PID under the filter and
  inspect the inherited FD's startup flag. It must remain open **and** acquire
  CLOEXEC. Returning ENOSYS without that marking fails the test.

Java accepts exactly one bounded JSON evidence line, and the host validator
checks mode, ABI, positive controls, syscall results, limits/restoration, masks, flags and stream
consistency. A `passed` boolean alone is insufficient. This is evidence for
these sentinel paths, not for FD values at/above the existing 65536 spawn-loop
ceiling, `CLOSE_RANGE_UNSHARE`, every thread, blocked asynchronous spawn, all
signal defaults or detached descendants. The distinction between marking a
descriptor and immediately closing it follows the
[Linux close_range contract](https://man7.org/linux/man-pages/man2/close_range.2.html).

## Fixed hard-limit fixture

`hard-limit-probes.mjs` is a separate immutable source, not a change to the
seven original FD modes above. The builder accepts only `startup-native`,
`startup-trap`, `spawn-native`, and `spawn-trap`, binding each ID, mode, asset
name and constant source header. Only the new assets have a 12 KiB source cap;
the original 25 definitions, 128 KiB JSON cap, 15-second default timeout,
16 KiB output budget and bounded semantic record are unchanged.

Each disposable supervised Bun process opens a non-CLOEXEC sentinel FD in
`[256,512)`, requires original limits at least 512, then lowers both soft and
hard limits to 128. Restoration must fail with EPERM. Startup re-execs the
installed read-only Bun at the same PID/UID, retaining the sentinel and setting
CLOEXEC; sync and async non-Bun toybox children each prove stdout-FD visibility,
sentinel absence and inherited limits of 128/128. Parent FD identity/flags and
limits remain correct. The Java instrumentation and supervisor independently
retain their original limits. No system setting, hidden Android API, extra
native helper, dependency or shell is used. See the
[Linux resource-limit contract](https://man7.org/linux/man-pages/man2/getrlimit.2.html).

TRAP modes add only a fixed ABI-checked calling-thread filter for syscall 436
and its prctl marker. Its bytes and all semantic fields are independently
validated; native control results remain success, ENOSYS or EINVAL as actually
observed, not a claim that native close_range is universally available.
These hard-limit modes do not cover FD 70000, UNSHARE, blocked asynchronous SIGSYS,
all threads or detached descendants. The original soft-only modes still restore
their limits; irreversible hard lowering occurs only in these new child processes.

## Fixed blocked-async fixture

`async-signal-probes.mjs` is separate from all historical fixtures. Only fixed
`native` and `trap` assets are accepted, each capped at 12 KiB, with unchanged
128 KiB probe JSON, 15-second/16 KiB process budgets and a 2048-byte semantic
record. No dependencies, extra native helper, shell or user project is used.

Each fresh Bun process opens a non-CLOEXEC FD in `[256,512)`, performs its raw
close_range control while unblocked, then clears any CLOEXEC mark. TRAP mode
installs the same ABI-checked close_range/prctl-marker policy as the hard-limit
fixture, and verifies its hash and ENOSYS before blocking. It does not synchronize
existing threads or deliberately trap pidfd_open. Platform filters still apply.

The main thread adds only SIGSYS to its mask, then asynchronously launches three
short-lived toybox children: stdout FD positive control, sentinel FD negative
control, and `/proc/self/status` observation. There is no earlier spawn/cache
warmup. Calling-thread TID and the exact mask are checked before spawn, immediately
after it returns and after streams/exit complete. The status child must retain
the exact blocked mask, expected parent and application UID; each observed child
must be gone after awaiting exit. Each child has 1500 ms and 8192 combined output
bytes, drained concurrently. Only after all children exit is the original mask
restored; parent sentinel identity/flags and post-restore TRAP marker are checked.
The FD and child-mask checks concern separate children, not one combined program.

The independent validator rejects early unblocking, changed TIDs/masks, missing
children, drifted filter bytes and false cleanup. The historical nine-patch API 28 runtime died before
emitting that proof; exit 159 suggests SIGSYS by the supervisor's convention,
but does not identify `si_syscall`. Do not warm the waiter cache or unblock early
to make this gate pass. General blocked-syscall semantics, all threads,
watch/reload and detached descendants remain outside this bounded fixture.

## Build outside the repository

The fixed `openat2-confinement` case compares 12 raw loopback HTTP paths in
native and post-TRAP phases. Its new source is an independent 8 KiB-capped
APK asset, with an exact ID/mode/name binding; it does not duplicate source
into the nearly-full, still 128 KiB-capped JSON asset. Every original 23 entry
remains unchanged. The verifier preserves complete failed evidence for
inspection but never accepts a confinement failure as success. The source,
verifier and Java asset dispatch are included in the current build receipt.

The three additional `syscall-probes.mjs` modes are `raw-controls`, `copy-range`
and `pidfd`. They use a separate bounded `SYSCALL_PROBE_RESULT` record and
independently checked ABI-specific filter hashes. Raw controls never imply
high-level semantic coverage; copy/wait require an EIO error control before
TRAP fallback can be claimed. Old-kernel/policy gates are explicit non-coverage,
not skipped successes. Both source files and the independent syscall verifier
are bound in the receipt. See the [fixture design and source-path review](../../../../../docs/compatibility/2026-09-10-m3-syscall-fallbacks.md).

Use Node.js, JDK 21, Android platform 36 and installed Android build tools
(validated locally with 37.0.0). JDK paths are explicit so an older Java on PATH
cannot silently compile or sign the test package. Both independent clean-build
outputs are mandatory; Windows can read them from a WSL ext4 share.

```powershell
node tools/bun-runtime/experimental/api28/app-probe/build-probe.mjs `
  --sdk <absolute-android-sdk> `
  --jdk <absolute-jdk-21> `
  --build-tools 37.0.0 `
  --arm64 <absolute-run-1/bun-arm64-v8a> `
  --x86 <absolute-run-1/bun-x86_64> `
  --repeat-arm64 <absolute-run-2/bun-arm64-v8a> `
  --repeat-x86 <absolute-run-2/bun-x86_64> `
  --output-directory <absolute-new-external-directory>
```

The parent directory must exist; the output directory must not. The builder
refuses repository/ancestor outputs, existing outputs, symlink input files,
identical primary/repeat input paths, mismatched hashes or ELF evidence.
Windows mount permission bits are not treated as Unix-mode evidence; the exact
locked bytes are rechecked and installed executable permissions are tested on
Android. No input binary is copied into a tracked production payload directory.

The builder also verifies and packages the checked-in, separately locked
`libbun_supervisor.so` for each ABI. Both Bun and its supervisor execute only
from read-only `nativeLibraryDir`; the external patched Bun inputs and the
official Bun/supervisor payloads in Git are not modified. Reproducing the helper
itself uses the [fixed NDK 29 recipe](../../../supervisor/README.md); this does not
change the patched Bun's independent NDK 27 toolchain.

`javac`, D8, AAPT2, the JDK jar utility, zipalign and apksigner create two
single-ABI APKs and schema-2 `probe-build.json`. The receipt binds the shared Java
source, supervisor source/toolchain lock, both helpers, probe sources and runtime
evidence using UTF-8/LF source bytes. Schema 1 is rejected; rebuild old probes.
Each build uses an ephemeral local RSA
test certificate with APK Signature Scheme v2. The temporary key and build
staging are removed after building; no release signing configuration is read.
The five bundled Bun/WebKit license texts and the project's MPL-2.0 license
for the first-party wrapper/helper accompany the probe. Build results
are not claimed to be byte-reproducible APKs: the *runtime* inputs are reproducible,
while the temporary certificate and APK metadata can differ between invocations.

## Run on an explicitly selected device

```powershell
node tools/bun-runtime/experimental/api28/app-probe/run-probe.mjs `
  --adb <absolute-adb-executable> `
  --serial <explicit-device-serial> `
  --abi arm64-v8a `
  --required-api 28 `
  --required-page-size 4096 `
  --apk-directory <absolute-builder-output-directory> `
  --output-directory <absolute-new-external-report-directory> `
  --sdk <absolute-android-sdk> `
  --jdk <absolute-jdk-21> `
  --build-tools 37.0.0
```

The runner rechecks current source fingerprints, APK signature/digests, the
actual packaged Manifest, native entries and ZIP alignment before installation.
It refuses an already-installed probe package rather than replacing it. It also
rejects ABI translation as native evidence and refuses the known-incompatible
x86_64 runtime with 16 KiB pages. The instrumented process asserts the requested
API/page size, native kernel architecture, application UID/context, exact installed
APK SHA-256 and both executable bytes/permissions in read-only `nativeLibraryDir`.

Only fixed test fixtures run, via direct argument vectors. JavaScript and
TypeScript use `bun run --no-install <private-source>`; only the two metadata
probes use `--version` or `--revision`. The executable never runs from a writable
application directory. Scripts, files and loopback HTTP are local test data.
No remote dependency installation or network service is needed.

Each process uses the shared wrapper's private control pipe: EOF requests
SIGTERM, 200 ms grace, SIGKILL if necessary, and reaping of the immediate child.
Bun stdin is already EOF and does not inherit that control pipe. Closing the
wrapper's script stdin is not a cancellation request.

Each process has a bounded timeout and combined stdout/stderr budget; reports
retain only bounded stream summaries. The runner force-stops the exact probe
package between rounds, verifies both its named process and every process with
its exact installed UID are absent, repeats the suite, then
uninstalls only the package installed by this invocation. Reports and raw bounded
instrumentation output remain in the requested external report directory,
including on failed tests. The final cleanup also checks the exact UID for
residual children after uninstall. If device connectivity is lost, inspect `cleanupError`
and remove only this exact test package after reconnecting.

## Development checks

Archive newly completed, source-matched runs with:

```powershell
node tools/bun-runtime/experimental/api28/app-probe/archive-probe.mjs `
  docs/compatibility/<new-report>.json <first-run-directory> <second-run-directory>
```

The archiver requires both raw instrumentation files and `probe-result.json`.
It revalidates the complete current 31 observations per round, exact installed hashes,
the current build receipt, every force-stop/uninstall/UID cleanup record and
the unchanged environment identity across rounds. Repeated images, different
APK builds, stale source bindings, failures or a raw/JSON mismatch are rejected.
The JSON archive retains raw text and its digests; exclusive creation refuses
existing targets. It archives new evidence, not retrospective source rebinding
of historical APKs. Native builds and test fixtures are not changed by archiving.

```powershell
node --test tools/bun-runtime/experimental/api28/app-probe/probe-common.test.mjs
node --test tools/bun-runtime/experimental/api28/app-probe/archive-probe.test.mjs
node --test tools/bun-runtime/experimental/api28/app-probe/hard-limit-evidence.test.mjs
node --test tools/bun-runtime/experimental/api28/app-probe/async-signal-evidence.test.mjs
node --test tools/bun-runtime/experimental/api28/app-probe/archive-async-signal-failure.test.mjs
```

For the reproduced API 28 failure only, use the separate failure archiver:

```powershell
node tools/bun-runtime/experimental/api28/app-probe/archive-async-signal-failure.mjs `
  docs/compatibility/<new-failure-report>.json <failed-run-directory>
```

It requires both failed instrumentation codes, all four unmodified exit-159
results, the original 29 passing observations per round, exact source/payload
bindings and full cleanup. Other regressions are rejected. Its output remains
`passed=false` and cannot enter the passing archiver. It preserves failures,
not an acceptance exception or a confirmed syscall diagnosis.

Build CI runs these fail-closed validator tests and compiles the Java runner
and shared process wrapper
against Android platform 36. CI does not have the external patched binaries and
does not claim to run this device suite. A future distributable experimental
plugin still needs its own reviewed identity, full Binder matrix and the matching
same-Release corresponding-source assets through the existing draft-first flow.
