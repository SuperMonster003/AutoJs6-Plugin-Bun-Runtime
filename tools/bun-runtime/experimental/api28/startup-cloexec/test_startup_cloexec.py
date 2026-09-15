"""Compile and exercise the exact startup helper added by the locked Bun patch (Linux)."""

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
HEADER = "src/jsc/bindings/bun-startup-cloexec.h"


def extract_locked_header():
    series = json.loads((ROOT / "patches/series.lock.json").read_text())
    records = [p for p in series["downstreamBackport"]["patches"] if HEADER in p["affectedPaths"]]
    if len(records) != 1:
        raise ValueError("exactly one locked startup patch is required")
    record = records[0]
    patch = (ROOT / "patches" / record["path"]).read_bytes()
    if len(patch) != record["bytes"] or hashlib.sha256(patch).hexdigest() != record["sha256"]:
        raise ValueError("startup patch bytes differ from lock")
    text = patch.decode("utf-8")
    section = text.split(f"diff --git a/{HEADER} b/{HEADER}\n")[1].split("diff --git ")[0]
    match = re.fullmatch(
        r"new file mode 100644\nindex 0{40}\.\.([0-9a-f]{40})\n--- /dev/null\n"
        + re.escape(f"+++ b/{HEADER}\n") + r"@@ -0,0 \+1,(\d+) @@\n((?:\+[^\n]*\n)+)\n?", section,
    )
    if not match:
        raise ValueError("startup header must be one complete, regular new-file patch")
    lines = match[3].splitlines(keepends=True)
    if len(lines) != int(match[2]):
        raise ValueError("startup header hunk count drifted")
    header = "".join(line[1:] for line in lines).encode()
    blob = hashlib.sha1(f"blob {len(header)}\0".encode() + header).hexdigest()
    if blob != match[1]:
        raise ValueError("startup header Git blob drifted")
    return header, text


class StartupCloexecTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix="bun-startup-cloexec-")
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.directory = Path(cls.scratch.name)
        header, cls.patch = extract_locked_header()
        (cls.directory / "bun-startup-cloexec.h").write_bytes(header)
        added = [line[1:] for line in cls.patch.splitlines() if line.startswith("+") and not line.startswith("+++")]
        start = next(index for index, line in enumerate(added) if line.startswith("    if (bun_close_range("))
        callsite = added[start:start + 4]
        if callsite[-1] != "    }":
            raise ValueError("startup call site must retain its complete fail-closed branch")
        (cls.directory / "startup-callsite.inc").write_text("\n".join(callsite) + "\n")
        compiler = os.environ.get("CXX", "c++")
        for mode, flags in [("real", []), ("fake", ["-DFAKE_SYSCALLS"]),
                            ("startup", ["-DFAKE_SYSCALLS", "-DSTARTUP_INTEGRATION"])]:
            result = subprocess.run([
                compiler, "-std=c++17", "-O2", "-Wall", "-Wextra", "-Werror", *flags,
                "-I", str(cls.directory),
                str(ROOT / "startup-cloexec/startup-cloexec.test.cpp"),
                "-o", str(cls.directory / mode),
            ], capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                raise RuntimeError(f"{mode} harness failed to compile ({result.returncode}):\n{result.stderr}")

    def run_case(self, binary, mode, output=None):
        result = subprocess.run([str(self.directory / binary), mode], capture_output=True, text=True, timeout=10)
        self.assertEqual((result.returncode, result.stdout, result.stderr), (0, output or f"OK {mode}\n", ""))

    def test_real_high_fd_marking_and_exec(self):
        self.run_case("real", "real", "OK real-exec\n")

    def test_error_and_boundary_matrix(self):
        cases = [
            "success", "already-marked", "open-error", "dirfd-error", "read-error", "get-error", "set-error",
            "get-ebadf", "set-ebadf", "close-error", "invalid-name", "overflow-name", "negative-name",
            "open-eintr-once", "read-eintr-once", "get-eintr-once", "set-eintr-once",
            "open-eintr-limit", "read-eintr-limit", "get-eintr-limit", "set-eintr-limit",
            "entry-exact-limit", "entry-limit",
        ]
        for mode in cases:
            with self.subTest(mode=mode):
                self.run_case("fake", mode)

    def test_startup_call_site_is_fail_closed(self):
        self.run_case("startup", "success", "OK startup\n")
        self.run_case("startup", "native-success", "OK startup\n")
        result = subprocess.run([str(self.directory / "startup"), "open-error"], capture_output=True, text=True, timeout=10)
        self.assertEqual((result.returncode, result.stdout, result.stderr),
                         (1, "", "Bun: cannot mark inherited file descriptors close-on-exec (errno 13)\n"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
