"""Compile the exact Android pidfd function from its hash-locked patch on Linux.

Only Fd ownership and libc fault injection are test seams. No production mask
logic is copied. PIDFD_LIBC_SOURCE may select an offline libc-0.2.186 source.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent


def extract_locked_function():
    series = json.loads((ROOT / 'patches/series.lock.json').read_text())
    patches = [p for p in series['downstreamBackport']['patches']
               if p.get('origin') == 'autojs6-blocked-pidfd']
    if len(patches) != 1 or patches[0]['affectedPaths'] != ['src/sys/linux_syscall.rs']:
        raise ValueError('one Android pidfd patch required')
    record = patches[0]
    patch = (ROOT / 'patches' / record['path']).read_bytes()
    if len(patch) != record['bytes'] or hashlib.sha256(patch).hexdigest() != record['sha256']:
        raise ValueError('pidfd patch bytes drifted')
    text = patch.decode()
    postimage = '\n'.join(line[1:] for line in text.splitlines()
                          if line.startswith(' ') or (line.startswith('+') and not line.startswith('+++')))
    match = re.search(r'#\[cfg\(target_os = "android"\)\]\n'
                      r'(pub\(crate\) fn pidfd_open\(pid: i32, flags: u32\) -> Result<Fd, i32> \{\n.*?\n\})',
                      postimage, re.S)
    if not match or 'Ok(Fd::from_native(rc as i32))' not in match[1]:
        raise ValueError('complete Android production function required')
    return match[1]


class BlockedPidfdTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix='bun-blocked-pidfd-')
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.directory = Path(cls.scratch.name)
        dependency = 'package = "libc", version = "=0.2.186"'
        if os.environ.get('PIDFD_LIBC_SOURCE'):
            dependency += ', path = ' + json.dumps(str(Path(os.environ['PIDFD_LIBC_SOURCE']).resolve()))
        (cls.directory / 'Cargo.toml').write_text(
            '[package]\nname = "bun-blocked-pidfd-test"\nversion = "0.0.0"\nedition = "2021"\n'
            '[dependencies]\nreal-libc = { ' + dependency + ' }\n'
            '[[bin]]\nname = "pidfd-test"\npath = "test.rs"\n')
        (cls.directory / 'production.inc').write_text(extract_locked_function() + '\n')
        (cls.directory / 'test.rs').write_bytes((ROOT / 'blocked-pidfd/pidfd.test.rs').read_bytes())
        args = [os.environ.get('CARGO', 'cargo'), 'build', '--manifest-path', str(cls.directory / 'Cargo.toml')]
        if os.environ.get('PIDFD_LIBC_SOURCE'):
            args.append('--offline')
        result = subprocess.run(args, capture_output=True, text=True, timeout=120)
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)
        cls.executable = cls.directory / 'target/debug/pidfd-test'

    def test_exact_production_function(self):
        for case in ['unblocked', 'blocked', 'pending', 'thread-local', 'invalid-pid',
                     'query-error', 'membership-error', 'syscall-error', 'real-pidfd', 'trap-skipped']:
            with self.subTest(case=case):
                result = subprocess.run([str(self.executable), case], capture_output=True, text=True, timeout=10)
                self.assertEqual((result.returncode, result.stdout, result.stderr), (0, f'OK {case}\n', ''))


if __name__ == '__main__':
    unittest.main(verbosity=2)
