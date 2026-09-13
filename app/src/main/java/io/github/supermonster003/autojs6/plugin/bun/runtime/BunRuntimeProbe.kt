package io.github.supermonster003.autojs6.plugin.bun.runtime

import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

internal data class BunRuntimeProbe(
    val ready: Boolean,
    val path: String,
    val abi: String?,
    val version: String?,
    val revision: String?,
    val failure: BunRuntimeFailure?,
    val retryable: Boolean = false,
)

/** One inspection at a time. The cooldown starts after completion, including cleanup. */
internal class BunRuntimeProbeCache(
    private val nowMillis: () -> Long,
    private val inspect: () -> BunRuntimeProbe,
) {
    private var cached: BunRuntimeProbe? = null
    private var completedAt = 0L

    @Synchronized
    fun probe(): BunRuntimeProbe {
        cached?.let {
            if (it.ready || !it.retryable || nowMillis() - completedAt < RETRY_MILLIS) return it
        }
        return inspect().also { cached = it; completedAt = nowMillis() }
    }

    companion object {
        const val RETRY_MILLIS = 30_000L
    }
}

internal data class BunProbeCommandResult(
    val reason: String?,
    val exitCode: Int?,
    val stdout: String,
    val stderr: String,
    val outputTruncated: Boolean,
    val reaped: Boolean,
    val drained: Boolean,
) {
    val succeeded: Boolean get() = reason == null
    // Never launch another child while the previous command or its readers may remain.
    val retryable: Boolean get() = reaped && drained
}

/** Fixed readiness commands only; script output continues through the service's callbacks. */
internal class BunProbeCommandRunner(
    private val start: (List<String>) -> Process,
    private val timeoutMillis: Long = 10_000L,
) {
    init { require(timeoutMillis > 0) }

    fun run(arguments: List<String>): BunProbeCommandResult {
        val process = try { start(arguments) } catch (_: java.io.IOException) {
            return BunProbeCommandResult("start-failed", null, "", "", false, true, true)
        } catch (_: SecurityException) {
            return BunProbeCommandResult("start-denied", null, "", "", false, true, true)
        }
        val exceeded = AtomicBoolean(false)
        val readFailed = AtomicBoolean(false)
        val closing = AtomicBoolean(false)
        val stdout = Capture(process.inputStream)
        val stderr = Capture(process.errorStream)
        fun reader(label: String, capture: Capture) = Thread({
            try {
                val buffer = ByteArray(1024)
                while (true) {
                    val count = capture.input.read(buffer)
                    if (count < 0) break
                    if (!capture.append(buffer, count)) {
                        exceeded.set(true)
                        process.destroyForcibly()
                        break
                    }
                }
            } catch (_: java.io.IOException) {
                readFailed.set(true)
                process.destroyForcibly()
            } finally {
                if (closing.get()) capture.close()
            }
        }, "AutoJs6-Bun-probe-$label").apply { isDaemon = true }
        val readers = listOf(reader("stdout", stdout), reader("stderr", stderr))
        var reason: String? = null
        var interrupted = false
        var reaped = false
        try {
            readers.forEach(Thread::start)
            if (!process.waitFor(timeoutMillis, TimeUnit.MILLISECONDS)) reason = "timeout"
        } catch (_: InterruptedException) {
            interrupted = true
            reason = "interrupted"
        } finally {
            // The real Process is SupervisedProcess: control EOF, SIGTERM, SIGKILL, waitpid.
            // Request termination before closing either reader, even on interruption.
            process.destroyForcibly()
            closing.set(true)
            val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2)
            do {
                try {
                    reaped = process.waitFor(maxOf(0L, deadline - System.nanoTime()), TimeUnit.NANOSECONDS)
                    break
                } catch (_: InterruptedException) { interrupted = true }
            } while (System.nanoTime() < deadline)
            for (thread in readers) {
                try { thread.join(500L) } catch (_: InterruptedException) { interrupted = true }
            }
            for ((thread, capture) in readers.zip(listOf(stdout, stderr))) {
                // Closing a pipe concurrently with a blocked Java read can itself block.
                // A remaining reader closes its own stream; disable retry in that case.
                if (!thread.isAlive) capture.close()
            }
            if (interrupted) Thread.currentThread().interrupt()
        }
        val drained = readers.none(Thread::isAlive)
        val exitCode = if (reaped) process.exitValue() else null
        val failure = when {
            !reaped -> "reap-incomplete"
            !drained -> "drain-incomplete"
            interrupted -> "interrupted"
            exceeded.get() -> "output-limit"
            reason != null -> reason
            readFailed.get() -> "read-failed"
            exitCode != 0 -> "nonzero-exit"
            else -> null
        }
        return BunProbeCommandResult(failure, exitCode, stdout.text(), stderr.text(), exceeded.get(), reaped, drained)
    }

    private class Capture(val input: InputStream) {
        private val bytes = ByteArrayOutputStream()
        private val closed = AtomicBoolean(false)
        fun close() { if (closed.compareAndSet(false, true)) runCatching { input.close() } }
        @Synchronized fun append(buffer: ByteArray, count: Int): Boolean {
            val accepted = minOf(count, OUTPUT_BYTES - bytes.size())
            bytes.write(buffer, 0, accepted)
            return accepted == count
        }
        @Synchronized fun text(): String = boundedTerminalMessage(bytes.toByteArray().toString(Charsets.UTF_8), OUTPUT_BYTES)
    }

    companion object { const val OUTPUT_BYTES = 4096 }
}

internal fun probeDiagnostic(
    api: Int,
    abi: String?,
    stage: String,
    reason: String,
    retryable: Boolean,
    version: String?,
    revision: String?,
    command: BunProbeCommandResult? = null,
): String = buildString {
    append("api=$api abi=${abi ?: "unverified"} stage=$stage reason=$reason")
    append(" expected=${BuildConfig.BUN_RUNTIME_VERSION}/${BuildConfig.BUN_RUNTIME_REVISION}")
    append(" observed=${boundedTerminalMessage(version ?: "unknown", 128)}/${boundedTerminalMessage(revision ?: "unknown", 128)}")
    append(" retry=${if (retryable) "after-${BunRuntimeProbeCache.RETRY_MILLIS}ms-on-request" else "service-recreation"}")
    if (command != null) {
        append(" exit=${command.exitCode ?: "unknown"}")
        command.exitCode?.takeIf { it in 129..192 }?.let {
            append(" possibleSignal=${it - 128}(exit-convention-only)")
        }
        append(" reaped=${command.reaped} drained=${command.drained} outputTruncated=${command.outputTruncated}")
        if (command.stderr.isNotBlank()) append("\nstderr: ${command.stderr.trim()}")
    }
}
