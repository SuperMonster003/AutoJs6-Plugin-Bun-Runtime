package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.app.Application
import android.app.Service
import android.content.Intent
import android.os.Bundle
import android.os.IBinder
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import android.system.Os
import android.system.OsConstants
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.autojs.plugin.bun.runtime.api.IBunRuntimeCallback
import org.autojs.plugin.bun.runtime.api.IBunRuntimePlugin
import org.autojs.plugin.common.api.PluginInfo
import java.io.File
import java.io.FileOutputStream
import java.io.InputStreamReader
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

class BunRuntimeService : Service() {
    private val executionGate = Semaphore(1, true)
    private val activeExecutions = ConcurrentHashMap<String, ExecutionHandle>()
    private val pendingCancellations = ConcurrentHashMap<String, Long>()
    private val runtimeBinary by lazy(LazyThreadSafetyMode.SYNCHRONIZED) { BunRuntimeBinary(applicationContext) }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onDestroy() {
        activeExecutions.values.forEach(ExecutionHandle::terminateAndReap)
        activeExecutions.clear()
        pendingCancellations.clear()
        super.onDestroy()
    }

    private val binder = object : IBunRuntimePlugin.Stub() {
        override fun getInfo(): PluginInfo {
            enforcePluginCaller()
            return applicationContext.bunPluginInfo()
        }

        override fun getRuntimeInfo(): Bundle {
            enforcePluginCaller()
            return runtimeInfo(runtimeBinary.probe())
        }

        override fun prewarmRuntime(): Bundle {
            enforcePluginCaller()
            return runtimeInfo(runtimeBinary.probe())
        }

        override fun cancelScript(executionId: String?): Boolean {
            enforcePluginCaller()
            if (executionId == null || !BunExecutionRequestParser.isValidExecutionId(executionId)) return false
            activeExecutions[executionId]?.let { return it.cancel() }
            rememberPendingCancellation(executionId)
            return true
        }

        override fun runScript(
            requestBundle: Bundle?,
            source: ParcelFileDescriptor?,
            callback: IBunRuntimeCallback?,
        ): Bundle {
            enforcePluginCaller()
            val startedAt = SystemClock.elapsedRealtime()
            var request: BunExecutionRequest? = null
            var handle: ExecutionHandle? = null
            var workspace: File? = null
            var gateAcquired = false
            try {
                request = BunExecutionRequestParser.parse(requestBundle)
                requireNotNull(source) { "Source descriptor is missing" }
                requireNotNull(callback) { "Runtime callback is missing" }
                if (consumePendingCancellation(request.executionId)) {
                    return failureWithCallback(callback, request.executionId, BunRuntimeContract.ERROR_CANCELLED, null, startedAt, cancelled = true)
                }
                if (!executionGate.tryAcquire()) {
                    return failureWithCallback(callback, request.executionId, BunRuntimeContract.ERROR_BUSY, null, startedAt)
                }
                gateAcquired = true
                handle = ExecutionHandle()
                require(activeExecutions.putIfAbsent(request.executionId, handle) == null) {
                    "Execution ID is already active"
                }
                if (consumePendingCancellation(request.executionId)) handle.cancel()
                val probe = runtimeBinary.probe()
                if (!probe.ready) {
                    return failureWithCallback(
                        callback,
                        request.executionId,
                        BunRuntimeContract.ERROR_RUNTIME_UNAVAILABLE,
                        null,
                        startedAt,
                        runtimeFailure = probe.failure,
                    )
                }
                if (handle.cancelled.get()) {
                    return failureWithCallback(callback, request.executionId, BunRuntimeContract.ERROR_CANCELLED, null, startedAt, cancelled = true)
                }

                workspace = createWorkspace(request.executionId)
                val sourceFile = File(workspace, BunExecutionRequestParser.safeFileName(request.sourceName))
                source.use { descriptor ->
                    validateSourceDescriptor(descriptor)
                    copySource(descriptor, sourceFile)
                }
                if (handle.cancelled.get()) {
                    return failureWithCallback(callback, request.executionId, BunRuntimeContract.ERROR_CANCELLED, null, startedAt, cancelled = true)
                }
                return execute(request, sourceFile, workspace, callback, handle, startedAt)
            } catch (error: SourceTooLargeException) {
                return failureWithCallback(
                    callback,
                    request?.executionId.orEmpty(),
                    BunRuntimeContract.ERROR_SOURCE_TOO_LARGE,
                    null,
                    startedAt,
                )
            } catch (error: IllegalArgumentException) {
                return failureWithCallback(
                    callback,
                    request?.executionId.orEmpty(),
                    BunRuntimeContract.ERROR_INVALID_REQUEST,
                    error.message,
                    startedAt,
                )
            } catch (error: Throwable) {
                return failureWithCallback(
                    callback,
                    request?.executionId.orEmpty(),
                    BunRuntimeContract.ERROR_INTERNAL,
                    error.message ?: error.javaClass.simpleName,
                    startedAt,
                )
            } finally {
                runCatching { source?.close() }
                handle?.terminateAndReap()
                handle?.let { activeHandle ->
                    request?.executionId?.let { executionId ->
                        activeExecutions.remove(executionId, activeHandle)
                    }
                }
                workspace?.takeIf { it.parentFile == executionRoot() }?.deleteRecursively()
                if (gateAcquired) executionGate.release()
            }
        }
    }

