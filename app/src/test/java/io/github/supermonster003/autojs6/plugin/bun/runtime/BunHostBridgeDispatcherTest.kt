package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.TimeUnit

/** The android.jar `org.json` stubs are unusable on the JVM, so replies are checked as the exact strings the bridge emits. */
class BunHostBridgeDispatcherTest {
    private val calls = CopyOnWriteArrayList<Triple<String, String, String>>()
    private val echo = BunHostBrokerInvoker { callId, capability, requestJson ->
        calls += Triple(callId, capability, requestJson)
        when (capability) {
            "device.info" -> "{\"model\":\"Pixel\"}"
            "ui.toast" -> " {\"shown\":true} "
            "test.array" -> "[1,2]"
            "test.large" -> "{\"blob\":\"" + "x".repeat(BunRuntimeContract.MAX_HOST_CALL_RESULT_BYTES) + "\"}"
            "test.quota" -> throw BunHostCallException(BunRuntimeContract.HOST_CALL_ERROR_QUOTA_EXCEEDED, "Only 4 toasts per run")
            "test.crash" -> throw IllegalStateException("boom")
            else -> throw BunHostCallException(BunRuntimeContract.HOST_CALL_ERROR_UNKNOWN_CAPABILITY, "No such capability")
        }
    }
    private val granted = listOf("device.info", "ui.toast", "test.array", "test.large", "test.quota", "test.crash", "test.missing")

    @Test
    fun servesTheInfoDocumentWithGrantsAndLimits() {
        val dispatcher = BunHostBridgeDispatcher(listOf("ui.toast", "device.info"), echo)
        val reply = dispatcher.handle(request("GET", "/v1/info"))
        assertEquals(200, reply.status)
        assertEquals(
            "{\"ok\":true,\"bridgeVersion\":1,\"capabilities\":[\"ui.toast\",\"device.info\"],\"limits\":{\"maxRequestBytes\":65536," +
                "\"maxResultBytes\":262144,\"maxCallsPerExecution\":1024,\"maxConcurrentCalls\":4,\"callTimeoutMillis\":10000}}",
            reply.body,
        )
        assertEquals(0, dispatcher.relayedCalls)

        assertError(dispatcher.handle(request("POST", "/v1/info")), 405, null, "INVALID_REQUEST")
        assertError(dispatcher.handle(request("GET", "/")), 404, null, "UNKNOWN_CAPABILITY")
        assertError(dispatcher.handle(request("GET", "/v2/info")), 404, null, "UNKNOWN_CAPABILITY")
        assertError(dispatcher.handle(request("POST", "/v1/../info")), 400, null, "INVALID_REQUEST")
        assertError(dispatcher.handle(request("POST", "/v1/toast")), 400, null, "INVALID_REQUEST")
        assertError(dispatcher.handle(request("POST", "/v1/")), 400, null, "INVALID_REQUEST")
        assertError(dispatcher.handle(request("GET", "/v1/ui.toast")), 405, "ui.toast", "INVALID_REQUEST")
        assertError(dispatcher.handle(request("POST", "/v1/ui.other")), 403, "ui.other", "NOT_GRANTED")
        assertEquals(0, dispatcher.relayedCalls)
        assertTrue(calls.isEmpty())
    }

    @Test
    fun relaysGrantedCallsAndWrapsTheResult() {
        val dispatcher = BunHostBridgeDispatcher(granted, echo)
        val info = dispatcher.handle(request("POST", "/v1/device.info"))
        assertEquals(200, info.status)
        assertEquals("{\"ok\":true,\"capability\":\"device.info\",\"result\":{\"model\":\"Pixel\"}}", info.body)
        val toast = dispatcher.handle(request("POST", "/v1/ui.toast", " {\"text\":\"hi\"} \n"))
        assertEquals(200, toast.status)
        assertEquals("{\"ok\":true,\"capability\":\"ui.toast\",\"result\":{\"shown\":true}}", toast.body)
        assertEquals(listOf(Triple("1", "device.info", "{}"), Triple("2", "ui.toast", "{\"text\":\"hi\"}")), calls)
        assertEquals(2, dispatcher.relayedCalls)
    }

    @Test
    fun rejectsBadBodiesBeforeRelaying() {
        val dispatcher = BunHostBridgeDispatcher(granted, echo)
        assertError(dispatcher.handle(request("POST", "/v1/ui.toast", "[1]")), 400, "ui.toast", "INVALID_REQUEST", "Request body must be a JSON object")
        assertError(dispatcher.handle(request("POST", "/v1/ui.toast", "\"text\"")), 400, "ui.toast", "INVALID_REQUEST")
        assertError(dispatcher.handle(request("POST", "/v1/ui.toast", "{")), 400, "ui.toast", "INVALID_REQUEST")
        assertError(
            dispatcher.handle(request("POST", "/v1/ui.toast", byteArrayOf(0x7b, 0xff.toByte(), 0x7d))),
            400, "ui.toast", "INVALID_REQUEST", "Request body is not valid UTF-8",
        )
        val oversized = "{\"blob\":\"" + "x".repeat(BunRuntimeContract.MAX_HOST_CALL_REQUEST_BYTES) + "\"}"
        assertError(dispatcher.handle(request("POST", "/v1/ui.toast", oversized)), 413, "ui.toast", "PAYLOAD_TOO_LARGE")
        assertTrue(calls.isEmpty())
        assertEquals(0, dispatcher.relayedCalls)
    }

