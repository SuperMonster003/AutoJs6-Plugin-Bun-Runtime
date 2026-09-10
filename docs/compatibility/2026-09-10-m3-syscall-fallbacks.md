# M3 syscall TRAP and scoped fallback observations

On 2026-09-10 the unchanged experimental Bun `1.4.0+a260ef308` passed two
23-probe rounds in each of five native, 4096-byte-page environments: **230/230**.
The [machine-readable report](2026-09-10-m3-syscall-fallbacks.json) binds the
existing two-clean-build runtime pair, new test APKs, exact source inputs,
ABI-specific BPF policies, all observations, historical reports and cleanup.
No Bun patch, native rebuild, official payload change or Release publication
occurred. This is not the full plugin Binder suite or stable API 28 acceptance.

## Device results

Each row represents two complete 23/23 rounds. Both ABIs ran natively, without
translation. All devices had PAGE_SIZE=4096, an application UID, the
`untrusted_app` SELinux domain and active seccomp filtering.

| Device | API | Native ABI | `copy_file_range` EIO control | `pidfd_open` EIO control |
| --- | --- | --- | --- | --- |
| Sony G8441 | 28 | arm64-v8a | Kernel-gated, not reachability evidence | Policy-gated, not reachability evidence |
| Sony XQ-AT72 | 31 | arm64-v8a | Observed; TRAP fallback passes | Observed; TRAP fallback passes |
| Redmi 22120RN86C | 33 | arm64-v8a | Observed; TRAP fallback passes | Observed; TRAP fallback passes |
| Xiaomi 23046RP50C | 35 | arm64-v8a | Observed; TRAP fallback passes | Observed; TRAP fallback passes |
| Google sdk_gphone64_x86_64, AVD_API_33 | 33 | x86_64 | Observed; TRAP fallback passes | Observed; TRAP fallback passes |

The original 20 definitions and assertions are unchanged, including revision,
FD isolation, signal handling, timeout, output and cancellation bounds. They
account for 200 passing observations. Three added fixtures account for 30:

- The raw fixture tests six syscalls per round, totaling **60 TRAP-to-ENOSYS
  observations**. All six pass on all five environments.
- The two behavioral fixtures yield **16 EIO-controlled fallback observations**:
  eight file-copy and eight asynchronous child-wait cases. Each then verifies
  two successful operations, covering first and subsequent fallback use.
- Four API 28 behavioral observations pass their explicitly narrower safety
  checks but **do not count as high-level call-path reachability**.

## Why the controls matter

The fixed `syscall-probes.mjs` fixture uses Bun FFI and invalid, non-mutating
raw arguments for `pidfd_open`, `clone3`, `epoll_pwait2`, `copy_file_range`,
`openat2` and `fchmodat2`. It cannot create a clone child, open a file, change
permissions or wait indefinitely with those arguments. An ABI-checked local
BPF filter traps exactly the selected numbers plus one otherwise-invalid
`prctl` marker. EINVAL before installation and ENOSYS afterwards demonstrate
filter activation even when a target already returns ENOSYS on an old kernel.
Numbers are cross-checked against the archived NDK 29 header hashes.

