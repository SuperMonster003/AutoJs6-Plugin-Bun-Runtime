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

The next acceptance step is the unchanged 33-probe application suite and complete
eight-test production Binder suite on new-source APKs. All fifteen existing
fixture/validator/Java inputs, the complete probe validator, definitions and
budgets stay protected; only the expected revision may change. Samsung ARM64
API 32/4 KiB and API 36/native 16 KiB require new evidence. Official API 33+,
payloads, supervisor, production service and AARs are unchanged. The ten-patch
large-page JSC candidate is a separate historical source and is not rebased here.

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
