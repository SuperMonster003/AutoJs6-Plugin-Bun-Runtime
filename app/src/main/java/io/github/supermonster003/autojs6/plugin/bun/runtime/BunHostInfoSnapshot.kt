package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunRuntimeContract

/** Facts about the calling host. Package and version are resolved by the plugin; the rest is host advisory. */
internal data class BunHostFacts(
    val packageName: String,
    val versionName: String,
    val versionCode: Long,
    val versionDate: String?,
    val languageTag: String?,
)

/** Facts about this plugin and its packaged runtime, taken from the installed package and the build. */
internal data class BunPluginFacts(
    val packageName: String,
    val versionName: String,
    val versionCode: Long,
    val runtimeVersion: String,
    val runtimeRevision: String,
    val runtimeAbi: String,
)

/** Facts about the current run that the script may want to correlate with host-side logs. */
internal data class BunExecutionFacts(
    val executionId: String,
    val sourceName: String,
    val workspaceArchive: Boolean,
)

/**
 * Renders the read-only host info snapshot (first capability of the M7 capability bridge) as a small JSON
 * document. The plugin writes it into the private run directory, outside `project`, and hands the path to
 * the script through [BunRuntimeContract.HOST_INFO_ENVIRONMENT_VARIABLE]. Kept free of android.os types so
 * JVM unit tests cover the exact bytes; every value is escaped, the layout is fixed and the size is bounded.
 */
internal object BunHostInfoSnapshot {
    const val DIRECTORY_NAME = "autojs6"
    const val FILE_NAME = "host-info.json"

    fun render(host: BunHostFacts, plugin: BunPluginFacts, execution: BunExecutionFacts): String {
        val json = buildString {
            append('{')
            append("\"hostInfoVersion\":").append(BunRuntimeContract.HOST_INFO_VERSION)
            append(",\"host\":{")
            field("packageName", host.packageName)
            append(',').field("versionName", host.versionName)
            append(",\"versionCode\":").append(host.versionCode)
            host.versionDate?.let { append(',').field("versionDate", it) }
            host.languageTag?.let { append(',').field("languageTag", it) }
            append("},\"plugin\":{")
            field("packageName", plugin.packageName)
            append(',').field("versionName", plugin.versionName)
            append(",\"versionCode\":").append(plugin.versionCode)
            append(',').field("runtimeVersion", plugin.runtimeVersion)
            append(',').field("runtimeRevision", plugin.runtimeRevision)
            append(',').field("runtimeAbi", plugin.runtimeAbi)
            append("},\"execution\":{")
            field("executionId", execution.executionId)
            append(',').field("sourceName", execution.sourceName)
            append(",\"workspaceArchive\":").append(execution.workspaceArchive)
            append("}}")
        }
        require(json.toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_HOST_INFO_BYTES) {
            "Host info snapshot is too large"
        }
        return json
    }

    private fun StringBuilder.field(name: String, value: String): StringBuilder =
        append('"').append(name).append("\":").append(quote(value))

    /**
     * JSON string literal with the RFC 8259 escapes. Control characters, DEL and the U+2028/U+2029 line
     * separators become `\uXXXX` escapes so the file stays single-line and safe for any JSON parser.
     */
    fun quote(value: String): String = buildString(value.length + 2) {
        append('"')
        value.forEach { character ->
            when (character) {
                '"' -> append("\\\"")
                '\\' -> append("\\\\")
                '\n' -> append("\\n")
                '\r' -> append("\\r")
                '\t' -> append("\\t")
                '\b' -> append("\\b")
                '\u000C' -> append("\\f")
                else -> if (character < ' ' || character == '\u007F' || character == '\u2028' || character == '\u2029') {
                    append("\\u").append(character.code.toString(16).padStart(4, '0'))
                } else {
                    append(character)
                }
            }
        }
        append('"')
    }
}