    private fun enforcePluginCaller() {
        enforceCallingPermission(
            BunRuntimeContract.PLUGIN_PERMISSION,
            getString(R.string.runtime_error_permission),
        )
    }

    private fun execute(
        request: BunExecutionRequest,
        sourceFile: File,
        workspace: File,
        callback: IBunRuntimeCallback,
        handle: ExecutionHandle,
        startedAt: Long,
    ): Bundle {
        val command = buildList {
            add(runtimeBinary.file.path)
            add("run")
            add("--no-install")
            add(sourceFile.path)
            addAll(request.arguments)
        }
        val processBuilder = ProcessBuilder(command).directory(workspace)
        processBuilder.environment().apply {
            putAll(request.environment)
            put("TMPDIR", File(workspace, "tmp").apply { mkdirs() }.path)
            put("BUN_INSTALL_CACHE_DIR", File(workspace, "bun-install-cache").apply { mkdirs() }.path)
            put("BUN_DISABLE_UPDATE_CHECK", "1")
        }
        val process = try {
            SupervisedProcess.start(processBuilder, runtimeBinary.supervisor)
        } catch (error: Throwable) {
            return failureWithCallback(
                callback,
                request.executionId,
                BunRuntimeContract.ERROR_SPAWN_FAILED,
                error.message ?: error.javaClass.simpleName,
                startedAt,
            )
        }
        handle.attach(process)
        runCatching { process.outputStream.close() }
        if (handle.cancelled.get()) process.destroy()

        val sequence = AtomicLong(0)
        emitSequenced(callback, request.executionId, BunRuntimeContract.EVENT_STARTED, sequence)
        val output = BoundedOutput(request.outputByteLimit) { handle.cancelForOutputLimit() }
        val stdout = process.inputStream
        val stderr = process.errorStream
        val stdoutThread = streamThread("stdout", stdout, BunRuntimeContract.EVENT_STDOUT, output, callback, request.executionId, sequence)
        val stderrThread = streamThread("stderr", stderr, BunRuntimeContract.EVENT_STDERR, output, callback, request.executionId, sequence)
        stdoutThread.start()
        stderrThread.start()

        var exited = false
        var timedOut = false
        while (!exited) {
            if (handle.cancelled.get()) {
                handle.forceTerminate()
                exited = process.waitFor(PROCESS_REAP_MILLIS, TimeUnit.MILLISECONDS)
                break
            }
            val remainingTimeoutMillis = request.timeoutMillis - (SystemClock.elapsedRealtime() - startedAt)
            if (remainingTimeoutMillis <= 0L) {
                timedOut = true
                handle.timeout()
                exited = process.waitFor(PROCESS_REAP_MILLIS, TimeUnit.MILLISECONDS)
                break
            }
            exited = process.waitFor(
                minOf(remainingTimeoutMillis, PROCESS_WAIT_POLL_MILLIS),
                TimeUnit.MILLISECONDS,
            )
        }
        if (!exited && process.isAlive) {
            handle.forceTerminate()
            process.waitFor(PROCESS_FORCE_REAP_MILLIS, TimeUnit.MILLISECONDS)
        }
        stdoutThread.join(STREAM_JOIN_MILLIS)
        stderrThread.join(STREAM_JOIN_MILLIS)
        if (stdoutThread.isAlive || stderrThread.isAlive) output.beginClosingStreams()
        if (stdoutThread.isAlive) runCatching { stdout.close() }
        if (stderrThread.isAlive) runCatching { stderr.close() }
        if (stdoutThread.isAlive) stdoutThread.join(STREAM_CLOSE_JOIN_MILLIS)
        if (stderrThread.isAlive) stderrThread.join(STREAM_CLOSE_JOIN_MILLIS)
        val outputDrainIncomplete = stdoutThread.isAlive || stderrThread.isAlive || output.streamFailure.get()
        output.seal()

        val cancelled = handle.cancelled.get() && !timedOut && !output.limitExceeded.get()
        val exitCode = if (process.isAlive) -1 else process.exitValue()
        val errorCode = when {
            output.limitExceeded.get() -> BunRuntimeContract.ERROR_OUTPUT_LIMIT
            timedOut -> BunRuntimeContract.ERROR_TIMEOUT
            cancelled -> BunRuntimeContract.ERROR_CANCELLED
            outputDrainIncomplete || process.isAlive -> BunRuntimeContract.ERROR_INTERNAL
            exitCode != 0 -> BunRuntimeContract.ERROR_NON_ZERO_EXIT
            else -> null
        }
        val result = Bundle().apply {
            putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
            putString(BunRuntimeContract.KEY_EXECUTION_ID, request.executionId)
            putBoolean(BunRuntimeContract.KEY_SUCCEEDED, errorCode == null)
            putInt(BunRuntimeContract.KEY_EXIT_CODE, exitCode)
            // Output is delivered only through bounded callback chunks. Repeating up to 8 MiB
            // in a terminal Bundle would exceed Android's Binder transaction size limit.
            putString(BunRuntimeContract.KEY_STDOUT, "")
            putString(BunRuntimeContract.KEY_STDERR, "")
            putString(BunRuntimeContract.KEY_ERROR_CODE, errorCode)
            putString(BunRuntimeContract.KEY_ERROR_MESSAGE, runtimeErrorMessage(errorCode, exitCode))
            putLong(BunRuntimeContract.KEY_DURATION_MILLIS, SystemClock.elapsedRealtime() - startedAt)
            putBoolean(BunRuntimeContract.KEY_CANCELLED, cancelled)
            putBoolean(BunRuntimeContract.KEY_TIMED_OUT, timedOut)
        }
        emitSequenced(
            callback,
            request.executionId,
            BunRuntimeContract.EVENT_FINISHED,
            sequence,
            terminal = result,
        )
        return result
    }

