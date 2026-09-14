# Fixed full-trace and inliner observation

This separate diagnostic follows the [PC-map controls](../pcmap/README.md).
The new source is the original four-phase restart source plus three marked
observation blocks. Removing those blocks must recover every original byte after
LF normalization. The hot functions, callers, arithmetic checks, warmup, profile
callbacks, original semantic validator and target gate are unchanged. Added
processing runs after each profile and may affect later compilation and timing.

Both arms set `BUN_JSC_collectExtraSamplingProfilerData=true`,
`BUN_JSC_dumpOptions=1` and `BUN_JSC_printEachDFGFTLInlineCall=true`. Only
`BUN_JSC_alwaysGeneratePCToCodeOriginMap=false/true` differs. The host requires the
complete four-option finalized JSC dump; requested environment values alone do
not satisfy that check. Round 1 runs map-off/on, and round 2 reverses the order.
Each arm starts a fresh Bun process through the actual production Binder service.

Pinned JSC exports an optional `inliner` object on semantic inline frames when
extra profiler data is enabled. It supplies the outer machine frame's name,
CodeBlock hash, tier, bytecode position and source position. Each stored witness
contains the entire original trace JSON, including every frame and optional
field. The host independently checks frame order, location grammar, tier and
matching outer-frame identity, then compares both hashes with compiler inline
decisions. These are JSC-exported links from processed CodeOrigin information;
they do not expose raw machine PCs, map pointers or a complete compiled graph.
An inline decision alone does not prove completed or executed FTL compilation.

The first trace in each of six classes is considered once per capture: linked
target FTL, unlinked target FTL, caller FTL with another target tier, caller FTL
without a target frame, a DFG pair, and other traces. All traces contribute to
class and linkage counts. Only the first complete witness is eligible; a later
smaller or more convenient trace never replaces it. Each serialized witness is
limited to 4096 UTF-8 bytes and their combined storage to 24576 bytes. Absent,
oversize and exhausted-budget states are explicit. The host rederives each
retained witness's class and machine links from its complete frame data.

The four profiles retain the original 300-ms/100000-call limits and 1000-us
sampling interval. Total work remains under 20 seconds, Binder timeout 25 seconds,
source 16 KiB and combined stdout/stderr 64 KiB. Extra-data also permits a synthetic
CCode top frame in the pinned profiler; it is retained. Actual sampled machine
tiers and original target-gate exit 1 remain visible. Missing FTL or target
disappearance is recorded without retrying or expanding the fixed workload.

Build the opt-in JSC main/test APK pair using the current separately locked
thirteen-patch candidate. Use exactly two rounds in each API 36 x86_64 environment
at 4096 and 16384 userspace pages, with the same APK bytes:

```powershell
node tools/bun-runtime/experimental/api28/binder/run-binder.mjs --sdk <sdk> --serial <serial> --abi x86_64 --api 36 --pages <4096-or-16384> --profile jsc16k --suite jsc-trace --output <new-directory>
node tools/bun-runtime/experimental/webkit-x86_64-16k/trace/archive-trace.mjs docs/compatibility/<new-report>.json <4k-directory> <16k-directory>
node --test tools/bun-runtime/experimental/webkit-x86_64-16k/trace/trace-common.test.mjs
```

The archiver binds current Git inputs, APKs, installed payloads, signatures,
both raw instrumentation rounds and independent final checks for both package
UIDs. Archive before changing compiled inputs. It creates a new file exclusively.
Collection is diagnostic only: no original-suite passes, historical failure root
cause, stability, native rebuild, hardware 16 KiB or Release acceptance is added.
The x86 16384-byte userspace ABI remains emulated over 4096-byte kernel mappings.
