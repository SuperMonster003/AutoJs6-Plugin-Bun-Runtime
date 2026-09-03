# Downstream backport patches

This directory contains a deterministic six-patch series reviewed against exact
Bun commit `34cbb9a40b4bd1bd767d134a7065e66c2432a676`.

The first five patches replay the immutable upstream compatibility commits
without conflict. Patch 0006 is project-owned: it replaces Bun's movable
Brotli `v1.1.0` tag with the full commit resolved during the supply-chain
review. The series was applied with deterministic dates and exported with
`git format-patch --full-index --binary --no-signature`. Each patch has its own
byte count, SHA-256, deterministic commit and parent, origin, stable patch ID,
purpose, affected paths, and license impact in `../series.lock.json`.

The stable patch IDs of compatibility patches 0001-0005 equal their
corresponding upstream reference patches. After the complete series is applied,
all five compatibility-affected source and test paths are byte-identical to the pinned PR head
`d6171ce7e2efa4f3eb3e6f5a099da922df15bc0c`.

This file proves source-level applicability only. Separate locked evidence now
shows that the full series builds reproducibly for both 64-bit ABIs and passes
the static ELF gate, so the experiment is `buildReady: true`. Neither this
patch record nor the build evidence proves application-process portability to
API 28-32 or distribution readiness; license/source obligations, packaging,
Binder execution, lifecycle, and device-matrix gates remain separate.
