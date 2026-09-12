# M5: x86_64 JSC bounded pressure acceptance

Date: 2026-09-12. The unchanged large-page JSC candidate passes all seven fixed
pressure modes twice in both API 36 x86 environments: **28/28 modes**, contained
in four successful JUnit runs. The exact same main/test APKs separately pass two
rounds of the unchanged eight-test Binder suite on each device: **32/32 tests**.
These are test-only Debug APKs, not final Release acceptance or a performance claim.

## Environments and results

| AVD / model | API / native ABI | Application page ABI | Kernel mappings | Pressure rounds | Original Binder rounds |
|---|---|---|---|---|---|
| `bun-jsc-pressure-4k-20260912` / `sdk_gphone64_x86_64` | 36 / x86_64 | 4096 bytes | 4096 bytes | 7/7 + 7/7 | 8/8 + 8/8 |
| `bun-jsc-pressure-16k-20260912` / `sdk_gphone16k_x86_64` | 36 / x86_64 | 16384 bytes, emulated | 4096 bytes | 7/7 + 7/7 | 8/8 + 8/8 |

The first image is Android 36.1 Google APIs, fingerprint build 14574095, kernel
`6.12.38-android16-5-gbb9513914902-ab13996879`; the second is Android 36 Google APIs
ps16k, build 13894323, kernel `6.6.66-android15-8-gd0c43a640eab-ab13812146`.
The exact fingerprints, serials, installed UIDs and observations are in the
[pressure JSON](2026-09-12-m5-x86-jsc-pressure.json) and the separate
[Binder JSON](2026-09-12-m5-x86-jsc-pressure-binder.json).

