"""Compile the complete before/after reload function from the locked patch."""
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
SOURCE = 'src/jsc/bindings/c-bindings.cpp'


def locked_sources():
    series = json.loads((ROOT / 'patches/series.lock.json').read_text())
    record = series['downstreamBackport']['patches'][12]
    if record['order'] != 13 or record['affectedPaths'] != [SOURCE]:
        raise ValueError('exact thirteenth reload patch required')
    patch = (ROOT / 'patches' / record['path']).read_bytes()
    if len(patch) != record['bytes'] or hashlib.sha256(patch).hexdigest() != record['sha256']:
        raise ValueError('locked patch bytes changed')
    section = patch.decode().split(f'diff --git a/{SOURCE} b/{SOURCE}\n')[1]
    match = re.fullmatch(r'index ([0-9a-f]{40})\.\.([0-9a-f]{40}) 100644\n--- a/' + re.escape(SOURCE) +
        r'\n\+\+\+ b/' + re.escape(SOURCE) + r'\n@@ -1,(\d+) \+1,(\d+) @@\n([\s\S]+)', section)
    if not match:
        raise ValueError('complete source before/after hunk required')
    lines = match[5].splitlines(keepends=True)
    sources = [''.join(s[1:] for s in lines if s.startswith(prefix)).encode()
               for prefix in [(' ', '-'), (' ', '+')]]
    for data, count, blob in zip(sources, [match[3], match[4]], [match[1], match[2]]):
        if len(data.splitlines()) != int(count) or hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest() != blob:
            raise ValueError('complete source blob or line count changed')
    # The original IPC and signal lifecycle is byte-identical, not reconstructed.
    marker = b'    // Preserve the IPC channel to the parent across the execve:'
    end = b'#endif // !OS(WINDOWS)'
    if sources[0].split(marker)[1].split(end)[0] != sources[1].split(marker)[1].split(end)[0]:
        raise ValueError('existing IPC/signal lifecycle changed')
    return sources


class ReloadFdTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix='bun-reload-fd-')
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.directory = Path(cls.scratch.name)
        spec = importlib.util.spec_from_file_location('spawn_fd_source', ROOT / 'spawn-fd/test_spawn_fd.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        header, *_ = module.extract_locked_code()
        (cls.directory / 'bun-spawn-fd.h').write_bytes(header)
        for name, source in zip(['original', 'candidate'], locked_sources()):
            start = source.index(b'static void unset_cloexec(int fd)')
            end = source.index(b'#endif // !OS(WINDOWS)', start)
            (cls.directory / 'reload.inc').write_bytes(source[start:end])
            for target in ['LINUX', 'FREEBSD', 'DARWIN']:
                result = subprocess.run([os.environ.get('CXX', 'c++'), '-std=c++17', '-O2',
                    '-Wall', '-Wextra', '-Werror', '-pthread', f'-DTARGET_{target}=1', '-I', str(cls.directory),
                    str(ROOT / 'reload-fd/reload-fd.test.cpp'), '-o', str(cls.directory / f'{name}-{target}')],
                    capture_output=True, text=True, timeout=60)
                if result.returncode:
                    raise RuntimeError(result.stdout + result.stderr)

    def run_mode(self, binary, mode):
        return subprocess.run([str(self.directory / binary), mode], capture_output=True, text=True, timeout=10)

    def test_linux_exec_closes_high_fds_preserving_stdio_and_explicit_ipc(self):
        for mode in ['native', 'enosys', 'einval', 'eio', 'ipc3', 'ipc256', 'ipc70000',
                     'ipc-invalid', 'ipc-overflow', 'ipc-negative', 'ipc-stdio', 'thread-reload']:
            with self.subTest(mode=mode):
                result = self.run_mode('candidate-LINUX', mode)
                self.assertEqual((result.returncode, result.stdout, result.stderr), (0, f'OK {mode}\n', ''))

    def test_original_missing_fallback_is_a_failing_control(self):
        for mode in ['enosys', 'einval', 'eio']:
            with self.subTest(mode=mode):
                result = self.run_mode('original-LINUX', mode)
                self.assertEqual((result.returncode, result.stdout, result.stderr),
                                 (90, '', 'FAIL reload descriptor marking\n'))

    def test_failure_exits_before_exec_and_cleans_only_owned_directory(self):
        for mode, error in [('open-error', 13), ('read-error', 5), ('get-error', 5),
                            ('set-error', 5), ('close-error', 5), ('eintr-exhausted', 4)]:
            with self.subTest(mode=mode):
                result = self.run_mode('candidate-LINUX', mode)
                self.assertEqual((result.returncode, result.stdout, result.stderr),
                    (1, '', f'Bun: cannot mark reload file descriptors close-on-exec (errno {error})\n'))

    def test_non_linux_policy_is_unchanged(self):
        for target in ['FREEBSD', 'DARWIN']:
            before = self.run_mode('original-' + target, 'policy')
            after = self.run_mode('candidate-' + target, 'policy')
            self.assertEqual((before.returncode, before.stdout, before.stderr), (0, 'OK policy\n', ''))
            self.assertEqual((after.returncode, after.stdout, after.stderr), (0, 'OK policy\n', ''))


if __name__ == '__main__':
    unittest.main(verbosity=2)
