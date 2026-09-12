"""The observer must preserve both handled and fatal SIGSYS outcomes on Linux."""
import json
import os
from pathlib import Path
import platform
import signal
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent


class TraceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if platform.machine() != 'x86_64':
            raise RuntimeError('native Linux x86_64 observer control required')
        cls.scratch = tempfile.TemporaryDirectory(prefix='bun-trace-test-')
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.directory = Path(cls.scratch.name)
        for source, binary in [('trace.c', 'trace'), ('trace-target.c', 'target')]:
            result = subprocess.run([os.environ.get('CC', 'cc'), '-std=c11', '-O2', '-Wall', '-Wextra', '-Werror',
                                     str(ROOT / source), '-o', str(cls.directory / binary)],
                                    capture_output=True, text=True, timeout=30)
            if result.returncode:
                raise RuntimeError(result.stdout + result.stderr)

    def test_forwarding_does_not_suppress_fatal_or_handled_signal(self):
        target, tracer = str(self.directory / 'target'), str(self.directory / 'trace')
        for mode in ['fatal', 'handled']:
            with self.subTest(mode=mode):
                plain = subprocess.run([target, 'run', '--no-install', '/' + mode], capture_output=True, text=True, timeout=5)
                traced = subprocess.run([tracer, target, '/' + mode], capture_output=True, text=True, timeout=5)
                expected = 0 if mode == 'handled' else -signal.SIGSYS
                self.assertEqual(plain.returncode, expected)
                self.assertEqual(traced.returncode, expected if expected == 0 else 128 - expected)
                self.assertEqual(traced.stdout, plain.stdout)
                self.assertEqual(plain.stderr, '')
                lines = traced.stderr.splitlines()
                self.assertEqual(len(lines), 2)
                self.assertTrue(lines[0].startswith('TRACE_SIGSYS='))
                info = json.loads(lines[0].split('=', 1)[1])
                self.assertEqual((info['tid'], info['signo'], info['code'], info['syscall'], info['arch']),
                                 (info['leader'], 31, 1, 39, 0xc000003e))
                self.assertTrue(lines[1].startswith('TRACE_DONE='))
                done = json.loads(lines[1].split('=', 1)[1])
                self.assertEqual((done['leader'], done['exitCode'], done['signals'], done['exits']),
                                 (info['leader'], traced.returncode, 1, 1))
                self.assertFalse(Path('/proc', str(info['leader'])).exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
