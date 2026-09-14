# Fixed PC-to-origin mapping controls

This diagnostic follows the [four-phase observation](../../../../../docs/compatibility/2026-09-14-m5-jsc-restart.md)
of continued target calls with no target samples and an FTL caller. It reuses the
**exact** previous `restart/assets/jsc-restart.mjs` and `validateRestartRecord`,
running target mode only. There is no new JavaScript workload, warmup, sleep,
threshold, `noInline`, native build or change to an older suite.

Each Android instrumentation round launches two fresh Bun processes through the
actual Binder service. Round 1 runs `map-off`, then `map-on`; round 2 reverses the
order. Both arms set `BUN_JSC_dumpOptions=1` and
`BUN_JSC_printEachDFGFTLInlineCall=true`. Only
`BUN_JSC_alwaysGeneratePCToCodeOriginMap=false/true` differs between arms.

The pinned Bun initialization consumes `BUN_JSC_*` with `Options::setOption` before
VM creation. Pinned WebKit dumps overridden options in `Options::finalize`, after
customization and coherence checks. Explicit false is still marked overridden.
The validator requires the complete expected three-option dump, including the
actual map value and shared logging options, and rejects unknown stderr. Merely
echoing the requested environment cannot satisfy this check.

Compiler `[InlineCall][DFG|FTL]` records retain the exact callee/caller names and
six-character hashes. These are inline decisions during graph parsing; they do
not alone prove that compilation finished or that FTL code executed. Actual
sampled tiers remain separate, including target FTL frames and the original
target-gate exit 1. Restoring a target name from an FTL machine frame does not
turn that frame into DFG. The old three-sample/no-target-FTL gate is unchanged.

All four profiles use the same 300-ms/100000-call limits and 1000-microsecond
interval. The original source cap is 16 KiB, combined stdout/stderr remains
64 KiB, work remains under20 seconds and Binder timeout25 seconds. The additional
logs count against that same output cap. No automatic retry or expansion of a
budget is used. If FTL does not occur or target disappearance is not observed,
retain the absence of evidence; collection alone cannot establish a cause.

Build the opt-in JSC main/test APKs with the retained thirteen-patch executable
and exact current project inputs, then run each of the two owned API36 x86 AVDs:

```powershell
node tools/bun-runtime/experimental/api28/binder/run-binder.mjs `
  --sdk <absolute-sdk> --serial <explicit-native-x86-serial> `
  --abi x86_64 --api 36 --pages 16384 --profile jsc16k --suite jsc-pcmap `
  --output <new-run-directory>
node tools/bun-runtime/experimental/webkit-x86_64-16k/pcmap/archive-pcmap.mjs `
  docs/compatibility/<new-diagnostic-report>.json <4k-directory> <16k-directory>
node --test tools/bun-runtime/experimental/webkit-x86_64-16k/pcmap/pcmap-common.test.mjs
```

The archived report binds all rounds, the identical APK pair, runtime/supervisor,
source receipt, installed signatures/hashes and raw final process/package lists
for both UIDs. Failed collection and unexpected observations remain separate.
Logging and PC mapping can perturb compilation and timing, so the new pair is
not interchangeable with historical runs without these observations enabled.

The 16 KiB x86 userspace ABI is emulated over4 KiB kernel mappings. This diagnostic
does not add baseline, original Binder/pressure, historical root-cause, stability,
performance or signed Release acceptance. Official API33 and payloads remain
unchanged; `distributionReady=false`.
