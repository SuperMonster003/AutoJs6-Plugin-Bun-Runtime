# Fixed offline runtime API boundaries

This opt-in test suite executes four immutable source snapshots through the actual
production Binder service, supervisor and exact shared AARs. The separate
`RuntimeApiInstrumentedTest` class is compiled only into the experimental test APK.
The production application and original eight-test Binder suite are unchanged.

| Order | Mode | Required observations |
| --- | --- | --- |
| 1 | files | Unicode paths, exclusive create/copy rejection, rename, missing old path, partial FileHandle read, bounded directory watcher events, watcher close and exact owned-directory removal |
| 2 | dns | System IPv4 localhost lookup plus an instance-local Resolver using a loopback UDP server for A, TXT and NXDOMAIN responses |
| 3 | tcp | Two 32 KiB binary requests, four writes each, client half-close, exact reversed responses and graceful client/server socket closure |
| 4 | http-fetch | Loopback HTTP redirect, UTF-8 response reconstructed through a stream reader, abort of a pending body read and observed server response close |

Each source is capped at 12 KiB. A mode has an 8-second script watchdog, 12-second
Binder timeout and 16 KiB combined output budget; its single successful JSON line
must fit 8 KiB. The resolver uses its own server list, and every server binds an
OS-allocated port on `127.0.0.1`. Nothing installs packages or contacts a public
network. A watchdog or assertion failure cannot pass the semantic validator.
Failed executions retain bounded stdout/stderr and actual terminal fields before
JUnit fails; the runner retains both fixed rounds and cleans its exact packages.

The initial fixed matrix is native ARM64 API 28/31/33/35 and x86_64 API 33, all with
4096-byte application and kernel pages. Each environment runs exactly two rounds.
One new baseline APK batch must bind all compiled inputs to a clean project commit
before execution. Reuse the thirteen-patch payloads from `../runtime-evidence.json`;
do not rebuild native code or substitute the large-page JSC candidate.

Build with the documented experimental Binder Gradle properties, then invoke
`../binder/run-binder.mjs` with `--suite runtime-api` and the normal SDK, serial,
ABI, API, pages and new output-directory arguments. Omit `--profile`. Archive a
complete successful batch with:

```text
node tools/bun-runtime/experimental/api28/runtime-api/archive-api.mjs <new docs/compatibility output.json> <arm28 run> <arm31 run> <arm33 run> <arm35 run> <x86-33 run>
```

The archiver independently validates raw instrumentation, mode order, semantic
facts, source hashes, native payloads, installed APK hashes, signer agreement,
both package UIDs, job cleanup and final raw process listings. It rejects a failed,
partial, mixed-source or mixed-APK batch. Preserve a failed batch separately before
any diagnosis; do not increase budgets or retry until it passes.

Host Node tests execute the actual filesystem and loopback fixtures, with only
Android identity and `/proc` inputs substituted, and test negative controls. They
validate the harness; they are not Android or Bun execution evidence.

These finite API observations are supplementary and keep
`compatibilityAcceptance=false` and `distributionReady=false`. They add no counts
to the unchanged 35-probe, eight-test Binder or JSC pressure suites. TLS, IPv6,
public DNS/networking, native 16 KiB, broader Node/Bun API behavior, full watch
reload lifecycle, soak/performance and signed Release acceptance remain separate.
