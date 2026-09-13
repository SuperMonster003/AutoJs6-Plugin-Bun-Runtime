package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.junit.Assert.*
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

class BunRuntimeProbeTest {
    private fun probe(ready: Boolean = false, retryable: Boolean = false) = BunRuntimeProbe(
        ready, "/installed/libbun_exec.so", "arm64-v8a", null, null,
        if (ready) null else BunRuntimeFailure.Unavailable("fixed facts"), retryable,
    )

    @Test fun successfulAndPermanentResultsLastForTheCacheLifetime() {
        for (result in listOf(probe(ready = true), probe())) {
            val now = AtomicLong(0)
            val calls = AtomicInteger()
            val cache = BunRuntimeProbeCache(now::get) { calls.incrementAndGet(); result }
            assertSame(result, cache.probe())
            now.set(Long.MAX_VALUE)
            assertSame(result, cache.probe())
            assertEquals(1, calls.get())
        }
    }

    @Test fun cooldownStartsAfterFailureAndOnlyAnExpiredRequestRetries() {
        val now = AtomicLong(0)
        val calls = AtomicInteger()
        val first = probe(retryable = true)
        val recovered = probe(ready = true)
        val cache = BunRuntimeProbeCache(now::get) {
            now.addAndGet(20_000) // Inspection time is not part of the cooldown.
            if (calls.incrementAndGet() == 1) first else recovered
        }
        assertSame(first, cache.probe())
        now.set(49_999)
        assertSame(first, cache.probe())
        assertEquals(1, calls.get())
        now.set(50_000)
        assertSame(recovered, cache.probe())
        now.set(1_000_000)
        assertSame(recovered, cache.probe())
        assertEquals(2, calls.get())
    }

    @Test fun concurrentColdAndExpiredRequestsShareOneCompletedAttempt() {
        val now = AtomicLong(0)
        val calls = AtomicInteger()
        var entered = CountDownLatch(1)
        var release = CountDownLatch(1)
        val cache = BunRuntimeProbeCache(now::get) {
            calls.incrementAndGet()
            entered.countDown()
            check(release.await(5, TimeUnit.SECONDS))
            probe(retryable = true)
        }
        val pool = Executors.newFixedThreadPool(8)
        try {
            for (attempt in 1..2) {
                val jobs = (1..8).map { pool.submit<BunRuntimeProbe> { cache.probe() } }
                assertTrue(entered.await(5, TimeUnit.SECONDS))
                assertEquals(attempt, calls.get())
                release.countDown()
                val results = jobs.map { it.get(5, TimeUnit.SECONDS) }
                results.forEach { assertSame(results.first(), it) }
                assertEquals(attempt, calls.get())
                entered = CountDownLatch(1)
                release = CountDownLatch(1)
                now.addAndGet(BunRuntimeProbeCache.RETRY_MILLIS)
            }
        } finally { release.countDown(); pool.shutdownNow() }
    }

    @Test fun fixedCommandKeepsStdoutAndStderrSeparateAndAlwaysCleansUp() {
        val process = RecordingProcess("1.4.0\n", "warning\n")
        val result = BunProbeCommandRunner(start = { assertEquals(listOf("--version"), it); process }).run(listOf("--version"))
        assertTrue(result.succeeded)
        assertEquals("1.4.0\n", result.stdout)
        assertEquals("warning\n", result.stderr)
        assertTrue(result.reaped && result.drained)
        assertTrue(process.terminated)
        assertTrue(process.closed.get() == 2)
    }

    @Test fun aNonzeroExitCarriesBoundedStderrAndOnlyAnInferredSignal() {
        val result = BunProbeCommandRunner(start = { RecordingProcess("", "synthetic", code = 159) }).run(listOf("--eval", "void 0"))
        assertEquals("nonzero-exit", result.reason)
        assertEquals(159, result.exitCode)
        assertTrue(result.retryable)
        val diagnostic = probeDiagnostic(28, "arm64-v8a", "smoke", result.reason!!, result.retryable, "1.4.0", "revision", result)
        for (fact in listOf("api=28", "abi=arm64-v8a", "stage=smoke", "exit=159", "possibleSignal=31(exit-convention-only)",
            "retry=after-30000ms-on-request", "stderr: synthetic")) assertTrue(diagnostic, diagnostic.contains(fact))
        assertFalse(probeDiagnostic(33, null, "version", "start-failed", true, null, null).contains("possibleSignal"))
    }

