import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location("compatibility_matrix", Path(__file__).with_name("generate_compatibility_matrix.py"))
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class MatrixTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.matrix = M.build_matrix()
        cls.entries = {s["file"]: s for s in cls.matrix["sources"]}

    def source(self, name):
        name += ".json"
        return M.read_json(M.canonical_bytes(M.ROOT / M.REPORT_DIR / name)), self.entries[name]

    def rows(self, name):
        return [r for r in self.matrix["rows"] if r["source"] == name + ".json"]

    def fixture(self, root):
        doc, entry = self.source("2026-09-01-m1")
        (root / M.REPORT_DIR).mkdir(parents=True)
        (root / M.REGISTRY).parent.mkdir(parents=True)
        (root / M.REPORT_DIR / entry["file"]).write_bytes(M.canonical_bytes(M.ROOT / M.REPORT_DIR / entry["file"]))
        (root / M.REGISTRY).write_text(json.dumps({"schemaVersion": 1, "sources": [entry]}), encoding="utf-8")
        return doc, entry

    def test_all_archives_are_bound_and_every_row_has_resolvable_provenance(self):
        actual = {p.name for p in (M.ROOT / M.REPORT_DIR).glob("*.json") if p.name != M.JSON_OUTPUT.name}
        self.assertEqual(actual, set(self.entries))
        for source in self.matrix["sources"]:
            doc = M.read_json(M.canonical_bytes(M.ROOT / M.REPORT_DIR / source["file"]))
            for row in self.rows(source["file"][:-5]):
                self.assertIsInstance(M.resolve_pointer(doc, row["pointer"]), dict)
                env = M.resolve_pointer(doc, row["environmentPointer"])
                self.assertTrue(env is None or isinstance(env, dict))
        self.assertFalse(self.matrix["crossReportTotalsComputed"])
        self.assertNotIn("summary", self.matrix)

    def test_official_native_failure_and_translated_success_remain_distinct(self):
        native, translated = self.rows("2026-09-02-m5-16kb-execution")
        self.assertEqual((native["status"], native["rounds"][0]["passed"], native["rounds"][0]["total"]), ("failed", 2, 5))
        self.assertFalse(native["acceptedForRecordedScope"])
        self.assertEqual(translated["environment"]["deviceAbi"], "x86_64")
        self.assertEqual(translated["environment"]["runtimeAbi"], "arm64-v8a")
        self.assertEqual(translated["environment"]["execution"], "translated")
        self.assertTrue(translated["acceptedForRecordedScope"])
        self.assertIsNone(translated["environment"]["kernelMappingPages"])

    def test_available_arm_bridge_does_not_relabel_x86_payload_execution(self):
        for row in self.rows("2026-09-13-m5-ten-patch-jsc-binder"):
            self.assertEqual(row["environment"]["bridge"], "libndk_translation.so")
            self.assertEqual(row["environment"]["execution"], "native")
            self.assertEqual(row["runtime"]["sha256"], "a237dc8c13fbef6366a36769ea9a6d729fd24307b0df93bb051be8d997f8dcd5")

    def test_x86_user_pages_kernel_pages_and_pressure_units_are_separate(self):
        rows = self.rows("2026-09-13-m5-ten-patch-jsc-pressure")
        self.assertEqual([r["environment"]["pages"] for r in rows], [4096, 16384])
        self.assertEqual([r["environment"]["kernelMappingPages"] for r in rows], [4096, 4096])
        self.assertTrue(rows[1]["environment"]["userPageSizeEmulated"])
        self.assertEqual(sum(x["passed"] for r in rows for x in r["rounds"]), 28)
        self.assertEqual({x["unit"] for r in rows for x in r["rounds"]}, {"modes"})
        binder = self.rows("2026-09-13-m5-ten-patch-jsc-binder")
        self.assertEqual(sum(x["passed"] for r in binder for x in r["rounds"]), 32)
        self.assertTrue(all(r["environment"]["kernelMappingPages"] is None for r in binder))

    def test_nine_patch_and_ten_patch_evidence_is_not_merged(self):
        old = self.rows("2026-09-12-m5-x86-16k-jsc-binder")[0]
        new = self.rows("2026-09-13-m5-ten-patch-jsc-binder")[0]
        self.assertNotEqual(old["runtime"]["commit"], new["runtime"]["commit"])
        self.assertNotEqual(old["runtime"]["sha256"], new["runtime"]["sha256"])
        self.assertNotEqual(old["apkSha256"], new["apkSha256"])
        repeated = self.rows("2026-09-12-m5-x86-16k-final-binder")[0]
        self.assertEqual(old["runtime"]["sha256"], repeated["runtime"]["sha256"])
        self.assertNotEqual(old["source"], repeated["source"])

    def test_original_api28_async_failure_stays_failed_with_passing_subset(self):
        row = self.rows("2026-09-13-m3-blocked-async-api28-failure")[0]
        self.assertEqual(row["status"], "failed")
        self.assertFalse(row["acceptedForRecordedScope"])
        self.assertEqual([(r["passed"], r["total"]) for r in row["rounds"]], [(29, 31), (29, 31)])
        self.assertEqual(row["runtime"]["revision"], "1.4.0+7b9ac2668")
        fixed = self.rows("2026-09-13-m3-blocked-pidfd-fix")[0]
        self.assertEqual(fixed["runtime"]["revision"], "1.4.0+a9c76a599")
        self.assertTrue(fixed["acceptedForRecordedScope"])

    def test_directory_escape_failure_is_not_rewritten_by_later_fix(self):
        old = self.rows("2026-09-10-m3-openat2-confinement")
        new = self.rows("2026-09-10-m3-scoped-open-fix")
        self.assertTrue(all(r["status"] == "failed" for r in old))
        self.assertTrue(all(x["passed"] == 23 and x["total"] == 24 for r in old for x in r["rounds"]))
        self.assertTrue(all(r["acceptedForRecordedScope"] for r in new))
        self.assertNotEqual(old[0]["runtime"]["sha256"], new[0]["runtime"]["sha256"])

    def test_preliminary_success_is_visible_but_excluded_from_acceptance(self):
        row = self.rows("2026-09-12-jsc-pressure-preliminary-diagnostics")[2]
        self.assertEqual(row["status"], "passed")
        self.assertTrue(row["recordedOutcome"])
        self.assertFalse(row["sourceReportedPassed"])
        self.assertFalse(row["acceptedForRecordedScope"])
        self.assertIsNone(row["environment"]["kernelMappingPages"])
        self.assertTrue(all(x["passed"] == 7 for x in row["rounds"]))

    def test_missing_diagnostic_observations_are_unknown_never_zero(self):
        row = self.rows("2026-09-12-binder-preliminary-diagnostics")[0]
        self.assertTrue(all(x["passed"] is None and x["total"] is None for x in row["rounds"]))
        missing_device = self.rows("2026-09-12-binder-preliminary-diagnostics")[2]
        self.assertIsNone(missing_device["environment"]["api"])
        self.assertIsNone(missing_device["runtime"]["sha256"])
        startup = self.rows("2026-09-13-m3-blocked-pidfd-binder-startup-failure")[0]
        self.assertEqual(startup["rounds"][0]["passed"], 8)
        self.assertIsNone(startup["rounds"][1]["passed"])
        self.assertFalse(startup["acceptedForRecordedScope"])

    def test_trace_completed_does_not_mean_compatibility_passed(self):
        for row in self.rows("2026-09-13-m3-blocked-pidfd-diagnosis"):
            self.assertFalse(row["acceptedForRecordedScope"])
            self.assertEqual(row["rounds"][0]["unit"], "observations")
            self.assertIsNone(row["rounds"][0]["passed"])
        failed = self.rows("2026-09-13-m3-signal-trace-harness-failure")[0]
        self.assertEqual(failed["status"], "failed")

    def test_shell_and_signed_release_keep_their_own_scope_and_units(self):
        shell = self.rows("2026-09-03-m2-patched-runtime-shell-smoke")[0]
        self.assertEqual(shell["category"], "shell")
        release = self.rows("2026-09-08-v0.2.0-release")
        self.assertEqual([r["apkVariant"] for r in release], ["arm64-v8a", "universal"])
        self.assertTrue(all(x["unit"] == "groups" and x["total"] is None for r in release for x in r["rounds"]))
        for source in self.matrix["sources"]:
            if source["category"] in ("build", "supplement"):
                self.assertEqual(source["rows"], 0)

    def test_changed_probe_payload_or_omitted_result_is_rejected(self):
        doc, entry = self.source("2026-09-13-m3-blocked-pidfd-fix")
        changed = copy.deepcopy(doc)
        changed["reports"][0]["runs"][1]["runtimeSha256"] = "a" * 64
        with self.assertRaisesRegex(M.MatrixError, "runtime payload hash|runtime"):
            M.project_source(changed, entry)
        changed = copy.deepcopy(doc)
        del changed["reports"][0]["runs"][0]["probes"][0]["passed"]
        with self.assertRaisesRegex(M.MatrixError, "Probe outcome"):
            M.project_source(changed, entry)

    def test_changed_apk_or_environment_cannot_share_a_row(self):
        doc, entry = self.source("2026-09-13-m3-blocked-pidfd-fix")
        for mutate in (
            lambda r: r.update(installedApkSha256="b" * 64),
            lambda r: r["environment"].update(pageSizeBytes=16384),
        ):
            changed = copy.deepcopy(doc)
            mutate(changed["reports"][0]["runs"][1])
            with self.assertRaisesRegex(M.MatrixError, "Drift within one environment"):
                M.project_source(changed, entry)

    def test_summary_drift_or_dropped_round_cannot_silently_change_totals(self):
        doc, entry = self.source("2026-09-13-m5-ten-patch-jsc-binder")
        doc["reports"][0]["rounds"].pop()
        with self.assertRaisesRegex(M.MatrixError, "summary mismatch"):
            M.project_source(doc, entry)

    def test_duplicate_binder_tests_and_pressure_modes_are_rejected(self):
        doc, entry = self.source("2026-09-13-m5-ten-patch-jsc-binder")
        tests = doc["reports"][0]["rounds"][0]["passedTests"]
        tests[1] = tests[0]
        with self.assertRaisesRegex(M.MatrixError, "Duplicate Binder"):
            M.project_source(doc, entry)
        doc, entry = self.source("2026-09-13-m5-ten-patch-jsc-pressure")
        modes = doc["reports"][0]["rounds"][0]["pressure"]
        modes[1] = copy.deepcopy(modes[0])
        with self.assertRaisesRegex(M.MatrixError, "Duplicate pressure"):
            M.project_source(doc, entry)

    def test_pressure_page_disagreement_is_rejected(self):
        doc, entry = self.source("2026-09-13-m5-ten-patch-jsc-pressure")
        doc["reports"][1]["device"]["pages"] = "4096"
        with self.assertRaisesRegex(M.MatrixError, "pages disagree"):
            M.project_source(doc, entry)

    def test_native_label_cannot_override_a_conflicting_payload_abi(self):
        with self.assertRaisesRegex(M.MatrixError, "Native execution contradicts"):
            M.environment({"nativeExecution": True, "abi": "x86_64", "machine": "x86_64"}, "arm64-v8a")

    def test_registry_rejects_duplicate_or_unsafe_paths(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _, entry = self.fixture(root)
            for sources, message in (([entry, entry], "Duplicate registered"),
                                     ([{**entry, "file": "../outside.json"}], "Unsafe source filename")):
                (root / M.REGISTRY).write_text(json.dumps({"schemaVersion": 1, "sources": sources}), encoding="utf-8")
                with self.assertRaisesRegex(M.MatrixError, message):
                    M.build_matrix(root)

    def test_device_acceptance_cannot_silently_become_index_only(self):
        doc, entry = self.source("2026-09-01-m1")
        with self.assertRaisesRegex(M.MatrixError, "index-only"):
            M.project_source(doc, {**entry, "adapter": "index"})

    def test_unregistered_and_missing_sources_fail_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _, entry = self.fixture(root)
            extra = root / M.REPORT_DIR / "2026-09-14-new.json"
            extra.write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(M.MatrixError, "Unregistered or missing"):
                M.build_matrix(root)
            extra.unlink()
            (root / M.REPORT_DIR / entry["file"]).unlink()
            with self.assertRaisesRegex(M.MatrixError, "Unregistered or missing"):
                M.build_matrix(root)

    def test_changed_archive_fails_before_any_generated_output_is_written(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _, entry = self.fixture(root)
            M.generate(root)
            before = {p: (root / p).read_bytes() for p in (M.JSON_OUTPUT, M.MARKDOWN_OUTPUT)}
            with (root / M.REPORT_DIR / entry["file"]).open("ab") as f:
                f.write(b" ")
            for check in (False, True):
                with self.assertRaisesRegex(M.MatrixError, "Archived source changed"):
                    M.generate(root, check)
            self.assertEqual(before, {p: (root / p).read_bytes() for p in before})

    def test_check_is_read_only_and_generation_is_deterministic_across_line_endings(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _, entry = self.fixture(root)
            source = root / M.REPORT_DIR / entry["file"]
            expected = M.artifacts(root)
            source.write_bytes(source.read_bytes().replace(b"\n", b"\r\n"))
            self.assertEqual(expected, M.artifacts(root))
            M.generate(root)
            paths = [source, root / M.JSON_OUTPUT, root / M.MARKDOWN_OUTPUT]
            before = [(p.read_bytes(), p.stat().st_mtime_ns) for p in paths]
            self.assertEqual([], M.generate(root, check=True))
            self.assertEqual(before, [(p.read_bytes(), p.stat().st_mtime_ns) for p in paths])
            (root / M.MARKDOWN_OUTPUT).write_text("stale", encoding="utf-8")
            with self.assertRaisesRegex(M.MatrixError, "Stale compatibility matrix"):
                M.generate(root, check=True)
            self.assertEqual("stale", (root / M.MARKDOWN_OUTPUT).read_text(encoding="utf-8"))

    def test_duplicate_json_keys_and_changed_schema_are_rejected(self):
        with self.assertRaisesRegex(M.MatrixError, "Duplicate JSON key"):
            M.read_json(b'{"passed": false, "passed": true}')
        doc, entry = self.source("2026-09-01-m1")
        doc["schemaVersion"] = 99
        with self.assertRaisesRegex(M.MatrixError, "schema changed"):
            M.project_source(doc, entry)

    def test_markdown_cells_escape_table_and_html_syntax(self):
        self.assertEqual(M.cell('Phone|<script>\r\nnext'), 'Phone&#124;&lt;script&gt;<br>next')
        self.assertEqual(M.cell(None), '未记录')
        self.assertEqual(M.cell(0), '0')


if __name__ == "__main__":
    unittest.main()
