package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.Context
import android.net.LocalSocket
import android.net.LocalSocketAddress
import android.system.ErrnoException
import android.system.Os
import android.system.OsConstants
import android.system.StructTimeval
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import java.io.BufferedInputStream
import java.io.File
import java.io.FileDescriptor
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.security.SecureRandom
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.SynchronousQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * The per-execution bridge socket: a filesystem unix socket in the plugin's private cache directory that speaks the
 * bounded HTTP/1.1 surface of [BunHostBridgeDispatcher]. One request per connection, at most [MAX_WORKERS]
 * connections served at once (further ones are answered 429 from the accept thread), 5 s idle timeouts on both
 * directions. [close] runs before the workspace is deleted: it stops accepting, fails the calls still waiting on
 * the host, shuts every connection down and removes the socket file. Descriptors are closed only by the thread
 * that owns them (the accept thread for the listener, the serving thread for a connection), so a descriptor
 * number is never reused underneath a blocked read. The listener is bound through [LocalSocket] because the
 * public SDK has no unix `SocketAddress`; everything else runs on the raw descriptor through [Os].
 */
internal class BunHostBridgeServer private constructor(
    private val socketFile: File,
    private val listener: LocalSocket,
    private val dispatcher: BunHostBridgeDispatcher,
    private val client: BunHostBrokerClient?,
) {
    val path: String get() = socketFile.path
    val relayedCalls: Int get() = dispatcher.relayedCalls

    private val serverFd: FileDescriptor = listener.fileDescriptor
    private val closed = AtomicBoolean(false)
    private val serverClosed = AtomicBoolean(false)
    private val connections = LinkedHashSet<FileDescriptor>()
    private val workerIndex = AtomicInteger(0)
    private val workers = ThreadPoolExecutor(0, MAX_WORKERS, WORKER_KEEP_ALIVE_SECONDS, TimeUnit.SECONDS, SynchronousQueue()) { runnable ->
        Thread(runnable, "AutoJs6-Bun-bridge-${workerIndex.incrementAndGet()}").apply { isDaemon = true }
    }
    private val acceptThread = Thread(::acceptLoop, "AutoJs6-Bun-bridge-accept").apply { isDaemon = true }

    private fun acceptLoop() {
        try {
            while (!closed.get()) {
                val connection = try {
                    Os.accept(serverFd, null)
                } catch (error: ErrnoException) {
                    if (closed.get()) return
                    if (error.errno == OsConstants.EINTR || error.errno == OsConstants.EAGAIN) continue
                    if (error.errno == OsConstants.EMFILE || error.errno == OsConstants.ENFILE) {
                        Thread.sleep(ACCEPT_RETRY_MILLIS)
                        continue
                    }
                    return
                }
                if (!register(connection)) {
                    runCatching { Os.close(connection) }
                    return
                }
                try {
                    Os.setsockoptTimeval(connection, OsConstants.SOL_SOCKET, OsConstants.SO_RCVTIMEO, IO_TIMEOUT)
                    Os.setsockoptTimeval(connection, OsConstants.SOL_SOCKET, OsConstants.SO_SNDTIMEO, IO_TIMEOUT)
                    workers.execute { serve(connection) }
                } catch (error: RejectedExecutionException) {
                    reply(
                        connection,
                        BunHostBridgeDispatcher.error(429, null, BunRuntimeContract.HOST_CALL_ERROR_TOO_MANY_REQUESTS, "Bridge is busy"),
                    )
                    closeConnection(connection)
                } catch (error: Exception) {
                    closeConnection(connection)
                }
            }
        } catch (error: Throwable) {
            // Never let the accept thread die loudly; the listener is closed below so connects fail fast instead.
        } finally {
            closeServerSocket()
        }
    }

    private fun serve(connection: FileDescriptor) {
        try {
            val reply = try {
                dispatcher.handle(BunHostBridgeHttp.readRequest(BufferedInputStream(FileInputStream(connection), READ_BUFFER_BYTES)))
            } catch (error: BunHostBridgeHttpException) {
                BunHostBridgeDispatcher.error(error.status, null, error.code, error.message ?: error.code)
            }
            reply(connection, reply)
        } catch (error: Exception) {
            // The peer went away or idled past the timeout: there is nobody left to answer.
        } finally {
            closeConnection(connection)
        }
    }

    private fun reply(connection: FileDescriptor, reply: BunHostBridgeReply) {
        try {
            val output = FileOutputStream(connection)
            output.write(BunHostBridgeHttp.renderResponse(reply.status, reply.body))
            output.flush()
        } catch (error: IOException) {
            // Same as above: a closed peer cannot receive the reply.
        }
    }

    /** Tracks a freshly accepted connection; false once the server is closing, so the caller closes it itself. */
    private fun register(connection: FileDescriptor): Boolean = synchronized(connections) {
        if (closed.get()) false else connections.add(connection)
    }

    private fun closeConnection(connection: FileDescriptor) {
        val owned = synchronized(connections) { connections.remove(connection) }
        if (owned) runCatching { Os.close(connection) }
    }

    private fun closeServerSocket() {
        if (!serverClosed.compareAndSet(false, true)) return
        runCatching { listener.close() }
    }

    /** Idempotent; safe to call from the Binder thread while workers are still waiting on the host. */
    fun close() {
        if (!closed.compareAndSet(false, true)) return
        dispatcher.close()
        // Shutting the listener down wakes the accept thread, which then closes the descriptor itself.
        runCatching { Os.shutdown(serverFd, OsConstants.SHUT_RDWR) }
        client?.close()
        workers.shutdownNow()
        synchronized(connections) {
            connections.forEach { connection -> runCatching { Os.shutdown(connection, OsConstants.SHUT_RDWR) } }
        }
        runCatching { acceptThread.join(SHUTDOWN_POKE_MILLIS) }
        // Kernels that do not wake accept() on shutdown() get a throwaway connection instead.
        if (acceptThread.isAlive) runCatching { LocalSocket().use { it.connect(LocalSocketAddress(path, LocalSocketAddress.Namespace.FILESYSTEM)) } }
        runCatching { acceptThread.join(SHUTDOWN_JOIN_MILLIS) }
        runCatching { workers.awaitTermination(SHUTDOWN_JOIN_MILLIS, TimeUnit.MILLISECONDS) }
        if (!acceptThread.isAlive) closeServerSocket()
        socketFile.delete()
        socketFile.parentFile?.delete()
    }

    companion object {
        const val DIRECTORY_NAME = "bun-bridge"
        const val SOCKET_SUFFIX = ".sock"
        private const val MAX_WORKERS = 8
        private const val BACKLOG = 16
        private const val READ_BUFFER_BYTES = 8 * 1024
        private const val WORKER_KEEP_ALIVE_SECONDS = 30L
        private const val ACCEPT_RETRY_MILLIS = 50L
        private const val SHUTDOWN_POKE_MILLIS = 100L
        private const val SHUTDOWN_JOIN_MILLIS = 1_000L
        private const val STALE_SOCKET_MILLIS = 60L * 60L * 1_000L
        /** `sun_path` holds 108 bytes including the terminator. */
        private const val MAX_SOCKET_PATH_BYTES = 107
        private val IO_TIMEOUT: StructTimeval = StructTimeval.fromMillis(5_000L)
        private val random = SecureRandom()

        fun start(context: Context, bridge: BunHostBridgeRequest, hostUid: Int, executionId: String): BunHostBridgeServer {
            val client = BunHostBrokerClient(bridge.broker, hostUid, executionId)
            return try {
                start(File(context.cacheDir, DIRECTORY_NAME), BunHostBridgeDispatcher(bridge.capabilities, client), client)
            } catch (error: Throwable) {
                client.close()
                throw error
            }
        }

        internal fun start(directory: File, dispatcher: BunHostBridgeDispatcher, client: BunHostBrokerClient?): BunHostBridgeServer {
            directory.mkdirs()
            check(directory.isDirectory) { "Unable to create the bridge directory" }
            val socketFile = try {
                Os.chmod(directory.path, OsConstants.S_IRWXU)
                pruneStaleSockets(directory)
                File(directory, randomHex(12) + SOCKET_SUFFIX)
            } catch (error: ErrnoException) {
                throw IllegalStateException("Unable to prepare the bridge directory", error)
            }
            check(socketFile.path.toByteArray(Charsets.UTF_8).size <= MAX_SOCKET_PATH_BYTES) { "Bridge socket path is too long" }
            val listener = LocalSocket()
            try {
                listener.bind(LocalSocketAddress(socketFile.path, LocalSocketAddress.Namespace.FILESYSTEM))
                Os.chmod(socketFile.path, OsConstants.S_IRUSR or OsConstants.S_IWUSR)
                Os.listen(listener.fileDescriptor, BACKLOG)
            } catch (error: Exception) {
                runCatching { listener.close() }
                socketFile.delete()
                throw IllegalStateException("Unable to open the bridge socket", error)
            }
            return BunHostBridgeServer(socketFile, listener, dispatcher, client).apply { acceptThread.start() }
        }

        /** Sockets left behind by a killed plugin process; the current run never shares a name with them. */
        private fun pruneStaleSockets(directory: File) {
            val cutoff = System.currentTimeMillis() - STALE_SOCKET_MILLIS
            directory.listFiles()
                ?.filter { it.name.endsWith(SOCKET_SUFFIX) && it.lastModified() < cutoff }
                ?.forEach { it.delete() }
        }

        private fun randomHex(length: Int): String {
            val bytes = ByteArray((length + 1) / 2).also(random::nextBytes)
            return bytes.joinToString("") { "%02x".format(it.toInt() and 0xff) }.take(length)
        }
    }
}