    private fun streamThread(
        label: String,
        input: java.io.InputStream,
        eventType: String,
        output: BoundedOutput,
        callback: IBunRuntimeCallback,
        executionId: String,
        sequence: AtomicLong,
    ): Thread = Thread({
        try {
            InputStreamReader(input, StandardCharsets.UTF_8).use { reader ->
                val buffer = CharArray(4_096)
                while (true) {
                    val count = reader.read(buffer)
                    if (count < 0) break
                    val chunk = String(buffer, 0, count)
                    if (!output.append(chunk)) break
                    emitSequenced(callback, executionId, eventType, sequence, chunk)
                }
            }
        } catch (error: IOException) {
            output.recordStreamFailure()
        }
    }, "AutoJs6-Bun-$label").apply { isDaemon = true }

    private fun copySource(descriptor: ParcelFileDescriptor, destination: File) {
        ParcelFileDescriptor.AutoCloseInputStream(descriptor).use { input ->
            FileOutputStream(destination).buffered().use { output ->
                val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                var total = 0L
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    total += count
                    if (total > BunRuntimeContract.MAX_SOURCE_BYTES) throw SourceTooLargeException()
                    output.write(buffer, 0, count)
                }
            }
        }
    }

    private fun validateSourceDescriptor(descriptor: ParcelFileDescriptor) {
        val stat = Os.fstat(descriptor.fileDescriptor)
        require(OsConstants.S_ISREG(stat.st_mode)) { "Source descriptor must reference a regular file" }
        require(stat.st_size >= 0L) { "Source descriptor has an invalid size" }
        if (stat.st_size > BunRuntimeContract.MAX_SOURCE_BYTES) throw SourceTooLargeException()
    }

    private fun createWorkspace(executionId: String): File {
        val root = executionRoot().apply(File::mkdirs)
        return File(root, "$executionId-${System.nanoTime()}").also { directory ->
            require(directory.mkdir()) { "Unable to create Bun execution workspace" }
        }
    }

    private fun executionRoot(): File = File(cacheDir, "bun-executions")

    private fun rememberPendingCancellation(executionId: String) {
        prunePendingCancellations()
        if (pendingCancellations.size >= MAX_PENDING_CANCELLATIONS) {
            pendingCancellations.entries.minByOrNull { it.value }?.let { oldest ->
                pendingCancellations.remove(oldest.key, oldest.value)
            }
        }
        pendingCancellations[executionId] = SystemClock.elapsedRealtime()
    }

    private fun consumePendingCancellation(executionId: String): Boolean {
        prunePendingCancellations()
        return pendingCancellations.remove(executionId) != null
    }

    private fun prunePendingCancellations() {
        val cutoff = SystemClock.elapsedRealtime() - PENDING_CANCELLATION_TTL_MILLIS
        pendingCancellations.entries.removeIf { it.value < cutoff }
    }

    private fun runtimeInfo(probe: BunRuntimeProbe): Bundle = Bundle().apply {
        val packagedAbis = applicationContext.packagedRuntimeAbis()
        putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
        putBoolean(BunRuntimeContract.KEY_RUNTIME_READY, probe.ready)
        putString(BunRuntimeContract.KEY_RUNTIME_VERSION, probe.version)
        putString(BunRuntimeContract.KEY_RUNTIME_REVISION, probe.revision)
        putString(BunRuntimeContract.KEY_RUNTIME_PATH, probe.path)
        putString(BunRuntimeContract.KEY_ERROR_MESSAGE, runtimeFailureMessage(probe.failure))
        putString(BunRuntimeContract.KEY_PROCESS_NAME, Application.getProcessName())
        putString(BunRuntimeContract.KEY_PROCESS_ABI, probe.abi)
        putStringArray(BunRuntimeContract.KEY_SUPPORTED_ABIS, packagedAbis)
        putLong(BunRuntimeContract.KEY_MAX_SOURCE_BYTES, BunRuntimeContract.MAX_SOURCE_BYTES)
        putLong(BunRuntimeContract.KEY_MAX_OUTPUT_BYTES, BunRuntimeContract.MAX_OUTPUT_BYTES)
    }

    private fun failure(
        executionId: String,
        code: String,
        diagnostic: String?,
        startedAt: Long,
        cancelled: Boolean = false,
        runtimeFailure: BunRuntimeFailure? = null,
    ): Bundle = Bundle().apply {
        putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
        putString(BunRuntimeContract.KEY_EXECUTION_ID, executionId)
        putBoolean(BunRuntimeContract.KEY_SUCCEEDED, false)
        putInt(BunRuntimeContract.KEY_EXIT_CODE, -1)
        putString(BunRuntimeContract.KEY_STDOUT, "")
        putString(BunRuntimeContract.KEY_STDERR, "")
        putString(BunRuntimeContract.KEY_ERROR_CODE, code)
        putString(BunRuntimeContract.KEY_ERROR_MESSAGE, runtimeFailureMessage(runtimeFailure)
            ?: runtimeErrorMessage(code, diagnostic = diagnostic))
        putLong(BunRuntimeContract.KEY_DURATION_MILLIS, SystemClock.elapsedRealtime() - startedAt)
        putBoolean(BunRuntimeContract.KEY_CANCELLED, cancelled)
        putBoolean(BunRuntimeContract.KEY_TIMED_OUT, code == BunRuntimeContract.ERROR_TIMEOUT)
    }

    private fun failureWithCallback(
        callback: IBunRuntimeCallback?,
        executionId: String,
        code: String,
        diagnostic: String?,
        startedAt: Long,
        cancelled: Boolean = false,
        runtimeFailure: BunRuntimeFailure? = null,
    ): Bundle = failure(executionId, code, diagnostic, startedAt, cancelled, runtimeFailure).also { result ->
        callback?.let {
            emit(
                callback = it,
                executionId = executionId,
                type = BunRuntimeContract.EVENT_FINISHED,
                sequence = 0L,
                terminal = result,
            )
        }
    }

    private fun emit(
        callback: IBunRuntimeCallback,
        executionId: String,
        type: String,
        text: String? = null,
        sequence: Long,
        terminal: Bundle? = null,
    ) {
        runCatching {
            callback.onEvent(Bundle().apply {
                putInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
                putString(BunRuntimeContract.KEY_EXECUTION_ID, executionId)
                putString(BunRuntimeContract.KEY_EVENT_TYPE, type)
                putLong(BunRuntimeContract.KEY_SEQUENCE, sequence)
                text?.let { putString(BunRuntimeContract.KEY_TEXT, it) }
                terminal?.let(::putAll)
            })
        }
    }

    private fun emitSequenced(
        callback: IBunRuntimeCallback,
        executionId: String,
        type: String,
        sequence: AtomicLong,
        text: String? = null,
        terminal: Bundle? = null,
    ) {
        synchronized(sequence) {
            emit(
                callback = callback,
                executionId = executionId,
                type = type,
                text = text,
                sequence = sequence.getAndIncrement(),
                terminal = terminal,
            )
        }
    }

    private class ExecutionHandle {
        val cancelled = AtomicBoolean(false)
        val outputLimit = AtomicBoolean(false)

        @Volatile
        private var process: Process? = null

        fun attach(value: Process) {
            process = value
            if (cancelled.get()) value.destroyForcibly()
        }

        fun cancel(): Boolean {
            val changed = cancelled.compareAndSet(false, true)
            process?.destroyForcibly()
            return changed
        }

        fun timeout() {
            cancelled.set(true)
            process?.destroyForcibly()
        }

        fun cancelForOutputLimit() {
            outputLimit.set(true)
            cancelled.set(true)
            process?.destroyForcibly()
        }

        fun forceTerminate() {
            process?.destroyForcibly()
        }

        fun terminateAndReap() {
            val activeProcess = process ?: return
            // Close the private control channel before joining/closing readers.
            // The real child's stdout/stderr must remain drainable until exit.
            if (activeProcess.isAlive) {
                runCatching { activeProcess.destroy() }
                val exited = runCatching { activeProcess.waitFor(1, TimeUnit.SECONDS) }.getOrDefault(false)
                if (!exited && activeProcess.isAlive) {
                    runCatching { activeProcess.destroyForcibly() }
                    runCatching { activeProcess.waitFor(2, TimeUnit.SECONDS) }
                }
            }
            runCatching { activeProcess.outputStream.close() }
            runCatching { activeProcess.inputStream.close() }
            runCatching { activeProcess.errorStream.close() }
        }
    }

    private class BoundedOutput(
        private val limit: Long,
        private val onLimit: () -> Unit,
    ) {
        val limitExceeded = AtomicBoolean(false)
        val streamFailure = AtomicBoolean(false)
        private val sealed = AtomicBoolean(false)
        private val closingStreams = AtomicBoolean(false)
        private var bytes = 0L

        @Synchronized
        fun append(chunk: String): Boolean {
            if (sealed.get() || limitExceeded.get()) return false
            val chunkBytes = chunk.toByteArray(Charsets.UTF_8).size.toLong()
            if (bytes + chunkBytes > limit) {
                if (limitExceeded.compareAndSet(false, true)) onLimit()
                return false
            }
            bytes += chunkBytes
            return true
        }

        fun seal() {
            sealed.set(true)
        }

        fun beginClosingStreams() {
            closingStreams.set(true)
        }

        fun recordStreamFailure() {
            if (!closingStreams.get()) streamFailure.set(true)
        }
    }

    private class SourceTooLargeException : IllegalArgumentException(
        "Source exceeds ${BunRuntimeContract.MAX_SOURCE_BYTES} bytes",
    )

    private companion object {
        const val PROCESS_WAIT_POLL_MILLIS = 100L
        const val PROCESS_REAP_MILLIS = 1_000L
        const val PROCESS_FORCE_REAP_MILLIS = 2_000L
        const val STREAM_JOIN_MILLIS = 2_000L
        const val STREAM_CLOSE_JOIN_MILLIS = 1_000L
        const val MAX_PENDING_CANCELLATIONS = 64
        const val PENDING_CANCELLATION_TTL_MILLIS = 60_000L
    }
}
