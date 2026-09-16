package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.os.Bundle
import android.os.IBinder
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract

/** Present only when the host sent a workspace archive instead of a single source. */
internal data class BunWorkspaceRequest(
    val entryPoint: String,
    val limits: BunWorkspaceLimits,
)

/** Present only when the host offered the read-only host info snapshot (M7, first capability). */
internal data class BunHostInfoRequest(
    val packageName: String,
    val versionDate: String?,
    val languageTag: String?,
)

/** Present only when the host offered the runtime capability bridge (M7, dynamic calls). */
internal data class BunHostBridgeRequest(
    val broker: IBinder,
    val capabilities: List<String>,
)

internal data class BunExecutionRequest(
    val executionId: String,
    val sourceName: String,
    val arguments: List<String>,
    val environment: Map<String, String>,
    val timeoutMillis: Long,
    val outputByteLimit: Long,
    val workspace: BunWorkspaceRequest? = null,
    val hostInfo: BunHostInfoRequest? = null,
    val hostBridge: BunHostBridgeRequest? = null,
)

internal object BunExecutionRequestParser {
    private val executionIdPattern = Regex("[A-Za-z0-9._-]{1,128}")
    private val environmentNamePattern = Regex("[A-Za-z_][A-Za-z0-9_]*")
    private val packageNamePattern = Regex("[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+")
    private val languageTagPattern = Regex("[A-Za-z0-9]{1,8}(-[A-Za-z0-9]{1,8})*")
    private val capabilityIdPattern = Regex("[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)+")

    fun isValidExecutionId(value: String): Boolean = executionIdPattern.matches(value)

    /** Capability IDs are dotted lowercase names (at least one dot, so they never collide with the bridge info path). */
    fun isValidCapabilityId(value: String): Boolean =
        value.toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_HOST_CAPABILITY_ID_BYTES && capabilityIdPattern.matches(value)

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
            validateEnvironmentName(name)
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

        // The archive marker is opt-in: a host that never learned the key keeps the single-source path.
        val workspace = if (request.containsKey(BunRuntimeContract.KEY_WORKSPACE_ARCHIVE_VERSION)) {
            parseWorkspace(
                version = request.getInt(BunRuntimeContract.KEY_WORKSPACE_ARCHIVE_VERSION, -1),
                entryPoint = request.getString(BunRuntimeContract.KEY_WORKSPACE_ENTRY_POINT),
                maxEntries = request.getInt(BunRuntimeContract.KEY_WORKSPACE_MAX_ENTRIES, 0),
                maxBytes = request.getLong(BunRuntimeContract.KEY_WORKSPACE_MAX_BYTES, 0L),
            )
        } else {
            null
        }

        // The host info marker is opt-in as well: absent means no snapshot and no reserved environment variable.
        val hostInfo = if (request.containsKey(BunRuntimeContract.KEY_HOST_INFO_VERSION)) {
            val bundle = request.getBundle(BunRuntimeContract.KEY_HOST_INFO)
            parseHostInfo(
                version = request.getInt(BunRuntimeContract.KEY_HOST_INFO_VERSION, -1),
                packageName = bundle?.getString(BunRuntimeContract.HOST_INFO_KEY_PACKAGE_NAME),
                versionDate = bundle?.getString(BunRuntimeContract.HOST_INFO_KEY_VERSION_DATE),
                languageTag = bundle?.getString(BunRuntimeContract.HOST_INFO_KEY_LANGUAGE_TAG),
            )
        } else {
            null
        }

        // The bridge marker is opt-in too: absent means no broker, no socket and no reserved environment variable.
        val hostBridge = if (request.containsKey(BunRuntimeContract.KEY_HOST_CAPABILITY_BRIDGE_VERSION)) {
            parseHostBridge(
                version = request.getInt(BunRuntimeContract.KEY_HOST_CAPABILITY_BRIDGE_VERSION, -1),
                broker = request.getBinder(BunRuntimeContract.KEY_HOST_CAPABILITY_BROKER),
                capabilities = request.getStringArrayList(BunRuntimeContract.KEY_HOST_CAPABILITIES),
            )
        } else {
            null
        }

