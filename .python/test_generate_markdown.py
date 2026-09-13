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

    def test_sample_library_matches_single_source_contract(self) -> None:
        generate_markdown.validate_samples(ROOT)

    def test_runtime_messages_reject_missing_empty_and_malformed_placeholders(self) -> None:
        reference = generate_markdown.read_android_strings(ROOT / "app/src/main/res/values/strings.xml")
        mutations = [
            ("runtime_error_timeout", ""),
            ("runtime_error_page_size", "Only %1$d bytes"),
            ("runtime_error_page_size", "%1$d then %1$d"),
            ("runtime_error_non_zero_exit", "%1$s"),
            ("runtime_error_timeout", "Invalid %s placeholder"),
            ("runtime_error_timeout", "错误。"),
        ]
        for key, value in mutations:
            with self.subTest(key=key, value=value):
                changed = {**reference, key: value}
                with self.assertRaises(generate_markdown.MarkdownGenerationError):
                    generate_markdown.validate_runtime_messages(changed, "fixture")
        del reference["runtime_help_activation"]
        with self.assertRaises(generate_markdown.MarkdownGenerationError):
            generate_markdown.validate_runtime_messages(reference, "fixture")

    def test_runtime_help_uses_exact_android_resources_in_every_language(self) -> None:
        for code, directory in generate_markdown.ANDROID_STRING_DIRECTORIES.items():
            strings = generate_markdown.read_android_strings(ROOT / "app/src/main/res" / directory / "strings.xml")
            help_text = generate_markdown.runtime_help_values(ROOT, code)["placeholder_runtime_help"]
            for key in ["runtime_help_activation", "runtime_help_android_version", "runtime_error_timeout",
                        "runtime_error_output_limit", "runtime_error_unavailable", "runtime_help_language"]:
                self.assertIn(strings[key], help_text, f"{code}/{key}")

    def test_sample_directive_must_be_the_first_line(self) -> None:
        source = (
            "// A comment before the directive is not allowed.\n"
            '"bun";\n'
            "console.log(Bun.version, process.platform);\n"
        )
        with self.assertRaisesRegex(generate_markdown.MarkdownGenerationError, "must start"):
            generate_markdown.validate_sample_source(Path("hello.bun.js"), source)

    def test_sample_relative_imports_are_rejected(self) -> None:
        source = (
            '"bun";\n'
            "// Project files are not transferred by the current contract.\n"
            'import value from "./value.js";\n'
            "console.log(value, Bun.version, process.platform);\n"
        )
        with self.assertRaisesRegex(generate_markdown.MarkdownGenerationError, "relative imports"):
            generate_markdown.validate_sample_source(Path("hello.bun.js"), source)

    def test_sample_package_install_commands_are_rejected(self) -> None:
        source = (
            '"bun";\n'
            "// Package installation is outside the current product boundary.\n"
            'Bun.spawn(["bun", "install"]);\n'
            "console.log(Bun.version, process.platform);\n"
        )
        with self.assertRaisesRegex(generate_markdown.MarkdownGenerationError, "install packages"):
            generate_markdown.validate_sample_source(Path("hello.bun.js"), source)

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
