package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.Context
import android.system.Os
import android.system.OsConstants
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

internal data class BunRuntimeProbe(
    val ready: Boolean,
    val path: String,
    val abi: String?,
    val version: String?,
    val revision: String?,
    val error: String?,
)

internal fun lockedRuntimeAbiForSha256(sha256: String): String? =
    LOCKED_RUNTIME_SHA256_BY_ABI.entries.singleOrNull { (_, expectedSha256) ->
        sha256 == expectedSha256
    }?.key

internal fun officialRuntimePageSizeError(abi: String, pageSizeBytes: Long): String? {
    if (abi != "x86_64" || pageSizeBytes <= OFFICIAL_X86_64_PAGE_SIZE_CEILING_BYTES) return null
    return "Official Bun ${BunRuntimeContract.RUNTIME_VERSION} x86_64 runtime is incompatible with " +
        "$pageSizeBytes-byte process pages because its pinned JavaScriptCore build has a " +
        "$OFFICIAL_X86_64_PAGE_SIZE_CEILING_BYTES-byte page-size ceiling"
}

internal class BunRuntimeBinary(private val context: Context) {
    @Volatile
    private var cachedProbe: BunRuntimeProbe? = null

    val file: File
        get() = File(context.applicationInfo.nativeLibraryDir, FILE_NAME)

    fun probe(): BunRuntimeProbe = cachedProbe ?: synchronized(this) {
        cachedProbe ?: inspect().also { cachedProbe = it }
    }

    private fun inspect(): BunRuntimeProbe {
        val runtime = file
        var runtimeAbi: String? = null
        return runCatching {
            require(runtime.isFile) { "Bun executable is missing from the native library directory" }
            val actual = sha256(runtime)
            val abi = requireNotNull(lockedRuntimeAbiForSha256(actual)) {
                "Bun executable SHA-256 does not match any locked ABI payload"
            }
            runtimeAbi = abi
            officialRuntimePageSizeError(
                abi,
                Os.sysconf(OsConstants._SC_PAGESIZE),
            )?.let(::error)
            val version = executeProbe(runtime, "--version")
            require(version == BunRuntimeContract.RUNTIME_VERSION) { "Unexpected Bun version: $version" }
            val revision = executeProbe(runtime, "--revision")
            require(revision == BunRuntimeContract.RUNTIME_REVISION) { "Unexpected Bun revision: $revision" }
            executeProbe(runtime, "--eval", "void 0")
            BunRuntimeProbe(true, runtime.path, runtimeAbi, version, revision, null)
        }.getOrElse { error ->
            BunRuntimeProbe(false, runtime.path, runtimeAbi, null, null, error.message ?: error.toString())
        }
    }

    private fun executeProbe(runtime: File, vararg arguments: String): String {
        val label = arguments.joinToString(" ")
        val process = ProcessBuilder(listOf(runtime.path) + arguments).redirectErrorStream(true).start()
        if (!process.waitFor(PROBE_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
            process.destroyForcibly()
            error("Bun $label probe timed out")
        }
        val output = process.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }.trim()
        require(process.exitValue() == 0) { "Bun $label probe failed: $output" }
        return output
    }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().buffered().use { input ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private companion object {
        const val FILE_NAME = "libbun_exec.so"
        const val PROBE_TIMEOUT_SECONDS = 10L
    }
}

private val LOCKED_RUNTIME_SHA256_BY_ABI = mapOf(
    "arm64-v8a" to BuildConfig.BUN_RUNTIME_ARM64_V8A_SHA256,
    "x86_64" to BuildConfig.BUN_RUNTIME_X86_64_SHA256,
)

private const val OFFICIAL_X86_64_PAGE_SIZE_CEILING_BYTES = 4096L
