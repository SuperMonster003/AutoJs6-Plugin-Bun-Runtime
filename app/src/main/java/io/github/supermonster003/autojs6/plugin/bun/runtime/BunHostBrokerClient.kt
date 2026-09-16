package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.os.Binder
import android.os.Bundle
import android.os.IBinder
import android.os.RemoteException
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.autojs.plugin.bun.runtime.api.IBunHostCapabilityBroker
import org.autojs.plugin.bun.runtime.api.IBunHostCapabilityCallback
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutionException
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Plugin-side client of the host's [IBunHostCapabilityBroker] for one execution. Every relayed call is one
 * oneway `invoke` followed by a bounded local wait for the callback. Results are accepted only from the host
 * UID that issued the run, only for this execution and only while the call is still in flight; host death
 * or execution shutdown fails every pending call with HOST_UNAVAILABLE.
 */
internal class BunHostBrokerClient(
    private val broker: IBinder,
    private val hostUid: Int,
    private val executionId: String,
    private val timeoutMillis: Long = BunRuntimeContract.HOST_CALL_TIMEOUT_MILLIS,
) : BunHostBrokerInvoker {
    private val proxy = IBunHostCapabilityBroker.Stub.asInterface(broker)
    private val pending = ConcurrentHashMap<String, CompletableFuture<Bundle>>()
    private val unavailable = AtomicBoolean(false)
    private val deathRecipient = IBinder.DeathRecipient { failAll("Host process died") }
    private val callback = object : IBunHostCapabilityCallback.Stub() {
        override fun onResult(result: Bundle?) {
            if (Binder.getCallingUid() != hostUid) return
            val callId = result?.getString(BunRuntimeContract.KEY_HOST_CALL_ID) ?: return
            if (result.getString(BunRuntimeContract.KEY_EXECUTION_ID) != executionId) return
            pending.remove(callId)?.complete(result)
        }
    }

    init {
        try {
            broker.linkToDeath(deathRecipient, 0)
        } catch (error: RemoteException) {
            unavailable.set(true)
        }
    }

    override fun invoke(callId: String, capability: String, requestJson: String): String {
        if (unavailable.get()) {
            throw BunHostCallException(BunRuntimeContract.HOST_CALL_ERROR_HOST_UNAVAILABLE, "Host capability broker is unavailable")
        }
        val key = "$executionId#$callId"
        val future = CompletableFuture<Bundle>()
        pending[key] = future
        try {
            proxy.invoke(
                Bundle().apply {
                    putInt(BunRuntimeContract.KEY_HOST_CAPABILITY_BRIDGE_VERSION, BunRuntimeContract.HOST_CAPABILITY_BRIDGE_VERSION)
                    putString(BunRuntimeContract.KEY_EXECUTION_ID, executionId)
                    putString(BunRuntimeContract.KEY_HOST_CALL_ID, key)
                    putString(BunRuntimeContract.KEY_HOST_CAPABILITY, capability)
                    putString(BunRuntimeContract.KEY_HOST_CALL_REQUEST_JSON, requestJson)
                },
                callback,
            )
        } catch (error: RemoteException) {
            pending.remove(key)
            throw BunHostCallException(BunRuntimeContract.HOST_CALL_ERROR_HOST_UNAVAILABLE, "Host capability broker is unreachable")
        }
        val result = try {
            future.get(timeoutMillis, TimeUnit.MILLISECONDS)
        } catch (error: TimeoutException) {
            pending.remove(key)
            throw BunHostCallException(BunRuntimeContract.HOST_CALL_ERROR_TIMEOUT, "Host did not answer within $timeoutMillis ms")
        } catch (error: ExecutionException) {
            throw error.cause as? BunHostCallException
                ?: BunHostCallException(BunRuntimeContract.HOST_CALL_ERROR_INTERNAL, "Host call failed")
        } catch (error: InterruptedException) {
            Thread.currentThread().interrupt()
            pending.remove(key)
            throw BunHostCallException(BunRuntimeContract.HOST_CALL_ERROR_HOST_UNAVAILABLE, "Execution is finishing")
        }
        if (!result.getBoolean(BunRuntimeContract.KEY_SUCCEEDED, false)) {
            val code = result.getString(BunRuntimeContract.KEY_ERROR_CODE)
                ?.takeIf(BunHostBridgeDispatcher::isKnownCode)
                ?: BunRuntimeContract.HOST_CALL_ERROR_INTERNAL
            val message = result.getString(BunRuntimeContract.KEY_ERROR_MESSAGE)?.take(MAX_MESSAGE_CHARS) ?: "Host call failed"
            throw BunHostCallException(code, message)
        }
        return result.getString(BunRuntimeContract.KEY_HOST_CALL_RESULT_JSON) ?: "{}"
    }

    fun close() {
        failAll("Execution is finishing")
        runCatching { broker.unlinkToDeath(deathRecipient, 0) }
    }

    private fun failAll(message: String) {
        unavailable.set(true)
        pending.keys.toList().forEach { key ->
            pending.remove(key)?.completeExceptionally(
                BunHostCallException(BunRuntimeContract.HOST_CALL_ERROR_HOST_UNAVAILABLE, message),
            )
        }
    }

    private companion object {
        const val MAX_MESSAGE_CHARS = 1024
    }
}
