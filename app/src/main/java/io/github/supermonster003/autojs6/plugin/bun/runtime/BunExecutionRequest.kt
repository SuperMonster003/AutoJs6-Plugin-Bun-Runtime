package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.os.Bundle
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract

internal data class BunExecutionRequest(
    val executionId: String,
    val sourceName: String,
    val arguments: List<String>,
    val environment: Map<String, String>,
    val timeoutMillis: Long,
    val outputByteLimit: Long,
)

internal object BunExecutionRequestParser {
    private val executionIdPattern = Regex("[A-Za-z0-9._-]{1,128}")
    private val environmentNamePattern = Regex("[A-Za-z_][A-Za-z0-9_]*")

    fun isValidExecutionId(value: String): Boolean = executionIdPattern.matches(value)

    fun parse(request: Bundle?): BunExecutionRequest {
        requireNotNull(request) { "Request is missing" }
        require(request.getInt(BunRuntimeContract.KEY_PROTOCOL_VERSION, -1) == BunRuntimeContract.PROTOCOL_VERSION) {
            "Unsupported Bun runtime protocol version"
        }
        val executionId = request.getString(BunRuntimeContract.KEY_EXECUTION_ID).orEmpty()
        require(isValidExecutionId(executionId)) { "Invalid execution ID" }

        val sourceName = request.getString(BunRuntimeContract.KEY_SOURCE_NAME)
            ?.takeIf(String::isNotBlank)
            ?: "script.js"
        require(sourceName.toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_SOURCE_NAME_BYTES) {
            "Source name is too long"
        }

        val arguments = request.getStringArrayList(BunRuntimeContract.KEY_ARGUMENTS).orEmpty()
        require(arguments.size <= BunRuntimeContract.MAX_ARGUMENT_COUNT) { "Too many script arguments" }
        require(arguments.none { '\u0000' in it }) { "Script arguments cannot contain NUL" }
        require(arguments.sumOf { it.toByteArray(Charsets.UTF_8).size } <= BunRuntimeContract.MAX_ARGUMENT_BYTES) {
            "Script arguments are too large"
        }

        val environmentBundle = request.getBundle(BunRuntimeContract.KEY_ENVIRONMENT)
        val environment = LinkedHashMap<String, String>()
        environmentBundle?.keySet()?.forEach { name ->
            require(environmentNamePattern.matches(name)) { "Invalid environment variable name" }
            val value = environmentBundle.get(name)
            require(value is String) { "Environment values must be strings" }
            require('\u0000' !in value) { "Environment values cannot contain NUL" }
            environment[name] = value
        }
        require(environment.size <= BunRuntimeContract.MAX_ENVIRONMENT_COUNT) { "Too many environment variables" }
        require(environment.entries.sumOf { (key, value) ->
            key.toByteArray(Charsets.UTF_8).size + value.toByteArray(Charsets.UTF_8).size
        } <= BunRuntimeContract.MAX_ENVIRONMENT_BYTES) { "Environment is too large" }

        val timeoutMillis = request.getLong(
            BunRuntimeContract.KEY_TIMEOUT_MILLIS,
            BunRuntimeContract.DEFAULT_TIMEOUT_MILLIS,
        )
        require(timeoutMillis in 1..BunRuntimeContract.MAX_TIMEOUT_MILLIS) { "Invalid execution timeout" }
        val outputByteLimit = request.getLong(
            BunRuntimeContract.KEY_OUTPUT_BYTE_LIMIT,
            BunRuntimeContract.MAX_OUTPUT_BYTES,
        )
        require(outputByteLimit in 1..BunRuntimeContract.MAX_OUTPUT_BYTES) { "Invalid output byte limit" }

        return BunExecutionRequest(
            executionId = executionId,
            sourceName = sourceName,
            arguments = arguments.toList(),
            environment = environment,
            timeoutMillis = timeoutMillis,
            outputByteLimit = outputByteLimit,
        )
    }

    fun safeFileName(sourceName: String): String {
        val leaf = sourceName.replace('\\', '/').substringAfterLast('/').ifBlank { "script.js" }
        val lowerLeaf = leaf.lowercase()
        val matchedExtension = SAFE_EXTENSIONS.firstOrNull(lowerLeaf::endsWith)
        val extension = matchedExtension ?: ".js"
        val rawStem = matchedExtension?.let { leaf.dropLast(it.length) } ?: leaf
        val maximumStemBytes = MAX_SAFE_FILE_NAME_BYTES - extension.toByteArray(Charsets.UTF_8).size
        val sanitized = buildString {
            rawStem.forEach { character ->
                val safe = if (character.isLetterOrDigit() || character in "._-") character else '_'
                if ((toString() + safe).toByteArray(Charsets.UTF_8).size <= maximumStemBytes) append(safe)
            }
        }.trimEnd('.')
        val stem = sanitized.takeUnless { it.isBlank() || it == "." || it == ".." } ?: "script"
        return "$stem$extension"
    }

    private val SAFE_EXTENSIONS = listOf(".bun.tsx", ".bun.ts", ".bun.js", ".tsx", ".ts", ".js")
    private const val MAX_SAFE_FILE_NAME_BYTES = 240
}
