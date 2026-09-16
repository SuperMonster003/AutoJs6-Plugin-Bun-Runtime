package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.ByteArrayInputStream

class BunHostBridgeHttpTest {
    @Test
    fun parsesTheRequestLineHeadersAndContentLengthBody() {
        val request = read("POST /v1/ui.toast?x=1 HTTP/1.1\r\nHost: autojs6\r\ncontent-length: 16\r\nContent-Type: application/json\r\n\r\n{\"text\":\"hello\"}trailing")
        assertEquals("POST", request.method)
        assertEquals("/v1/ui.toast", request.path)
        assertEquals("{\"text\":\"hello\"}", String(request.body, Charsets.UTF_8))

        val bare = read("GET /v1/info HTTP/1.0\n\n")
        assertEquals("GET", bare.method)
        assertEquals("/v1/info", bare.path)
        assertEquals(0, bare.body.size)

        val explicitEmpty = read("POST /v1/device.info HTTP/1.1\r\nContent-Length: 0\r\n\r\n")
        assertEquals(0, explicitEmpty.body.size)
    }

    @Test
    fun rejectsMalformedAndUnsupportedRequests() {
        assertRejected(400, "Request line is missing", "")
        assertRejected(400, "Malformed request line", "GET /v1/info\r\n\r\n")
        assertRejected(400, "Malformed request line", "GET  /v1/info HTTP/1.1\r\n\r\n")
        assertRejected(400, "Malformed request method", "get /v1/info HTTP/1.1\r\n\r\n")
        assertRejected(400, "Malformed request target", "GET v1/info HTTP/1.1\r\n\r\n")
        assertRejected(400, "Unsupported HTTP version", "GET /v1/info HTTP/2.0\r\n\r\n")
        assertRejected(400, "Header block is truncated", "GET /v1/info HTTP/1.1\r\nHost: x\r\n")
        assertRejected(400, "Malformed header line", "GET /v1/info HTTP/1.1\r\nno-colon\r\n\r\n")
        assertRejected(400, "Malformed header line", "GET /v1/info HTTP/1.1\r\n: value\r\n\r\n")
        assertRejected(400, "Malformed Content-Length", "POST /v1/a.b HTTP/1.1\r\nContent-Length: -1\r\n\r\n")
        assertRejected(400, "Malformed Content-Length", "POST /v1/a.b HTTP/1.1\r\nContent-Length: abc\r\n\r\n")
        assertRejected(400, "Chunked request bodies are not supported", "POST /v1/a.b HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\n")
        assertRejected(400, "Expect is not supported", "POST /v1/a.b HTTP/1.1\r\nExpect: 100-continue\r\nContent-Length: 2\r\n\r\n{}")
        assertRejected(400, "Request body is truncated", "POST /v1/a.b HTTP/1.1\r\nContent-Length: 5\r\n\r\n{}")
        assertRejected(400, "Request line is too long", "GET /" + "a".repeat(BunHostBridgeHttp.MAX_REQUEST_LINE_BYTES) + " HTTP/1.1\r\n\r\n")
        assertRejected(400, "Header block is too long", "GET /v1/info HTTP/1.1\r\nX: " + "a".repeat(BunHostBridgeHttp.MAX_HEADER_BYTES) + "\r\n\r\n")
        assertRejected(400, "Request line is truncated", "GET /v1/info HTTP/1.1")
    }

    @Test
    fun boundsTheBodyByContentLengthBeforeReadingIt() {
        val limit = 16
        val fits = read("POST /v1/a.b HTTP/1.1\r\nContent-Length: $limit\r\n\r\n" + "{" + " ".repeat(limit - 2) + "}", limit)
        assertEquals(limit, fits.body.size)
        try {
            read("POST /v1/a.b HTTP/1.1\r\nContent-Length: ${limit + 1}\r\n\r\n" + "{" + " ".repeat(limit - 1) + "}", limit)
            fail("Expected 413")
        } catch (error: BunHostBridgeHttpException) {
            assertEquals(413, error.status)
            assertEquals(BunRuntimeContract.HOST_CALL_ERROR_PAYLOAD_TOO_LARGE, error.code)
            assertEquals("Request body exceeds $limit bytes", error.message)
        }
        // The default bound is the contract's request limit.
        try {
            read("POST /v1/a.b HTTP/1.1\r\nContent-Length: ${BunRuntimeContract.MAX_HOST_CALL_REQUEST_BYTES + 1}\r\n\r\n")
            fail("Expected 413")
        } catch (error: BunHostBridgeHttpException) {
            assertEquals(413, error.status)
        }
    }

    @Test
    fun rendersClosedJsonResponsesWithTheByteLength() {
        val body = "{\"ok\":true,\"text\":\"héllo\"}"
        val rendered = BunHostBridgeHttp.renderResponse(200, body)
        val expectedHead = "HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${body.toByteArray(Charsets.UTF_8).size}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n"
        assertArrayEquals(expectedHead.toByteArray(Charsets.ISO_8859_1) + body.toByteArray(Charsets.UTF_8), rendered)
        assertTrue(String(BunHostBridgeHttp.renderResponse(429, "{}"), Charsets.ISO_8859_1).startsWith("HTTP/1.1 429 Too Many Requests\r\n"))
        assertTrue(String(BunHostBridgeHttp.renderResponse(504, "{}"), Charsets.ISO_8859_1).startsWith("HTTP/1.1 504 Gateway Timeout\r\n"))
        assertEquals("Unknown", BunHostBridgeHttp.reason(418))
    }

    private fun read(text: String, maxBodyBytes: Int = BunRuntimeContract.MAX_HOST_CALL_REQUEST_BYTES): BunHostBridgeHttpRequest =
        BunHostBridgeHttp.readRequest(ByteArrayInputStream(text.toByteArray(Charsets.ISO_8859_1)), maxBodyBytes)

    private fun assertRejected(status: Int, message: String, text: String) {
        try {
            read(text)
            fail("Expected $status: $message")
        } catch (error: BunHostBridgeHttpException) {
            assertEquals(text, status, error.status)
            assertEquals(text, message, error.message)
            assertEquals(BunRuntimeContract.HOST_CALL_ERROR_INVALID_REQUEST, error.code)
        }
    }
}
