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
import android.system.Os
import android.system.OsConstants
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
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.RandomAccessFile
import java.net.InetAddress
import java.net.ServerSocket
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class BunRuntimeInstrumentedTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val instrumentationContext = InstrumentationRegistry.getInstrumentation().context

    @Before
    fun assertInstrumentationEnvironment() {
        assertTrue(
            "Bun runtime instrumentation requires Android 13 (API 33) or newer, but ran on API ${Build.VERSION.SDK_INT}",
            Build.VERSION.SDK_INT >= MIN_SUPPORTED_API_LEVEL,
        )
        val requiredApiLevel = requireNotNull(
            InstrumentationRegistry.getArguments()
                .getString(REQUIRED_API_LEVEL_ARGUMENT)
                ?.toIntOrNull(),
        ) {
            "Instrumentation runner argument $REQUIRED_API_LEVEL_ARGUMENT must contain the expected API level"
        }
        assertEquals(
            "Instrumentation ran on API ${Build.VERSION.SDK_INT}, but the workflow required API $requiredApiLevel",
            requiredApiLevel,
            Build.VERSION.SDK_INT,
        )
        InstrumentationRegistry.getArguments()
            .getString(REQUIRED_PAGE_SIZE_BYTES_ARGUMENT)
            ?.let { requiredPageSizeArgument ->
                val requiredPageSizeBytes = requireNotNull(requiredPageSizeArgument.toLongOrNull()) {
                    "Instrumentation runner argument $REQUIRED_PAGE_SIZE_BYTES_ARGUMENT must contain " +
                        "the expected page size"
                }
                val actualPageSizeBytes = Os.sysconf(OsConstants._SC_PAGESIZE)
                assertEquals(
                    "Instrumentation ran with PAGE_SIZE=$actualPageSizeBytes, but the workflow required " +
                        "PAGE_SIZE=$requiredPageSizeBytes",
                    requiredPageSizeBytes,
                    actualPageSizeBytes,
                )
            }
    }

    @Test
    fun installedNativeRuntimeMatchesTheLockedPayload() {
        val packagedAbis = context.packagedRuntimeAbis().toSet()
        val runtime = File(context.applicationInfo.nativeLibraryDir, "libbun_exec.so")
        assertTrue("Installed Bun runtime is missing: $runtime", runtime.isFile)
        val actualSha256 = runtime.sha256()
        val installedAbi = requireNotNull(lockedRuntimeAbiForSha256(actualSha256)) {
            "Installed Bun runtime SHA-256 does not match any locked ABI payload"
        }
        val expectedBytes = when (installedAbi) {
            "arm64-v8a" -> BuildConfig.BUN_RUNTIME_ARM64_V8A_BYTES
            "x86_64" -> BuildConfig.BUN_RUNTIME_X86_64_BYTES
            else -> error("Unexpected installed Bun ABI: $installedAbi")
        }
        assertTrue("Installed Bun ABI $installedAbi is absent from the APK", installedAbi in packagedAbis)
        assertTrue("Installed Bun ABI $installedAbi is unsupported by the device", installedAbi in Build.SUPPORTED_ABIS)
        assertEquals("Installed Bun runtime byte count", expectedBytes, runtime.length())
    }

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

            val probes = List(PREWARM_REPETITIONS) { runtime.prewarmRuntime() }
            val installedRuntimeAbi = requireNotNull(
                lockedRuntimeAbiForSha256(
                    File(context.applicationInfo.nativeLibraryDir, "libbun_exec.so").sha256(),
                ),
            )
            probes.forEach { probe -> assertRuntimeProbe(probe, packagedAbis, installedRuntimeAbi) }
            assertEquals(
                probes.first().getString(BunRuntimeContract.KEY_RUNTIME_PATH),
                probes.last().getString(BunRuntimeContract.KEY_RUNTIME_PATH),
            )

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

            val spawnAndFileIo = runSource(
                runtime,
                "spawn-and-file-io.bun.js",
                """
                    import { readFile, realpath, writeFile } from "node:fs/promises";
                    import { dirname, join } from "node:path";

                    const workDirectory = process.cwd();
                    const temporaryDirectory = process.env.TMPDIR;
                    const canonicalWorkDirectory = await realpath(workDirectory);
                    const canonicalTemporaryParent = temporaryDirectory
                        ? await realpath(dirname(temporaryDirectory))
                        : "";
                    if (canonicalTemporaryParent !== canonicalWorkDirectory) {
                        throw new Error("TMPDIR is outside the private execution workspace");
                    }

                    const marker = join(workDirectory, "file-io-smoke.txt");
                    await writeFile(marker, "file-io-ok", "utf8");
                    const markerText = await readFile(marker, "utf8");

                    const child = Bun.spawn({
                        cmd: [process.execPath, "-e", "process.stdout.write('spawn-ok')"],
                        cwd: workDirectory,
                        stdout: "pipe",
                        stderr: "pipe",
                    });
                    const childStdout = await new Response(child.stdout).text();
                    const childStderr = await new Response(child.stderr).text();
                    const childExitCode = await child.exited;
                    if (childExitCode !== 0) {
                        throw new Error("Bun.spawn failed with " + childExitCode + ": " + childStderr);
                    }
                    if (childStdout !== "spawn-ok") {
                        throw new Error("Unexpected Bun.spawn output: " + childStdout);
                    }

                    console.log("$WORKSPACE_OUTPUT_PREFIX" + canonicalWorkDirectory);
                    console.log("file=" + markerText + ";spawn=" + childStdout);
                """.trimIndent(),
            )
            assertTrue(
                buildString {
                    append(spawnAndFileIo.result.getString(BunRuntimeContract.KEY_ERROR_MESSAGE).orEmpty())
                    if (spawnAndFileIo.stderr.isNotBlank()) append("; stderr: ${spawnAndFileIo.stderr}")
                    if (spawnAndFileIo.stdout.isNotBlank()) append("; stdout: ${spawnAndFileIo.stdout}")
                },
                spawnAndFileIo.result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED),
            )
            assertTrue(spawnAndFileIo.stdout.contains("file=file-io-ok;spawn=spawn-ok"))
            val workspacePath = spawnAndFileIo.stdout.lineSequence()
                .single { line -> line.startsWith(WORKSPACE_OUTPUT_PREFIX) }
                .removePrefix(WORKSPACE_OUTPUT_PREFIX)
            val workspace = File(workspacePath).canonicalFile
            assertEquals(File(context.cacheDir, "bun-executions").canonicalFile, workspace.parentFile)
            assertTrue("Private execution workspace was not removed after the run", !workspace.exists())
        }
    }

    @Test
    fun checkedInSamplesExecuteWithinPublishedBoundaries() {
        withBoundRuntime { runtime ->
            val expectations = listOf(
                SampleExpectation(
                    sourceName = "hello.bun.js",
                    stdout = listOf("Hello from Bun 1.4.0 on android"),
                ),
                SampleExpectation(
                    sourceName = "typescript.bun.ts",
                    stdout = listOf("Completed 1 of 2 typed tasks"),
                ),
                SampleExpectation(
                    sourceName = "file-io.bun.js",
                    stdout = listOf("Saved and restored bun 1.4.0", "Temporary file:"),
                ),
                SampleExpectation(
                    sourceName = "output-streams.bun.js",
                    stdout = listOf("stdout: a normal result", "stdout: written without console.log"),
                    stderr = listOf("stderr: a diagnostic message", "stderr: written without console.error"),
                ),
            )
            expectations.forEach { expectation ->
                assertSampleRun(runtime, expectation)
            }

            withLocalHttpEndpoint { endpoint ->
                assertSampleRun(
                    runtime,
                    SampleExpectation(
                        sourceName = "fetch.bun.js",
                        stdout = listOf("GET $endpoint -> 200", "Received 15 characters"),
                        environment = mapOf("SAMPLE_FETCH_URL" to endpoint),
                    ),
                )
            }
        }
    }

    @Test
    fun sigtermIgnoringTimeoutReapsTheChild() {
        withBoundRuntime { runtime ->
            assertTrue(runtime.prewarmRuntime().getBoolean(BunRuntimeContract.KEY_RUNTIME_READY))
            // Translation may take longer than the default fixture deadline to
            // install its signal handler. This changes script runtime only,
            // never the supervisor grace or the five-second cleanup assertion.
            val fixtureTimeout = InstrumentationRegistry.getArguments()
                .getString("sigtermIgnoringTimeoutMillis")?.toLong() ?: 3_000L
            require(fixtureTimeout in 3_000L..30_000L)
            val startedAt = SystemClock.elapsedRealtime()
            val captured = runSource(
                runtime = runtime,
                sourceName = "uncooperative-timeout.bun.js",
                sourceText = uncooperativeSource(),
                timeoutMillis = fixtureTimeout,
            )
            assertReaped(captured, BunRuntimeContract.ERROR_TIMEOUT)
            assertTrue("Timeout cleanup exceeded its bound", SystemClock.elapsedRealtime() - startedAt < fixtureTimeout + 5_000L)
            assertTrue(runSource(runtime, "recovery.js", "console.log('recovered');")
                .result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED))
        }
    }

    @Test
    fun sigtermIgnoringCancellationAfterReadinessReapsTheChild() {
        withBoundRuntime { runtime ->
            assertTrue(runtime.prewarmRuntime().getBoolean(BunRuntimeContract.KEY_RUNTIME_READY))
            repeat(3) {
                val ready = CountDownLatch(1)
                val executionId = "ready-cancel-${UUID.randomUUID()}"
                val executor = Executors.newSingleThreadExecutor()
                try {
                    val future = executor.submit<CapturedRun> {
                        runSource(runtime, "uncooperative-cancel.js", uncooperativeSource(),
                            executionId = executionId, timeoutMillis = 30_000L, stdoutReadySignal = ready)
                    }
                    assertTrue("SIGTERM handler was not ready", ready.await(15, TimeUnit.SECONDS))
                    val startedAt = SystemClock.elapsedRealtime()
                    assertTrue(runtime.cancelScript(executionId))
                    val captured = future.get(8, TimeUnit.SECONDS)
                    assertReaped(captured, BunRuntimeContract.ERROR_CANCELLED)
                    assertTrue(captured.result.getBoolean(BunRuntimeContract.KEY_CANCELLED))
                    assertTrue("Cancellation cleanup exceeded its bound", SystemClock.elapsedRealtime() - startedAt < 5_000L)
                } finally {
                    executor.shutdownNow()
                }
            }
            assertTrue(runSource(runtime, "cancel-recovery.js", "console.log('recovered');")
                .result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED))
        }
    }

    @Test
    fun sigtermIgnoringOutputLimitReapsTheChild() {
        withBoundRuntime { runtime ->
            assertTrue(runtime.prewarmRuntime().getBoolean(BunRuntimeContract.KEY_RUNTIME_READY))
            val startedAt = SystemClock.elapsedRealtime()
            val captured = runSource(runtime, "uncooperative-output.js",
                uncooperativeSource("await Bun.sleep(500); writeSync(1, 'x'.repeat(4096));"),
                timeoutMillis = 30_000L, outputByteLimit = 1_024L)
            assertReaped(captured, BunRuntimeContract.ERROR_OUTPUT_LIMIT)
            assertTrue(captured.stdout.toByteArray(Charsets.UTF_8).size <= 1_024)
            assertTrue("Output limit waited for script timeout", SystemClock.elapsedRealtime() - startedAt < 8_000L)
            assertTrue(runSource(runtime, "output-recovery.js", "console.log('recovered');")
                .result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED))
        }
    }

    private fun uncooperativeSource(afterReady: String = "") = """
        import { writeSync } from 'node:fs';
        process.on('SIGTERM', () => {});
        writeSync(1, 'ready-pid=' + process.pid + '\nworkdir=' + process.cwd() + '\n');
        $afterReady
        setInterval(() => {}, 1000);
    """.trimIndent()

    private fun assertReaped(captured: CapturedRun, expectedError: String) {
        assertEquals(expectedError, captured.result.getString(BunRuntimeContract.KEY_ERROR_CODE))
        assertTrue("Handler readiness was not observed; result=${captured.result}; stdout=${captured.stdout}; stderr=${captured.stderr}",
            captured.stdout.contains("ready-pid="))
        val childPid = captured.stdout.lineSequence()
            .single { it.startsWith("ready-pid=") }.removePrefix("ready-pid=").toInt()
        assertTrue("Bun child $childPid survived terminal $expectedError; result=${captured.result}",
            !File("/proc/$childPid").exists())
        assertTrue("Terminal result has no reaped exit status", captured.result.getInt(BunRuntimeContract.KEY_EXIT_CODE) != -1)
        val workspace = File(captured.stdout.lineSequence()
            .single { it.startsWith(WORKSPACE_OUTPUT_PREFIX) }.removePrefix(WORKSPACE_OUTPUT_PREFIX)).canonicalFile
        assertEquals(File(context.cacheDir, "bun-executions").canonicalFile, workspace.parentFile)
        assertTrue("Private execution workspace survived $expectedError", !workspace.exists())
        InstrumentationRegistry.getInstrumentation().sendStatus(0, Bundle().apply {
            putString("stream", "\nBUN_LIFECYCLE error=$expectedError childPid=$childPid reaped=true " +
                "exitCode=${captured.result.getInt(BunRuntimeContract.KEY_EXIT_CODE)} " +
                "durationMillis=${captured.result.getLong(BunRuntimeContract.KEY_DURATION_MILLIS)} workspaceRemoved=true\n")
        })
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
        environment: Map<String, String> = emptyMap(),
        startedSignal: CountDownLatch? = null,
        stdoutReadySignal: CountDownLatch? = null,
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
                        if (stdout.contains("ready-pid=") && stdout.contains("\nworkdir=")) stdoutReadySignal?.countDown()
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
                    if (environment.isNotEmpty()) {
                        putBundle(BunRuntimeContract.KEY_ENVIRONMENT, Bundle().apply {
                            environment.forEach(::putString)
                        })
                    }
                }, descriptor, callback)
            }.also {
                assertEquals(
                    BunRuntimeContract.PROTOCOL_VERSION,
                    it.getInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, -1),
                )
                assertTrue("Finished callback was not delivered", finished.await(10, TimeUnit.SECONDS))
                synchronized(events) {
                    assertEquals(expectStarted, BunRuntimeContract.EVENT_STARTED in events)
                    assertEquals("Exactly one finished event is required", 1, events.count { it == BunRuntimeContract.EVENT_FINISHED })
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

    private fun assertSampleRun(runtime: IBunRuntimePlugin, expectation: SampleExpectation) {
        val source = instrumentationContext.assets.open(expectation.sourceName)
            .bufferedReader(Charsets.UTF_8)
            .use { it.readText() }
        val captured = runSource(
            runtime = runtime,
            sourceName = expectation.sourceName,
            sourceText = source,
            environment = expectation.environment,
        )
        assertTrue(
            buildString {
                append("Sample ${expectation.sourceName} failed")
                append("; result=${captured.result.getString(BunRuntimeContract.KEY_ERROR_MESSAGE).orEmpty()}")
                if (captured.stdout.isNotBlank()) append("; stdout=${captured.stdout}")
                if (captured.stderr.isNotBlank()) append("; stderr=${captured.stderr}")
            },
            captured.result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED),
        )
        expectation.stdout.forEach { text ->
            assertTrue("${expectation.sourceName} stdout did not contain $text", captured.stdout.contains(text))
        }
        expectation.stderr.forEach { text ->
            assertTrue("${expectation.sourceName} stderr did not contain $text", captured.stderr.contains(text))
        }
        if (expectation.stderr.isEmpty()) {
            assertTrue("${expectation.sourceName} wrote unexpected stderr: ${captured.stderr}", captured.stderr.isEmpty())
        }
    }

    private fun withLocalHttpEndpoint(block: (String) -> Unit) {
        val body = "sample-fetch-ok"
        ServerSocket(0, 1, InetAddress.getByName("127.0.0.1")).use { server ->
            server.soTimeout = 30_000
            val executor = Executors.newSingleThreadExecutor()
            val response = executor.submit {
                server.accept().use { client ->
                    client.soTimeout = 10_000
                    val reader = client.getInputStream().bufferedReader(StandardCharsets.US_ASCII)
                    while (true) {
                        val line = reader.readLine() ?: break
                        if (line.isEmpty()) break
                    }
                    val payload = buildString {
                        append("HTTP/1.1 200 OK\r\n")
                        append("Content-Type: text/plain; charset=utf-8\r\n")
                        append("Content-Length: ${body.toByteArray(StandardCharsets.UTF_8).size}\r\n")
                        append("Connection: close\r\n")
                        append("\r\n")
                        append(body)
                    }.toByteArray(StandardCharsets.UTF_8)
                    client.getOutputStream().apply {
                        write(payload)
                        flush()
                    }
                }
            }
            try {
                block("http://127.0.0.1:${server.localPort}/sample")
                response.get(10, TimeUnit.SECONDS)
            } finally {
                server.close()
                executor.shutdownNow()
            }
        }
    }

    private fun assertRuntimeProbe(
        probe: Bundle,
        packagedAbis: Set<String>,
        installedRuntimeAbi: String,
    ) {
        assertTrue(
            probe.getString(BunRuntimeContract.KEY_ERROR_MESSAGE).orEmpty(),
            probe.getBoolean(BunRuntimeContract.KEY_RUNTIME_READY),
        )
        assertEquals(BunRuntimeContract.RUNTIME_VERSION, probe.getString(BunRuntimeContract.KEY_RUNTIME_VERSION))
        assertEquals(BunRuntimeContract.RUNTIME_REVISION, probe.getString(BunRuntimeContract.KEY_RUNTIME_REVISION))
        assertTrue(probe.getString(BunRuntimeContract.KEY_PROCESS_NAME).orEmpty().endsWith(":bun_runtime"))
        assertEquals(
            packagedAbis,
            probe.getStringArray(BunRuntimeContract.KEY_SUPPORTED_ABIS).orEmpty().toSet(),
        )
        assertEquals(
            installedRuntimeAbi,
            probe.getString(BunRuntimeContract.KEY_PROCESS_ABI),
        )
        assertEquals(BunRuntimeContract.MAX_SOURCE_BYTES, probe.getLong(BunRuntimeContract.KEY_MAX_SOURCE_BYTES))
        assertEquals(BunRuntimeContract.MAX_OUTPUT_BYTES, probe.getLong(BunRuntimeContract.KEY_MAX_OUTPUT_BYTES))
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

    private data class SampleExpectation(
        val sourceName: String,
        val stdout: List<String>,
        val stderr: List<String> = emptyList(),
        val environment: Map<String, String> = emptyMap(),
    )

    private fun File.sha256(): String {
        val digest = MessageDigest.getInstance("SHA-256")
        inputStream().buffered().use { input ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) }
    }

    private companion object {
        const val MIN_SUPPORTED_API_LEVEL = Build.VERSION_CODES.TIRAMISU
        const val PREWARM_REPETITIONS = 2
        const val REQUIRED_API_LEVEL_ARGUMENT = "requiredApiLevel"
        const val REQUIRED_PAGE_SIZE_BYTES_ARGUMENT = "requiredPageSizeBytes"
        const val WORKSPACE_OUTPUT_PREFIX = "workdir="
    }
}
