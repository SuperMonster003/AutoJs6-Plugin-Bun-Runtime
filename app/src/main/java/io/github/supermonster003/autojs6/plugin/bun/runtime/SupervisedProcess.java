package io.github.supermonster003.autojs6.plugin.bun.runtime;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/** A Process whose termination closes an owned control pipe, never guesses a PID. */
public final class SupervisedProcess extends Process {
    public static final String SUPERVISOR_NAME = "libbun_supervisor.so";
    private final Process delegate;
    private final AtomicBoolean terminationRequested = new AtomicBoolean();
    private final OutputStream closedInput = new OutputStream() {
        @Override
        public void write(int value) throws IOException {
            throw new IOException("Bun stdin is closed");
        }
    };

    // Package-private for lifecycle unit tests; the delegate is always the supervisor.
    SupervisedProcess(Process delegate) {
        this.delegate = delegate;
    }

    public static SupervisedProcess start(ProcessBuilder builder, File supervisor) throws IOException {
        List<String> original = new ArrayList<>(builder.command());
        if (original.isEmpty()) throw new IOException("Bun command is missing");
        File runtime = new File(original.get(0));
        if (!runtime.isAbsolute() || !supervisor.isAbsolute()
                || !"libbun_exec.so".equals(runtime.getName())
                || !SUPERVISOR_NAME.equals(supervisor.getName())
                || !runtime.getCanonicalFile().getParentFile().equals(supervisor.getCanonicalFile().getParentFile())
                || !runtime.isFile() || !supervisor.isFile()
                || !runtime.canExecute() || !supervisor.canExecute()
                || runtime.canWrite() || supervisor.canWrite()) {
            throw new IOException("Bun and its supervisor must be installed read-only sibling executables");
        }
        List<String> command = new ArrayList<>(original.size() + 1);
        command.add(supervisor.getPath());
        command.addAll(original);
        // Do not mutate the caller's reusable builder or share a redirected stdin.
        ProcessBuilder supervised = new ProcessBuilder(command)
                .directory(builder.directory()).redirectErrorStream(builder.redirectErrorStream());
        supervised.environment().clear();
        supervised.environment().putAll(builder.environment());
        return new SupervisedProcess(supervised.start());
    }

    @Override public OutputStream getOutputStream() { return closedInput; }
    @Override public InputStream getInputStream() { return delegate.getInputStream(); }
    @Override public InputStream getErrorStream() { return delegate.getErrorStream(); }
    @Override public int waitFor() throws InterruptedException { return delegate.waitFor(); }
    @Override public boolean waitFor(long timeout, TimeUnit unit) throws InterruptedException {
        return delegate.waitFor(timeout, unit);
    }
    @Override public int exitValue() { return delegate.exitValue(); }
    @Override public boolean isAlive() { return delegate.isAlive(); }

    @Override public void destroy() {
        if (terminationRequested.compareAndSet(false, true)) {
            try {
                delegate.getOutputStream().close();
            } catch (IOException ignored) {
                // The Process pipe may already have been closed by its reaper.
            }
        }
    }

    @Override public Process destroyForcibly() {
        // Android's default implementation only sends SIGTERM. Our supervisor
        // applies SIGTERM -> 200 ms grace -> SIGKILL -> waitpid instead.
        destroy();
        return this;
    }
}
