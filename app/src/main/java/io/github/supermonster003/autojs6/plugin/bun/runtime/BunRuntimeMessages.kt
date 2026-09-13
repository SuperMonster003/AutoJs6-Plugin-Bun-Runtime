package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.Context
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract

// Cache facts, never translated text: a cached prewarm failure must follow locale changes.
internal sealed interface BunRuntimeFailure {
    data class Unavailable(val diagnostic: String) : BunRuntimeFailure
    data class PageSize(val actualBytes: Long, val maximumBytes: Long, val diagnostic: String? = null) : BunRuntimeFailure
}

internal fun runtimePageSizeFailure(abi: String, pageSizeBytes: Long): BunRuntimeFailure.PageSize? =
    if (abi == "x86_64" && pageSizeBytes > BuildConfig.BUN_X86_MAX_PAGE_SIZE_BYTES) {
        BunRuntimeFailure.PageSize(pageSizeBytes, BuildConfig.BUN_X86_MAX_PAGE_SIZE_BYTES)
    } else null

internal fun Context.runtimeFailureMessage(failure: BunRuntimeFailure?): String? = when (failure) {
    null -> null
    is BunRuntimeFailure.Unavailable -> runtimeErrorMessage(
        BunRuntimeContract.ERROR_RUNTIME_UNAVAILABLE, diagnostic = failure.diagnostic,
    )
    is BunRuntimeFailure.PageSize -> appendRuntimeDiagnostic(getString(
        R.string.runtime_error_page_size, failure.actualBytes, failure.maximumBytes,
    ), failure.diagnostic)
}

internal fun Context.runtimeErrorMessage(code: String?, exitCode: Int = -1, diagnostic: String? = null): String? {
    if (code == null) return null
    val summary = when (code) {
        BunRuntimeContract.ERROR_INVALID_REQUEST -> getString(R.string.runtime_error_invalid_request)
        BunRuntimeContract.ERROR_SOURCE_TOO_LARGE -> getString(R.string.runtime_error_source_too_large, BunRuntimeContract.MAX_SOURCE_BYTES)
        BunRuntimeContract.ERROR_BUSY -> getString(R.string.runtime_error_busy)
        BunRuntimeContract.ERROR_RUNTIME_UNAVAILABLE -> getString(R.string.runtime_error_unavailable)
        BunRuntimeContract.ERROR_SPAWN_FAILED -> getString(R.string.runtime_error_spawn_failed)
        BunRuntimeContract.ERROR_CANCELLED -> getString(R.string.runtime_error_cancelled)
        BunRuntimeContract.ERROR_TIMEOUT -> getString(R.string.runtime_error_timeout)
        BunRuntimeContract.ERROR_OUTPUT_LIMIT -> getString(R.string.runtime_error_output_limit)
        BunRuntimeContract.ERROR_NON_ZERO_EXIT -> getString(R.string.runtime_error_non_zero_exit, exitCode)
        else -> getString(R.string.runtime_error_internal)
    }
    // Keep low-level exception/probe details for diagnosis, after the readable summary.
    return appendRuntimeDiagnostic(summary, diagnostic)
}

private fun Context.appendRuntimeDiagnostic(summary: String, diagnostic: String?): String =
    boundedTerminalMessage(if (diagnostic.isNullOrBlank()) summary else
        "$summary\n${getString(R.string.runtime_diagnostic_label)} $diagnostic")

/** A UTF-8 byte bound that does not split a supplementary Unicode code point. */
internal fun boundedTerminalMessage(message: String, maxBytes: Int = BunRuntimeContract.MAX_TERMINAL_MESSAGE_BYTES): String {
    require(maxBytes >= 0)
    var end = 0
    var bytes = 0
    while (end < message.length) {
        val point = message.codePointAt(end)
        val size = when {
            point <= 0x7f -> 1
            point <= 0x7ff -> 2
            point <= 0xffff -> 3
            else -> 4
        }
        if (size > maxBytes - bytes) break
        bytes += size
        end += Character.charCount(point)
    }
    return message.substring(0, end)
}
