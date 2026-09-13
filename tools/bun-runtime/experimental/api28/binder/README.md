# Test-only experimental plugin Binder suite

This opt-in Gradle module packages the existing production service, exact shared
API AARs and the **same eight instrumentation methods** with the locked experimental
API 28 runtime. It does not implement a second service or a mock Binder contract.
The default build remains the official API 33 plugin. No experimental executable
is added to `app/src/main/jniLibs`, and this module cannot build a Release variant.

The application ID ends in `.api28binder`, the manifest has `testOnly=true`, and
the version name and runtime variant explicitly identify experimental test bytes.
The optional large-page x86 profile adds `.jsc16k` and packages only x86_64.
The service permission, process name, request limits, argument vector, read-only
`nativeLibraryDir` execution and supervisor are unchanged. Single-source,
`--no-install`, no relative project imports, no AutoJs6 globals and no Java bridge
remain the contract. A child process is not a security sandbox.

## Build and run on Windows

Supply the two previously verified native build directories (each containing
`bun-arm64-v8a` and `bun-x86_64`). Use absolute paths, including WSL UNC paths if
needed. Set `JAVA_HOME` to the repository's selected JDK. Example:

```powershell
.\gradlew.bat :experimental-binder:assembleDebug :experimental-binder:assembleDebugAndroidTest `
  '-PexperimentalRuntimeDirectory=<absolute-first-build-directory>' `
  '-PexperimentalRuntimeRepeatDirectory=<absolute-second-build-directory>'

node tools/bun-runtime/experimental/api28/binder/run-binder.mjs `
  --sdk <absolute-android-sdk> --serial <explicit-adb-serial> `
  --abi arm64-v8a --api 36 --pages 16384 --output <new-run-directory>
```

The output parent must already exist; the runner refuses to overwrite a previous
report. It checks the actual primary ABI, kernel architecture, API and page size,
then performs two complete rounds with force-stop/process restart. ARM64 native
acceptance requires a disabled translation bridge. An x86 ELF on an x86 primary
ABI/kernel is native even if that AVD offers an ARM translation bridge.
API 28 devices without `getconf` use the process `smaps` page size; every test also
hard-asserts `Os.sysconf(_SC_PAGESIZE)` and the required API.

The module verifies both native builds, supervisor sources/bytes and the API AAR
lock. Its embedded `assets/binder-build.json` binds the actual compile inputs,
including shared source and test definitions. The runner rejects stale APKs after
input changes, verifies ZIP/payload integrity, checks APK signatures and the
installed application/test APK hashes, and requires every test plus all five
bounded lifecycle diagnostics in each round. Signature checks and installed-test
APK hashing were added after the first archived matrix; do not retroactively
attribute those extra checks to its earlier receipts.

Only the two newly installed test packages are removed. Pre-existing packages are
never replaced; on partial install or test failure cleanup still runs. Successful
reports require zero processes for the exact application UID. AVD lifetime is
owned by the caller: close any AVD you started after testing.

## Permission and signing

The real `org.autojs.permission.PLUGIN` signature permission remains enforced.
The module uses the repository's existing Release signing configuration for
host-compatible **test-only Debug** APKs when available; it never publishes or
prints signing secrets. Without it, normal debug signing can work on a clean AVD
whose permission is defined by the same-signed test APK. An existing AutoJs6 with
a different signer must not be removed or bypassed for this test: use a clean AVD
or the genuinely matching signing configuration. A unique test permission
declaration does not grant the real service permission.

## Large-page x86 candidate

The baseline source has advanced to eleven patches. The unchanged ten-patch JSC
lock now resolves its original baseline evidence through the immutable archive;
its provenance remains verifiable. The existing current-source check in Binder
preparation rejects using it as the eleven-patch baseline. A further rebase and
its own build/device evidence are still required.

The ten-patch JSC rebase now has two independently built identical Bun binaries,
with actual successful driver exits. Build and runner reject source mismatch;
the historical nine-patch candidate lock and reports remain unchanged.

The current `jsc16k` profile now requires the separate ten-patch
[`rebased-candidate.lock.json`](../../webkit-x86_64-16k/rebased-candidate.lock.json)
and its two matching clean Bun receipts. It never accepts the historical
nine-patch candidate as current source. Both builds reuse the exact independently
built JSC inputs; they do not constitute new WebKit builds. The original pressure
asset, its budgets and the eight shared Binder test methods are unchanged.

