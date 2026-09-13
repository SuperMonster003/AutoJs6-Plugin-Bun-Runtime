# Compatibility evidence matrix

The [human-readable matrix](../../docs/compatibility/MATRIX.md) and
[machine-readable index](../../docs/compatibility/matrix.generated.json) are generated
from the archived `docs/compatibility/*.json` reports. They help locate evidence;
the original reports, bound payloads and test validators remain authoritative.

```powershell
py .python/generate_compatibility_matrix.py
py .python/generate_compatibility_matrix.py --check
py -B -m unittest discover -s .python -p "test_*.py"
```

This generator is separate from `.python/generate_markdown.py`, whose existing
10-language / 36-artifact contract remains unchanged. The Markdown workflow runs
both generators' checks and the shared Python test discovery.

## Adding a report

1. Finish the original report's source/APK/runtime/raw-output/cleanup validation
   using its existing archiver. Keep failure and preliminary attempts separate.
   Do not overwrite earlier evidence with a later result.
2. Add its basename to [matrix-sources.json](matrix-sources.json), in filename order.
   Each entry records the source's `schemaVersion` (or historical `schema`), exact
   `kind` (null when absent), SHA-256, adapter, collection, category and scope label.
   Compute the hash from UTF-8 bytes after replacing CRLF with LF, matching Git's
   `*.json text eol=lf`. This does not normalize JSON whitespace, reorder keys or
   alter escaped line endings inside JSON strings.
3. Select the adapter only after reviewing the report structure and scope. Labels
   and notes describe the test boundary; do not copy device measurements, payload
   identities or counts into the registry. New schemas need an explicit adapter
   and positive/negative fixtures before registration. Construction and cleanup
   supplements use `index` and never create new device passes.
4. Run the commands above and review both generated diffs. A new source, a missing
   source, an altered historical hash or stale generated output fails the check.
   Commit the report, registry and generated outputs together.

To print a prospective report's canonical SHA-256 without changing it:

```powershell
py -c "import hashlib,pathlib,sys; print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes().replace(b'\r\n',b'\n')).hexdigest())" docs/compatibility/YYYY-MM-DD-new-report.json
```

The normal generator never refreshes source hashes. If an archival correction is
necessary, preserve the original report and add a separately identified correction
or supplement. Changing a registry hash is a reviewable change to the archive
binding, not a way to dismiss a failing check.

## Reading the output

- A row represents one source record and its recorded rounds. JSON pointers locate
  the record and environment within the original report. The source entry binds
  the complete original JSON, including APK receipts, raw output and cleanup facts
  that are not duplicated into this index.
- Counts retain their original unit: tests, application probes, pressure modes,
  release acceptance groups or diagnostic observations. Per-source summary counts
  are cross-checked against the projected rounds when recorded. There is no total
  across reports, runtime revisions, APKs, repeated suites or units.
- `status` describes the record's outcome. `acceptedForRecordedScope` additionally
  requires a non-diagnostic source and no explicit source/record acceptance veto.
  A successful control inside a failed preliminary report remains visible but
  cannot become accepted evidence. Shell acceptance is limited to shell UID smoke
  tests, never the application's seccomp or Binder contract.
- `null` means that the structured field is absent. No later device report or
  current runtime lock supplies missing facts. A missing failed-round count is
  unknown, not zero. Historical reports with only a commit or version keep that
  limited identity; the generator does not manufacture a revision string.
- Runtime hashes, actual installed payload ABI and source commits stay attached to
  their own report. An available ARM bridge does not make a verified x86 payload
  translated. Application/user page size and explicitly captured kernel mapping
  page size are separate; x86 16 KiB userspace emulation is not ARM64 hardware
  16 KiB acceptance. A missing kernel page measurement stays missing.
- The official plugin still requires API 33+. These finite experimental suites do
  not close the broader syscall/API/FD/OEM, soak/performance or signed Release
  gates. Build-only reports and independent supplements remain linked without
  adding executions. Embedded preliminary failures remain in their source, and
  the corresponding matrix section points readers to them.

## Adapter families

| Adapter | Source records | Count source |
| --- | --- | --- |
| `probes` | `devices`, `reports`, `record` or root with `runs` (early `rounds`) | Individual boolean probe outcomes and IDs; each round keeps its own count |
| `binder` | `reports` or `report` | `passedTests` and the report's test definitions when present; raw stdout is not reparsed |
| `pressure` | `reports` | Recorded pressure mode evidence and the report's mode definitions |
| `legacy-tests`, `execution`, `official-rounds`, `platform`, `release` | Explicit historical official layouts | Original test counters, round counters or release group counts |
| `shell` | `environments` | Recorded shell exit codes; no application acceptance inferred |
| `trace` | `records` or `record` | Plain/ptrace observation counts, without a fabricated pass count |
| `index` | Entire source | No execution counts; links build, supplement or mixed root-cause evidence |

The generator checks round consistency, runtime/APK identity, duplicate test IDs,
pressure page facts and source summaries. It does not repeat the original semantic
validation, reproduce native builds, install APKs or run device tests.
