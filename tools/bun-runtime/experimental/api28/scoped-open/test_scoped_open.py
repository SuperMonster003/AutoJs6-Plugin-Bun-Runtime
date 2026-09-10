"""Compile the exact locked read-only resolver and C bridge, not a copy."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
HEADER = 'src/jsc/bindings/bun-scoped-open.h'


def extract_locked_code():
    series = json.loads((ROOT / 'patches/series.lock.json').read_text())
    records = [p for p in series['downstreamBackport']['patches'] if HEADER in p['affectedPaths']]
    if len(records) != 1 or records[0]['origin'] != 'autojs6-scoped-open':
        raise ValueError('exactly one reviewed scoped-open patch required')
    record = records[0]
    patch = (ROOT / 'patches' / record['path']).read_bytes()
    if len(patch) != record['bytes'] or hashlib.sha256(patch).hexdigest() != record['sha256']:
        raise ValueError('scoped-open patch bytes drifted')
    text = patch.decode()
    section = text.split(f'diff --git a/{HEADER} b/{HEADER}\n')[1].split('diff --git ')[0]
    match = re.fullmatch(r'new file mode 100644\nindex 0{40}\.\.([0-9a-f]{40})\n--- /dev/null\n'
                         + re.escape(f'+++ b/{HEADER}\n') + r'@@ -0,0 \+1,(\d+) @@\n((?:\+[^\n]*\n)+)\n?', section)
    if not match:
        raise ValueError('complete scoped-open new-file hunk required')
    lines = match[3].splitlines(keepends=True)
    if len(lines) != int(match[2]):
        raise ValueError('scoped-open hunk length drifted')
    header = ''.join(line[1:] for line in lines).encode()
    if hashlib.sha1(f'blob {len(header)}\0'.encode() + header).hexdigest() != match[1]:
        raise ValueError('scoped-open header Git blob drifted')

    def postimage(path):
        part = text.split(f'diff --git a/{path} b/{path}\n')[1].split('diff --git ')[0]
        return '\n'.join(line[1:] for line in part.splitlines()
                         if line.startswith(' ') or (line.startswith('+') and not line.startswith('+++')))

    cpp = postimage('src/jsc/bindings/c-bindings.cpp')
    bridge = re.search(r'extern "C" int bun_open_in_root_readonly\([^\n]+\n\{\n[^}]+\n\}', cpp)
    if not bridge or 'return BunScopedOpen::resolve(root, path, flags, mode);' not in bridge[0]:
        raise ValueError('complete production C bridge required')
    rust = postimage('src/sys/lib.rs')
    for required in ['pub fn openat2_in_root(', 'static UNAVAILABLE:',
                     'let rc = unsafe { bun_open_in_root_readonly(dir.native(), path.as_ptr(), flags, mode as u32) };',
                     'Error::from_code_int(last_errno(), Tag::open)', 'Ok(Fd::from_native(rc))']:
        if required not in rust:
            raise ValueError('Rust fast-path/FFI/error/ownership wiring missing')
    if re.search(r'^        openat\(dir, path, flags, mode\)$', rust, re.M):
        raise ValueError('unconstrained fallback restored')
    return header, bridge[0]


class ScopedOpenTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix='bun-scoped-open-compile-')
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.directory = Path(cls.scratch.name)
        header, bridge = extract_locked_code()
        (cls.directory / 'bun-scoped-open.h').write_bytes(header)
        (cls.directory / 'binding.inc').write_text(bridge + '\n')
        cls.executable = cls.directory / 'scoped-open'
        result = subprocess.run([os.environ.get('CXX', 'c++'), '-std=c++17', '-O2', '-pthread',
                                 '-Wall', '-Wextra', '-Werror', '-I', str(cls.directory),
                                 str(ROOT / 'scoped-open/scoped-open.test.cpp'), '-o', str(cls.executable)],
                                capture_output=True, text=True, timeout=60)
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)

    def run_case(self, case):
        result = subprocess.run([str(self.executable), case], capture_output=True, text=True, timeout=20)
        self.assertEqual((result.returncode, result.stdout, result.stderr), (0, f'OK {case}\n', ''), case)

    def test_paths_links_flags_and_native_openat2_oracle(self):
        for case in ['functional', 'bounds', 'magic']:
            with self.subTest(case=case):
                self.run_case(case)

    def test_pinned_paths_parent_rename_and_concurrent_replacement(self):
        for case in ['pin-file', 'pin-link', 'move-parent', 'stress']:
            with self.subTest(case=case):
                self.run_case(case)

    def test_errors_eintr_budgets_and_descriptor_cleanup(self):
        for case in ['open-eintr', 'stat-eintr', 'fsstat-eintr', 'link-eintr', 'close-eintr', 'open-emfile',
                     'proc-denied', 'stat-denied', 'fsstat-denied', 'link-denied', 'link-truncated', 'fake-proc']:
            with self.subTest(case=case):
                self.run_case(case)

    def test_old_fallback_exposes_the_sentinel_rejected_by_the_new_resolver(self):
        self.run_case('old-control')


if __name__ == '__main__':
    unittest.main(verbosity=2)