For copy/wait behavior, a first filter injects EIO. The corresponding **high-level
Bun operation must fail with EIO** before the fixture can claim reachability.
A second filter selects TRAP; the existing patched handler converts it to
ENOSYS. TRAP takes precedence over ERRNO when filters are stacked, as documented
by the [Linux seccomp contract](https://man7.org/linux/man-pages/man2/seccomp.2.html).
The fixture does not weaken Android policy or synchronize filters into existing
sibling threads; only its calling thread and subsequent inherited children are
affected, not the supervisor.

`copyFileSync` disables the exact upstream FICLONE optimization flag to prevent
a successful clone from bypassing the target syscall. It then verifies 102400
bytes by SHA-256, mode 0600, unchanged source bytes and no descriptors pointing
to the private fixture files. Asynchronous `Bun.spawn` verifies exact stdout,
empty stderr, exit code 17 and disappearance of each successfully returned
child PID. It executes the read-only installed Bun directly, never a shell.

Sony API 28 uses kernel 4.4.148. Bun's kernel-version gate skips
`copy_file_range`, so even an active raw EIO injection cannot establish that
high-level path. For `pidfd_open`, the raw call still returns ENOSYS after the
EIO layer while the independent marker returns EIO; this is consistent with
an existing higher-precedence seccomp action, not an observable EIO control.
Both cases are separately recorded and excluded from the 16 controlled cases.

## What remains open

Source review is tied to clean Bun commit
`a260ef3085eccca9076569b1fd5d32fbb3e8c87d` and exact per-file hashes:

| Syscall | Actual source-path boundary | Remaining acceptance |
| --- | --- | --- |
| `pidfd_open` | Async spawn uses pidfd unless waiter fallback is cached; synchronous fast path bypasses it | Broader error, FD and thread behavior; API 28 reachability control |
| `copy_file_range` | Kernel gate, FICLONE-first optimization, then sendfile/read-write fallback | Broader copy/error/filesystem semantics; API 28 kernel-gated path |
| `clone3` | Spawn's cgroup branch uses CLONE_INTO_CGROUP; ordinary spawn uses vfork | cgroup-specific behavior, not ordinary spawn success |
| `epoll_pwait2` | Android explicitly reports this optimized path unsupported | Disabled-path characterization; timer/fetch success cannot prove this fallback |
| `openat2` | Beneath-root install and in-root static-directory paths differ | Confinement and error behavior, not just invalid raw arguments |
| `fchmodat2` | No direct high-level call found in the reviewed Bun `src` tree | Dependency-origin call-path review and meaningful behavior |

The full six-syscall semantic gate therefore remains open. So do full
experimental Binder acceptance, API 29/30/32, other FD/signal/watch/reload/thread
boundaries and matching experimental APK/source publication. Raw syscall
coverage alone does not prove all-FD leak freedom or supervision of detached
descendants.

No new native ARM64 16 KiB test was run in this session. The historical
[six-environment 20-probe result](2026-09-10-m3-spawn-fd-fix.json), including
Samsung native ARM64 16 KiB, remains unchanged and does not cover these three
new fixtures. Native x86_64 16 KiB remains blocked separately.

## Cleanup and local checks

All 30 original forcible lifecycle cases passed at **301-307 ms** from
termination request to supervisor exit. Every round verified zero processes
under the test package UID after force-stop, and every package was uninstalled
with zero UID processes remaining. The owned API 33 AVD was identified and
shut down without saving a snapshot or wiping data; launcher and QEMU exit
were observed. No command targeted either pre-existing AVD. The API 24 AVD
remained online; the API 36 large-page AVD was online at the first cleanup
check but absent at the final read-only census, for an undetermined reason.
The Samsung remote connection was not used.

The suite keeps its existing 131072-byte aggregate asset cap, 16384-byte fixed
source cap, 8192-byte inline source cap and 2048-character evidence-line cap.
Receipts bind both new fixture and independent validator sources. Node tests
execute the BPF model over syscall numbers 0-512 on both ABIs, reject forged
or incomplete proofs, cross-check the Bun-reported kernel with Android's
independent uname result, and hash the unchanged original 20-probe definitions.
After adding that independent kernel binding, fresh source-bound test APKs
were built and the complete five-environment matrix was repeated; this report
archives that final 230/230 matrix, not the earlier qualification runs.

All 114 Node tests, 11 Python generator tests and 7 JVM tests passed. Markdown
generation/check, official runtime and supervisor verification, experimental
source/build-plan gates, three Debug APK ABI/integrity/16 KiB ZIP gates,
AndroidTest compilation, lint and IDE compilation passed. Existing SDK XML
version and `Bundle.get` deprecation warnings remain unrelated to these changes.
The new tests are included in the build workflow; no remote CI run is claimed.
Verification is automated technical evidence, not a legal opinion or approval.
