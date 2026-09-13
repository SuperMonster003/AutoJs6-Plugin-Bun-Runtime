package io.github.supermonster003.autojs6.plugin.bun.runtime.signaltrace;

import android.app.Instrumentation;
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
import java.util.concurrent.atomic.AtomicInteger;

/** Diagnostic observation only, never a substitute for the untraced suite. */
public final class TraceInstrumentation extends Instrumentation {
    private Bundle arguments;
    private final JSONObject report = new JSONObject();
    private File job;
    @Override public void onCreate(Bundle args) { super.onCreate(args); arguments = args; start(); }
    private static void check(boolean value, String text) { if (!value) throw new IllegalStateException(text); }
    private static byte[] read(InputStream input, int limit) throws IOException {
        try (InputStream stream = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] bytes = new byte[4096]; int count;
            while ((count = stream.read(bytes)) != -1) { check(out.size() + count <= limit, "bounded input"); out.write(bytes,0,count); }
            return out.toByteArray();
        }
    }
    private String asset(String name) throws IOException { return new String(read(getTargetContext().getAssets().open(name), 131072), StandardCharsets.UTF_8); }
    private static String digest(File file) throws Exception {
        MessageDigest hash = MessageDigest.getInstance("SHA-256");
        try (InputStream stream = new FileInputStream(file)) { byte[] bytes = new byte[65536]; int n; while ((n=stream.read(bytes))!=-1) hash.update(bytes,0,n); }
        StringBuilder text = new StringBuilder(); for (byte b:hash.digest()) text.append(String.format(Locale.ROOT,"%02x",b&255)); return text.toString();
    }
    private static void remove(File file, String root, int depth) throws IOException {
        check(depth < 4 && (file.getCanonicalPath().equals(root) || file.getCanonicalPath().startsWith(root+File.separator)), "exact owned workspace");
        if (file.isDirectory()) { File[] files = file.listFiles(); check(files!=null && files.length<=16,"bounded files"); for(File child:files) remove(child,root,depth+1); }
        check(file.delete(),"owned file removal");
    }
    @Override public void onStart() {
        boolean completed = false;
        try {
            JSONObject build = new JSONObject(asset("trace-build.json"));
            check(build.getString("kind").equals("test-only-signal-trace-build"),"diagnostic identity");
            String fixtureSet = build.getString("fixtureSet");
            check(fixtureSet.equals("blocked-async") || fixtureSet.equals("pending-async"),"fixed fixture set");
            int uid = android.os.Process.myUid();
            String abi = arguments.getString("abi");
            check(Build.SUPPORTED_ABIS[0].equals(abi) && (abi.equals("arm64-v8a") ? Os.uname().machine.equals("aarch64") : Os.uname().machine.equals("x86_64")), "native ABI");
            check(Build.VERSION.SDK_INT == Integer.parseInt(arguments.getString("api")), "API");
            check(Os.sysconf(OsConstants._SC_PAGESIZE) == Long.parseLong(arguments.getString("pageSize")), "page size");
            String context = new String(read(new FileInputStream("/proc/self/attr/current"),4096),StandardCharsets.UTF_8).replace("\0", "").trim();
            String status = new String(read(new FileInputStream("/proc/self/status"),16384),StandardCharsets.UTF_8);
            check(uid >=10000 && context.startsWith("u:r:untrusted_app") && status.matches("(?s).*\nSeccomp:\\s+2(?:\n|$).*"),"application domain");
            File apk = new File(getTargetContext().getApplicationInfo().sourceDir);
            check(digest(apk).equals(arguments.getString("apkSha256")),"installed APK hash");
            File nativeDir = new File(getTargetContext().getApplicationInfo().nativeLibraryDir);
            JSONObject payloads = build.getJSONObject("payloads").getJSONObject(abi);
            for (String name : new String[]{"libbun_exec.so","libbun_supervisor.so","libbun_signal_trace.so"}) {
                File file = new File(nativeDir,name); JSONObject expected = payloads.getJSONObject(name);
                check(file.isFile() && file.canExecute() && !file.canWrite(),"read-only executable");
                check(file.length()==expected.getLong("bytes") && digest(file).equals(expected.getString("sha256")),"installed payload hash");
            }
            report.put("kind","test-only-signal-trace-observation").put("compatibilityAcceptance",false)
                .put("fixtureSet",fixtureSet).put("api",Build.VERSION.SDK_INT).put("abi",abi).put("pageSize",Os.sysconf(OsConstants._SC_PAGESIZE))
                .put("uid",uid).put("selinux",context).put("seccomp",2).put("kernel",Os.uname().release)
                .put("model",Build.MODEL).put("fingerprint",Build.FINGERPRINT).put("apkSha256",digest(apk)).put("payloads",payloads);
            job = new File(getTargetContext().getCacheDir(),"signal-trace-"+SystemClock.elapsedRealtime()); check(job.mkdir(),"new workspace");
            JSONArray rows = new JSONArray(); report.put("rows",rows);
            for (String mode:new String[]{"native","trap"}) for(boolean traced:new boolean[]{false,true}) {
                File work = new File(job,mode+(traced?"-traced":"-plain")); check(work.mkdir(),"new case workspace");
                File entry = new File(work,"entry.mjs");
                String source = asset((fixtureSet.equals("pending-async")?"pending-signal-":"async-signal-")+mode+".mjs"); check(source.getBytes(StandardCharsets.UTF_8).length<=12288,"fixed asset bound");
                try(OutputStream output=new FileOutputStream(entry)) { output.write(source.getBytes(StandardCharsets.UTF_8)); }
                List<String> command = new ArrayList<>();
                command.add(new File(nativeDir,"libbun_exec.so").getAbsolutePath());
                command.add("run"); command.add("--no-install");
                if(traced) {
                    File launcher=new File(work,"trace-launcher.mjs");
                    try(OutputStream output=new FileOutputStream(launcher)) { output.write(asset("trace-launcher.mjs").getBytes(StandardCharsets.UTF_8)); }
                    command.add(launcher.getAbsolutePath());
                }
                command.add(entry.getAbsolutePath());
                ProcessBuilder builder = new ProcessBuilder(command).directory(work); builder.environment().put("PROBE_UID",Integer.toString(uid));
                long started = SystemClock.elapsedRealtime();
                java.lang.Process process=SupervisedProcess.start(builder,new File(nativeDir,"libbun_supervisor.so"));
                process.getOutputStream().close(); ExecutorService streams=Executors.newFixedThreadPool(2);
                AtomicInteger used=new AtomicInteger();
                Callable<byte[]> out=new Callable<byte[]>() { public byte[] call() throws IOException { return capture(process.getInputStream(),used); } };
                Callable<byte[]> err=new Callable<byte[]>() { public byte[] call() throws IOException { return capture(process.getErrorStream(),used); } };
                Future<byte[]> stdout=streams.submit(out),stderr=streams.submit(err);
                try {
                    check(process.waitFor(15000,TimeUnit.MILLISECONDS),"bounded diagnostic execution");
                    rows.put(new JSONObject().put("mode",mode).put("traced",traced).put("exitCode",process.exitValue())
                        .put("elapsedMillis",SystemClock.elapsedRealtime()-started).put("sourceSha256",digest(entry))
                        .put("stdout",new String(stdout.get(2,TimeUnit.SECONDS),StandardCharsets.UTF_8))
                        .put("stderr",new String(stderr.get(2,TimeUnit.SECONDS),StandardCharsets.UTF_8)).put("processReaped",true));
                } finally {
                    if(process.isAlive()) { process.destroy(); check(process.waitFor(2000,TimeUnit.MILLISECONDS),"supervised diagnostic teardown"); }
                    process.getInputStream().close(); process.getErrorStream().close(); streams.shutdownNow();
                }
                remove(work,work.getCanonicalPath(),0);
            }
            completed=true;
        } catch(Exception error) { try { report.put("error",error.toString()); } catch(Exception ignored) {} }
        finally {
            try { if(job!=null && job.exists()) remove(job,job.getCanonicalPath(),0); report.put("workspaceRemoved",job==null||!job.exists()); }
            catch(Exception error) { completed=false; try { report.put("cleanupError",error.toString()); } catch(Exception ignored) {} }
            try { report.put("completed",completed); } catch(Exception ignored) {}
            Bundle result=new Bundle(); result.putString("report",report.toString()); finish(completed?-1:0,result);
        }
    }
    private static byte[] capture(InputStream input,AtomicInteger used) throws IOException {
        ByteArrayOutputStream output=new ByteArrayOutputStream(); byte[] bytes=new byte[2048]; int n;
        while((n=input.read(bytes))!=-1) { check(used.addAndGet(n)<=16384,"combined output bound"); output.write(bytes,0,n); }
        return output.toByteArray();
    }
}
