# Fixed profiler restart and clear controls

The first [DFG diagnostic](../sampling/README.md) reached its target in the first
capture on all four observed processes. It did not exercise subsequent
pause/clear/start cycles or the device path that preserves an exit-1 result.
This separate fixture covers those paths without changing the original pressure
or sampling assets, instrumentation, validators or budgets.

There are two fixed modes, each in a fresh Bun process through the actual plugin
Binder service. Both perform exactly four `profile()` calls, each with a distinct
once-called callback `jscRestartPhase1` through `jscRestartPhase4`:

- `target` executes the original `jscPressureHotLoop` and checks every result
  against the independent BigInt references. It observes all four phases even
  when the cumulative three-DFG-frame check already matches.
- `target-absent` executes a separately named arithmetic control loop during
  every capture. The original target is warmed only before profiling. This
  deliberately provides zero target invocations in the captures; complete
  diagnostics must retain the observed target gate and exit 1. It is a controlled
  absence of target work, **not reproduction of naturally insufficient samples**.

Each process retains the original target's 128 warmup calls, `noFTL` and optimization
request. The control function also has `noFTL` but no additional warmup or forced
optimization. Each callback uses a 300-ms deadline/100000-call cap and a
1000-microsecond profile interval. The fixture has exactly four captures, source
at most16 KiB, output64 KiB, work under20 seconds and Binder timeout25 seconds.
No new native build, JIT flag, `noInline`, dependency or sleep is used.

Per-capture evidence includes calls and clocks, optimizer counters, total traces,
target/control/all-function tier counts, named-phase counts and witnesses, bounded
histograms and target witnesses. Histogram attribution is cross-checked against
the declared counts. A restart is observed only if all four captures contain their
own phase frame, no other phase frame, and non-overlapping ordered timestamps.
Empty or stale observations are retained with `restartObserved=false`; an unknown
tier label is retained and does not erase an otherwise identified phase frame.
Collection and target/restart/control outcomes remain separate.

The pinned WebKit source clears `m_isPaused` in `startWithLock`; the existing
thread continues its timer loop while paused. Bun pauses and clears results after
reporting rather than shutting the thread down. These source facts predict reuse,
but do not prove what happened in the historical two-sample failure. Named callbacks
and added diagnostics can affect optimization/scheduling. Finite successful cycles
do not establish stability or all profiler/VM lifecycle behavior.

Build the [opt-in JSC Binder APKs](../../api28/binder/README.md) once using the
retained thirteen-patch candidate. Use fresh output directories at each page size:

```powershell
node tools/bun-runtime/experimental/api28/binder/run-binder.mjs `
  --sdk <absolute-sdk> --serial <explicit-native-x86-serial> `
  --abi x86_64 --api 36 --pages 16384 --profile jsc16k --suite jsc-restart `
  --output <new-run-directory>
node --test tools/bun-runtime/experimental/webkit-x86_64-16k/restart/restart-common.test.mjs
node tools/bun-runtime/experimental/webkit-x86_64-16k/restart/archive-restart.mjs `
  docs/compatibility/<new-diagnostic-report>.json <4k-run-directory> <16k-run-directory>
```

Two restarted rounds per environment collect eight processes/32 profiles overall.
Both page sizes must use identical APKs with exact source, runtime and installed
hash bindings. The runner retains the raw final numeric-UID `ps` listing and the
package listing; the archive independently checks both package UIDs against it.
Collection failure and unexpected semantic outcomes remain visible, without
automatic device retries or modification of prior reports.

The x86 16 KiB userspace ABI is emulated over4 KiB kernel mappings. This adds no
original Binder/pressure/baseline acceptance, performance or signed Release claim.
Official API33 support, payload locks and `distributionReady=false` stay unchanged.
