package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException
import java.nio.charset.CodingErrorAction
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/** A bridge reply: HTTP status plus the JSON body. */
internal data class BunHostBridgeReply(val status: Int, val body: String)

/** Failure of one relayed call, carrying a bridge-level error code from [BunRuntimeContract]. */
internal class BunHostCallException(val code: String, message: String) : Exception(message)

/** Relays one call to the host and blocks until the result JSON arrives or the call fails. */
internal fun interface BunHostBrokerInvoker {
    fun invoke(callId: String, capability: String, requestJson: String): String
}

/**
 * Serves the bridge HTTP surface of one execution: the info document and the `POST /v1/<capability>` relays.
 * The dispatcher owns the grant check, the per-execution quotas (total and concurrent calls) and the error
 * mapping; it never interprets the JSON payloads beyond size, UTF-8 validity and the outermost object braces,
 * so a new host capability needs no plugin change. Free of android.os types for JVM unit tests.
 */
internal class BunHostBridgeDispatcher(
    capabilities: List<String>,
    private val invoker: BunHostBrokerInvoker,
    private val maxCalls: Int = BunRuntimeContract.MAX_HOST_CALLS_PER_EXECUTION,
    private val maxConcurrentCalls: Int = BunRuntimeContract.MAX_CONCURRENT_HOST_CALLS,
    private val maxRequestBytes: Int = BunRuntimeContract.MAX_HOST_CALL_REQUEST_BYTES,
    private val maxResultBytes: Int = BunRuntimeContract.MAX_HOST_CALL_RESULT_BYTES,
) {
    private val capabilities = capabilities.toList()
    private val attempted = AtomicInteger(0)
    private val inFlight = AtomicInteger(0)
    private val closed = AtomicBoolean(false)

    /** Calls that held a relay slot, including the ones the host failed; info requests and fast rejections are not counted. */
    val relayedCalls: Int get() = minOf(attempted.get(), maxCalls)

    fun handle(request: BunHostBridgeHttpRequest): BunHostBridgeReply {
        if (request.path == INFO_PATH) {
            if (request.method != "GET") return error(405, null, INVALID_REQUEST, "Use GET for the bridge info")
            return BunHostBridgeReply(200, info())
        }
        if (!request.path.startsWith(CALL_PREFIX)) return error(404, null, UNKNOWN_CAPABILITY, "Unknown bridge path")
        val capability = request.path.removePrefix(CALL_PREFIX)
        if (!BunExecutionRequestParser.isValidCapabilityId(capability)) {
            return error(400, null, INVALID_REQUEST, "Invalid capability ID")
        }
        if (request.method != "POST") return error(405, capability, INVALID_REQUEST, "Use POST to call a capability")
        if (capability !in capabilities) {
            return error(403, capability, NOT_GRANTED, "Capability is not granted for this execution")
        }
        val requestJson = try {
            requestObject(request.body)
        } catch (error: BunHostCallException) {
            return error(statusFor(error.code), capability, error.code, error.message ?: error.code)
        }
        if (closed.get()) return error(503, capability, HOST_UNAVAILABLE, "Execution is finishing")
        if (!enterInFlight()) {
            return error(429, capability, TOO_MANY_REQUESTS, "At most $maxConcurrentCalls calls may be in flight")
        }
        try {
            // Only calls that hold a slot count against the budget, so a concurrency rejection is free to retry.
            val callNumber = attempted.incrementAndGet()
            if (callNumber > maxCalls) {
                return error(429, capability, TOO_MANY_REQUESTS, "Call limit of $maxCalls per execution reached")
            }
            val resultJson = try {
                invoker.invoke(callNumber.toString(), capability, requestJson)
            } catch (error: BunHostCallException) {
                return error(statusFor(error.code), capability, error.code, error.message ?: error.code)
            } catch (error: RuntimeException) {
                return error(500, capability, INTERNAL, "Bridge relay failed")
            }
            if (resultJson.toByteArray(Charsets.UTF_8).size > maxResultBytes) {
                return error(413, capability, PAYLOAD_TOO_LARGE, "Host result exceeds $maxResultBytes bytes")
            }
            if (!looksLikeObject(resultJson)) return error(500, capability, INTERNAL, "Host result is not a JSON object")
            return BunHostBridgeReply(
                200,
                "{\"ok\":true,\"capability\":${BunHostInfoSnapshot.quote(capability)},\"result\":${resultJson.trim()}}",
            )
        } finally {
            inFlight.decrementAndGet()
        }
    }

    /** Later calls fail fast with HOST_UNAVAILABLE; calls already in flight finish on their own. */
    fun close() {
        closed.set(true)
    }

    private fun enterInFlight(): Boolean {
        while (true) {
            val current = inFlight.get()
            if (current >= maxConcurrentCalls) return false
            if (inFlight.compareAndSet(current, current + 1)) return true
        }
    }

    private fun requestObject(body: ByteArray): String {
        if (body.size > maxRequestBytes) {
            throw BunHostCallException(PAYLOAD_TOO_LARGE, "Request body exceeds $maxRequestBytes bytes")
        }
        val text = try {
            Charsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(body))
                .toString()
        } catch (error: CharacterCodingException) {
            throw BunHostCallException(INVALID_REQUEST, "Request body is not valid UTF-8")
        }
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return "{}"
        if (!looksLikeObject(trimmed)) throw BunHostCallException(INVALID_REQUEST, "Request body must be a JSON object")
        return trimmed
    }

    private fun info(): String = buildString {
        append("{\"ok\":true,\"bridgeVersion\":").append(BunRuntimeContract.HOST_CAPABILITY_BRIDGE_VERSION)
        append(",\"capabilities\":[")
        capabilities.forEachIndexed { index, id ->
            if (index > 0) append(',')
            append(BunHostInfoSnapshot.quote(id))
        }
        append("],\"limits\":{\"maxRequestBytes\":").append(maxRequestBytes)
        append(",\"maxResultBytes\":").append(maxResultBytes)
        append(",\"maxCallsPerExecution\":").append(maxCalls)
        append(",\"maxConcurrentCalls\":").append(maxConcurrentCalls)
        append(",\"callTimeoutMillis\":").append(BunRuntimeContract.HOST_CALL_TIMEOUT_MILLIS)
        append("}}")
    }

    companion object {
        const val INFO_PATH = "/v1/info"
        const val CALL_PREFIX = "/v1/"

        private const val INVALID_REQUEST = BunRuntimeContract.HOST_CALL_ERROR_INVALID_REQUEST
        private const val NOT_GRANTED = BunRuntimeContract.HOST_CALL_ERROR_NOT_GRANTED
        private const val UNKNOWN_CAPABILITY = BunRuntimeContract.HOST_CALL_ERROR_UNKNOWN_CAPABILITY
        private const val PAYLOAD_TOO_LARGE = BunRuntimeContract.HOST_CALL_ERROR_PAYLOAD_TOO_LARGE
        private const val TOO_MANY_REQUESTS = BunRuntimeContract.HOST_CALL_ERROR_TOO_MANY_REQUESTS
        private const val QUOTA_EXCEEDED = BunRuntimeContract.HOST_CALL_ERROR_QUOTA_EXCEEDED
        private const val TIMEOUT = BunRuntimeContract.HOST_CALL_ERROR_TIMEOUT
        private const val HOST_UNAVAILABLE = BunRuntimeContract.HOST_CALL_ERROR_HOST_UNAVAILABLE
        private const val INTERNAL = BunRuntimeContract.HOST_CALL_ERROR_INTERNAL

        fun statusFor(code: String): Int = when (code) {
            INVALID_REQUEST -> 400
            NOT_GRANTED -> 403
            UNKNOWN_CAPABILITY -> 404
            PAYLOAD_TOO_LARGE -> 413
            TOO_MANY_REQUESTS, QUOTA_EXCEEDED -> 429
            HOST_UNAVAILABLE -> 503
            TIMEOUT -> 504
            else -> 500
        }

        fun isKnownCode(code: String): Boolean = code == INTERNAL || statusFor(code) != 500

        fun error(status: Int, capability: String?, code: String, message: String) =
            BunHostBridgeReply(status, errorBody(capability, code, message))

        fun errorBody(capability: String?, code: String, message: String): String =
            "{\"ok\":false,\"capability\":${capability?.let(BunHostInfoSnapshot::quote) ?: "null"}," +
                "\"error\":{\"code\":${BunHostInfoSnapshot.quote(code)},\"message\":${BunHostInfoSnapshot.quote(message)}}}"

        fun looksLikeObject(text: String): Boolean {
            val trimmed = text.trim()
            return trimmed.length >= 2 && trimmed.first() == '{' && trimmed.last() == '}'
        }
    }
}
