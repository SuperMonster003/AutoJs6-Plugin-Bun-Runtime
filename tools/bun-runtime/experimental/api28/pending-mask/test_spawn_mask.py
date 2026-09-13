"""Compile the complete locked before/after spawn source, without Bun/JSC."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
CPP = 'src/jsc/bindings/bun-spawn.cpp'

def locked_sources():
    series = json.loads((ROOT / 'patches/series.lock.json').read_text())
    record = series['downstreamBackport']['patches'][10]
    if record['order'] != 11 or record['affectedPaths'] != [CPP]:
        raise ValueError('exact eleventh spawn-mask patch required')
    patch = (ROOT / 'patches' / record['path']).read_bytes()
    if len(patch) != record['bytes'] or hashlib.sha256(patch).hexdigest() != record['sha256']:
        raise ValueError('locked patch bytes changed')
    section = patch.decode().split(f'diff --git a/{CPP} b/{CPP}\n')[1]
    match = re.fullmatch(r'index ([0-9a-f]{40})\.\.([0-9a-f]{40}) 100644\n--- a/' + re.escape(CPP) +
        r'\n\+\+\+ b/' + re.escape(CPP) + r'\n@@ -1,(\d+) \+1,(\d+) @@\n([\s\S]+)', section)
    if not match:
        raise ValueError('complete one-file before/after hunk required')
    lines = match[5].splitlines(keepends=True)
    before = ''.join(s[1:] for s in lines if s.startswith((' ', '-'))).encode()
    after = ''.join(s[1:] for s in lines if s.startswith((' ', '+'))).encode()
    for data, count, blob in [(before, match[3], match[1]), (after, match[4], match[2])]:
        if len(data.splitlines()) != int(count) or hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest() != blob:
            raise ValueError('complete source blob or line count changed')
    return before, after

class SpawnMaskTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix='bun-pending-mask-')
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.directory = Path(cls.scratch.name)
        spec = importlib.util.spec_from_file_location('spawn_fd_source', ROOT / 'spawn-fd/test_spawn_fd.py')
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        (cls.directory / 'bun-spawn-fd.h').write_bytes(helper.extract_locked_code()[0])
        (cls.directory / 'root.h').write_text('''#pragma once
#define OS(name) OS_##name
#define OS_LINUX 1
#define OS_ANDROID 1
#define OS_DARWIN 0
#define OS_FREEBSD 0
#define CPU(name) CPU_##name
#define CPU_X86_64 1
#define CPU_ARM64 0
#ifndef __has_feature
#define __has_feature(value) 0
#endif
''')
        compiler = os.environ.get('CXX', 'c++')
        for name, source in zip(['original', 'candidate'], locked_sources()):
            (cls.directory / 'spawn.inc').write_bytes(source)
            # The unchanged production source uses C-style `{ 0 }` for sigaction.
            result = subprocess.run([compiler, '-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror',
                '-Wno-missing-field-initializers', '-Wno-missing-braces', '-pthread',
                '-I', str(cls.directory), str(ROOT / 'pending-mask/spawn-mask.test.cpp'), '-o', str(cls.directory / name)],
                capture_output=True, text=True, timeout=60)
            if result.returncode:
                raise RuntimeError(result.stdout + result.stderr)

    def test_complete_production_function_preserves_pending_mask_children_and_errors(self):
        for mode in ['pending-native', 'pending-trap', 'blocked-native', 'blocked-trap', 'unblocked-trap',
                     'pending-cgroup-trap', 'pending-cgroup-error', 'unblocked-cgroup-trap',
                     'pending-cgroup-then-unblocked', 'mask-parent-error', 'mask-child-setup-error',
                     'mask-child-restore-error', 'exec-error', 'pending-threaded']:
            with self.subTest(mode=mode):
                result = subprocess.run([str(self.directory / 'candidate'), mode], capture_output=True, text=True, timeout=15)
                self.assertEqual((result.returncode, result.stdout, result.stderr), (0, f'OK {mode}\n', ''))

    def test_original_complete_source_fails_the_same_pending_assertion(self):
        for mode in ['pending-native', 'pending-trap']:
            with self.subTest(mode=mode):
                result = subprocess.run([str(self.directory / 'original'), mode], capture_output=True, text=True, timeout=15)
                self.assertEqual(result.returncode, 90)
                self.assertEqual(result.stdout, '')
                self.assertIn('FAIL parent pending signal retained across spawn', result.stderr)

if __name__ == '__main__':
    unittest.main(verbosity=2)
