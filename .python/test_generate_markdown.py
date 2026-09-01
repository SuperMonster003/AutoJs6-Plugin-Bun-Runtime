from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / ".python" / "generate_markdown.py"
SPEC = importlib.util.spec_from_file_location("generate_markdown", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
generate_markdown = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generate_markdown)


class MarkdownGenerationTest(unittest.TestCase):

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


if __name__ == "__main__":
    unittest.main()
