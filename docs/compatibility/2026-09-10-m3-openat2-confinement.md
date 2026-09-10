# M3 openat2 directory-confinement blocker

On 2026-09-10 the unchanged experimental Bun `1.4.0+a260ef308` scored
**23/24 in both rounds on each of five native 4 KiB environments**. The
original 23 probes still pass: 230 passing observations. The new directory
confinement probe fails in all 10 rounds and records **60 outside-root
sentinel reads**. This is a failed compatibility gate, not 240/240 acceptance.

The [complete machine-readable report](2026-09-10-m3-openat2-confinement.json)
binds source inputs, test APKs, the existing two-clean-build runtime pair,
all 240 probe outcomes, failure details and cleanup. No runtime patch, native
rebuild, official payload change, remote CI run or Release publication occurred.
This suite does not exercise the full experimental plugin Binder contract.

## Observed scope

All runs used application UIDs, the `untrusted_app` SELinux domain, active
seccomp filters, read-only installed executables and PAGE_SIZE=4096.

| Device | API | Native ABI | Complete suite | Failed new probe |
| --- | --- | --- | --- | --- |
| Sony G8441 | 28 | arm64-v8a | 23/24 twice | Directory confinement |
| Sony XQ-AT72 | 31 | arm64-v8a | 23/24 twice | Directory confinement |
| Redmi 22120RN86C | 33 | arm64-v8a | 23/24 twice | Directory confinement |
| Xiaomi 23046RP50C | 35 | arm64-v8a | 23/24 twice | Directory confinement |
| Google sdk_gphone64_x86_64, AVD_API_33 | 33 | x86_64 | 23/24 twice | Directory confinement |

`Bun.serve` binds only `127.0.0.1` and maps `/static/*` to a new `public`
directory within the private test job. A synthetic sentinel is created next
to `public`, still inside that same job. No user file, unrelated application,
external host or external network peer is accessed.

The 12 requests run before and after adding a local TRAP policy:

| Request group | Before test filters | After TRAP | Verdict |
| --- | --- | --- | --- |
| Regular file and internal relative symlink | 200, expected content | 200, expected content | Pass |
| Literal/encoded/double-encoded traversal, NUL and missing paths | 404, no sentinel | 404, no sentinel | Pass |
| FIFO without a writer | 404, does not block | 404, does not block | Pass |
| Relative symlink to `../secret.txt` | 200, sentinel content | 200, sentinel content | Fail |
| Absolute symlink to the private sentinel | 200, sentinel content | 200, sentinel content | Fail |
| Symlink to `/proc/self/fd/<owned-sentinel-fd>` | 200, sentinel content | 200, sentinel content | Fail |

Across 10 rounds, 180 of 240 path assertions pass and 60 fail. Each escape
kind accounts for 20 failures. The test retains every request and does not
stop recording after the first escaped sentinel.

## Source explanation and control limits

Source review is pinned to clean Bun commit
`a260ef3085eccca9076569b1fd5d32fbb3e8c87d`. `DirectoryRoute::open_beneath`
calls `bun_sys::openat2_in_root`, which requests `RESOLVE_IN_ROOT` and
`RESOLVE_NO_MAGICLINKS`. If both the requested path and a separate `.` probe
report ENOSYS, EPERM, EINVAL or E2BIG, the helper caches unavailability and
falls back to plain `openat`.

