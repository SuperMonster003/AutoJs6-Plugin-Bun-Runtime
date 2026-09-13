# Android epoll pending-signal repair

The twelfth patch repairs the wait-stage defect independently recorded in the
[eleven-patch failed gate and read-only diagnosis](2026-09-13-m3-pending-wait.md).
The old source, native build evidence, failed device rounds and observer records
remain unchanged. Their reproducibility result cannot accept this new source.

## Source and behavior

- Parent: `946f082ab8ede2b7cbd6ba9fddb90463a94f0330`.
- New head: `06e518f73b4fccc6c3ffb17412ea166bf886bed0`.
- New tree: `1eb8d5ea945001f018bdf14bd00c261d40b02573`.
- Expected new revision: `1.4.0+06e518f73`.
- Only changed native file: `packages/bun-usockets/src/eventing/epoll_kqueue.c`.
- Complete new file: 43420 bytes, SHA-256
  `1bca3917f08b3b161d975c9025d59ef1c0644af08830d2ac87742b657f25e68d`.
- Patch 12: 45355 bytes, SHA-256
  `c15c77d06022db5d414c674dea2f530098731b43111515887076fde70a11adb6`,
  stable patch ID `6b482c8bd6b36ad36de24a8af1c70653611644d1`.

Android now passes NULL to `epoll_pwait`, retaining the caller's existing signal
mask throughout the wait. It does not change or query the mask, clear pending
signals, unblock SIGSYS, or warm any waiter cache. An empty temporary mask could
deliver a pending signal even though the kernel restores the caller's mask when
the wait returns. The kernel's [epoll implementation](https://github.com/torvalds/linux/blob/master/fs/eventpoll.c)
applies a supplied temporary mask around the wait, and
[set_user_sigmask](https://github.com/torvalds/linux/blob/v6.12/kernel/signal.c#L2960)
returns without changing the mask for NULL. The host controls below test the
observed signal behavior directly.

The exact parent already disables `epoll_pwait2` unconditionally for Android in
`src/analytics/lib.rs:490`. `us_create_loop` consumes that result. Patch 12 also
excludes the optional syscall at the C call site, including forced unknown or
available capability states. There is no unsafe blocked-SIGSYS probe and no
write to global availability state. This is preservation of the existing Android
policy, not new `epoll_pwait2` compatibility or evidence of Android first entry.

Non-Android Linux retains its original empty temporary mask, both wait paths,
raw-negative versus libc errno conventions and sticky fallback errors. Deadline,
EINTR retry, millisecond rounding and saturation calculations are unchanged.
The patch adds 14 lines and removes two. The bundled uSockets file retains
Apache-2.0 licensing; Bun's repository remains MIT. No dependency is added.

## Completed source and host controls

The complete twelve-patch series replays to the exact head/tree. The five-patch
upstream prefix remains byte-equivalent and all 28 locked source-definition
blobs match. The original eleven patch files are unchanged.

GCC 13 and Clang 21 each compile the complete original/candidate production
function and pass 45 bounded executions:

| Scope | Executions per compiler | Required outcome |
|---|---:|---|
| Android candidate, 17 fixed modes | 17 | Pending SIGSYS/second signal and complete caller mask retained; explicit later restoration delivers each once |
| Original Android failure controls | 2 | Exact pending-preservation assertion fails with controlled exit 90 |
| Linux original/candidate, 13 paired modes | 26 | Same signal policy, real wait/EINTR/event behavior and controlled error/deadline results |

The [host fixture](../../tools/bun-runtime/experimental/api28/pending-wait/README.md)
verifies complete patch bytes, file Git blobs and line counts before extracting
the production function. Real tests include eventfd wakeup, a second thread,
finite/infinite/zero waits and a test-only TRAP filter on the excluded syscall.
Injected raw errors and clock advances are explicitly synthetic. These are
finite Linux host observations, not Android kernel equivalence, cgroup,
watch/reload, OEM, soak or Release acceptance. The initial host compilation
failed before any test because its wrapper preceded the source's syscall-number
definition; moving only that wrapper below the include fixed the test harness.
The earlier patch-11 complete spawn regression also passes after binding its
extractor to fixed patch index 10.

## Native and device gates

Two fresh independent clean checkouts each completed both ABIs. The
[schema-3 archive](2026-09-13-m2-pending-wait-runtime-evidence.json) binds actual driver exits, clean before/after heads and
trees, sixteen unchanged recipes, complete logs and final Ninja edges. The
collector and complete four-ELF audit both exited zero. Each ABI is byte-identical
across the two runs.

- Run 1: 2026-09-13T08:19:41Z through 2026-09-13T08:41:54Z, actual exit 0.
- Run 2: 2026-09-13T08:41:55Z through 2026-09-13T09:01:35Z, actual exit 0.

| ABI | Bytes | SHA-256, identical in both runs |
|---|---:|---|
| arm64-v8a | 87923328 | `86d1b4d0fd74591655bc55e55f90ec75c7d3a0aba2116200be419ae626ed53d6` |
| x86_64 | 90449752 | `f44f4197def111f8e753f88bc2b9b3b13d653e0a55e26851b32e1f45993628b8` |

The fixed offline container reuses the exact locked upstream Android
WebKit/JSC/ICU bundle; no new builds of those libraries are claimed. This is
reproducibility/static acceptance. New-source Android acceptance remains separate.
`runtimeProduced=true` and `distributionReady=false`.

The new-source APKs now pass the unchanged 33-probe application suite and
complete eight-test production Binder suite twice in five native 4 KiB
environments. All fifteen existing fixture/validator/Java inputs, the complete
probe validator, definitions and budgets stay protected; only the expected
revision changes. The accepted APKs were built at clean project commit
`bb61b9c225524fb0b1527501234945e32924afdb`: 30 probe inputs and 81 Binder inputs
are bound. Later documentation builds do not replace these tested APK snapshots.

## New-source device results

The [probe archive](2026-09-13-m3-pending-wait-probes.json) and
[Binder archive](2026-09-13-m3-pending-wait-binder.json) retain separate raw
rounds, source/APK/runtime receipts and zero-execution-UID cleanup.

| Device | API | Native ABI | Page bytes | Two probe rounds | Two Binder rounds |
|---|---:|---|---:|---:|---:|
| Sony G8441 | 28 | arm64-v8a | 4096 | 66/66 | 16/16 |
| Sony XQ-AT72 | 31 | arm64-v8a | 4096 | 66/66 | 16/16 |
| Redmi 22120RN86C | 33 | arm64-v8a | 4096 | 66/66 | 16/16 |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 4096 | 66/66 | 16/16 |
| sdk_gphone64_x86_64 AVD | 33 | x86_64 | 4096 | 66/66 | 16/16 |
| Total for this source and batch | | | | 330/330 | 80/80 |

All twenty pending-async modes and sixty associated child observations pass.
The signal remains pending, with zero JavaScript delivery, through all ten
checks around three asynchronous child launches/waits; explicit caller mask
restoration then delivers it once on the caller thread. The previous native/TRAP
wait-stage failures on Sony API 28/31 are resolved for this fixed suite.
Twenty blocked-async modes and sixty child observations, forty hard-limit cases,
forty hard-limit spawn API observations, twenty soft-limit cases and thirty
forcible lifecycle cases also pass; forcible termination takes 301-308 ms.
The Binder archive separately retains fifty lifecycle observations.

Sony API 28 required three complete attempts with identical APKs, compiled
inputs, native bytes and signatures. The [first attempt](2026-09-13-m3-pending-wait-binder-startup-failure.json)
and [first retry](2026-09-13-m3-pending-wait-binder-retry-failure.json) each pass
8/8 once, then fail before any second-round test. Owned process events bind
PID/TID/UID 29359/29366/10762 and 29997/30004/10764 to pre-initialized ART/ADB-JDWP
SIGSEGV/SEGV_MAPERR stacks in libart/libadbconnection. Those entire attempts are
excluded. The third attempt passes both rounds without a device, mask, fixture,
APK or native-byte workaround; finite later success does not erase the startup
instability. This is direct platform-process crash evidence, not a Bun execution
stack or SIGSYS diagnosis.

The [checkpoint supplement](2026-09-13-m3-pending-wait-checkpoint.json) preserves
the local post-build snapshot-count error (the test-only module intentionally
builds three APKs, no universal), corrected without rebuilding. Sony XQ-DQ72
disconnected before probe preflight: no output directory, installation or test
was started. The available Redmi supplies the separately identified API 33 slot.
All test packages are uninstalled and execution UIDs have zero processes,
including both failed API 28 attempts. Only the owned API 33 AVD is closed;
no pre-existing AVD is operated, and no cause is inferred for inventory changes.

The 17:05-17:15 Asia/Shanghai Samsung window remained offline at localhost:50781,
so no Samsung package or test was run. New-source ARM64 API 32/4 KiB and API 36
with native hardware 16 KiB still require new evidence; earlier ten-patch results
are not transferred. Official API 33+, payloads, supervisor, production service
and AARs are unchanged. The ten-patch large-page JSC candidate is not rebased here.
Broader syscall/API/FD/OEM, watch/reload, cgroup/clone3, Android FD 70000/UNSHARE,
pressure/performance and signed paired APK/source Release gates remain open.
`distributionReady=false`.

## Repository validation at the native checkpoint

The full Node tool suite passes 229/229, including rejection of all prior runtime
evidence for the new source and preservation of the complete 33-probe definitions,
fifteen fixture/validator/Java inputs and existing probe validator. The Python
suite passes 38/38. Ten-language Markdown generation/check covers 36 artifacts;
the separately generated matrix registers 74 reports and retains 168 device rows.
The new native-build report adds no device observations. All 73 historical JSON
archives, official native payloads, supervisor, production Java and JSC candidate
files remain unchanged.

The four production Gradle verification tasks complete with actual exit zero:
unit tests (21 stored passing tests, task up to date), Debug APK integrity,
Android-test APK assembly and lint (zero errors, 44 existing warnings). The three
Debug APKs pass their payload and 16 KiB ZIP gates. The IDE build tool's separate
60-second timeout remains recorded as a timeout; the corresponding two owned
Gradle command intervals later finish successfully and are retained independently.
No IDE tool success is inferred from those command results.

After device archival and final localization, the complete Node suite again
passes 229/229, Python 38/38, Markdown 10 languages/36 artifacts and the matrix
79 reports/180 rows. The four production Gradle checks again exit zero (17 s,
96 tasks: 49 executed and 47 up to date). All 73 original JSON archives and the
committed twelve-patch native evidence remain unchanged. The accepted experimental
APK snapshots stay bound to the pre-documentation source commit and receipts.
