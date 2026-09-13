package io.github.supermonster003.autojs6.plugin.bun.runtime.api28probe;

import android.app.Instrumentation;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.system.Os;
import android.system.OsConstants;
import io.github.supermonster003.autojs6.plugin.bun.runtime.SupervisedProcess;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** No plugin/Binder dependencies; shares only the production process-control wrapper. */
public final class ProbeInstrumentation extends Instrumentation {
    private Bundle arguments;
    private File runtime;
    private File supervisor;
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
            check(facts.getInt("schemaVersion") == 2, "supervisor-aware build receipt required");
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
            JSONObject helper = null;
            JSONArray helpers = facts.getJSONObject("supervisor").getJSONArray("artifacts");
            for (int index = 0; index < helpers.length(); index++) {
                JSONObject candidate = helpers.getJSONObject(index);
                if (candidate.getString("abi").equals(abi)) { check(helper == null, "duplicate helper ABI"); helper = candidate; }
            }
            check(helper != null, "installed helper ABI is locked");
            supervisor = new File(context.getApplicationInfo().nativeLibraryDir, SupervisedProcess.SUPERVISOR_NAME);
            check(supervisor.isFile() && supervisor.canExecute() && !supervisor.canWrite(), "read-only installed supervisor");
            check(supervisor.length() == helper.getLong("binaryBytes") &&
                    sha256(supervisor).equals(helper.getString("binarySha256")), "installed supervisor bytes");
            check(sha256(new File(context.getApplicationInfo().sourceDir)).equals(required("requiredApkSha256")), "installed probe APK SHA-256");
            report.put("schemaVersion", 2);
            report.put("kind", "test-only-application-process-probe");
            report.put("pluginBinderExercised", false);
            report.put("variant", facts.getString("variant"));
            report.put("runtimeSha256", expected.getString("sha256"));
            report.put("runtimeBytes", expected.getLong("bytes"));
            report.put("installedPayloadVerified", true);
            report.put("supervisorSha256", helper.getString("binarySha256"));
            report.put("supervisorBytes", helper.getLong("binaryBytes"));
            report.put("installedSupervisorVerified", true);
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
                try {
                    deleteOwned(job, job.getCanonicalPath(), 0, new int[] {0});
                    check(!job.exists(), "private job root remains");
                    report.put("privateJobRemoved", true);
                }
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
        boolean hardLimit = id.startsWith("fd-hard-");
        boolean asyncSignal = id.startsWith("sigsys-blocked-async-");
        boolean pendingSignal = id.startsWith("sigsys-pending-async-");
        boolean watchReload = id.startsWith("watch-reload-");
        long[] parentBefore = hardLimit ? readNofileLimits() : null;
        File work = new File(job, id);
        check(work.mkdir(), "new per-probe directory");
        List<String> command = new ArrayList<>();
        command.add(runtime.getAbsolutePath());
        if (probe.has("arguments")) {
            JSONArray args = probe.getJSONArray("arguments");
            for (int index = 0; index < args.length(); index++) command.add(args.getString(index));
        } else {
            File source = new File(work, "entry." + probe.optString("extension", "js"));
            String sourceText;
            if (probe.has("sourceAsset")) {
                if (hardLimit) {
                    String mode = probe.getString("mode");
                    check(java.util.Arrays.asList("startup-native", "startup-trap", "spawn-native", "spawn-trap").contains(mode) &&
                            id.equals("fd-hard-" + mode) && probe.getString("sourceFile").equals("hard-limit-probes.mjs") &&
                            probe.getString("sourceAsset").equals("hard-limit-" + mode + ".mjs") && !probe.has("source"),
                            "fixed hard-limit source asset binding");
                    sourceText = asset("hard-limit-" + mode + ".mjs");
                    check(sourceText.getBytes(StandardCharsets.UTF_8).length <= 12288 &&
                            sourceText.startsWith("const HARD_LIMIT_MODE = \"" + mode + "\";\n"), "bounded fixed hard-limit source asset");
                } else if (watchReload) {
                    String mode = probe.getString("mode");
                    check(java.util.Arrays.asList("native", "trap").contains(mode) &&
                            id.equals("watch-reload-" + mode) && probe.getString("sourceFile").equals("watch-reload-probes.mjs") &&
                            probe.getString("sourceAsset").equals("watch-reload-" + mode + ".mjs") && !probe.has("source"),
                            "fixed watch-reload source asset binding");
                    sourceText = asset("watch-reload-" + mode + ".mjs");
                    check(sourceText.getBytes(StandardCharsets.UTF_8).length <= 12288 &&
                            sourceText.startsWith("const WATCH_RELOAD_MODE = \"" + mode + "\";\n"), "bounded fixed watch-reload source asset");
                } else if (pendingSignal) {
                    String mode = probe.getString("mode");
                    check(java.util.Arrays.asList("native", "trap").contains(mode) &&
                            id.equals("sigsys-pending-async-" + mode) && probe.getString("sourceFile").equals("pending-signal-probes.mjs") &&
                            probe.getString("sourceAsset").equals("pending-signal-" + mode + ".mjs") && !probe.has("source"),
                            "fixed pending-signal source asset binding");
                    sourceText = asset("pending-signal-" + mode + ".mjs");
                    check(sourceText.getBytes(StandardCharsets.UTF_8).length <= 12288 &&
                            sourceText.startsWith("const PENDING_SIGNAL_MODE = \"" + mode + "\";\n"), "bounded fixed pending-signal source asset");
                } else if (asyncSignal) {
                    String mode = probe.getString("mode");
                    check(java.util.Arrays.asList("native", "trap").contains(mode) &&
                            id.equals("sigsys-blocked-async-" + mode) && probe.getString("sourceFile").equals("async-signal-probes.mjs") &&
                            probe.getString("sourceAsset").equals("async-signal-" + mode + ".mjs") && !probe.has("source"),
                            "fixed async-signal source asset binding");
                    sourceText = asset("async-signal-" + mode + ".mjs");
                    check(sourceText.getBytes(StandardCharsets.UTF_8).length <= 12288 &&
                            sourceText.startsWith("const ASYNC_SIGNAL_MODE = \"" + mode + "\";\n"), "bounded fixed async-signal source asset");
                } else {
                    boolean lchmod = id.equals("lchmod-bin-link");
                    String name = lchmod ? "lchmod-probes.mjs" : "openat2-probes.mjs";
                    String mode = lchmod ? "bin-link" : "confinement";
                    check((lchmod || id.equals("openat2-confinement")) && probe.getString("mode").equals(mode) &&
                            probe.getString("sourceFile").equals(name) &&
                            probe.getString("sourceAsset").equals(name) && !probe.has("source"), "fixed source asset binding");
                    sourceText = asset(name);
                    check(sourceText.getBytes(StandardCharsets.UTF_8).length <= (lchmod ? 12288 : 8192) &&
                            sourceText.startsWith(lchmod ? "const LCHMOD_MODE = \"bin-link\";\n" :
                                    "const OPENAT2_MODE = \"confinement\";\n"), "bounded fixed source asset");
                }
            } else sourceText = probe.getString("source");
            try (OutputStream stream = new FileOutputStream(source)) {
                stream.write(sourceText.getBytes(StandardCharsets.UTF_8));
            }
            command.add("run"); command.add("--no-install"); command.add(source.getAbsolutePath());
        }
        long timeout = probe.optLong("timeoutMillis", 15000);
        int outputLimit = probe.optInt("outputBytes", 16384);
        ProcessBuilder builder = new ProcessBuilder(command).directory(work);
        builder.environment().put("PROBE_UID", Integer.toString(uid));
        long started = SystemClock.elapsedRealtime();
        java.lang.Process process = SupervisedProcess.start(builder, supervisor);
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
        boolean requiresReady = probe.optBoolean("requiresReady", false);
        int childPid = -1, supervisorPid = -1;
        long readyAt = -1, terminationAt = -1, exitedAt;
        int exitCode;
        try {
            while (!process.waitFor(40, TimeUnit.MILLISECONDS)) {
                if (requiresReady && childPid < 0) {
                    int observed = capture.readyPid();
                    if (observed > 0) {
                        // These PIDs are observations only. All termination goes through
                        // the private control pipe, never through a script-reported PID.
                        supervisorPid = verifyParentage(observed, uid);
                        childPid = observed;
                        readyAt = SystemClock.elapsedRealtime();
                    }
                }
                long now = SystemClock.elapsedRealtime();
                if (probe.has("cancelAfterReadyMillis") && readyAt >= 0 && now - readyAt >= probe.getLong("cancelAfterReadyMillis"))
                    termination.compareAndSet("running", "cancelled");
                if (now - started >= timeout) termination.compareAndSet("running", "timeout");
                if (!termination.get().equals("running")) {
                    terminationAt = SystemClock.elapsedRealtime();
                    process.destroy();
                    check(process.waitFor(2000, TimeUnit.MILLISECONDS), "bounded supervised process termination");
                    break;
                }
            }
            exitedAt = SystemClock.elapsedRealtime();
            exitCode = process.exitValue();
            termination.compareAndSet("running", "exited");
            stdout.get(2, TimeUnit.SECONDS); stderr.get(2, TimeUnit.SECONDS);
        } finally {
            if (process.isAlive()) { process.destroy(); process.waitFor(1500, TimeUnit.MILLISECONDS); }
            process.getInputStream().close(); process.getErrorStream().close();
            streams.shutdownNow();
        }
        long elapsed = SystemClock.elapsedRealtime() - started;
        String out = capture.stdout.toString("UTF-8"), err = capture.stderr.toString("UTF-8");
        String reason = termination.get();
        boolean childGone = childPid > 1 && !new File("/proc/" + childPid).exists();
        boolean supervisorGone = supervisorPid > 1 && !new File("/proc/" + supervisorPid).exists();
        boolean passed = reason.equals(probe.getString("termination")) && streamError.get() == null;
        if (reason.equals("exited")) passed &= exitCode == 0;
        if (probe.has("stdout")) passed &= out.contains(probe.getString("stdout"));
        if (probe.has("stderr")) passed &= err.contains(probe.getString("stderr"));
        if (reason.equals("timeout")) passed &= elapsed < timeout + 4000;
        if (reason.equals("output-limit")) passed &= elapsed < 10000;
        if (requiresReady) passed &= readyAt >= started && readyAt - started < timeout && terminationAt >= readyAt &&
                exitCode == 137 && childGone && supervisorGone && exitedAt - terminationAt < 2000;
        if (reason.equals("cancelled")) passed &= terminationAt - readyAt >= probe.getLong("cancelAfterReadyMillis") &&
                terminationAt - readyAt < 2000;
        JSONObject fixtureEvidence = null;
        String evidenceKey = null;
        String evidenceError = null;
        if (probe.has("sourceFile")) {
            try {
                String sourceFile = probe.getString("sourceFile");
                check(sourceFile.equals("fd-probes.mjs") || sourceFile.equals("syscall-probes.mjs") ||
                        sourceFile.equals("openat2-probes.mjs") || sourceFile.equals("lchmod-probes.mjs") ||
                        sourceFile.equals("hard-limit-probes.mjs") || sourceFile.equals("async-signal-probes.mjs") || sourceFile.equals("pending-signal-probes.mjs") || sourceFile.equals("watch-reload-probes.mjs"), "fixed fixture source");
                boolean fd = sourceFile.equals("fd-probes.mjs");
                boolean openat2 = sourceFile.equals("openat2-probes.mjs");
                boolean lchmod = sourceFile.equals("lchmod-probes.mjs");
                String prefix = fd ? "FD_PROBE_RESULT=" : openat2 ? "OPENAT2_PROBE_RESULT=" : lchmod ? "LCHMOD_PROBE_RESULT=" : hardLimit ? "HARD_LIMIT_RESULT=" : asyncSignal ? "ASYNC_SIGNAL_RESULT=" : pendingSignal ? "PENDING_SIGNAL_RESULT=" : watchReload ? "WATCH_RELOAD_RESULT=" : "SYSCALL_PROBE_RESULT=";
                evidenceKey = fd ? "fdEvidence" : openat2 ? "openat2Evidence" : lchmod ? "lchmodEvidence" : hardLimit ? "hardLimitEvidence" : asyncSignal ? "asyncSignalEvidence" : pendingSignal ? "pendingSignalEvidence" : watchReload ? "watchReloadEvidence" : "syscallEvidence";
                String line = out.trim();
                check(line.startsWith(prefix) && !line.contains("\n") && line.length() <= 2048,
                        "exactly one bounded fixture evidence record");
                fixtureEvidence = new JSONObject(line.substring(prefix.length()));
                passed &= fixtureEvidence.getInt("schemaVersion") == 1 && fixtureEvidence.getBoolean("passed") &&
                        fixtureEvidence.getString("mode").equals(probe.getString("mode"));
            } catch (Exception error) { passed = false; evidenceError = bounded(error.toString()); }
        }
        JSONObject parentLimits = null;
        if (hardLimit) {
            // Observation only: never lower this instrumentation process's limit.
            long[] parentAfter = readNofileLimits();
            passed &= parentBefore[0] >= 512 && parentBefore[1] >= parentBefore[0] &&
                    parentAfter[0] == parentBefore[0] && parentAfter[1] == parentBefore[1];
            parentLimits = new JSONObject().put("before", new JSONArray().put(parentBefore[0]).put(parentBefore[1]))
                    .put("after", new JSONArray().put(parentAfter[0]).put(parentAfter[1]));
        }
        deleteOwned(work, work.getCanonicalPath(), 0, new int[] {0});
        check(!work.exists(), "per-probe workspace remains");
        JSONObject result = new JSONObject().put("id", id).put("passed", passed)
                .put("exitCode", exitCode).put("termination", reason).put("forciblyTerminated", requiresReady && exitCode == 137)
                .put("processReaped", !process.isAlive()).put("workspaceRemoved", true)
                .put("elapsedMillis", elapsed).put("capturedBytes", capture.used)
                .put("outputLimitBytes", outputLimit).put("stdout", bounded(out)).put("stderr", bounded(err));
        if (fixtureEvidence != null) result.put(evidenceKey, fixtureEvidence);
        if (parentLimits != null) result.put("hardLimitParentLimits", parentLimits);
        if (evidenceError != null) result.put("evidenceError", evidenceError);
        if (requiresReady) result.put("readyObserved", readyAt >= 0).put("parentageVerified", supervisorPid > 1)
                .put("childPid", childPid).put("supervisorPid", supervisorPid)
                .put("childGone", childGone).put("supervisorGone", supervisorGone)
                .put("readinessMillis", readyAt < 0 ? -1 : readyAt - started)
                .put("terminationRequestedAfterReadyMillis", readyAt < 0 || terminationAt < 0 ? -1 : terminationAt - readyAt)
                .put("terminationToExitMillis", terminationAt < 0 ? -1 : exitedAt - terminationAt);
        if (streamError.get() != null) result.put("streamError", bounded(streamError.get()));
        if (exitCode >= 128 && exitCode <= 192) result.put("possibleSignalFromExitConvention", exitCode - 128);
        return result;
    }

    private static long[] readNofileLimits() throws IOException {
        Matcher match = Pattern.compile("(?m)^Max open files[ \\t]+(\\d+)[ \\t]+(\\d+)[ \\t]+files[ \\t]*$")
                .matcher(read(new File("/proc/self/limits"), 16384));
        check(match.find(), "independent instrumentation nofile limits");
        return new long[] { Long.parseLong(match.group(1)), Long.parseLong(match.group(2)) };
    }

    private int verifyParentage(int childPid, int uid) throws Exception {
        check(childPid > 1 && childPid != android.os.Process.myPid(), "distinct ready child PID");
        String childStatus = read(new File("/proc/" + childPid + "/status"), 16384);
        int parent = processParent(childStatus, uid);
        check(parent > 1 && parent != childPid && parent != android.os.Process.myPid(), "separate supervisor parent");
        check(processParent(read(new File("/proc/" + parent + "/status"), 16384), uid) == android.os.Process.myPid(),
                "supervisor belongs to this instrumentation process");
        check(read(new File("/proc/" + childPid + "/cmdline"), 16384).split("\0", -1)[0].equals(runtime.getAbsolutePath()),
                "observed child executes the installed Bun path");
        check(read(new File("/proc/" + parent + "/cmdline"), 16384).split("\0", -1)[0].equals(supervisor.getAbsolutePath()),
                "observed parent executes the installed supervisor path");
        return parent;
    }

    private static int processParent(String status, int uid) {
        Matcher user = Pattern.compile("(?m)^Uid:[ \\t]+(\\d+)[ \\t]+(\\d+)[ \\t]+(\\d+)[ \\t]+(\\d+)[ \\t]*$").matcher(status);
        check(user.find(), "observable process UID");
        for (int index = 1; index <= 4; index++) check(Integer.parseInt(user.group(index)) == uid, "same application UID");
        Matcher parent = Pattern.compile("(?m)^PPid:[ \\t]+(\\d+)[ \\t]*$").matcher(status);
        check(parent.find(), "observable parent PID");
        return Integer.parseInt(parent.group(1));
    }

    private static final class Capture {
        final ByteArrayOutputStream stdout = new ByteArrayOutputStream();
        final ByteArrayOutputStream stderr = new ByteArrayOutputStream();
        final int limit;
        final AtomicReference<String> termination;
        int used;
        Capture(int limit, AtomicReference<String> termination) { this.limit = limit; this.termination = termination; }
        synchronized int readyPid() throws IOException {
            Matcher matcher = Pattern.compile("(?:^|\\n)PROBE_READY=(\\d+)\\r?\\n").matcher(stdout.toString("UTF-8"));
            return matcher.find() ? Integer.parseInt(matcher.group(1)) : -1;
        }
        void pump(InputStream input, ByteArrayOutputStream destination, AtomicReference<String> error) {
            try (InputStream stream = input) {
                byte[] buffer = new byte[4096];
                for (int count; (count = stream.read(buffer)) != -1;) {
                    synchronized (this) {
                        int accepted = Math.min(count, limit - used);
                        destination.write(buffer, 0, accepted); used += accepted;
                        if (accepted < count) {
                            termination.compareAndSet("running", "output-limit");
                            // Keep draining/discarding until termination closes the child.
                            // Closing a reader first can cause EPIPE/SIGPIPE instead of
                            // exercising the requested SIGTERM -> SIGKILL lifecycle.
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