    @Test fun outputOverflowStopsTheProcessAndRetainsOnlyFixedBytes() {
        for (stderr in listOf(false, true)) {
            val large = "😀".repeat(5000)
            val process = RecordingProcess(if (stderr) "" else large, if (stderr) large else "")
            val result = BunProbeCommandRunner(start = { process }).run(listOf("--version"))
            assertEquals("output-limit", result.reason)
            assertTrue(result.outputTruncated && result.reaped && result.drained)
            assertTrue(process.terminated)
            val text = if (stderr) result.stderr else result.stdout
            assertEquals(BunProbeCommandRunner.OUTPUT_BYTES, text.toByteArray(Charsets.UTF_8).size)
            assertEquals(text, text.toByteArray(Charsets.UTF_8).toString(Charsets.UTF_8))
        }
    }

    @Test fun timeoutAndReadFailureRequestTerminationBeforeClosingReaders() {
        val timeout = BunProbeCommandRunner(start = { RecordingProcess("", "", initialWait = false) }, timeoutMillis = 1).run(emptyList())
        assertEquals("timeout", timeout.reason)
        assertTrue(timeout.reaped && timeout.drained && timeout.retryable)
        val readFailure = BunProbeCommandRunner(start = { RecordingProcess("", "", readFailure = true) }).run(emptyList())
        assertEquals("read-failed", readFailure.reason)
        assertTrue(readFailure.reaped && readFailure.drained)
    }

    @Test fun incompleteReapDisablesRetryAndNeverFabricatesAnExitCode() {
        val result = BunProbeCommandRunner(start = { RecordingProcess("", "", initialWait = false, canReap = false) }, timeoutMillis = 1).run(emptyList())
        assertEquals("reap-incomplete", result.reason)
        assertNull(result.exitCode)
        assertFalse(result.reaped || result.retryable)
    }

    @Test fun interruptionStillReapsAndRestoresTheCallerFlag() {
        val process = RecordingProcess("", "", interruptWait = true)
        try {
            val result = BunProbeCommandRunner(start = { process }).run(emptyList())
            assertEquals("interrupted", result.reason)
            assertTrue(result.reaped && result.drained)
            assertTrue(Thread.currentThread().isInterrupted)
        } finally { Thread.interrupted() }
    }

    @Test fun launchExceptionsDoNotExposePathsOrUserDetails() {
        val result = BunProbeCommandRunner(start = { throw IOException("/private/path secret") }).run(emptyList())
        assertEquals("start-failed", result.reason)
        assertTrue(result.retryable)
        assertEquals("", result.stderr)
        assertNull(result.exitCode)
    }

    @Test fun aStalledReaderReturnsWithinABoundAndDisablesRetry() {
        val release = CountDownLatch(1)
        val process = object : Process() {
            val input = object : InputStream() {
                override fun read(): Int { check(release.await(5, TimeUnit.SECONDS)); return -1 }
            }
            override fun getInputStream() = input
            override fun getErrorStream() = ByteArrayInputStream(byteArrayOf())
            override fun getOutputStream(): OutputStream = object : OutputStream() { override fun write(b: Int) = Unit }
            override fun waitFor() = 0
            override fun waitFor(timeout: Long, unit: TimeUnit) = true
            override fun exitValue() = 0
            override fun destroy() = Unit
            override fun destroyForcibly(): Process = this
        }
        try {
            val started = System.nanoTime()
            val result = BunProbeCommandRunner(start = { process }).run(emptyList())
            assertEquals("drain-incomplete", result.reason)
            assertTrue(result.reaped)
            assertFalse(result.drained || result.retryable)
            assertTrue(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started) < 2500)
        } finally {
            release.countDown()
            Thread.getAllStackTraces().keys.filter { it.name.startsWith("AutoJs6-Bun-probe-") }.forEach { it.join(1000) }
        }
    }

    private class RecordingProcess(
        stdout: String,
        stderr: String,
        private val code: Int = 0,
        private val initialWait: Boolean = true,
        private val canReap: Boolean = true,
        private val interruptWait: Boolean = false,
        private val readFailure: Boolean = false,
    ) : Process() {
        @Volatile var terminated = false
        val closed = AtomicInteger()
        private val waits = AtomicInteger()
        private fun stream(text: String) = object : InputStream() {
            val bytes = ByteArrayInputStream(text.toByteArray(Charsets.UTF_8))
            override fun read(): Int = if (readFailure) throw IOException("private detail") else bytes.read()
            override fun close() { check(terminated); closed.incrementAndGet() }
        }
        private val out = stream(stdout)
        private val err = stream(stderr)
        override fun getInputStream() = out
        override fun getErrorStream() = err
        override fun getOutputStream(): OutputStream = object : OutputStream() { override fun write(b: Int) = Unit }
        override fun waitFor() = code
        override fun waitFor(timeout: Long, unit: TimeUnit): Boolean {
            if (waits.incrementAndGet() == 1) {
                if (interruptWait) throw InterruptedException()
                return initialWait
            }
            return canReap
        }
        override fun exitValue() = code
        override fun destroy() { terminated = true }
        override fun destroyForcibly(): Process { destroy(); return this }
    }
}
