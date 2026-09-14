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
class RuntimeNetworkInstrumentedTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext

    @Test
    fun fixedTlsAndIpv6Boundaries() {
        assertTrue(BuildConfig.BUN_EXPERIMENTAL)
        val expected = InstrumentationRegistry.getArguments()
        val abi = expected.getString("requiredAbi")!!
        assertTrue(abi == "arm64-v8a" || abi == "x86_64")
        assertEquals(abi, Build.SUPPORTED_ABIS.first())
        assertEquals(if (abi == "arm64-v8a") "aarch64" else "x86_64", Os.uname().machine)
        assertEquals(expected.getString("requiredApiLevel")!!.toInt(), Build.VERSION.SDK_INT)
        val pages = Os.sysconf(OsConstants._SC_PAGESIZE)
        assertEquals(4096L, pages)
        assertEquals(expected.getString("requiredPageSizeBytes")!!.toLong(), pages)
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
            for (mode in listOf("tls-transport", "tls-rejection", "https", "ipv6")) {
                val sourceName = "runtime-network-$mode.mjs"
                val source = instrumentation.context.assets.open(sourceName).bufferedReader().use { it.readText() }
                assertTrue(source.toByteArray(Charsets.UTF_8).size <= 12288)
                val sourceHash = MessageDigest.getInstance("SHA-256").digest(source.toByteArray(Charsets.UTF_8))
                    .joinToString("") { "%02x".format(it.toInt() and 255) }
                val sourceFile = File.createTempFile("runtime-network-", ".mjs", context.cacheDir)
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
                                        if (outputBytes > 16384) callbackError.set("Runtime network output exceeded bound")
                                        else output.append(text)
                                    }
                                    BunRuntimeContract.EVENT_STDERR -> {
                                        val text = event.getString(BunRuntimeContract.KEY_TEXT).orEmpty()
                                        outputBytes += text.toByteArray(Charsets.UTF_8).size
                                        if (outputBytes > 16384) callbackError.set("Runtime network output exceeded bound")
                                        else errors.append(text)
                                    }
                                    BunRuntimeContract.EVENT_FINISHED -> { finishes++; finished.countDown() }
                                }
                            }
                        }
                    }
                    val environment = Bundle()
                    val result = ParcelFileDescriptor.open(sourceFile, ParcelFileDescriptor.MODE_READ_ONLY).use { fd ->
                        runtime.runScript(Bundle().apply {
                            putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
                            putString(BunRuntimeContract.KEY_EXECUTION_ID, "runtime-network-${UUID.randomUUID()}")
                            putString(BunRuntimeContract.KEY_SOURCE_NAME, sourceName)
                            putLong(BunRuntimeContract.KEY_TIMEOUT_MILLIS, 12000)
                            putLong(BunRuntimeContract.KEY_OUTPUT_BYTE_LIMIT, 16384)
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
                    if (!succeeded) {
                        val failure = JSONObject().put("mode", mode).put("sourceSha256", sourceHash)
                            .put("stdout", captured).put("stderr", synchronized(output) { errors.toString() })
                            .put("terminal", JSONObject().put("succeeded", false).put("exitCode", exitCode)
                                .put("errorCode", result.getString(BunRuntimeContract.KEY_ERROR_CODE) ?: JSONObject.NULL))
                            .put("compatibilityAcceptance", false)
                        instrumentation.sendStatus(0, Bundle().apply { putString("stream", "RUNTIME_NETWORK_FAILURE=" + failure.toString() + "\n") })
                    }
                    assertEquals(if (succeeded) 0 else 1, exitCode)
                    assertEquals(if (succeeded) null else BunRuntimeContract.ERROR_NON_ZERO_EXIT, result.getString(BunRuntimeContract.KEY_ERROR_CODE))
                    assertTrue("Runtime network mode failed: $mode", succeeded)
                    assertEquals("", synchronized(output) { errors.toString() })
                    val line = captured.trim()
                    assertFalse(line.contains("\n"))
                    assertTrue(line.startsWith("RUNTIME_NETWORK_RESULT="))
                    val proof = JSONObject(line.removePrefix("RUNTIME_NETWORK_RESULT="))
                    assertEquals(mode, proof.getString("mode"))
                    assertEquals(pages, proof.getLong("pages"))
                    assertEquals(context.applicationInfo.uid, proof.getInt("uid"))
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
                    instrumentation.sendStatus(0, Bundle().apply { putString("stream", "RUNTIME_NETWORK=" + record.toString() + "\n") })
                } finally { assertTrue(sourceFile.delete()) }
            }
        } finally { context.unbindService(connection) }
    }
}
