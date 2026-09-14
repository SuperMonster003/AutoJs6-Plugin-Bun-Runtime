package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.ParcelFileDescriptor
import android.system.Os
import android.system.OsConstants
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.autojs.plugin.bun.runtime.api.BunPluginActions
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.autojs.plugin.bun.runtime.api.IBunRuntimeCallback
import org.autojs.plugin.bun.runtime.api.IBunRuntimePlugin
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/** Test-only source set: never compiled into the production app or its suite. */
@RunWith(AndroidJUnit4::class)
class JscFlowInstrumentedTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext

    @Test
    fun originalPressureFlowDiagnostics() {
        assertTrue(BuildConfig.BUN_EXPERIMENTAL)
        assertEquals("x86_64", Build.SUPPORTED_ABIS.first())
        assertEquals("x86_64", Os.uname().machine)
        assertEquals(36, Build.VERSION.SDK_INT)
        assertEquals(36, InstrumentationRegistry.getArguments().getString("requiredApiLevel")!!.toInt())
        val pages = Os.sysconf(OsConstants._SC_PAGESIZE)
        assertEquals(InstrumentationRegistry.getArguments().getString("requiredPageSizeBytes")!!.toLong(), pages)
        assertTrue(pages == 4096L || pages == 16384L)
        assertTrue(BuildConfig.BUN_X86_MAX_PAGE_SIZE_BYTES > 4096L)
        val originalSource = instrumentation.context.assets.open("jsc-pressure.mjs").bufferedReader().use { it.readText() }
        val observedSource = instrumentation.context.assets.open("jsc-pressure-flow.mjs").bufferedReader().use { it.readText() }
        val ready = CountDownLatch(1)
        val service = AtomicReference<IBinder?>()
        val connection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, binder: IBinder?) { service.set(binder); ready.countDown() }
            override fun onServiceDisconnected(name: ComponentName?) = Unit
            override fun onNullBinding(name: ComponentName?) = ready.countDown()
            override fun onBindingDied(name: ComponentName?) = ready.countDown()
        }
        val intent = Intent(BunPluginActions.RUNTIME).addCategory(BunPluginActions.CATEGORY)
            .setComponent(ComponentName(context.packageName, BunRuntimeService::class.java.name))
        assertTrue(context.bindService(intent, connection, Context.BIND_AUTO_CREATE))
        try {
            assertTrue(ready.await(20, TimeUnit.SECONDS))
            assertEquals(BunRuntimeContract.BINDER_DESCRIPTOR, service.get()?.interfaceDescriptor)
            val runtime = IBunRuntimePlugin.Stub.asInterface(requireNotNull(service.get()))
            for (mode in listOf("jit-off", "baseline", "dfg", "ftl", "gc", "wasm", "workers")) {
                val source = if (mode == "dfg") observedSource else originalSource
                val sourceName = if (mode == "dfg") "jsc-pressure-flow.mjs" else "jsc-pressure.mjs"
                assertTrue(source.toByteArray(Charsets.UTF_8).size <= 16384)
                val sourceHash = MessageDigest.getInstance("SHA-256").digest(source.toByteArray(Charsets.UTF_8))
                    .joinToString("") { "%02x".format(it.toInt() and 255) }
                val sourceFile = File.createTempFile("jsc-flow-", ".mjs", context.cacheDir)
                try {
                    sourceFile.writeText(source, Charsets.UTF_8)
                    val output = StringBuilder()
                    val errors = StringBuilder()
                    var outputBytes = 0
                    val callbackError = AtomicReference<String?>()
                    val finished = CountDownLatch(1)
                    var starts = 0
                    var finishes = 0
                    val callback = object : IBunRuntimeCallback.Stub() {
                        override fun onEvent(event: Bundle?) {
                            synchronized(output) {
                                if (event == null || event.getInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, -1) != BunRuntimeContract.PROTOCOL_VERSION) {
                                    callbackError.set("Missing event/protocol"); return
                                }
                                when (event.getString(BunRuntimeContract.KEY_EVENT_TYPE)) {
                                    BunRuntimeContract.EVENT_STARTED -> starts++
                                    BunRuntimeContract.EVENT_STDOUT -> {
                                        val text = event.getString(BunRuntimeContract.KEY_TEXT).orEmpty()
                                        outputBytes += text.toByteArray(Charsets.UTF_8).size
                                        if (outputBytes > 65536) callbackError.set("Flow output exceeded bound")
                                        else output.append(text)
                                    }
                                    BunRuntimeContract.EVENT_STDERR -> {
                                        val text = event.getString(BunRuntimeContract.KEY_TEXT).orEmpty()
                                        outputBytes += text.toByteArray(Charsets.UTF_8).size
                                        if (outputBytes > 65536) callbackError.set("Flow output exceeded bound")
                                        else errors.append(text)
                                    }
                                    BunRuntimeContract.EVENT_FINISHED -> { finishes++; finished.countDown() }
                                }
                            }
                        }
                    }
                    val environment = Bundle().apply {
                        putString("AUTOJS6_JSC_PRESSURE_MODE", mode)
                        if (mode == "jit-off") putString("BUN_JSC_useJIT", "false")
                        if (mode == "baseline") {
                            putString("BUN_JSC_useDFGJIT", "false")
                            putString("BUN_JSC_useFTLJIT", "false")
                        }
                    }
                    val result = ParcelFileDescriptor.open(sourceFile, ParcelFileDescriptor.MODE_READ_ONLY).use { fd ->
                        runtime.runScript(Bundle().apply {
                            putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
                            putString(BunRuntimeContract.KEY_EXECUTION_ID, "jsc-flow-${UUID.randomUUID()}")
                            putString(BunRuntimeContract.KEY_SOURCE_NAME, sourceName)
                            putLong(BunRuntimeContract.KEY_TIMEOUT_MILLIS, 25000)
                            putLong(BunRuntimeContract.KEY_OUTPUT_BYTE_LIMIT, 65536)
                            putBundle(BunRuntimeContract.KEY_ENVIRONMENT, environment)
                        }, fd, callback)
                    }
                    assertTrue(finished.await(10, TimeUnit.SECONDS))
                    val captured = synchronized(output) {
                        assertNull(callbackError.get())
                        assertEquals(1, starts); assertEquals(1, finishes)
                        output.toString()
                    }
                    assertTrue(result.getString(BunRuntimeContract.KEY_STDOUT).isNullOrEmpty())
                    assertTrue(result.getString(BunRuntimeContract.KEY_STDERR).isNullOrEmpty())
                    val succeeded = result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED)
                    val exitCode = result.getInt(BunRuntimeContract.KEY_EXIT_CODE, -1)
                    assertEquals(if (succeeded) 0 else 1, exitCode)
                    assertEquals(if (succeeded) null else BunRuntimeContract.ERROR_NON_ZERO_EXIT, result.getString(BunRuntimeContract.KEY_ERROR_CODE))
                    if (mode != "dfg") assertTrue("Unchanged mode failed: $mode", succeeded)
                    val lines = captured.trim().lines()
                    val prefix = if (mode == "dfg") "JSC_FLOW_RESULT=" else "JSC_PRESSURE_RESULT="
                    assertEquals(if (mode == "dfg" && succeeded) 2 else 1, lines.size)
                    assertTrue(lines.last().startsWith(prefix))
                    val proof = JSONObject(lines.last().removePrefix(prefix))
                    assertEquals(mode, proof.getString("mode"))
                    assertEquals(pages, proof.getLong("pages"))
                    if (mode == "dfg") {
                        assertFalse(proof.getBoolean("compatibilityAcceptance"))
                        assertEquals(succeeded, proof.getBoolean("fixtureReturned"))
                    } else assertTrue(proof.getBoolean("passed"))
                    val workspace = File(proof.getString("workspace")).canonicalFile
                    assertEquals(File(context.cacheDir, "bun-executions").canonicalFile, workspace.parentFile)
                    assertFalse("Execution workspace survived completion", workspace.exists())
                    val requested = JSONObject()
                    environment.keySet().sorted().forEach { requested.put(it, environment.getString(it)) }
                    val terminal = JSONObject().put("succeeded", succeeded).put("exitCode", exitCode)
                        .put("errorCode", result.getString(BunRuntimeContract.KEY_ERROR_CODE) ?: JSONObject.NULL)
                    val record = JSONObject().put("mode", mode).put("environment", requested)
                        .put("sourceSha256", sourceHash).put("workspaceRemoved", true)
                        .put("stdout", captured).put("stderr", synchronized(output) { errors.toString() })
                        .put("terminal", terminal).put("compatibilityAcceptance", false)
                    instrumentation.sendStatus(0, Bundle().apply { putString("stream", "JSC_FLOW=" + record.toString() + "\n") })
                } finally { assertTrue(sourceFile.delete()) }
            }
        } finally { context.unbindService(connection) }
    }
}