The x86 ELF runs natively, despite the images offering `libndk_translation.so`
for other ABIs. However, x86 Android's **16 KiB userspace ABI is simulated over
4 KiB mappings**, not physical 16 KiB ARM64 pages. Each new script cross-checks
ELF `AT_PAGESZ` against instrumentation `Os.sysconf(_SC_PAGESIZE)` and the runner's
`getconf PAGE_SIZE`; its `smaps` measurement is a separate field. AOSP documents
this [x86 emulation mechanism](https://source.android.com/docs/core/architecture/16kb-page-size/getting-started-cf-x86-64-pgagnostic),
and Android recommends [runtime page-size queries](https://developer.android.com/guide/practices/page-sizes#fix-code).
Earlier reports remain unchanged; their x86 16 KiB wording must not be read as
ARM64 hardware-page evidence. Existing Samsung ARM64 evidence stays separate.

## What was exercised

The [new test-only fixture and replay instructions](../../tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/README.md)
define the seven modes. No original Binder method or fixed 25-probe definition
was modified. All scripts use the actual production service and supervisor,
`bun run --no-install`, one immutable source descriptor, bounded streaming output
and the original private workspace cleanup.

| Sampled tier | 4 KiB round 1 / 2 | 16 KiB userspace round 1 / 2 |
|---|---|---|
| LLInt, JIT disabled | 20 / 21 | 13 / 20 |
| Baseline, DFG/FTL disabled | 19 / 24 | 23 / 20 |
| DFG, hot function FTL disabled | 20 / 23 | 7 / 5 |
| FTL, default JIT configuration | 17 / 23 | 9 / 7 |

These counts are actual sampled frames of `jscPressureHotLoop`, not build flags.
Three exact frames with distinct trace timestamps are retained per tier case
(48 witnesses total). Checked arithmetic matches an independent 16-seed BigInt
reference. DFG/FTL compile counters are positive and non-sentinel. The value
`1000000` in JIT-off/Baseline controls is WebKit's disabled-optimizer sentinel,
not an observed compilation count. JIT thresholds and concurrency are unchanged.

Across the four accepted rounds, the GC mode performs 100 explicit full and 96
Eden collections, checking surviving objects and typed buffers under a 128 MiB
JSC-heap bound. Wasm performs 128 module compilations/instantiations, 8,388,608
checked additions and 252 memory grows; old buffers detach, existing data survives,
new pages are zeroed and the maximum is enforced. This is not per-BBQ/OMG tier
sampling or an exhaustive Wasm test.

Workers run in four waves of four per round. All **64 workers** return correct
arithmetic and positive optimization counts, transfer an aggregate 64 MiB and
emit normal exit code 0 before subsequent waves begin. Each worker additionally
calls full GC once; these 64 calls are separate from the main-thread GC counts.
All termination promises are awaited in failure cleanup too.

The asset is 10,049 bytes, below its 16 KiB cap. Binder bounds are 25 seconds and
64 KiB output per script; the measured work phase is below 20 seconds, worker
deadlines eight seconds. Observed work phases are 179-1,863 ms, excluding the
initial BigInt reference calculation but inside the Binder timeout. These are
correctness bounds, not controlled performance comparisons between different
images/kernels or proof of long-running stability.

## Byte and source bindings

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| Locked x86 Bun/JSC candidate | 90,609,480 | `704cc15634da42bbea46cbced53a4e3fd719ed9f88ce78bb975ee89113963e38` |
| Test-only main APK | 42,827,323 | `1625d9d34706f2a4bd8e0787cdf343965695d3a2eb6868feb6cdbf69e85a54fc` |
| Instrumentation APK | 2,358,324 | `61b59e07d5f98489b689d72a04df0dc15d51b0052ee2838e1e413f4fcd23656f` |
| Fixed pressure source | 10,049 | `35ad7c4f0ca1bf75ba1b925481c6e0b5b71c92ab5b47fb24ec782f030983921d` |

APK v2 signatures match; both installed APK hashes match their local inputs.
The unchanged Binder suite additionally verifies extracted native payloads.
Embedded build receipts bind the actual plugin/test sources and fixed native
candidate; later generated-documentation APKs are not substituted for tested bytes.
The retained JSON contains raw instrumentation and independently checked parsed
output, rather than only a summary `passed=true` flag.

The source audit used Bun nine-patch head
`7b9ac266888abda7ee6ec0b8ac11a74236420030` and WebKit
`0f966e81b78c84bb23213e391bc679c4ef83e56b`. Bun's `BunJSCModule.h`,
`ZigGlobalObject.cpp` and `worker_threads.ts` are unchanged from the locked upstream
Bun base `34cbb9a40b4bd1bd767d134a7065e66c2432a676`: profile exports,
`BUN_JSC_` option application and awaited worker termination were checked directly.
WebKit's `TestRunnerUtils.cpp` establishes sentinel semantics, and
`SamplingProfiler.cpp` establishes frame categories/timestamps. The two independent
native clean builds were completed previously and are not newly claimed here.

## Preliminary failures and cleanup

[Four preliminary receipts](2026-09-12-jsc-pressure-preliminary-diagnostics.json)
are retained with their original outcomes, outside acceptance counts:

1. The first 4 KiB run completed seven scripts in both rounds but host validation
   rejected `/data/data`, a canonical alias of `/data/user/0`. The validator now
   permits only these exact private-package spellings, retaining immediate-child
   and device-side canonical-parent/nonexistence checks.
2. The first 16 KiB run timed out before instrumentation. A later read-only check
   found only the main APK installed (UID 10213), matching local SHA-256
   `709cb75da7ec301bf41d49a0d508cc282452b66525ada59cc912e91fa528ee0c`.
   It was force-stopped/uninstalled; package lookup and exact-UID process checks
   returned empty. The failed receipt is not retroactively marked clean. The
   runner now owns installation attempts before invoking ADB and preserves
   bounded timeout command diagnostics.
3. The next 4 KiB control passed 14/14 using the earlier smaps-only fixture; it is
   retained as preliminary success, not counted against the final changed fixture.
4. The next 16 KiB run failed both rounds because that fixture incorrectly treated
   kernel mapping size 4096 as the application page ABI 16384. One immediate
   post-force-stop check still saw a UID process; final uninstall recorded zero.
   This failed cleanup checkpoint remains failed. The final fixture records both
   measurements, without changing JIT workload, resource limits or native bytes.

All accepted pressure and Binder runs uninstalled both test packages and recorded
zero remaining UID processes. Only the two AVDs created this session (ports 5560
and 5562) were shut down. The pre-existing API 27 AVD at 5554 and an externally
started AVD at 5580 were not managed or shut down; physical devices were not used.
AVD definitions remain available for replay.

## Remaining boundaries

This closes the fixed offline seven-mode pressure gate, not all compiler paths,
long-duration stress, broad Wasm/CLI support, syscall/SIGSYS/FD/OEM coverage or
performance. ARM64 API 32 remains unavailable. The new x86 fixture is not a new
Samsung or native ARM64 16 KiB test. Official Bun and the original nine-patch
locks, Android 13 minimum, production capabilities and x86 page guard are unchanged.
`distributionReady=false`; signed Release APK and matching corresponding-source
publication gates remain open. No release assets or remote repository state were
changed this session.
