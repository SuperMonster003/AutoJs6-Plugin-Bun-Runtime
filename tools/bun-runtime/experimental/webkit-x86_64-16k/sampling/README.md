# Bounded DFG sampling diagnostics

This separate, opt-in diagnostic investigates the original thirteen-patch
[two-sample failure](../../../../../docs/compatibility/2026-09-14-m5-thirteen-patch-jsc-pressure-sampling-failure.json).
It does not modify or replace the original seven-mode pressure asset, instrumentation,
validator or budgets, and it cannot produce compatibility acceptance.

The DFG-only asset preserves the original hot function and checked BigInt arithmetic,
128 warmup calls, `noFTL`, optimization request, 1000-microsecond profiler interval,
300-ms/100000-call capture limits, four-capture maximum and stop at three DFG frames.
Each process retains per-capture callback/profile time, calls, compile/reoptimization
counters before and after, total traces/frames, distinct timestamps, target and
all-function tier counts, target depth and up to sixteen function/category histogram
entries with an explicit overflow-frame count. Three bounded witness frames are kept.
Names/categories/locations are truncated only in the diagnostic histogram/witness
presentation; target matching uses the complete original name and category.

The hot loop is unchanged, but the surrounding diagnostic program and observations
can affect optimization and scheduling. Counters are not proof of the active tier,
and an unreproduced failure does not prove stability or identify its historical cause.
All accounting occurs outside the sampled callback except for its start/end clocks.

The full record is printed before choosing exit 0 or 1 from the original
count/compile/no-FTL/distinct-witness checks. The instrumentation preserves both
outcomes: successful **collection** may contain `originalGatePassed=false`, exit 1.
Other script, timeout, callback, protocol or cleanup failures fail collection.
The source cap is 16 KiB, output 64 KiB, work under 20 seconds and Binder timeout
25 seconds. No added warmup, sleeps, JIT flags, dependencies or native rebuilds.

Build the [isolated Binder module](../../api28/binder/README.md) using the retained,
locked thirteen-patch JSC executable. Its input receipt includes the separate asset
and instrumentation. Run two restarted DFG processes at each page size:

```powershell
node tools/bun-runtime/experimental/api28/binder/run-binder.mjs `
  --sdk <absolute-sdk> --serial <explicit-native-x86-serial> `
  --abi x86_64 --api 36 --pages 16384 --profile jsc16k --suite jsc-sampling `
  --output <new-run-directory>
```

Use a separate 4096-byte environment and fresh directory for the other run.
The runner verifies local/installed APK hashes, signatures, payloads, actual API/ABI
and page size; both package UIDs are checked after uninstall. Memory snapshots are
context before/after each process, not evidence of memory state at an earlier failure.
The x86 16 KiB userspace ABI is emulated over 4 KiB kernel mappings.

```powershell
node --test tools/bun-runtime/experimental/webkit-x86_64-16k/sampling/sampling-common.test.mjs
node tools/bun-runtime/experimental/webkit-x86_64-16k/sampling/archive-sampling.mjs `
  docs/compatibility/<new-diagnostic-report>.json <4k-run-directory> <16k-run-directory>
```

Archive before changing compiled inputs; the archiver binds each input to the
current Git commit and preserves raw transcripts, exit outcomes and cleanup.
No result increases the baseline probe/Binder or original pressure counts.
Official payloads, API 33 support and `distributionReady=false` stay unchanged.
