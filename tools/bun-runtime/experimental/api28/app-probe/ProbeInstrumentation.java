package io.github.supermonster003.autojs6.plugin.bun.runtime.api28probe;

import android.app.Instrumentation;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.system.Os;
import android.system.OsConstants;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

/** Deliberately independent of AutoJs6 and the production plugin's implementation. */
public final class ProbeInstrumentation extends Instrumentation {
    private Bundle arguments;
    private File runtime;
    private File job;
    private final JSONObject report = new JSONObject();
    private final JSONArray outcomes = new JSONArray();

    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        this.arguments = arguments;
        start();
    }

    @Override public void onStart() {
        boolean success = false;
        try {
            Context context = getTargetContext();
            JSONObject facts = new JSONObject(asset("build-facts.json"));
            String abi = required("expectedAbi");
            JSONObject expected = facts.getJSONObject("runtimes").getJSONObject(abi);
            int api = Integer.parseInt(required("requiredApiLevel"));
            long pageSize = Os.sysconf(OsConstants._SC_PAGESIZE);
            check(api >= 28 && api == Build.VERSION.SDK_INT, "required Android API");
            check(pageSize == Long.parseLong(required("requiredPageSizeBytes")), "required page size");
            check(abi.equals(Build.SUPPORTED_ABIS[0]), "primary ABI; translation does not count as native evidence");
            String machine = Os.uname().machine;
            check((abi.equals("arm64-v8a") && machine.equals("aarch64")) ||
                    (abi.equals("x86_64") && machine.equals("x86_64")), "native kernel ABI");
            check(!(abi.equals("x86_64") && pageSize > 4096), "locked x86_64 JSC has a 4 KiB page ceiling");
            int uid = android.os.Process.myUid();
            check(uid >= 10000, "must run as an application UID, not shell/root");
            String selinux = read(new File("/proc/self/attr/current"), 4096).replace("\0", "").trim();
            String procStatus = read(new File("/proc/self/status"), 16384);
            check(selinux.startsWith("u:r:untrusted_app"), "untrusted application SELinux domain");
            check(procStatus.matches("(?s).*\nSeccomp:\\s+2(?:\n|$).*"), "application seccomp filter");
            runtime = new File(context.getApplicationInfo().nativeLibraryDir, "libbun_exec.so");
            check(runtime.isFile() && runtime.canExecute() && !runtime.canWrite(), "read-only installed executable");
            check(runtime.length() == expected.getLong("bytes") && sha256(runtime).equals(expected.getString("sha256")), "installed patched payload bytes");
            check(sha256(new File(context.getApplicationInfo().sourceDir)).equals(required("requiredApkSha256")), "installed probe APK SHA-256");
            report.put("schemaVersion", 1);
            report.put("kind", "test-only-application-process-probe");
            report.put("pluginBinderExercised", false);
            report.put("variant", facts.getString("variant"));
            report.put("runtimeSha256", expected.getString("sha256"));
            report.put("runtimeBytes", expected.getLong("bytes"));
            report.put("installedPayloadVerified", true);
            report.put("installedApkSha256", required("requiredApkSha256"));
            report.put("environment", new JSONObject()
                    .put("manufacturer", Build.MANUFACTURER).put("model", Build.MODEL)
                    .put("fingerprint", Build.FINGERPRINT).put("apiLevel", api)
                    .put("abi", abi).put("kernelMachine", machine).put("kernel", Os.uname().release)
                    .put("pageSizeBytes", pageSize).put("uid", uid)
                    .put("selinuxContext", selinux).put("seccomp", 2));
            JSONArray probes = new JSONArray(asset("probes.json"));
            // Resolve Android's /data/user/0 <-> /data/data alias before creating
            // our owned root; descendants must still never be symlinks.
            job = new File(context.getCacheDir().getCanonicalFile(), "api28-probe-" + UUID.randomUUID());
            check(job.mkdir(), "new private job directory");
            success = true;
            for (int index = 0; index < probes.length(); index++) {
                JSONObject probe = probes.getJSONObject(index);
                JSONObject outcome;
                try { outcome = runProbe(probe, uid); }
                catch (Exception error) {
                    outcome = new JSONObject().put("id", probe.getString("id"))
                            .put("passed", false).put("error", bounded(error.toString()));
                }
                outcomes.put(outcome);
                boolean passed = outcome.getBoolean("passed");
                success &= passed;
                Bundle progress = new Bundle();
                progress.putString("stream", (passed ? "PASS " : "FAIL ") + probe.getString("id") + "\n");
                sendStatus(0, progress);
            }
        } catch (Throwable error) {
            success = false;
            try { report.put("environmentError", bounded(error.toString())); } catch (Exception ignored) { }
        } finally {
            if (job != null) {
                try { deleteOwned(job, job.getCanonicalPath(), 0, new int[] {0}); }
                catch (Exception error) {
                    success = false;
                    try { report.put("cleanupError", bounded(error.toString())); } catch (Exception ignored) { }
                }
            }
            try { report.put("probes", outcomes).put("passed", success); } catch (Exception ignored) { }
            Bundle result = new Bundle();
            result.putString("report", report.toString());
            finish(success ? -1 : 0, result);
        }
    }

    private JSONObject runProbe(JSONObject probe, int uid) throws Exception {
        String id = probe.getString("id");
        File work = new File(job, id);
        check(work.mkdir(), "new per-probe directory");
        List<String> command = new ArrayList<>();
        command.add(runtime.getAbsolutePath());
        if (probe.has("arguments")) {
            JSONArray args = probe.getJSONArray("arguments");
            for (int index = 0; index < args.length(); index++) command.add(args.getString(index));
        } else {
            File source = new File(work, "entry." + probe.optString("extension", "js"));
            try (OutputStream stream = new FileOutputStream(source)) {
                stream.write(probe.getString("source").getBytes(StandardCharsets.UTF_8));
            }
            command.add("run"); command.add("--no-install"); command.add(source.getAbsolutePath());
        }
        long timeout = probe.optLong("timeoutMillis", 15000);
        int outputLimit = probe.optInt("outputBytes", 16384);
        ProcessBuilder builder = new ProcessBuilder(command).directory(work);
        builder.environment().put("PROBE_UID", Integer.toString(uid));
        long started = SystemClock.elapsedRealtime();
        java.lang.Process process = builder.start();
        process.getOutputStream().close();
        AtomicReference<String> termination = new AtomicReference<>("running");
        AtomicReference<String> streamError = new AtomicReference<>();
        Capture capture = new Capture(outputLimit, termination);
        ExecutorService streams = Executors.newFixedThreadPool(2);
        Future<?> stdout = streams.submit(new Runnable() {
            @Override public void run() { capture.pump(process.getInputStream(), capture.stdout, streamError); }
        });
        Future<?> stderr = streams.submit(new Runnable() {
            @Override public void run() { capture.pump(process.getErrorStream(), capture.stderr, streamError); }
        });
        boolean forced = false;
        int exitCode;
        try {
            while (!process.waitFor(40, TimeUnit.MILLISECONDS)) {
                if (SystemClock.elapsedRealtime() - started >= timeout) termination.compareAndSet("running", "timeout");
                if (!termination.get().equals("running")) {
                    process.destroy();
                    if (!process.waitFor(500, TimeUnit.MILLISECONDS)) { forced = true; process.destroyForcibly(); }
                    check(process.waitFor(1500, TimeUnit.MILLISECONDS), "bounded process termination");
                    break;
                }
            }
            exitCode = process.exitValue();
            termination.compareAndSet("running", "exited");
            stdout.get(2, TimeUnit.SECONDS); stderr.get(2, TimeUnit.SECONDS);
        } finally {
            if (process.isAlive()) { process.destroyForcibly(); process.waitFor(1500, TimeUnit.MILLISECONDS); }
            process.getInputStream().close(); process.getErrorStream().close();
            streams.shutdownNow();
        }
        long elapsed = SystemClock.elapsedRealtime() - started;
        String out = capture.stdout.toString("UTF-8"), err = capture.stderr.toString("UTF-8");
        String reason = termination.get();
        boolean passed = reason.equals(probe.getString("termination")) && streamError.get() == null;
        if (reason.equals("exited")) passed &= exitCode == 0;
        if (probe.has("stdout")) passed &= out.contains(probe.getString("stdout"));
        if (probe.has("stderr")) passed &= err.contains(probe.getString("stderr"));
        if (reason.equals("timeout")) passed &= elapsed < timeout + 4000;
        if (reason.equals("output-limit")) passed &= elapsed < 10000;
        JSONObject result = new JSONObject().put("id", id).put("passed", passed)
                .put("exitCode", exitCode).put("termination", reason).put("forciblyTerminated", forced)
                .put("elapsedMillis", elapsed).put("capturedBytes", capture.used)
                .put("outputLimitBytes", outputLimit).put("stdout", bounded(out)).put("stderr", bounded(err));
        if (streamError.get() != null) result.put("streamError", bounded(streamError.get()));
        if (exitCode >= 128 && exitCode <= 192) result.put("possibleSignalFromExitConvention", exitCode - 128);
        return result;
    }

    private static final class Capture {
        final ByteArrayOutputStream stdout = new ByteArrayOutputStream();
        final ByteArrayOutputStream stderr = new ByteArrayOutputStream();
        final int limit;
        final AtomicReference<String> termination;
        int used;
        Capture(int limit, AtomicReference<String> termination) { this.limit = limit; this.termination = termination; }
        void pump(InputStream input, ByteArrayOutputStream destination, AtomicReference<String> error) {
            try (InputStream stream = input) {
                byte[] buffer = new byte[4096];
                for (int count; (count = stream.read(buffer)) != -1;) {
                    synchronized (this) {
                        int accepted = Math.min(count, limit - used);
                        destination.write(buffer, 0, accepted); used += accepted;
                        if (accepted < count) {
                            if (!termination.get().equals("timeout")) termination.set("output-limit");
                            return;
                        }
                    }
                }
            } catch (IOException exception) {
                if (termination.get().equals("running") || termination.get().equals("exited")) error.set(exception.toString());
            }
        }
    }

    private String required(String name) {
        String value = arguments.getString(name);
        check(value != null && !value.isEmpty(), "missing runner argument " + name);
        return value;
    }
    private String asset(String name) throws IOException {
        try (InputStream input = getContext().getAssets().open(name)) { return read(input, 131072); }
    }
    private static String read(File file, int limit) throws IOException {
        try (InputStream input = new FileInputStream(file)) { return read(input, limit); }
    }
    private static String read(InputStream input, int limit) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(); byte[] buffer = new byte[4096];
        for (int count; (count = input.read(buffer)) != -1;) {
            if (bytes.size() + count > limit) throw new IOException("bounded input exceeded");
            bytes.write(buffer, 0, count);
        }
        return bytes.toString("UTF-8");
    }
    private static String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[65536];
            for (int count; (count = input.read(buffer)) != -1;) digest.update(buffer, 0, count);
        }
        StringBuilder hex = new StringBuilder();
        for (byte value : digest.digest()) hex.append(String.format(Locale.ROOT, "%02x", value & 255));
        return hex.toString();
    }
    private static void deleteOwned(File file, String root, int depth, int[] visited) throws IOException {
        check(depth <= 8 && ++visited[0] <= 256, "bounded cleanup inventory");
        String path = file.getCanonicalPath();
        check(path.equals(root) || path.startsWith(root + File.separator), "cleanup escaped exact job directory");
        check(file.getAbsolutePath().equals(path), "cleanup encountered a symlink");
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteOwned(child, root, depth + 1, visited);
        check(file.delete(), "private probe file cleanup");
    }
    private static String bounded(String text) { return text.length() <= 2048 ? text : text.substring(0, 2048) + "[truncated]"; }
    private static void check(boolean value, String message) { if (!value) throw new IllegalStateException(message); }
}
