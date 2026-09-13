package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.app.LocaleManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.res.Configuration
import android.os.Bundle
import android.os.IBinder
import android.os.LocaleList
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import android.system.Os
import android.system.OsConstants
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.SdkSuppress
import androidx.test.platform.app.InstrumentationRegistry
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.autojs.plugin.bun.runtime.api.IBunRuntimeCallback
import org.autojs.plugin.bun.runtime.api.IBunRuntimePlugin
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.RandomAccessFile
import java.util.Locale
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/** Presentation regression, separate from the unchanged eight-test runtime suite. */
@RunWith(AndroidJUnit4::class)
@SdkSuppress(minSdkVersion = 33)
class BunRuntimeMessagesInstrumentedTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val locales = listOf("en", "ar", "es", "fr", "ja", "ko", "ru", "zh-CN", "zh-HK", "zh-TW")

    @Before
    fun assertEnvironment() = BunRuntimeInstrumentedTest().assertInstrumentationEnvironment()

    @Test
    fun tenLocalesRenderResourcesHelpAndBoundedDiagnostics() {
        val resources = R.string::class.java.fields.filter { it.name.startsWith("runtime_") }
        assertEquals(17, resources.size)
        val english = localized("en")
        val cachedFailure = BunRuntimeFailure.Unavailable("probe detail " + "😀".repeat(16_384))
        val cachedPages = BunRuntimeFailure.PageSize(16_384, 4_096)
        for (tag in locales) {
            val language = localized(tag)
            for (field in resources) {
                val id = field.getInt(null)
                val text = language.getString(id, 17L, 4096L)
                assertTrue("$tag/${field.name}", text.isNotBlank())
                assertFalse(text.contains(Regex("%[0-9]+\\$[ds]")))
                if (tag != "en") assertNotEquals("Fallback to English: $tag/${field.name}", english.getString(id, 17L, 4096L), text)
            }
            val help = language.resources.openRawResource(R.raw.plugin_instruction).bufferedReader().use { it.readText() }
            for (id in listOf(R.string.runtime_help_activation, R.string.runtime_help_android_version,
                R.string.runtime_error_timeout, R.string.runtime_error_output_limit, R.string.runtime_error_unavailable)) {
                assertTrue("Compiled help drift: $tag/$id", help.contains(language.getString(id)))
            }
            assertNull(language.runtimeErrorMessage(null))
            assertNull(language.runtimeFailureMessage(null))
            assertEquals(language.getString(R.string.runtime_error_internal), language.runtimeErrorMessage("FUTURE_ERROR"))
            for (code in listOf(BunRuntimeContract.ERROR_BUSY, BunRuntimeContract.ERROR_CANCELLED,
                BunRuntimeContract.ERROR_INTERNAL, BunRuntimeContract.ERROR_INVALID_REQUEST,
                BunRuntimeContract.ERROR_NON_ZERO_EXIT, BunRuntimeContract.ERROR_OUTPUT_LIMIT,
                BunRuntimeContract.ERROR_SOURCE_TOO_LARGE, BunRuntimeContract.ERROR_SPAWN_FAILED,
                BunRuntimeContract.ERROR_TIMEOUT, BunRuntimeContract.ERROR_RUNTIME_UNAVAILABLE)) {
                val text = requireNotNull(language.runtimeErrorMessage(code, 7))
                assertBounded(text)
                if (tag != "en") assertNotEquals(english.runtimeErrorMessage(code, 7), text)
            }
            val message = requireNotNull(language.runtimeFailureMessage(cachedFailure))
            assertTrue(message.startsWith(language.getString(R.string.runtime_error_unavailable)))
            assertTrue(message.contains(language.getString(R.string.runtime_diagnostic_label) + " probe detail "))
            assertBounded(message)
            assertEquals(language.getString(R.string.runtime_error_page_size, 16_384L, 4_096L), language.runtimeFailureMessage(cachedPages))
            status("resources locale=$tag keys=17 help=5 errorCodes=10 diagnosticBound=true")
        }
    }

    @Test
    fun binderErrorsFollowAppLocaleAndMatchFinishedEvents() = withRuntime { runtime ->
        val probe = runtime.prewarmRuntime()
        assertTrue(probe.getString(BunRuntimeContract.KEY_ERROR_MESSAGE), probe.getBoolean(BunRuntimeContract.KEY_RUNTIME_READY))
        withAppLocales { manager ->
            for (tag in locales) {
                val language = localized(tag)
                selectLocale(manager, runtime, tag, language)
                assertFailure(run(runtime, request = Bundle()), BunRuntimeContract.ERROR_INVALID_REQUEST,
                    language.getString(R.string.runtime_error_invalid_request), prefix = true)
                assertFailure(run(runtime, "setInterval(() => {}, 1000)", timeout = 500L), BunRuntimeContract.ERROR_TIMEOUT,
                    language.getString(R.string.runtime_error_timeout))
                assertFailure(run(runtime, "console.log('x'.repeat(4096))", outputLimit = 64L), BunRuntimeContract.ERROR_OUTPUT_LIMIT,
                    language.getString(R.string.runtime_error_output_limit))
                assertFailure(run(runtime, "process.exit(7)"), BunRuntimeContract.ERROR_NON_ZERO_EXIT,
                    language.getString(R.string.runtime_error_non_zero_exit, 7))
                val cancelled = request()
                assertTrue(runtime.cancelScript(cancelled.getString(BunRuntimeContract.KEY_EXECUTION_ID)))
                assertFailure(run(runtime, "throw new Error('must not run')", request = cancelled), BunRuntimeContract.ERROR_CANCELLED,
                    language.getString(R.string.runtime_error_cancelled))
                assertFailure(run(runtime, oversized = true), BunRuntimeContract.ERROR_SOURCE_TOO_LARGE,
                    language.getString(R.string.runtime_error_source_too_large, BunRuntimeContract.MAX_SOURCE_BYTES))
                status("binder locale=$tag errors=6 finishedMatches=true")
            }
        }
    }

    @Test
    fun cachedPageSizeRefusalFollowsLocaleInPrewarmInfoAndRun() = withRuntime { runtime ->
        val pages = Os.sysconf(OsConstants._SC_PAGESIZE)
        val initial = runtime.prewarmRuntime()
        assumeTrue(initial.getString(BunRuntimeContract.KEY_PROCESS_ABI) == "x86_64" && pages > BuildConfig.BUN_X86_MAX_PAGE_SIZE_BYTES)
        assertFalse(initial.getBoolean(BunRuntimeContract.KEY_RUNTIME_READY))
        withAppLocales { manager ->
            for (tag in locales) {
                val language = localized(tag)
                selectLocale(manager, runtime, tag, language)
                val expected = language.getString(R.string.runtime_error_page_size, pages, BuildConfig.BUN_X86_MAX_PAGE_SIZE_BYTES)
                for (probe in listOf(runtime.prewarmRuntime(), runtime.runtimeInfo)) {
                    assertFalse(probe.getBoolean(BunRuntimeContract.KEY_RUNTIME_READY))
                    val message = requireNotNull(probe.getString(BunRuntimeContract.KEY_ERROR_MESSAGE))
                    assertTrue(message, message.startsWith(expected + "\n"))
                    assertTrue(message.contains("stage=page-size reason=unsupported-page-size"))
                    assertTrue(message.contains("retry=service-recreation"))
                }
                assertFailure(run(runtime), BunRuntimeContract.ERROR_RUNTIME_UNAVAILABLE, expected, prefix = true)
                status("page-refusal locale=$tag pages=$pages prewarmInfoRun=true finishedMatches=true")
            }
        }
    }

    private fun localized(tag: String): Context = context.createConfigurationContext(
        Configuration(context.resources.configuration).apply { setLocales(LocaleList(Locale.forLanguageTag(tag))) },
    )

    private fun withAppLocales(block: (LocaleManager) -> Unit) {
        val manager = requireNotNull(context.getSystemService(LocaleManager::class.java))
        val previous = manager.applicationLocales
        try { block(manager) } finally {
            manager.applicationLocales = previous
            assertEquals(previous, manager.applicationLocales)
            status("localeRestored=true")
        }
    }

    private fun selectLocale(manager: LocaleManager, runtime: IBunRuntimePlugin, tag: String, language: Context) {
        manager.applicationLocales = LocaleList.forLanguageTags(tag)
        val expected = language.getString(R.string.runtime_error_invalid_request)
        val deadline = SystemClock.elapsedRealtime() + 10_000L
        do {
            val actual = runtime.runScript(Bundle(), null, null).getString(BunRuntimeContract.KEY_ERROR_MESSAGE).orEmpty()
            if (actual.startsWith(expected)) return
            SystemClock.sleep(50L)
        } while (SystemClock.elapsedRealtime() < deadline)
        fail("Service did not receive locale configuration: $tag")
    }

    private fun request(timeout: Long = 10_000L, outputLimit: Long = 1024L) = Bundle().apply {
        putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
        putString(BunRuntimeContract.KEY_EXECUTION_ID, "messages-${UUID.randomUUID()}")
        putString(BunRuntimeContract.KEY_SOURCE_NAME, "messages.js")
        putLong(BunRuntimeContract.KEY_TIMEOUT_MILLIS, timeout)
        putLong(BunRuntimeContract.KEY_OUTPUT_BYTE_LIMIT, outputLimit)
    }

    private fun run(runtime: IBunRuntimePlugin, source: String = "void 0", timeout: Long = 10_000L,
        outputLimit: Long = 1024L, request: Bundle = request(timeout, outputLimit), oversized: Boolean = false): Bundle {
        val file = File.createTempFile("message-test-", ".js", context.cacheDir)
        val finished = AtomicReference<Bundle>()
        val latch = CountDownLatch(1)
        val callback = object : IBunRuntimeCallback.Stub() {
            override fun onEvent(event: Bundle?) {
                if (event?.getString(BunRuntimeContract.KEY_EVENT_TYPE) == BunRuntimeContract.EVENT_FINISHED) {
                    finished.set(event)
                    latch.countDown()
                }
            }
        }
        try {
            if (oversized) RandomAccessFile(file, "rw").use { it.setLength(BunRuntimeContract.MAX_SOURCE_BYTES + 1) }
            else file.writeText(source, Charsets.UTF_8)
            val result = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use {
                runtime.runScript(request, it, callback)
            }
            assertTrue("Missing finished event", latch.await(10, TimeUnit.SECONDS))
            for (key in listOf(BunRuntimeContract.KEY_ERROR_CODE, BunRuntimeContract.KEY_ERROR_MESSAGE,
                BunRuntimeContract.KEY_EXECUTION_ID, BunRuntimeContract.KEY_STDOUT, BunRuntimeContract.KEY_STDERR)) {
                assertEquals(key, result.getString(key), finished.get().getString(key))
            }
            assertTrue(result.getString(BunRuntimeContract.KEY_STDOUT).isNullOrEmpty())
            assertTrue(result.getString(BunRuntimeContract.KEY_STDERR).isNullOrEmpty())
            return result
        } finally { assertTrue(file.delete()) }
    }

    private fun assertFailure(result: Bundle, code: String, message: String, prefix: Boolean = false) {
        assertFalse(result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED))
        assertEquals(code, result.getString(BunRuntimeContract.KEY_ERROR_CODE))
        val actual = requireNotNull(result.getString(BunRuntimeContract.KEY_ERROR_MESSAGE))
        if (prefix) assertTrue(actual, actual.startsWith(message + "\n")) else assertEquals(message, actual)
        assertBounded(actual)
    }

    private fun assertBounded(message: String) {
        assertTrue(message.toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_TERMINAL_MESSAGE_BYTES)
        assertEquals(message, message.toByteArray(Charsets.UTF_8).toString(Charsets.UTF_8))
    }

    private fun status(text: String) = InstrumentationRegistry.getInstrumentation().sendStatus(0,
        Bundle().apply { putString("stream", "\nBUN_MESSAGES $text\n") })

    private fun withRuntime(block: (IBunRuntimePlugin) -> Unit) {
        val connected = CountDownLatch(1)
        val binder = AtomicReference<IBinder>()
        val connection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, service: IBinder?) { binder.set(service); connected.countDown() }
            override fun onServiceDisconnected(name: ComponentName?) = Unit
        }
        val intent = Intent().setComponent(ComponentName(context.packageName, BunRuntimeService::class.java.name))
        assertTrue(context.bindService(intent, connection, Context.BIND_AUTO_CREATE))
        try {
            assertTrue(connected.await(20, TimeUnit.SECONDS))
            assertEquals(BunRuntimeContract.BINDER_DESCRIPTOR, binder.get().interfaceDescriptor)
            block(IBunRuntimePlugin.Stub.asInterface(binder.get()))
        } finally { context.unbindService(connection) }
    }
}