Add `-PexperimentalJscCandidateFile=<absolute-locked-candidate-bun>` to the same
build command, then pass `--profile jsc16k --abi x86_64` to the runner. Both API 36
4 KiB and 16 KiB environments are required. This selection checks the separate
[rebased JSC candidate lock](../../webkit-x86_64-16k/rebased-candidate.lock.json); it cannot replace
the baseline with arbitrary bytes or silently disable the official x86 page guard.
Outputs are under `build/experimental-binder-jsc16k`; baseline outputs use
`build/experimental-binder`, outside the immutable native experiment directory.

The profile also compiles a separate test-only
[JSC pressure class](../../webkit-x86_64-16k/pressure/README.md). Select it explicitly
with `--suite jsc-pressure`; without this option the original eight methods remain
the entire selected suite. Its seven offline modes produce their own report kind
and are not eight-test Binder observations. Pressure requires API 36 and independently
checks the Bun process's ELF AT_PAGESZ, Android sysconf and the host page-size gate.
The x86 16 KiB userspace mode is emulated over 4 KiB kernel mappings, not ARM64
hardware 16 KiB. Compiled input receipts bind the additional test sources/assets.

## Evidence

- [2026-09-13 ten-patch large-page JSC](../../../../../docs/compatibility/2026-09-13-m5-ten-patch-jsc.md): the new `a237dc8c...7f8dcd5` candidate passes the unchanged eight-test suite twice on native x86_64 API 36 at both 4 KiB and 16 KiB userspace pages (32/32). The identical APK pair also passes the separate original pressure fixture (28/28 modes). Its 77 inputs match project commit `5738129`; signatures, installed bytes and execution UID cleanup pass. These candidate results are separate from baseline Binder totals and all nine-patch history.

- [2026-09-13 ten-patch local matrix](../../../../../docs/compatibility/2026-09-13-m3-blocked-pidfd-fix.md): 80/80 in five native 4 KiB environments, using the unchanged eight methods. The initial API 28 ART/ADB-JDWP startup crash is archived separately and excluded; the identical APK retry passes two rounds. The later Samsung follow-up below completes both planned new-source device gates.

- [2026-09-13 Samsung follow-up](../../../../../docs/compatibility/2026-09-13-m3-blocked-pidfd-native-arm64-api36.md): the same main/test APKs pass 16/16 each on SM-F936U API 32 / native ARM64 / 4 KiB and SM-A566B API 36 / native ARM64 / 16 KiB. This adds 32/32, bringing ten-patch totals to 112/112 across seven native environments in separately bound batches. The 75 inputs bound to project commit df186ec, installed hashes, lifecycle and cleanup pass; no native rebuild or AVD operation. The results below remain historical nine-patch evidence.

- [2026-09-12 baseline Binder matrix](../../../../../docs/compatibility/2026-09-12-m3-experimental-binder.md): nine native environments, 144/144.
- [2026-09-12 API 29/32 follow-up](../../../../../docs/compatibility/2026-09-12-m3-api29-api32.md): 32/32 additional native x86_64 / 4 KiB Binder observations, completing API 28-32 version coverage of this existing eight-test suite. The earlier matrix's APK/source bindings remain unchanged; ARM64 API 32 was still untested in that session.
- [2026-09-12 native ARM64 API 32 follow-up](../../../../../docs/compatibility/2026-09-12-m3-native-arm64-api32.md): Samsung Fold4 SM-F936U actually reports API 32 despite its Android 12 label. Two unchanged Binder rounds pass 16/16 on native ARM64 / 4 KiB, bringing baseline evidence to 192/192 in twelve native environments across separately bound APK batches. Main/test signatures, installed hashes, all ten lifecycle diagnostics and zero-process cleanup pass. Its independent 29-probe suite also passes 58/58 with the previous probe APK; this is not native 16 KiB, the broader runtime matrix or Release acceptance.
- [2026-09-12 native x86 large-page candidate](../../../../../docs/compatibility/2026-09-12-m5-x86-16k-jsc.md): 32/32 in the two page-size environments.
- [2026-09-12 bounded JSC pressure](../../../../../docs/compatibility/2026-09-12-m5-x86-jsc-pressure.md): 28/28 pressure modes and a separate 32/32 repeat of the unchanged Binder suite, with identical main/test APKs in both suites and both page-size environments.

`archive-binder.mjs <new-report.json> <baseline|jsc16k> <run-directory>...`
revalidates the retained raw instrumentation and cleanup records before archiving.
It rejects duplicate environments and cannot turn a failed run into acceptance.
The complete existing eight-test suite is not the full Bun CLI, signal, syscall,
FD, OEM, API or final signed Release matrix. `distributionReady` stays false.
