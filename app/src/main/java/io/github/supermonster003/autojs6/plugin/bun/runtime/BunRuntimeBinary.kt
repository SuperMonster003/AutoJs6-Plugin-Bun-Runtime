package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.Context
import android.os.Build
import android.os.SystemClock
import android.system.Os
import android.system.OsConstants
import java.io.File
import java.security.MessageDigest

internal fun lockedRuntimeAbiForSha256(sha256: String): String? =
    LOCKED_RUNTIME_SHA256_BY_ABI.entries.singleOrNull { (_, expectedSha256) ->
        sha256 == expectedSha256
    }?.key

internal class BunRuntimeBinary(
    private val context: Context,
    nowMillis: () -> Long = SystemClock::elapsedRealtime,
    private val startProbe: (List<String>, File) -> Process = { command, helper ->
        SupervisedProcess.start(ProcessBuilder(command), helper)
    },
) {
    private val cache = BunRuntimeProbeCache(nowMillis, ::inspect)

    val file: File
        get() = File(context.applicationInfo.nativeLibraryDir, FILE_NAME)

    val supervisor: File
        get() = File(context.applicationInfo.nativeLibraryDir, SupervisedProcess.SUPERVISOR_NAME)

    fun probe(): BunRuntimeProbe = cache.probe()

    private fun inspect(): BunRuntimeProbe {
        val runtime = file
        var runtimeAbi: String? = null
        var version: String? = null
        var revision: String? = null
        var stage = "runtime-integrity"
        fun failed(reason: String, retryable: Boolean = false, command: BunProbeCommandResult? = null): BunRuntimeProbe =
            BunRuntimeProbe(false, runtime.path, runtimeAbi, version, revision,
                BunRuntimeFailure.Unavailable(probeDiagnostic(Build.VERSION.SDK_INT, runtimeAbi, stage, reason,
                    retryable, version, revision, command)), retryable)
        return try {
            if (!runtime.isFile) return failed("runtime-missing")
            val actual = sha256(runtime)
            val abi = lockedRuntimeAbiForSha256(actual) ?: return failed("runtime-hash-mismatch")
            runtimeAbi = abi
            stage = "supervisor-integrity"
            val expectedSupervisor = when (abi) {
                "arm64-v8a" -> BuildConfig.BUN_SUPERVISOR_ARM64_V8A_SHA256
                "x86_64" -> BuildConfig.BUN_SUPERVISOR_X86_64_SHA256
                else -> error("Unexpected Bun ABI: $abi")
            }
            if (!supervisor.isFile || sha256(supervisor) != expectedSupervisor) return failed("supervisor-hash-mismatch")
            stage = "page-size"
            val pageSize = Os.sysconf(OsConstants._SC_PAGESIZE)
            if (pageSize <= 0) return failed("page-size-unavailable", retryable = true)
            runtimePageSizeFailure(abi, pageSize)?.let { failure ->
                return BunRuntimeProbe(false, runtime.path, runtimeAbi, null, null, failure.copy(
                    diagnostic = probeDiagnostic(Build.VERSION.SDK_INT, runtimeAbi, stage, "unsupported-page-size",
                        false, null, null),
                ))
            }
            val runner = BunProbeCommandRunner(start = { arguments ->
                startProbe(listOf(runtime.path) + arguments, supervisor)
            })
            stage = "version"
            val versionResult = runner.run(listOf("--version"))
            if (!versionResult.succeeded) return failed(requireNotNull(versionResult.reason), versionResult.retryable, versionResult)
            version = versionResult.stdout.trim()
            if (version != BuildConfig.BUN_RUNTIME_VERSION) return failed("version-mismatch", command = versionResult)
            stage = "revision"
            val revisionResult = runner.run(listOf("--revision"))
            if (!revisionResult.succeeded) return failed(requireNotNull(revisionResult.reason), revisionResult.retryable, revisionResult)
            revision = revisionResult.stdout.trim()
            if (revision != BuildConfig.BUN_RUNTIME_REVISION) return failed("revision-mismatch", command = revisionResult)
            stage = "smoke"
            val smoke = runner.run(listOf("--eval", "void 0"))
            if (!smoke.succeeded) return failed(requireNotNull(smoke.reason), smoke.retryable, smoke)
            BunRuntimeProbe(true, runtime.path, runtimeAbi, version, revision, null)
        } catch (_: java.io.IOException) {
            failed("integrity-read-failed", retryable = true)
        } catch (_: Exception) {
            // Fixed facts only: exceptions can embed paths or inherited environment values.
            failed("inspection-failed")
        }
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
    }
}

private val LOCKED_RUNTIME_SHA256_BY_ABI = mapOf(
    "arm64-v8a" to BuildConfig.BUN_RUNTIME_ARM64_V8A_SHA256,
    "x86_64" to BuildConfig.BUN_RUNTIME_X86_64_SHA256,
)
