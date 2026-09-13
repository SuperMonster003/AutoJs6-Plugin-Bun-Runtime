package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.IOException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/** Test-only injected launch failure; real installed payloads and production probe/cache thereafter. */
@RunWith(AndroidJUnit4::class)
class BunRuntimeProbeInstrumentedTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Before fun environment() = BunRuntimeInstrumentedTest().assertInstrumentationEnvironment()

    @Test fun transientFailureRetriesOnceForConcurrentCallersAfterCooldown() {
        val now = AtomicLong(0)
        val starts = AtomicInteger()
        val binary = BunRuntimeBinary(context, now::get) { command, helper ->
            if (starts.incrementAndGet() == 1) throw IOException("test-only private path must stay private")
            SupervisedProcess.start(ProcessBuilder(command), helper)
        }
        val pool = Executors.newFixedThreadPool(8)
        try {
            fun together() = (1..8).map { pool.submit<BunRuntimeProbe> { binary.probe() } }.map { it.get(45, TimeUnit.SECONDS) }
            val failed = together()
            failed.forEach { assertSame(failed.first(), it) }
            assertFalse(failed.first().ready)
            assertTrue(failed.first().retryable)
            val message = requireNotNull(context.runtimeFailureMessage(failed.first().failure))
            assertTrue(message, message.contains("stage=version reason=start-failed"))
            assertTrue(message.contains("api=${Build.VERSION.SDK_INT}"))
            assertTrue(message.contains("retry=after-30000ms-on-request"))
            assertFalse(message.contains("private path"))
            now.set(29_999)
            assertSame(failed.first(), binary.probe())
            assertEquals(1, starts.get())
            now.set(30_000)
            val success = together()
            success.forEach { assertSame(success.first(), it) }
            assertTrue(context.runtimeFailureMessage(success.first().failure), success.first().ready)
            assertEquals(BuildConfig.BUN_RUNTIME_REVISION, success.first().revision)
            assertEquals(4, starts.get()) // One injected failure, then version/revision/smoke.
            now.set(3_000_000)
            assertSame(success.first(), binary.probe())
            assertEquals(4, starts.get())
            status("retry callers=8 commands=4 cooldownMillis=30000 recovered=true injectedStartFailure=true")
        } finally { pool.shutdownNow() }
    }

    @Test fun permanentIdentityFailureRequiresANewCacheAndDoesNotRetry() {
        val now = AtomicLong(0)
        val starts = AtomicInteger()
        val binary = BunRuntimeBinary(context, now::get) { command, helper ->
            starts.incrementAndGet()
            // Fixed test-only command; do not change the installed native payload or production arguments.
            SupervisedProcess.start(ProcessBuilder(command.take(1) + listOf("--eval", "console.log('mismatch')")), helper)
        }
        val failed = binary.probe()
        assertFalse(failed.ready || failed.retryable)
        assertTrue(context.runtimeFailureMessage(failed.failure)!!.contains("stage=version reason=version-mismatch"))
        now.set(3_000_000)
        assertSame(failed, binary.probe())
        assertEquals(1, starts.get())
        assertTrue(BunRuntimeBinary(context).probe().ready)
        status("permanent commands=1 elapsedMillis=3000000 cached=true newCacheReady=true injectedVersionMismatch=true")
    }

    @Test fun realCommandsBoundOutputTimeoutAndExitDiagnostics() {
        val binary = BunRuntimeBinary(context)
        val ready = binary.probe()
        assertTrue(context.runtimeFailureMessage(ready.failure), ready.ready)
        fun run(source: String, timeout: Long = 10_000) = BunProbeCommandRunner(start = { args ->
            SupervisedProcess.start(ProcessBuilder(listOf(binary.file.path) + args), binary.supervisor)
        }, timeoutMillis = timeout).run(listOf("--eval", source))
        val nonzero = run("console.error('probe-synthetic-error'); process.exit(159)")
        assertEquals("nonzero-exit", nonzero.reason)
        assertEquals(159, nonzero.exitCode)
        val message = probeDiagnostic(Build.VERSION.SDK_INT, ready.abi, "smoke", nonzero.reason!!, true,
            ready.version, ready.revision, nonzero)
        assertTrue(message.contains("possibleSignal=31(exit-convention-only)"))
        assertTrue(message.contains("stderr: probe-synthetic-error"))
        assertTrue(nonzero.reaped && nonzero.drained)
        for ((stream, script) in listOf("stdout" to "console.log('😀'.repeat(32768))",
            "stderr" to "console.error('😀'.repeat(32768))")) {
            val overflow = run(script)
            assertEquals("output-limit", overflow.reason)
            assertTrue(overflow.reaped && overflow.drained && overflow.outputTruncated)
            val text = if (stream == "stdout") overflow.stdout else overflow.stderr
            assertTrue(text.toByteArray(Charsets.UTF_8).size <= BunProbeCommandRunner.OUTPUT_BYTES)
            assertEquals(text, text.toByteArray(Charsets.UTF_8).toString(Charsets.UTF_8))
            assertTrue(context.runtimeErrorMessage(BunRuntimeContract.ERROR_RUNTIME_UNAVAILABLE, diagnostic = message)!!
                .toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_TERMINAL_MESSAGE_BYTES)
        }
        val began = SystemClock.elapsedRealtime()
        val timeout = run("process.on('SIGTERM', () => {}); console.error('probe-ready'); setInterval(() => {}, 1000)", 1500)
        val elapsed = SystemClock.elapsedRealtime() - began
        assertEquals("timeout", timeout.reason)
        assertTrue(timeout.stderr.contains("probe-ready"))
        assertEquals(137, timeout.exitCode)
        assertTrue(timeout.reaped && timeout.drained)
        assertTrue("Cleanup exceeded bound: $elapsed", elapsed < 5000)
        assertTrue(run("void 0").succeeded)
        assertTrue(Thread.getAllStackTraces().keys.none { it.isAlive && it.name.startsWith("AutoJs6-Bun-probe-") })
        status("commands nonzero=159 syntheticExit=true outputStreams=2 capBytes=4096 timeoutExit=137 reaped=true readers=0 recovery=true")
    }

    private fun status(text: String) = InstrumentationRegistry.getInstrumentation().sendStatus(0,
        Bundle().apply { putString("stream", "\nBUN_PROBE $text\n") })
}
