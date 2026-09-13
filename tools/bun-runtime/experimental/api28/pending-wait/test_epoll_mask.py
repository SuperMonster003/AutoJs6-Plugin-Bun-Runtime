"""Exercise the complete locked epoll wait function, before and after patch 12."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
SOURCE = 'packages/bun-usockets/src/eventing/epoll_kqueue.c'


def locked_sources():
    series = json.loads((ROOT / 'patches/series.lock.json').read_text())
    record = series['downstreamBackport']['patches'][11]
    if record['order'] != 12 or record['affectedPaths'] != [SOURCE]:
        raise ValueError('exact twelfth epoll-mask patch required')
    patch = (ROOT / 'patches' / record['path']).read_bytes()
    if len(patch) != record['bytes'] or hashlib.sha256(patch).hexdigest() != record['sha256']:
        raise ValueError('locked patch bytes changed')
    section = patch.decode().split(f'diff --git a/{SOURCE} b/{SOURCE}\n')[1]
    match = re.fullmatch(r'index ([0-9a-f]{40})\.\.([0-9a-f]{40}) 100644\n--- a/' + re.escape(SOURCE) +
        r'\n\+\+\+ b/' + re.escape(SOURCE) + r'\n@@ -1,(\d+) \+1,(\d+) @@\n([\s\S]+)', section)
    if not match:
        raise ValueError('complete one-file before/after hunk required')
    lines = match[5].splitlines(keepends=True)
    sources = [''.join(s[1:] for s in lines if s.startswith(prefix)).encode()
               for prefix in [(' ', '-'), (' ', '+')]]
    for data, count, blob in zip(sources, [match[3], match[4]], [match[1], match[2]]):
        if len(data.splitlines()) != int(count) or hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest() != blob:
            raise ValueError('complete source blob or line count changed')
    return sources


class EpollMaskTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix='bun-pending-wait-')
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.directory = Path(cls.scratch.name)
        for name, source in zip(['original', 'candidate'], locked_sources()):
            # Include the production global, raw ABI declaration and entire function.
            # No function body is copied or rewritten by the host fixture.
            start = source.index(b'static int has_epoll_pwait2 = -1;')
            end = source.index(b'extern int Bun__isEpollPwait2SupportedOnLinuxKernel();', start)
            (cls.directory / 'wait.inc').write_bytes(source[start:end])
            for target, defines in [('android', ['-D__ANDROID__=1']), ('linux', [])]:
                result = subprocess.run([os.environ.get('CC', 'cc'), '-std=c11', '-O2',
                    '-Wall', '-Wextra', '-Werror', '-pthread', *defines, '-I', str(cls.directory),
                    str(ROOT / 'pending-wait/epoll-mask.test.c'), '-o', str(cls.directory / f'{name}-{target}')],
                    capture_output=True, text=True, timeout=60)
                if result.returncode:
                    raise RuntimeError(result.stdout + result.stderr)

    def run_mode(self, binary, mode):
        return subprocess.run([str(self.directory / binary), mode], capture_output=True, text=True, timeout=8)

    def test_android_retains_pending_signals_and_excludes_optional_syscall(self):
        modes = ['pending-disabled', 'pending-unknown', 'pending-enabled',
                 'trap-disabled', 'trap-unknown', 'trap-enabled', 'trap-unblocked',
                 'zero', 'wake-finite', 'wake-infinite', 'eintr', 'bad-fd', 'bad-maxevents',
                 'rounding', 'saturation', 'deadline', 'thread-local']
        for mode in modes:
            with self.subTest(mode=mode):
                result = self.run_mode('candidate-android', mode)
                self.assertEqual((result.returncode, result.stdout, result.stderr), (0, f'OK {mode}\n', ''))

    def test_original_wait_delivers_pending_before_caller_unblocks(self):
        for mode in ['pending-disabled', 'trap-disabled']:
            with self.subTest(mode=mode):
                result = self.run_mode('original-android', mode)
                self.assertEqual(result.returncode, 90)
                self.assertEqual(result.stdout, '')
                self.assertIn('FAIL caller pending signals retained during wait', result.stderr)

    def test_linux_policy_and_both_wait_error_timeout_paths_are_unchanged(self):
        for mode in ['linux-old-mask', 'linux-new-mask', 'linux-new-eintr',
                     'linux-enosys', 'linux-eperm', 'linux-eopnotsupp', 'linux-eacces', 'linux-efault',
                     'linux-einval', 'linux-eio', 'linux-new-deadline', 'linux-new-zero', 'linux-new-infinite']:
            with self.subTest(mode=mode):
                before = self.run_mode('original-linux', mode)
                after = self.run_mode('candidate-linux', mode)
                self.assertEqual((before.returncode, before.stdout, before.stderr), (0, f'OK {mode}\n', ''))
                self.assertEqual((after.returncode, after.stdout, after.stderr), (before.returncode, before.stdout, before.stderr))


if __name__ == '__main__':
    unittest.main(verbosity=2)
