# Downstream backport patches

This directory contains a deterministic ten-patch series reviewed against exact
Bun commit `34cbb9a40b4bd1bd767d134a7065e66c2432a676`.

The first five patches replay the immutable upstream compatibility commits
without conflict. Patch 0006 is project-owned: it replaces Bun's movable
Brotli `v1.1.0` tag with the full commit resolved during the supply-chain
review. The series was applied with deterministic dates and exported with
`git format-patch --full-index --binary --no-signature`. Each patch has its own
byte count, SHA-256, deterministic commit and parent, origin, stable patch ID,
purpose, affected paths, and license impact in `../series.lock.json`.

Project-owned MIT patch 0007 fixes startup CLOEXEC handling. Patch 0008 provides
a bounded, allocation-free Linux spawn FD fallback and fail-closed setup. Its
additional `--unified=20` export context lets the native regression harness
compile the exact new wrapper/call site and the old failing loop. The locked
stable patch ID is calculated from that exact exported patch.

Project-owned MIT patch 0009 replaces only the unconstrained directory-route
fallback with a bounded, read-only descriptor-relative resolver. Its
`--unified=20` context binds the Rust call site and C bridge; the
[native harness](../../scoped-open/README.md) extracts and compiles the exact
new header and bridge. It preserves ordinary directory serving without adding
a dependency or a permissive switch, and does not restrict general script I/O.

Project-owned MIT patch 0010 changes only the Android pidfd shim. It queries
the caller's mask and uses the existing waiter fallback when SIGSYS is blocked,
preserving pending signals without unblocking or warming the waiter cache.
The [exact-source host harness](../../blocked-pidfd/README.md) covers ten cases.

The stable patch IDs of compatibility patches 0001-0005 equal their
corresponding upstream reference patches. At that five-patch prefix,
all five compatibility-affected source and test paths are byte-identical to the pinned PR head
`d6171ce7e2efa4f3eb3e6f5a099da922df15bc0c`.
The final startup, spawn and directory-open code intentionally differs and is bound by the
project-owned patches; no upstream comparison path is omitted.

This file proves source-level applicability only. Separate locked evidence now
shows that the full series builds reproducibly for both 64-bit ABIs and passes
the static ELF gate, so the experiment is `buildReady: true`. Neither this
patch record nor the build evidence proves application-process portability to
API 28-32 or distribution readiness; license/source obligations, packaging,
Binder execution, lifecycle, and device-matrix gates remain separate.