        return BunExecutionRequest(
            executionId = executionId,
            sourceName = sourceName,
            arguments = arguments.toList(),
            environment = environment,
            timeoutMillis = timeoutMillis,
            outputByteLimit = outputByteLimit,
            workspace = workspace,
            hostInfo = hostInfo,
            hostBridge = hostBridge,
        )
    }

    /** Environment names follow the POSIX identifier form; the `AUTOJS6_` namespace belongs to the plugin. */
    fun validateEnvironmentName(name: String) {
        require(environmentNamePattern.matches(name)) { "Invalid environment variable name" }
        require(!name.startsWith(BunRuntimeContract.RESERVED_ENVIRONMENT_PREFIX)) { "Reserved environment variable name" }
    }

    /**
     * Validates the host info snapshot fields. Kept free of android.os types so JVM tests cover it. Only the
     * package name is mandatory; the service later checks it against the Binder caller and resolves the host
     * version itself. Blank advisory values count as absent.
     */
    fun parseHostInfo(version: Int, packageName: String?, versionDate: String?, languageTag: String?): BunHostInfoRequest {
        require(version == BunRuntimeContract.HOST_INFO_VERSION) { "Unsupported host info version" }
        require(!packageName.isNullOrBlank()) { "Host info package name is missing" }
        require(packageName.toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_HOST_INFO_VALUE_BYTES) {
            "Host info package name is too long"
        }
        require(packageNamePattern.matches(packageName)) { "Invalid host info package name" }
        val tag = advisoryHostInfoValue(languageTag, "Host info language tag")
        require(tag == null || languageTagPattern.matches(tag)) { "Invalid host info language tag" }
        return BunHostInfoRequest(
            packageName = packageName,
            versionDate = advisoryHostInfoValue(versionDate, "Host info version date"),
            languageTag = tag,
        )
    }

    /**
     * Validates the capability bridge fields. The broker Binder stays opaque here; the service pins it to the
     * caller UID and the execution ID. Kept free of android.os calls so JVM tests cover the list rules.
     */
    fun parseHostBridge(version: Int, broker: IBinder?, capabilities: List<String?>?): BunHostBridgeRequest {
        require(version == BunRuntimeContract.HOST_CAPABILITY_BRIDGE_VERSION) { "Unsupported host capability bridge version" }
        requireNotNull(broker) { "Host capability broker is missing" }
        require(!capabilities.isNullOrEmpty()) { "Host capability list is empty" }
        require(capabilities.size <= BunRuntimeContract.MAX_HOST_CAPABILITY_COUNT) { "Too many host capabilities" }
        val ids = capabilities.map { id ->
            require(id != null && isValidCapabilityId(id)) { "Invalid host capability ID" }
            id
        }
        require(ids.toSet().size == ids.size) { "Duplicate host capability ID" }
        return BunHostBridgeRequest(broker = broker, capabilities = ids)
    }

    private fun advisoryHostInfoValue(value: String?, label: String): String? {
        val trimmed = value?.trim()?.takeIf(String::isNotEmpty) ?: return null
        require(trimmed.toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_HOST_INFO_VALUE_BYTES) { "$label is too long" }
        require(trimmed.none(Char::isISOControl)) { "$label contains control characters" }
        return trimmed
    }

    /**
     * Validates the workspace archive fields. Kept free of android.os types so JVM tests cover it.
     * Non-positive limits mean "plugin default"; larger values are clamped to the hard caps.
     */
    fun parseWorkspace(version: Int, entryPoint: String?, maxEntries: Int, maxBytes: Long): BunWorkspaceRequest {
        require(version == BunRuntimeContract.WORKSPACE_ARCHIVE_VERSION) { "Unsupported workspace archive version" }
        require(!entryPoint.isNullOrBlank()) { "Workspace entry point is missing" }
        require(entryPoint.toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_SOURCE_NAME_BYTES) {
            "Workspace entry point is too long"
        }
        return BunWorkspaceRequest(
            entryPoint = BunWorkspaceArchive.normalizeEntryPoint(entryPoint),
            limits = BunWorkspaceLimits.clamped(maxEntries = maxEntries, maxTotalBytes = maxBytes),
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
