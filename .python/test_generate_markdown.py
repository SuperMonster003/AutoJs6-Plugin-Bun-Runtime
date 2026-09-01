from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / ".python" / "generate_markdown.py"
SPEC = importlib.util.spec_from_file_location("generate_markdown", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
generate_markdown = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generate_markdown)


class MarkdownGenerationTest(unittest.TestCase):

    def write_android_compatibility_fixture(
        self,
        root: Path,
        *,
        manifest_api: int = 33,
        lock_api: int = 33,
    ) -> dict[str, str]:
        (root / "tools/bun-runtime").mkdir(parents=True)
        (root / "version.properties").write_text(
            f"MIN_SDK_VERSION={manifest_api}\n",
            encoding="utf-8",
        )
        (root / "tools/bun-runtime/runtime.lock.json").write_text(
            json.dumps({"androidBuild": {"minimumSupportedApi": lock_api}}),
            encoding="utf-8",
        )
        return {
            "android_min_sdk": "33",
            "min_android_version": "13",
        }

    def test_expected_artifact_inventory_is_complete(self) -> None:
        artifacts = generate_markdown.build_artifacts(ROOT)
        self.assertEqual(generate_markdown.EXPECTED_ARTIFACT_COUNT, len(artifacts))
        self.assertIn(ROOT / "README.md", artifacts)
        self.assertIn(ROOT / "app/src/main/assets/doc/CHANGELOG.md", artifacts)
        self.assertIn(ROOT / "app/src/main/res/raw/plugin_instruction.md", artifacts)

    def test_checked_in_artifacts_match_sources(self) -> None:
        artifacts = generate_markdown.build_artifacts(ROOT)
        generate_markdown.check_artifacts(ROOT, artifacts)

    def test_duplicate_json_keys_are_rejected(self) -> None:
        with self.assertRaises(generate_markdown.MarkdownGenerationError):
            generate_markdown.reject_duplicate_pairs([("same", 1), ("same", 2)])

    def test_android_minimum_api_sources_are_aligned(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            common = self.write_android_compatibility_fixture(root)
            generate_markdown.validate_android_compatibility_alignment(root, common)

    def test_android_minimum_api_rejects_runtime_lock_drift(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            common = self.write_android_compatibility_fixture(root, lock_api=34)
            with self.assertRaisesRegex(generate_markdown.MarkdownGenerationError, "Android minimum API drift"):
                generate_markdown.validate_android_compatibility_alignment(root, common)

    def test_android_minimum_api_rejects_documentation_drift(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            common = self.write_android_compatibility_fixture(root)
            common["android_min_sdk"] = "34"
            with self.assertRaisesRegex(generate_markdown.MarkdownGenerationError, "Android minimum API drift"):
                generate_markdown.validate_android_compatibility_alignment(root, common)

    def test_android_version_name_must_match_api_level(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            common = self.write_android_compatibility_fixture(root)
            common["min_android_version"] = "14"
            with self.assertRaisesRegex(generate_markdown.MarkdownGenerationError, "maps to Android 13"):
                generate_markdown.validate_android_compatibility_alignment(root, common)


if __name__ == "__main__":
    unittest.main()
