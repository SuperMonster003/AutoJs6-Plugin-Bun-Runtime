package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.Build
import android.os.IBinder
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.autojs.plugin.bun.runtime.api.BunPluginActions
import org.autojs.plugin.bun.runtime.api.BunPluginCapabilityKeys
import org.autojs.plugin.bun.runtime.api.BunPluginIds
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.autojs.plugin.bun.runtime.api.IBunRuntimeCallback
import org.autojs.plugin.bun.runtime.api.IBunRuntimePlugin
import org.autojs.plugin.common.api.PluginCapabilityKeys
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.RandomAccessFile
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class BunRuntimeInstrumentedTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Test
    fun discoveryMetadataPrewarmJavaScriptAndTypeScriptRoundTrip() {
        withBoundRuntime { runtime ->
            val info = runtime.info
            @Suppress("DEPRECATION")
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            assertEquals(context.getString(R.string.app_name), info.name)
            assertEquals(context.getString(R.string.plugin_description), info.description)
            assertEquals(context.getString(R.string.plugin_author), info.author)
            assertEquals(BunPluginIds.ID, info.id)
            assertEquals(BunPluginIds.ENGINE, info.engine)
            assertEquals(BunPluginIds.VARIANT_BUN_1_4_0_ANDROID, info.variant)
            assertEquals(packageInfo.versionName, info.versionName)
            assertEquals(packageInfo.longVersionCode, info.versionCode)
            assertTrue(info.versionDate?.isNotBlank() == true)
            val packagedAbis = context.packagedRuntimeAbis().toSet()
            assertTrue(packagedAbis.isNotEmpty())
            assertTrue(packagedAbis.all { it in DISTRIBUTED_ABIS })
            assertEquals(packagedAbis, info.supportedAbis.orEmpty().toSet())
            assertTrue(info.description?.isNotBlank() == true)
            assertEquals("@raw/plugin_instruction", info.instruction)
            assertEquals(
                BunRuntimeContract.REQUIRES_HOST_VERSION,
                requireNotNull(info.capabilities).getLong(PluginCapabilityKeys.REQUIRES_HOST_VERSION),
            )
            assertEquals(
                BunRuntimeContract.PROTOCOL_VERSION,
                requireNotNull(info.capabilities).getInt(BunPluginCapabilityKeys.CONTRACT_VERSION),
            )
            assertTrue(requireNotNull(info.capabilities).getBoolean(BunPluginCapabilityKeys.SUPPORTS_TYPESCRIPT))
            assertTrue(requireNotNull(info.capabilities).getBoolean(BunPluginCapabilityKeys.SUPPORTS_CANCELLATION))
            assertTrue(requireNotNull(info.capabilities).getBoolean(BunPluginCapabilityKeys.SUPPORTS_STREAMING_OUTPUT))

            val probe = runtime.prewarmRuntime()
            assertTrue(probe.getString(BunRuntimeContract.KEY_ERROR_MESSAGE).orEmpty(), probe.getBoolean(BunRuntimeContract.KEY_RUNTIME_READY))
            assertEquals(BunRuntimeContract.RUNTIME_VERSION, probe.getString(BunRuntimeContract.KEY_RUNTIME_VERSION))
            assertEquals(BunRuntimeContract.RUNTIME_REVISION, probe.getString(BunRuntimeContract.KEY_RUNTIME_REVISION))
            assertTrue(probe.getString(BunRuntimeContract.KEY_PROCESS_NAME).orEmpty().endsWith(":bun_runtime"))
            assertEquals(
                packagedAbis,
                probe.getStringArray(BunRuntimeContract.KEY_SUPPORTED_ABIS).orEmpty().toSet(),
            )
            assertEquals(
                Build.SUPPORTED_ABIS.first(packagedAbis::contains),
                probe.getString(BunRuntimeContract.KEY_PROCESS_ABI),
            )
            assertEquals(BunRuntimeContract.MAX_SOURCE_BYTES, probe.getLong(BunRuntimeContract.KEY_MAX_SOURCE_BYTES))
            assertEquals(BunRuntimeContract.MAX_OUTPUT_BYTES, probe.getLong(BunRuntimeContract.KEY_MAX_OUTPUT_BYTES))

            val javaScript = runSource(
                runtime,
                "entry.bun.js",
                "console.log(`platform=${'$'}{process.platform};version=${'$'}{Bun.version};unicode=中文`); console.error('stderr-ok');",
            )
            assertTrue(javaScript.result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED))
            assertTrue(javaScript.stdout.contains("platform=android;version=1.4.0"))
            assertTrue(javaScript.stdout.contains("unicode=中文"))
            assertTrue(javaScript.stderr.contains("stderr-ok"))
            assertTrue(javaScript.result.getString(BunRuntimeContract.KEY_STDOUT).isNullOrEmpty())
            assertTrue(javaScript.result.getString(BunRuntimeContract.KEY_STDERR).isNullOrEmpty())

            val typeScript = runSource(
                runtime,
                "entry.bun.ts",
                "const value: number = 42; console.log(`typescript=${'$'}{value}`);",
            )
            assertTrue(typeScript.result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED))
            assertTrue(typeScript.stdout.contains("typescript=42"))
        }
    }

    @Test
    fun timeoutCancellationAndInvalidRequestAreBounded() {
        withBoundRuntime { runtime ->
            val timedOut = runSource(
                runtime = runtime,
                sourceName = "timeout.bun.js",
                sourceText = "setInterval(() => {}, 1000); await new Promise(() => {});",
                timeoutMillis = 1_000L,
            ).result
            assertTrue(!timedOut.getBoolean(BunRuntimeContract.KEY_SUCCEEDED))
            assertTrue(timedOut.getBoolean(BunRuntimeContract.KEY_TIMED_OUT))
            assertEquals(BunRuntimeContract.ERROR_TIMEOUT, timedOut.getString(BunRuntimeContract.KEY_ERROR_CODE))

            val outputLimitStartedAt = SystemClock.elapsedRealtime()
            val outputLimited = runSource(
                runtime = runtime,
                sourceName = "output-limit.bun.js",
                sourceText = "process.on('SIGTERM', () => {}); setInterval(() => console.log('x'.repeat(4096)), 1);",
                timeoutMillis = 20_000L,
                outputByteLimit = 128L,
            ).result
            assertTrue(
                "Output-limit termination waited for the script timeout",
                SystemClock.elapsedRealtime() - outputLimitStartedAt < 10_000L,
            )
            assertTrue(!outputLimited.getBoolean(BunRuntimeContract.KEY_SUCCEEDED))
            assertEquals(
                BunRuntimeContract.ERROR_OUTPUT_LIMIT,
                outputLimited.getString(BunRuntimeContract.KEY_ERROR_CODE),
            )

            val cancelledBeforeDispatchId = "cancel-before-${UUID.randomUUID()}"
            assertTrue(runtime.cancelScript(cancelledBeforeDispatchId))
            val cancelledBeforeDispatch = runSource(
                runtime = runtime,
                sourceName = "cancel-before.bun.js",
                sourceText = "throw new Error('must not execute');",
                executionId = cancelledBeforeDispatchId,
                expectStarted = false,
            ).result
            assertTrue(cancelledBeforeDispatch.getBoolean(BunRuntimeContract.KEY_CANCELLED))
            assertEquals(
                BunRuntimeContract.ERROR_CANCELLED,
                cancelledBeforeDispatch.getString(BunRuntimeContract.KEY_ERROR_CODE),
            )

            val executionId = "cancel-${UUID.randomUUID()}"
            val started = CountDownLatch(1)
            val executor = Executors.newSingleThreadExecutor()
            try {
                val future = executor.submit<CapturedRun> {
                    runSource(
                        runtime = runtime,
                        sourceName = "cancel.bun.js",
                        sourceText = "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);",
                        executionId = executionId,
                        timeoutMillis = 60_000L,
                        startedSignal = started,
                    )
                }
                assertTrue("Bun execution did not start", started.await(20, TimeUnit.SECONDS))
                val cancellationStartedAt = SystemClock.elapsedRealtime()
                assertTrue("Bun execution was not cancellable", runtime.cancelScript(executionId))
                val cancelled = future.get(20, TimeUnit.SECONDS).result
                assertTrue(
                    "Explicit cancellation waited for the script timeout",
                    SystemClock.elapsedRealtime() - cancellationStartedAt < 10_000L,
                )
                assertTrue(!cancelled.getBoolean(BunRuntimeContract.KEY_SUCCEEDED))
                assertTrue(cancelled.getBoolean(BunRuntimeContract.KEY_CANCELLED))
                assertEquals(BunRuntimeContract.ERROR_CANCELLED, cancelled.getString(BunRuntimeContract.KEY_ERROR_CODE))
            } finally {
                executor.shutdownNow()
            }

            val oversized = File.createTempFile("bun-test-oversized-", ".js", context.cacheDir)
            try {
                RandomAccessFile(oversized, "rw").use { file ->
                    file.setLength(BunRuntimeContract.MAX_SOURCE_BYTES + 1L)
                }
                val oversizedResult = ParcelFileDescriptor.open(
                    oversized,
                    ParcelFileDescriptor.MODE_READ_ONLY,
                ).use { descriptor ->
                    runtime.runScript(
                        Bundle().apply {
                            putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
                            putString(BunRuntimeContract.KEY_EXECUTION_ID, "oversized-${UUID.randomUUID()}")
                            putString(BunRuntimeContract.KEY_SOURCE_NAME, "oversized.js")
                            putLong(BunRuntimeContract.KEY_TIMEOUT_MILLIS, 30_000L)
                            putLong(BunRuntimeContract.KEY_OUTPUT_BYTE_LIMIT, 1_024L)
                        },
                        descriptor,
                        object : IBunRuntimeCallback.Stub() {
                            override fun onEvent(event: Bundle?) = Unit
                        },
                    )
                }
                assertEquals(
                    BunRuntimeContract.ERROR_SOURCE_TOO_LARGE,
                    oversizedResult.getString(BunRuntimeContract.KEY_ERROR_CODE),
                )
            } finally {
                oversized.delete()
            }

            val invalid = runtime.runScript(
                Bundle().apply {
                    putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION + 1)
                },
                null,
                null,
            )
            assertEquals(BunRuntimeContract.ERROR_INVALID_REQUEST, invalid.getString(BunRuntimeContract.KEY_ERROR_CODE))
        }
    }

    @Test
    fun manifestPublishesWakeInfoAndRuntimeContracts() {
        val runtimeIntent = Intent(BunPluginActions.RUNTIME)
            .addCategory(BunPluginActions.CATEGORY)
            .setPackage(context.packageName)
        @Suppress("DEPRECATION")
        val runtimeService = context.packageManager.queryIntentServices(runtimeIntent, 0).single().serviceInfo
        assertTrue(runtimeService.exported)
        assertEquals(BunRuntimeContract.PLUGIN_PERMISSION, runtimeService.permission)
        assertTrue(runtimeService.processName.endsWith(":bun_runtime"))

        val infoIntent = Intent(BunPluginActions.INFO)
            .addCategory(BunPluginActions.CATEGORY)
            .setPackage(context.packageName)
        @Suppress("DEPRECATION")
        val infoService = context.packageManager.queryIntentServices(infoIntent, 0).single().serviceInfo
        assertTrue(infoService.exported)
        assertEquals(BunRuntimeContract.PLUGIN_PERMISSION, infoService.permission)

        val wakeIntent = Intent("org.autojs.plugin.action.WAKE")
            .addCategory(Intent.CATEGORY_DEFAULT)
            .setPackage(context.packageName)
        @Suppress("DEPRECATION")
        val wakeActivity = context.packageManager.queryIntentActivities(wakeIntent, 0).single().activityInfo
        assertTrue(wakeActivity.exported)
        assertEquals(BunRuntimeContract.PLUGIN_PERMISSION, wakeActivity.permission)

        @Suppress("DEPRECATION")
        val appInfo = context.packageManager.getApplicationInfo(context.packageName, android.content.pm.PackageManager.GET_META_DATA)
        assertEquals(".WakeActivity", appInfo.metaData.getString("org.autojs.plugin.WAKE_ACTIVITY"))
    }

    private fun runSource(
        runtime: IBunRuntimePlugin,
        sourceName: String,
        sourceText: String,
        executionId: String = "instrumentation-${UUID.randomUUID()}",
        timeoutMillis: Long = 30_000L,
        outputByteLimit: Long = 1024L * 1024L,
        startedSignal: CountDownLatch? = null,
        expectStarted: Boolean = true,
    ): CapturedRun {
        val sourceFile = File.createTempFile("bun-test-", sourceName.substringAfterLast('.', ".js"), context.cacheDir)
        sourceFile.writeText(sourceText, Charsets.UTF_8)
        val finished = CountDownLatch(1)
        val events = mutableListOf<String>()
        val stdout = StringBuilder()
        val stderr = StringBuilder()
        val callback = object : IBunRuntimeCallback.Stub() {
            override fun onEvent(event: Bundle?) {
                event ?: return
                assertEquals(
                    BunRuntimeContract.PROTOCOL_VERSION,
                    event.getInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, -1),
                )
                val type = event.getString(BunRuntimeContract.KEY_EVENT_TYPE).orEmpty()
                synchronized(events) { events += type }
                when (type) {
                    BunRuntimeContract.EVENT_STARTED -> startedSignal?.countDown()
                    BunRuntimeContract.EVENT_STDOUT -> synchronized(stdout) {
                        stdout.append(event.getString(BunRuntimeContract.KEY_TEXT).orEmpty())
                    }
                    BunRuntimeContract.EVENT_STDERR -> synchronized(stderr) {
                        stderr.append(event.getString(BunRuntimeContract.KEY_TEXT).orEmpty())
                    }
                    BunRuntimeContract.EVENT_FINISHED -> finished.countDown()
                }
            }
        }
        return try {
            ParcelFileDescriptor.open(sourceFile, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
                runtime.runScript(Bundle().apply {
                    putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
                    putString(BunRuntimeContract.KEY_EXECUTION_ID, executionId)
                    putString(BunRuntimeContract.KEY_SOURCE_NAME, sourceName)
                    putLong(BunRuntimeContract.KEY_TIMEOUT_MILLIS, timeoutMillis)
                    putLong(BunRuntimeContract.KEY_OUTPUT_BYTE_LIMIT, outputByteLimit)
                }, descriptor, callback)
            }.also {
                assertEquals(
                    BunRuntimeContract.PROTOCOL_VERSION,
                    it.getInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, -1),
                )
                assertTrue("Finished callback was not delivered", finished.await(10, TimeUnit.SECONDS))
                synchronized(events) {
                    assertEquals(expectStarted, BunRuntimeContract.EVENT_STARTED in events)
                    assertTrue(BunRuntimeContract.EVENT_FINISHED in events)
                }
            }.let { result ->
                CapturedRun(
                    result = result,
                    stdout = synchronized(stdout) { stdout.toString() },
                    stderr = synchronized(stderr) { stderr.toString() },
                )
            }
        } finally {
            sourceFile.delete()
        }
    }

    private fun withBoundRuntime(block: (IBunRuntimePlugin) -> Unit) {
        val discovery = Intent(BunPluginActions.RUNTIME)
            .addCategory(BunPluginActions.CATEGORY)
            .setPackage(context.packageName)
        @Suppress("DEPRECATION")
        val matches = context.packageManager.queryIntentServices(discovery, 0)
        assertEquals("Bun runtime discovery must resolve exactly one service", 1, matches.size)
        val serviceInfo = matches.single().serviceInfo
        val latch = CountDownLatch(1)
        val binder = AtomicReference<IBinder?>()
        val connection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
                binder.set(service)
                latch.countDown()
            }
            override fun onServiceDisconnected(name: ComponentName?) = Unit
            override fun onNullBinding(name: ComponentName?) = latch.countDown()
            override fun onBindingDied(name: ComponentName?) = latch.countDown()
        }
        val explicit = Intent(discovery).setComponent(ComponentName(serviceInfo.packageName, serviceInfo.name))
        assertTrue(context.bindService(explicit, connection, Context.BIND_AUTO_CREATE))
        try {
            assertTrue(latch.await(20, TimeUnit.SECONDS))
            assertNotNull(binder.get())
            assertEquals(BunRuntimeContract.BINDER_DESCRIPTOR, binder.get()?.interfaceDescriptor)
            block(IBunRuntimePlugin.Stub.asInterface(binder.get()))
        } finally {
            context.unbindService(connection)
        }
    }

    private data class CapturedRun(
        val result: Bundle,
        val stdout: String,
        val stderr: String,
    )
}
