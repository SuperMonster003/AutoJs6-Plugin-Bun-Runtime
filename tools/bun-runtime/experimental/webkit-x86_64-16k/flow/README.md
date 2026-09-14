# Original pressure control-flow diagnostic

This separate test-only collection observes DFG sampling with the original seven-mode order: `jit-off`, `baseline`, `dfg`, `ftl`, `gc`, `wasm`, `workers`. Six modes run the original pressure asset and unchanged validator. Only DFG uses `assets/jsc-pressure-flow.mjs`. Removing its seven marked observation blocks recovers the entire original pressure source, including the hot function, anonymous profile callback, warmup, early stop and assertions.

DFG receives only `AUTOJS6_JSC_PRESSURE_MODE=dfg`, with no additional JSC options. Other modes keep their original environments. The original source limit (16 KiB), combined output limit (64 KiB), work limit (20 seconds), Binder timeout (25 seconds), four-profile cap, 300 ms / 100000-call callback and 1000 us sampling interval remain fixed. Each profile records calls, full profile duration, target/caller tiers, sample snapshots and first complete traces per class. The existing trace helper retains one first candidate per class, with 4096 bytes per witness and 24576 bytes total. Oversize and budget omissions are explicit; later traces cannot replace the first candidate.

The original assertions still throw. An outer catch records the same error and rethrows it, while finally emits bounded diagnostic facts. A fully recorded original DFG assertion with actual exit 1 and `NON_ZERO_EXIT` can be collected before continuing the remaining modes. Unknown failures, missing facts, changed gates and timeouts fail collection. This continuation differs from the original JUnit suite and adds zero compatibility passes. A successful DFG mode also passes the unchanged original host validator.

The fixed device scope is two rounds each on API 36 native x86_64 with 4096 and 16384 userspace pages: 28 mode processes and four DFG diagnostics, with one to four profiles each following the original early stop. Use one source-bound APK pair and the retained thirteen-patch JSC payload. Do not retry for a desired sample outcome, expand budgets or rebuild native dependencies as part of this collection. The 16384-byte userspace ABI is emulated over 4096-byte kernel mappings.

```powershell
node --test tools/bun-runtime/experimental/webkit-x86_64-16k/flow/flow-common.test.mjs
# Build a clean source commit with the existing experimental JSC Gradle properties.
node tools/bun-runtime/experimental/api28/binder/run-binder.mjs --sdk <sdk> --serial <serial> --abi x86_64 --api 36 --pages <4096-or-16384> --profile jsc16k --suite jsc-flow --output <new-directory>
node tools/bun-runtime/experimental/webkit-x86_64-16k/flow/archive-flow.mjs docs/compatibility/<new-report>.json <4k-directory> <16k-directory>
```

The archive rechecks exact source/APK/native/signature bindings, raw instrumentation, fixed mode order, original final gates, deterministic trace byte accounting and both package UIDs against the complete final numeric-UID process list. Register it with the compatibility matrix's `index` adapter. Node controls execute the actual asset with a constructed profiler and are never native/device observations. Post-profile observation and the additional script code can affect later compilation and timing. Fresh observations cannot recover missing per-profile data from the historical 2 < 3 failure or establish its cause retroactively.
