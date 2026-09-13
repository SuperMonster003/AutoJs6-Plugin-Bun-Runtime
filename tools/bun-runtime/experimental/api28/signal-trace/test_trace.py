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
        for mode in ['fatal', 'handled', 'user-fatal', 'user-handled', 'user-epoll']:
            with self.subTest(mode=mode):
                plain = subprocess.run([target, 'run', '--no-install', '/' + mode], capture_output=True, text=True, timeout=5)
                traced = subprocess.run([tracer, target, '/' + mode], capture_output=True, text=True, timeout=5)
                expected = 0 if mode.endswith('handled') or mode == 'user-epoll' else -signal.SIGSYS
                self.assertEqual(plain.returncode, expected)
                self.assertEqual(traced.returncode, expected if expected == 0 else 128 - expected)
                self.assertEqual(traced.stdout, plain.stdout)
                self.assertEqual(plain.stderr, '')
                lines = traced.stderr.splitlines()
                if mode == 'user-epoll':
                    self.assertEqual(len(lines), 3)
                    context_line = lines.pop(1)
                    self.assertTrue(context_line.startswith('TRACE_USER_WAIT='))
                    context = json.loads(context_line[len('TRACE_USER_WAIT='):])
                    self.assertEqual(context['syscallRegister'], 281)
                    self.assertTrue(context['maskRead'])
                    self.assertNotEqual(context['maskAddress'], '0000000000000000')
                    self.assertEqual(context['maskWord'], '0000000000000000')
                self.assertEqual(len(lines), 2)
                info = json.loads(lines[0].split('=', 1)[1])
                if mode.startswith('user-'):
                    self.assertTrue(lines[0].startswith('TRACE_USER_SIGSYS='))
                    self.assertEqual(set(info), {'leader', 'tid', 'signo', 'code', 'senderPid', 'senderUid'})
                    self.assertEqual((info['tid'], info['signo'], info['code'], info['senderPid'], info['senderUid']),
                                     (info['leader'], 31, -6, info['leader'], os.getuid()))
                else:
                    self.assertTrue(lines[0].startswith('TRACE_SIGSYS='))
                    self.assertEqual((info['tid'], info['signo'], info['code'], info['syscall'], info['arch']),
                                     (info['leader'], 31, 1, 39, 0xc000003e))
                self.assertTrue(lines[1].startswith('TRACE_DONE='))
                done = json.loads(lines[1].split('=', 1)[1])
                self.assertEqual((done['leader'], done['exitCode'], done['signals'], done['exits']),
                                 (info['leader'], traced.returncode, 1, 1))
                self.assertFalse(Path('/proc', str(info['leader'])).exists())

    def test_abort_snapshot_preserves_the_fatal_signal_and_reaps_owned_target(self):
        target, tracer = str(self.directory / 'target'), str(self.directory / 'trace')
        plain = subprocess.run([target, 'run', '--no-install', '/abort'], capture_output=True, text=True, timeout=5)
        traced = subprocess.run([tracer, target, '/abort'], capture_output=True, text=True, timeout=5)
        self.assertEqual(plain.returncode, -signal.SIGABRT)
        self.assertEqual(traced.returncode, 128 + signal.SIGABRT)
        self.assertEqual(traced.stdout, plain.stdout)
        lines = traced.stderr.splitlines()
        self.assertLess(len(traced.stderr.encode()), 4096)
        self.assertTrue(lines[0].startswith('TRACE_ABORT='))
        info = json.loads(lines[0].split('=', 1)[1])
        self.assertEqual((info['tid'], info['signo'], info['infoError'], info['registerError']), (info['leader'], 6, 0, 0))
        self.assertGreater(int(info['pc'], 16), 0)
        frames = [json.loads(line.split('=', 1)[1]) for line in lines if line.startswith('TRACE_ABORT_FRAME=')]
        self.assertTrue(1 <= len(frames) <= 8)
        self.assertEqual(frames[0]['address'], info['pc'])
        self.assertTrue(frames[0]['mapped'])
        self.assertEqual(frames[0]['mapError'], 0)
        self.assertFalse(frames[0]['mapLimitReached'])
        self.assertFalse(frames[0]['pathMayBeTruncated'])
        self.assertIn('libc', bytes.fromhex(frames[0]['pathHex']).decode())
        resources = json.loads(next(line.split('=', 1)[1] for line in lines if line.startswith('TRACE_ABORT_RESOURCES=')))
        self.assertEqual((resources['tid'], resources['tgid'], resources['uid'], resources['statusError']),
                         (info['leader'], info['leader'], os.getuid(), 0))
        self.assertGreater(resources['threads'], 0)
        self.assertEqual(resources['limitsError'], 0)
        self.assertNotEqual(resources['nprocSoft'], 'unknown')
        self.assertTrue(lines[-1].startswith('TRACE_DONE='))
        done = json.loads(lines[-1][len('TRACE_DONE='):])
        self.assertEqual((done['exitCode'], done['signals'], done['exits']), (134, 0, 1))
        self.assertFalse(Path('/proc', str(info['leader'])).exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
