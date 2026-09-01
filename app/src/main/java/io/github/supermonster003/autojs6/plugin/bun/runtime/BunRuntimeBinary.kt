package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.Context
import android.os.Build
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

internal data class BunRuntimeProbe(
    val ready: Boolean,
    val path: String,
    val version: String?,
    val revision: String?,
    val error: String?,
)

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
        return runCatching {
            require(runtime.isFile) { "Bun executable is missing for ${Build.SUPPORTED_ABIS.joinToString()}" }
            val expected = EXPECTED_SHA256.entries.firstOrNull { (abi) -> abi in Build.SUPPORTED_ABIS }
                ?: error("Unsupported ABI: ${Build.SUPPORTED_ABIS.joinToString()}")
            val actual = sha256(runtime)
            require(actual == expected.value) { "Bun executable SHA-256 mismatch for ${expected.key}" }
            val version = executeProbe(runtime, "--version")
            require(version == BunRuntimeContract.RUNTIME_VERSION) { "Unexpected Bun version: $version" }
            val revision = executeProbe(runtime, "--revision")
            require(revision == BunRuntimeContract.RUNTIME_REVISION) { "Unexpected Bun revision: $revision" }
            BunRuntimeProbe(true, runtime.path, version, revision, null)
        }.getOrElse { error ->
            BunRuntimeProbe(false, runtime.path, null, null, error.message ?: error.toString())
        }
    }

    private fun executeProbe(runtime: File, argument: String): String {
        val process = ProcessBuilder(runtime.path, argument).redirectErrorStream(true).start()
        if (!process.waitFor(PROBE_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
            process.destroyForcibly()
            error("Bun $argument probe timed out")
        }
        val output = process.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }.trim()
        require(process.exitValue() == 0) { "Bun $argument probe failed: $output" }
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
        val EXPECTED_SHA256 = mapOf(
            "arm64-v8a" to "44a83a9b716a2df09c7c62cfee94f99b4d0b389f9326c6318c4831d888e2a250",
            "x86_64" to "2884ee9a0f0828661977b17b08324e640f024585e48357cc3fc24ee700d192df",
        )
    }
}
