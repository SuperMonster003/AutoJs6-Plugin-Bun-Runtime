"""Exercise the exact locked Linux spawn fallback and call site, without Bun/JSC."""

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
HEADER = "src/jsc/bindings/bun-spawn-fd.h"


def extract_locked_code():
    series = json.loads((ROOT / "patches/series.lock.json").read_text())
    records = [p for p in series["downstreamBackport"]["patches"] if HEADER in p["affectedPaths"]]
    if len(records) != 1:
        raise ValueError("exactly one locked spawn patch is required")
    record = records[0]
    patch = (ROOT / "patches" / record["path"]).read_bytes()
    if len(patch) != record["bytes"] or hashlib.sha256(patch).hexdigest() != record["sha256"]:
        raise ValueError("spawn patch bytes differ from lock")
    text = patch.decode()
    section = text.split(f"diff --git a/{HEADER} b/{HEADER}\n")[1].split("diff --git ")[0]
    match = re.fullmatch(
        r"new file mode 100644\nindex 0{40}\.\.([0-9a-f]{40})\n--- /dev/null\n"
        + re.escape(f"+++ b/{HEADER}\n") + r"@@ -0,0 \+1,(\d+) @@\n((?:\+[^\n]*\n)+)\n?", section)
    if not match:
        raise ValueError("spawn header is not a complete new-file hunk")
    lines = match[3].splitlines(keepends=True)
    if len(lines) != int(match[2]):
        raise ValueError("spawn header hunk length drifted")
    header = "".join(line[1:] for line in lines).encode()
    if hashlib.sha1(f"blob {len(header)}\0".encode() + header).hexdigest() != match[1]:
        raise ValueError("spawn header blob drifted")
    cpp = text.split("diff --git a/src/jsc/bindings/bun-spawn.cpp b/src/jsc/bindings/bun-spawn.cpp\n")[1]
    after = "\n".join(line[1:] for line in cpp.splitlines() if line.startswith(" ") or (line.startswith("+") and not line.startswith("+++")))
    wrapper = re.search(r"static inline int closeRangeOrLoop\([^\n]+\n\{\n.*?\n\}", after, re.S)
    callsite = re.search(r"        if \(current_max_fd < INT_MAX && closeRangeOrLoop\([^\n]+\n            return childFailed\(\);\n        \}", after)
    if not wrapper or not callsite:
        raise ValueError("complete range wrapper and fail-closed spawn call site are required")
    before = "\n".join(line[1:] for line in cpp.splitlines() if line.startswith(" ") or (line.startswith("-") and not line.startswith("---")))
    original = re.search(r"static inline int getMaxFd\(.*?static inline void closeRangeOrLoop\([^\n]+\n\{\n.*?\n\}", before, re.S)
    if not original:
        raise ValueError("complete original range implementation is required for the failing control")
    return header, wrapper[0], callsite[0], original[0]


class SpawnFdTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix="bun-spawn-fd-")
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.directory = Path(cls.scratch.name)
        header, wrapper, callsite, original = extract_locked_code()
        (cls.directory / "bun-spawn-fd.h").write_bytes(header)
        (cls.directory / "spawn-range.inc").write_text(wrapper + "\n")
        (cls.directory / "spawn-callsite.inc").write_text(callsite + "\n")
        compiler = os.environ.get("CXX", "c++")
        for mode, flags in [("real", []), ("fake", ["-DFAKE_SYSCALLS"])]:
            result = subprocess.run([
                compiler, "-std=c++17", "-O2", "-Wall", "-Wextra", "-Werror", *flags,
                "-I", str(cls.directory), str(ROOT / "spawn-fd/spawn-fd.test.cpp"),
                "-o", str(cls.directory / mode),
            ], capture_output=True, text=True, timeout=60)
            if result.returncode:
                raise RuntimeError(result.stdout + result.stderr)
        # Inspect a helper-only object: allocator/directory-stream/lock calls are forbidden.
        unit = cls.directory / "symbols.cpp"
        unit.write_text('#include "bun-spawn-fd.h"\nextern "C" int probe(int a, int b, bool c) { return bun_spawn_fd_fallback(a, b, c); }\n')
        subprocess.run([compiler, "-std=c++17", "-O2", "-c", str(unit), "-o", str(cls.directory / "symbols.o")], check=True, timeout=60)
        (cls.directory / "spawn-range.inc").write_text(original + "\n")
        (cls.directory / "spawn-callsite.inc").write_text("        closeRangeOrLoop(current_max_fd + 1, INT_MAX, true);\n")
        result = subprocess.run([compiler, "-std=c++17", "-O2", "-Wall", "-Wextra", "-Werror",
                                 "-I", str(cls.directory), str(ROOT / "spawn-fd/spawn-fd.test.cpp"),
                                 "-o", str(cls.directory / "original")], capture_output=True, text=True, timeout=60)
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)

    def run_case(self, binary, mode):
        result = subprocess.run([str(self.directory / binary), mode], capture_output=True, text=True, timeout=10)
        self.assertEqual((result.returncode, result.stdout, result.stderr), (0, f"OK {mode}\n", ""), mode)

    def test_real_vfork_exec_high_fds_and_lowered_limits(self):
        for mode in ["spawn-soft", "spawn-hard", "spawn-unlowered", "spawn-exhausted", "spawn-native", "range-mark", "range-close"]:
            with self.subTest(mode=mode):
                self.run_case("real", mode)

    def test_errors_bounds_and_exact_call_site(self):
        cases = [
            "success", "inclusive-range", "empty", "already-marked", "preserve-flags", "invalid-first", "invalid-last",
            "open-error", "open-emfile", "read-error", "get-error", "set-error", "get-ebadf", "set-ebadf",
            "directory-close-error", "directory-close-eintr", "read-and-close-error",
            "target-close-error", "target-close-eintr", "target-close-ebadf", "target-close-success",
            "invalid-name", "negative-name", "overflow-name", "empty-name", "unterminated",
            "short-header", "zero-record", "short-record", "long-record", "unaligned-record", "trailing-byte", "oversized-read",
            "open-eintr-once", "read-eintr-once", "get-eintr-once", "set-eintr-once",
            "open-eintr-limit", "read-eintr-limit", "get-eintr-limit", "set-eintr-limit",
            "entry-exact-limit", "entry-limit", "native-success", "integration-error",
        ]
        for mode in cases:
            with self.subTest(mode=mode):
                self.run_case("fake", mode)

    def test_helper_only_uses_syscall_and_errno(self):
        result = subprocess.run(["nm", "-u", str(self.directory / "symbols.o")], check=True, capture_output=True, text=True, timeout=10)
        symbols = {line.split()[-1] for line in result.stdout.splitlines()}
        self.assertTrue({"__errno_location", "syscall"}.issubset(symbols))
        self.assertLessEqual(symbols, {"__errno_location", "syscall", "__stack_chk_fail", "_GLOBAL_OFFSET_TABLE_"})

    def test_original_locked_loop_fails_the_same_high_fd_assertion(self):
        for mode, code in [("spawn-soft", 93), ("spawn-hard", 93), ("spawn-unlowered", 94), ("spawn-exhausted", 95)]:
            with self.subTest(mode=mode):
                result = subprocess.run([str(self.directory / "original"), mode], capture_output=True, text=True, timeout=10)
                self.assertEqual((result.returncode, result.stdout, result.stderr), (90, "", f"child exit {code}\n"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