    @Test
    fun mapsHostFailuresAndResultViolationsToBridgeErrors() {
        val dispatcher = BunHostBridgeDispatcher(granted, echo)
        assertError(dispatcher.handle(request("POST", "/v1/test.quota")), 429, "test.quota", "QUOTA_EXCEEDED", "Only 4 toasts per run")
        assertError(dispatcher.handle(request("POST", "/v1/test.missing")), 404, "test.missing", "UNKNOWN_CAPABILITY", "No such capability")
        assertError(dispatcher.handle(request("POST", "/v1/test.crash")), 500, "test.crash", "INTERNAL", "Bridge relay failed")
        assertError(dispatcher.handle(request("POST", "/v1/test.array")), 500, "test.array", "INTERNAL", "Host result is not a JSON object")
        assertError(dispatcher.handle(request("POST", "/v1/test.large")), 413, "test.large", "PAYLOAD_TOO_LARGE")
        assertEquals(5, dispatcher.relayedCalls)
    }

    @Test
    fun enforcesTheTotalCallBudgetAndFailsFastAfterClose() {
        val dispatcher = BunHostBridgeDispatcher(granted, echo, maxCalls = 3)
        repeat(3) { assertEquals(200, dispatcher.handle(request("POST", "/v1/device.info")).status) }
        assertError(dispatcher.handle(request("POST", "/v1/device.info")), 429, "device.info", "TOO_MANY_REQUESTS", "Call limit of 3 per execution reached")
        assertError(dispatcher.handle(request("POST", "/v1/device.info")), 429, "device.info", "TOO_MANY_REQUESTS")
        assertEquals(3, dispatcher.relayedCalls)
        assertEquals(3, calls.size)
        assertEquals(200, dispatcher.handle(request("GET", "/v1/info")).status)

        dispatcher.close()
        assertError(dispatcher.handle(request("POST", "/v1/device.info")), 503, "device.info", "HOST_UNAVAILABLE", "Execution is finishing")
        assertEquals(200, dispatcher.handle(request("GET", "/v1/info")).status)
        assertEquals(3, dispatcher.relayedCalls)
    }

    @Test
    fun boundsTheCallsInFlight() {
        val entered = CountDownLatch(2)
        val release = CountDownLatch(1)
        val blocking = BunHostBrokerInvoker { _, _, _ ->
            entered.countDown()
            release.await(10, TimeUnit.SECONDS)
            "{}"
        }
        val dispatcher = BunHostBridgeDispatcher(listOf("slow.call"), blocking, maxConcurrentCalls = 2)
        val replies = CopyOnWriteArrayList<BunHostBridgeReply>()
        val threads = (1..2).map {
            Thread { replies += dispatcher.handle(request("POST", "/v1/slow.call")) }.apply { start() }
        }
        assertTrue(entered.await(10, TimeUnit.SECONDS))
        assertError(dispatcher.handle(request("POST", "/v1/slow.call")), 429, "slow.call", "TOO_MANY_REQUESTS", "At most 2 calls may be in flight")
        release.countDown()
        threads.forEach { it.join(10_000) }
        assertEquals(listOf(200, 200), replies.map { it.status })
        // The slot is free again once the calls returned.
        assertEquals(200, dispatcher.handle(request("POST", "/v1/slow.call")).status)
        assertEquals(3, dispatcher.relayedCalls)
    }

    @Test
    fun errorBodiesAndStatusMappingFollowTheContract() {
        assertEquals(
            "{\"ok\":false,\"capability\":null,\"error\":{\"code\":\"TIMEOUT\",\"message\":\"Host did not answer \\\"in time\\\"\"}}",
            BunHostBridgeDispatcher.errorBody(null, "TIMEOUT", "Host did not answer \"in time\""),
        )
        assertEquals(
            "{\"ok\":false,\"capability\":\"ui.toast\",\"error\":{\"code\":\"NOT_GRANTED\",\"message\":\"no\"}}",
            BunHostBridgeDispatcher.errorBody("ui.toast", "NOT_GRANTED", "no"),
        )
        mapOf(
            "INVALID_REQUEST" to 400, "NOT_GRANTED" to 403, "UNKNOWN_CAPABILITY" to 404, "PAYLOAD_TOO_LARGE" to 413,
            "TOO_MANY_REQUESTS" to 429, "QUOTA_EXCEEDED" to 429, "TIMEOUT" to 504, "HOST_UNAVAILABLE" to 503, "INTERNAL" to 500,
        ).forEach { (code, status) ->
            assertEquals(code, status, BunHostBridgeDispatcher.statusFor(code))
            assertTrue(code, BunHostBridgeDispatcher.isKnownCode(code))
        }
        assertEquals(500, BunHostBridgeDispatcher.statusFor("SOMETHING_ELSE"))
        assertFalse(BunHostBridgeDispatcher.isKnownCode("SOMETHING_ELSE"))
        assertFalse(BunHostBridgeDispatcher.isKnownCode(""))
        assertTrue(BunHostBridgeDispatcher.looksLikeObject(" {} "))
        assertFalse(BunHostBridgeDispatcher.looksLikeObject("{"))
        assertFalse(BunHostBridgeDispatcher.looksLikeObject("[]"))
    }

    private fun request(method: String, path: String, body: String = ""): BunHostBridgeHttpRequest =
        request(method, path, body.toByteArray(Charsets.UTF_8))

    private fun request(method: String, path: String, body: ByteArray): BunHostBridgeHttpRequest =
        BunHostBridgeHttpRequest(method, path, body)

    private fun assertError(reply: BunHostBridgeReply, status: Int, capability: String?, code: String, message: String? = null) {
        assertEquals(reply.body, status, reply.status)
        val expectedCapability = capability?.let { "\"$it\"" } ?: "null"
        val prefix = "{\"ok\":false,\"capability\":$expectedCapability,\"error\":{\"code\":\"$code\",\"message\":\""
        assertTrue(reply.body, reply.body.startsWith(prefix) && reply.body.endsWith("\"}}"))
        if (message != null) assertEquals(prefix + message + "\"}}", reply.body)
    }
}
