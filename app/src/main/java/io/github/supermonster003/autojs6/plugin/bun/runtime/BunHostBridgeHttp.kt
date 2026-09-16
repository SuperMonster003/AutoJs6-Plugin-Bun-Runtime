package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream

/** One parsed HTTP/1.1 request from the bridge socket: method, path without query, and the bounded body. */
internal class BunHostBridgeHttpRequest(val method: String, val path: String, val body: ByteArray)

/** A request that cannot be served; carries the HTTP status and the bridge error code for the JSON reply. */
internal class BunHostBridgeHttpException(val status: Int, val code: String, message: String) : IOException(message)

/**
 * Minimal, bounded HTTP/1.1 reader and writer for the capability bridge socket: exactly what
 * `fetch(url, { unix })` needs. One request per connection, `Content-Length` bodies only, `Connection: close`
 * replies. Kept free of android.os types so JVM unit tests cover the exact byte handling.
 */
internal object BunHostBridgeHttp {
    const val MAX_REQUEST_LINE_BYTES = 1024
    const val MAX_HEADER_BYTES = 8 * 1024
    private val methodPattern = Regex("[A-Z]{1,16}")

    fun readRequest(
        input: InputStream,
        maxBodyBytes: Int = BunRuntimeContract.MAX_HOST_CALL_REQUEST_BYTES,
    ): BunHostBridgeHttpRequest {
        val requestLine = readLine(input, MAX_REQUEST_LINE_BYTES, "Request line")
            ?: throw invalid("Request line is missing")
        val parts = requestLine.split(' ')
        if (parts.size != 3) throw invalid("Malformed request line")
        val (method, target, version) = parts
        if (!methodPattern.matches(method)) throw invalid("Malformed request method")
        if (!target.startsWith('/')) throw invalid("Malformed request target")
        if (version != "HTTP/1.1" && version != "HTTP/1.0") throw invalid("Unsupported HTTP version")

        var contentLength = 0
        var headerBytes = 0
        while (true) {
            val line = readLine(input, MAX_HEADER_BYTES - headerBytes, "Header block")
                ?: throw invalid("Header block is truncated")
            if (line.isEmpty()) break
            headerBytes += line.length + 2
            val separator = line.indexOf(':')
            if (separator <= 0) throw invalid("Malformed header line")
            val value = line.substring(separator + 1).trim()
            when (line.substring(0, separator).trim().lowercase()) {
                "content-length" -> {
                    val parsed = value.toLongOrNull()?.takeIf { it >= 0L } ?: throw invalid("Malformed Content-Length")
                    if (parsed > maxBodyBytes) {
                        throw BunHostBridgeHttpException(
                            413,
                            BunRuntimeContract.HOST_CALL_ERROR_PAYLOAD_TOO_LARGE,
                            "Request body exceeds $maxBodyBytes bytes",
                        )
                    }
                    contentLength = parsed.toInt()
                }
                "transfer-encoding" -> throw invalid("Chunked request bodies are not supported")
                "expect" -> throw invalid("Expect is not supported")
            }
        }

        val body = ByteArray(contentLength)
        var read = 0
        while (read < contentLength) {
            val count = input.read(body, read, contentLength - read)
            if (count < 0) throw invalid("Request body is truncated")
            read += count
        }
        return BunHostBridgeHttpRequest(method, target.substringBefore('?'), body)
    }

    fun renderResponse(status: Int, body: String): ByteArray {
        val payload = body.toByteArray(Charsets.UTF_8)
        val head = "HTTP/1.1 $status ${reason(status)}\r\n" +
            "Content-Type: application/json; charset=utf-8\r\n" +
            "Content-Length: ${payload.size}\r\n" +
            "Cache-Control: no-store\r\n" +
            "Connection: close\r\n\r\n"
        return head.toByteArray(Charsets.ISO_8859_1) + payload
    }

    fun reason(status: Int): String = when (status) {
        200 -> "OK"
        400 -> "Bad Request"
        403 -> "Forbidden"
        404 -> "Not Found"
        405 -> "Method Not Allowed"
        413 -> "Payload Too Large"
        429 -> "Too Many Requests"
        500 -> "Internal Server Error"
        503 -> "Service Unavailable"
        504 -> "Gateway Timeout"
        else -> "Unknown"
    }

    /** Reads one line up to LF (CRLF tolerated); null at a clean EOF, 400 on truncation or overlength. */
    private fun readLine(input: InputStream, maxBytes: Int, label: String): String? {
        val buffer = ByteArrayOutputStream(128)
        while (true) {
            val byte = input.read()
            if (byte < 0) {
                if (buffer.size() == 0) return null
                throw invalid("$label is truncated")
            }
            if (byte == '\n'.code) break
            if (buffer.size() >= maxBytes) throw invalid("$label is too long")
            buffer.write(byte)
        }
        val bytes = buffer.toByteArray()
        val end = if (bytes.isNotEmpty() && bytes.last() == '\r'.code.toByte()) bytes.size - 1 else bytes.size
        return String(bytes, 0, end, Charsets.ISO_8859_1)
    }

    private fun invalid(message: String) =
        BunHostBridgeHttpException(400, BunRuntimeContract.HOST_CALL_ERROR_INVALID_REQUEST, message)
}
