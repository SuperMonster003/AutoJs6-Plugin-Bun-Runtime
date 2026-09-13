# Bounded JSC pressure acceptance

This test-only source set is enabled only by the isolated Binder module's
`experimentalJscCandidateFile` option. It never changes the production service,
the original eight instrumentation methods, runtime bytes or Release capability.
The fixed offline asset runs seven independent Bun processes through the actual
`runScript` Binder method, with the real permission, supervisor and private job
cleanup. No dependency install, network access or writable executable is needed.

## Scope and bounds

| Mode | Required evidence per round |
|---|---|
| `jit-off` | `BUN_JSC_useJIT=false`; at least three distinct LLInt sampled traces, no higher-tier samples |
| `baseline` | DFG/FTL disabled; at least three distinct Baseline sampled traces, no DFG/FTL samples |
| `dfg` | `noFTL(hotFunction)`; actual DFG frames and a positive non-sentinel compile count, no FTL frames |
| `ftl` | Default JIT options; actual FTL frames and a positive non-sentinel compile count |
| `gc` | 24 allocation rounds, 24 explicit Eden and 25 full collections; check retained objects/buffers, bounded JSC heap |
| `wasm` | 32 fixed add modules, 2,097,152 checked calls, 63 memory grows to 4 MiB, detached old buffers, preserved/zeroed pages, maximum rejection |
| `workers` | Four waves of four workers; independent arithmetic, positive optimization counts, 1 MiB transfers and **normal exit code 0 observed before the next wave** |

JIT results are checked against independent BigInt modular arithmetic for 16
seeds. Each capture lasts at most 300 ms, at most four captures/400,128 calls;
each call has 16,384 iterations. Retain three exact target-tier frames and their
distinct trace timestamps, as well as the aggregate observed tier counts.
WebKit's `numberOfDFGCompiles` value `1000000` when optimizing JIT is disabled is
an intentional sentinel, not a million actual compilations. No optimization
threshold or concurrent-JIT option is lowered for the DFG/FTL cases.

The source cap is 16 KiB. Each Binder job has a 25-second timeout and 64 KiB output
cap; its measured work phase must be below 20 seconds. Worker deadlines are eight
seconds and termination is awaited even on failure. BigInt reference setup is
outside the recorded work-phase duration but inside the Binder timeout. These
are finite correctness/resource gates, not performance benchmarks. Wasm tier
sampling, exhaustive compiler coverage and long-running soak tests are not claimed.

## Page-size measurement

The runner checks `getconf PAGE_SIZE`, Android instrumentation checks
`Os.sysconf(_SC_PAGESIZE)`, and every Bun process independently reads its own ELF
`AT_PAGESZ` from bounded `/proc/self/auxv`. All three must agree. `smaps`
`KernelPageSize` is retained separately and is 4096 in both tested x86 images.
The 16 KiB x86 Android environment emulates the userspace page ABI; it is not a
16 KiB ARM64 hardware/kernel environment. This distinction follows the
[AOSP x86 page-size emulation documentation](https://source.android.com/docs/core/architecture/16kb-page-size/getting-started-cf-x86-64-pgagnostic).
Verified x86 ELF execution does not use the AVD's optional ARM native bridge.

## Replay

Build the [isolated JSC Binder APKs](../../api28/binder/README.md) with the locked
candidate first. Keep the two native build directories and JSC candidate explicit;
do not rebuild native bytes just to run this fixture. Then run each page size:

```powershell
node tools/bun-runtime/experimental/api28/binder/run-binder.mjs `
  --sdk <absolute-android-sdk> --serial <explicit-x86-adb-serial> `
  --abi x86_64 --api 36 --pages 16384 --profile jsc16k --suite jsc-pressure `
  --output <new-16k-run-directory>
```

Repeat with `--pages 4096` and its own device/output directory. The runner performs
two process-restarted rounds, checks local/installed APK hashes and signing, and
removes only newly installed packages with zero remaining UID processes. A failed
installation attempt is owned before invoking ADB, including an installation that
finishes after the client timeout. Cleanup failure cannot pass the gate.

Run the same command **without** `--suite jsc-pressure` on both devices to repeat
the unchanged eight-test Binder suite. Do not combine its counts with pressure
modes: pressure has one JUnit method with seven scripts per round.

```powershell
node --test tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/pressure-common.test.mjs
node tools/bun-runtime/experimental/webkit-x86_64-16k/pressure/archive-pressure.mjs `
  acceptance docs/compatibility/<new-pressure-report>.json <4k-run-directory> <16k-run-directory>
```

Archive before changing compiled inputs. The archive requires two complete native
API 36 environments at opposite page sizes with identical main/test APKs, exact
fixture/source/runtime bindings, signatures, raw transcripts and cleanup. Missing,
extra, duplicate, wrong-tier or partial observations fail closed. Preliminary
runs can be retained separately with `diagnostics` in place of `acceptance`; their
original outcomes are preserved and never counted in final acceptance.

The [2026-09-13 twelve-patch rebase](../../../../../docs/compatibility/2026-09-13-m5-twelve-patch-jsc.md)
passes the same seven-mode fixture twice per page-size environment, 28/28 modes,
including actual LLInt/Baseline/DFG/FTL samples and 64 normal worker exits. The
same APK pair binds 83 inputs to `0210e82` and separately passes the original
Binder suite 32/32. Its initial 16 KiB Binder low-memory service death is preserved
outside acceptance; the full identical-APK retry passes. All pressure sources,
validators and budgets remain unchanged. Both package UIDs are checked after
uninstall and only owned AVDs are stopped; baseline counts and Release stay separate.

The historical [2026-09-13 ten-patch rebase](../../../../../docs/compatibility/2026-09-13-m5-ten-patch-jsc.md)
passes this unchanged fixture with the new separately built `a237dc8c...7f8dcd5`
candidate: 28/28 modes and a separate 32/32 original Binder regression. The same
APK pair binds 77 inputs to project commit `5738129`; original assets, semantic
validators and budgets are unchanged. The archive selects the exact source
lineage and rejects borrowing historical candidate bytes for the new source.

The historical [2026-09-12 evidence](../../../../../docs/compatibility/2026-09-12-m5-x86-jsc-pressure.md)
records 28/28 pressure modes and a separate 32/32 original Binder regression.
Official Android 13 support, the original x86 page guard and all native locks are
unchanged. `distributionReady=false`; no Release/source assets are published.