Plain `openat` does not provide those resolution constraints. In contrast,
IN_ROOT rebases absolute links and clamps parent traversal to the directory
root; NO_MAGICLINKS rejects proc-style magic links. These are distinct kernel
guarantees described by the [openat2 contract](https://man7.org/linux/man-pages/man2/openat2.2.html).
The observed outside-root reads are consistent with this fallback. This is
a source-based explanation supported by runtime observations, not a syscall trace.

The directory-route implementation and `src/sys/lib.rs` are byte-identical
to the pinned upstream Bun commit. This session does not attribute the defect
to the preceding startup/spawn fixes. It also does not claim that the official
APK has been tested with this fixture: only experimental bytes were executed.

All 10 valid raw `openat2` controls already return ENOSYS **before** adding a
test policy. Native directory requests can therefore cache unavailability
before the EIO/TRAP layers are installed. The subsequent EIO request still
serves the ordinary file. It is explicitly recorded as
`unavailable-before-filter`, not as a successful high-level EIO reachability
control. The post-TRAP phase is not claimed to prove first-entry fallback.

Separate invalid-`prctl` markers prove the ABI-specific policies were installed:
EINVAL -> EIO -> ENOSYS. Their exact BPF hashes and target results are checked.
TRAP takes precedence over ERRNO under the [seccomp filter contract](https://man7.org/linux/man-pages/man2/seccomp.2.html).
Policies only restrict the calling Bun thread and subsequent inherited children;
they do not affect the supervisor or existing sibling threads.

This is a failure of the configured directory boundary, not an escape from
the Android UID. The plugin remains a trusted-script engine, not a sandbox;
that does not make a directory-route containment assertion optional.

## fchmodat2 call-path correction

The preceding syscall report said no direct high-level call had been found
in Bun's `src` tree. A case-insensitive search now finds the uppercase
`SYS_FCHMODAT2` constant. The historical report remains unchanged; this is an
explicit correction to that limited search result.

The actual internal path is `install/bin.rs::chmod_on_ok` -> `sys::lchmod`
-> raw syscall 452 with `AT_SYMLINK_NOFOLLOW`; ENOSYS falls back to libc
`fchmodat`. `chmod_on_ok` discards the returned error. It is an internal
package-bin linking path, not a newly supported plugin installation feature.

Separately, Android's `node_fs::lchmod` returns EOPNOTSUPP, and `node:fs` only
exports its lchmod methods when O_SYMLINK is available. Both public exports
were observed as `undefined` in all 10 device rounds. No package installation
or internal CLI fallback was run, so the latter's behavior gate remains open.
Do not infer it from ordinary `chmod`, raw syscall results or absent exports.

## Remediation decision

The experimental distribution gate remains blocked. The recommended first
remediation is **fail closed** when a constrained open is unavailable: retain
the controlled directory-route error instead of substituting plain `openat`.
This would make affected directory requests unavailable on the tested systems,
while leaving unrelated single-source execution and ordinary file APIs outside
this change. It is a deliberate functionality tradeoff requiring confirmation.

The alternative is a separately designed, descriptor-relative resolver with
bounded symlink processing, magic-link rejection, race/error handling and
matching native regression tests. A lexical `..` filter, realpath-then-open
check or final-component-only O_NOFOLLOW flag is not an equivalent substitute.
No remediation or relaxed test expectation has been applied in this report.

After selecting a fix, the plan is to lock its source, reproduce both native
ABIs twice, retain this failed baseline and repeat the local suite. Only then
is another Samsung native ARM64 16 KiB reservation useful. No remote device
or new 16 KiB execution is part of the present result.

## Tooling, checks and cleanup

The new immutable source uses a separate APK asset (7073 bytes, maximum 8192).
The existing 23 materialized entries remain unchanged at 123987 bytes; the
24-entry JSON asset is 124162 bytes, still below its original 131072-byte cap.
Only the fixed asset name, probe ID and mode are accepted. The source and
independent verifier are bound in the receipt. Existing timeouts, source caps,
output limits and 2048-character evidence-line limits were not increased.
Each raw HTTP response is capped at 8192 bytes with a 1000 ms request deadline.

The verifier can inspect a complete failed observation for archiving but the
runner's acceptance function always rejects it. Unit tests verify that an
escaped sentinel cannot become a passing report by flipping its verdict,
dropping a path, changing a kernel label or forging a filter control.

All 121 Node tests, 11 Python generator tests and 7 JVM tests pass. Markdown
regeneration/check, official runtime and supervisor verification, experimental
source/build-plan gates, Debug APK payload/16 KiB ZIP alignment, Android-test
APK assembly and Debug lint also pass. IDE builds succeed; one run reports
the existing SDK XML v3/v4 tooling warning. No remote CI or signed Release build
is included. The expected device failures do not mean the test tooling failed;
the complete runtime gate remains false. The original 30 forcible lifecycle
cases pass at 301-316 ms, with no new crash or hang.
All fixture links, files and FIFOs were removed; force-stop and uninstall
left zero test-package UID processes. The owned API 33 AVD was identified and
shut down without saving a snapshot or wiping data, and its launcher/QEMU
exit was observed. The pre-existing API 24 AVD remains running.
