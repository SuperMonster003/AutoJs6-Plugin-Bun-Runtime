"""Linux host control-protocol regressions; NOT Android/Bun compatibility evidence."""
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import tempfile
import time
import unittest


@unittest.skipUnless(sys.platform == "linux", "native supervisor host tests require Linux")
class SupervisorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix="bun-supervisor-tests-")
        cls.binary = str(Path(cls.temporary.name) / "supervisor")
        subprocess.run([os.environ.get("CC", "cc"), "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror",
                        str(Path(__file__).with_name("supervisor.c")), "-o", cls.binary], check=True)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def launch(self, code, *args):
        child = subprocess.Popen([self.binary, sys.executable, "-c", code, *args],
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.addCleanup(self.cleanup_child, child)
        return child

    @staticmethod
    def cleanup_child(child):
        if child.poll() is None:
            child.kill()
        child.wait(timeout=5)
        for stream in (child.stdin, child.stdout, child.stderr):
            if stream:
                stream.close()

    def ready(self, child):
        self.assertTrue(select.select([child.stdout], [], [], 5)[0], "child never became ready")
        return int(child.stdout.readline(64))

    def assert_reaped(self, pid):
        until = time.monotonic() + 5
        while Path("/proc/" + str(pid)).exists() and time.monotonic() < until:
            time.sleep(0.01)
        self.assertFalse(Path("/proc/" + str(pid)).exists(), "child was not reaped")

    def test_forwards_argv_output_and_exit_status_without_a_shell(self):
        child = self.launch("import sys; print(sys.argv[1]); print('err', file=sys.stderr); sys.exit(17)",
                            "中文 ; $(no-shell) 'quoted'")
        self.assertEqual(17, child.wait(timeout=5))
        self.assertEqual("中文 ; $(no-shell) 'quoted'\n", child.stdout.read().decode())
        self.assertEqual(b"err\n", child.stderr.read())

    def test_bun_stdin_is_eof_while_private_control_pipe_stays_open(self):
        child = self.launch("import sys; print(repr(sys.stdin.read()))")
        self.assertEqual(0, child.wait(timeout=5))
        self.assertFalse(child.stdin.closed)
        self.assertEqual(b"''\n", child.stdout.read())

    def test_ignoring_sigterm_escalates_and_reaps_before_completion(self):
        child = self.launch("import os,signal,time; signal.signal(signal.SIGTERM, signal.SIG_IGN); "
                            "print(os.getpid(), flush=True); time.sleep(60)")
        pid = self.ready(child)
        start = time.monotonic()
        child.stdin.close()
        self.assertEqual(137, child.wait(timeout=5))
        self.assertGreaterEqual(time.monotonic() - start, 0.18)
        self.assert_reaped(pid)

    def test_cooperative_child_gets_a_graceful_exit(self):
        child = self.launch("import os,signal,sys,time; signal.signal(signal.SIGTERM, lambda *_: sys.exit(23)); "
                            "print(os.getpid(), flush=True); time.sleep(60)")
        pid = self.ready(child)
        child.stdin.close()
        self.assertEqual(23, child.wait(timeout=5))
        self.assert_reaped(pid)

    def test_unexpected_control_data_fails_closed(self):
        child = self.launch("import os,time; print(os.getpid(), flush=True); time.sleep(60)")
        pid = self.ready(child)
        child.stdin.write(b"not-a-pid-or-command")
        child.stdin.flush()
        self.assertEqual(143, child.wait(timeout=5))
        self.assert_reaped(pid)

    def test_supervisor_death_kills_its_ignoring_child(self):
        child = self.launch("import os,signal,time; signal.signal(signal.SIGTERM, signal.SIG_IGN); "
                            "print(os.getpid(), flush=True); time.sleep(60)")
        pid = self.ready(child)
        child.kill()
        self.assertEqual(-signal.SIGKILL, child.wait(timeout=5))
        self.assert_reaped(pid)

    def test_close_at_startup_is_bounded(self):
        for _ in range(30):
            child = self.launch("import time; time.sleep(60)")
            child.stdin.close()
            self.assertIn(child.wait(timeout=5), (137, 143))

    def test_exec_failure_is_nonzero_and_diagnostic(self):
        child = subprocess.Popen([self.binary, "/does-not-exist/bun"], stdin=subprocess.PIPE,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.addCleanup(self.cleanup_child, child)
        self.assertEqual(126, child.wait(timeout=5))
        self.assertIn(b"Bun supervisor exec", child.stderr.read())


if __name__ == "__main__":
    unittest.main(verbosity=2)
