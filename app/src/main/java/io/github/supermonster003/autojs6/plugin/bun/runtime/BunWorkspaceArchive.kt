package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import java.io.EOFException
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.text.Normalizer
import java.util.Locale
import java.util.zip.ZipException
import java.util.zip.ZipInputStream

/**
 * Raised when a workspace archive violates a fixed rule. [code] is stable and bounded; the message
 * never echoes entry names or file content, only the 1-based entry index and the violated rule.
 */
internal class BunWorkspaceArchiveException(val code: String, message: String) : IllegalArgumentException(message)

/** Effective limits for one expansion. Values are clamped to the hard caps in [BunWorkspaceArchive]. */
internal data class BunWorkspaceLimits(
    val maxEntries: Int = BunWorkspaceArchive.HARD_MAX_ENTRIES,
    val maxTotalBytes: Long = BunWorkspaceArchive.HARD_MAX_TOTAL_BYTES,
    val maxEntryBytes: Long = BunWorkspaceArchive.HARD_MAX_ENTRY_BYTES,
) {
    init {
        require(maxEntries in 1..BunWorkspaceArchive.HARD_MAX_ENTRIES) { "Invalid workspace entry limit" }
        require(maxTotalBytes in 1..BunWorkspaceArchive.HARD_MAX_TOTAL_BYTES) { "Invalid workspace byte limit" }
        require(maxEntryBytes in 1..BunWorkspaceArchive.HARD_MAX_ENTRY_BYTES) { "Invalid workspace entry byte limit" }
    }

    companion object {
        /** Clamps host-requested limits into the hard caps; absent or non-positive values use the caps. */
        fun clamped(maxEntries: Int? = null, maxTotalBytes: Long? = null, maxEntryBytes: Long? = null): BunWorkspaceLimits =
            BunWorkspaceLimits(
                maxEntries = maxEntries?.takeIf { it > 0 }?.coerceAtMost(BunWorkspaceArchive.HARD_MAX_ENTRIES)
                    ?: BunWorkspaceArchive.HARD_MAX_ENTRIES,
                maxTotalBytes = maxTotalBytes?.takeIf { it > 0L }?.coerceAtMost(BunWorkspaceArchive.HARD_MAX_TOTAL_BYTES)
                    ?: BunWorkspaceArchive.HARD_MAX_TOTAL_BYTES,
                maxEntryBytes = maxEntryBytes?.takeIf { it > 0L }?.coerceAtMost(BunWorkspaceArchive.HARD_MAX_ENTRY_BYTES)
                    ?: BunWorkspaceArchive.HARD_MAX_ENTRY_BYTES,
            )
    }
}

/** A fully expanded, validated project rooted at [root]; [entryFile] is the file Bun should run. */
internal data class BunExpandedWorkspace(
    val root: File,
    val entryFile: File,
    val entryPath: String,
    val fileCount: Int,
    val directoryCount: Int,
    val totalBytes: Long,
)

/**
 * Bounded expansion of a multi-file project snapshot for M6.
 *
 * The snapshot is a plain ZIP stream whose entry names are relative, `/`-separated paths. Every
 * rule is enforced before a byte reaches disk, and any failure removes the staging directory so
 * the caller-owned workspace contains nothing of the archive. Only regular files and directories
 * are ever created: unix modes, symlink flags and every other entry attribute are ignored, never
 * honored, so an archive cannot point outside its own root.
 *
 * This object does not touch Binder or the shared contract. The request keys that select an
 * archive instead of a single source belong to the contract revision described in
 * `docs/design/m6-workspace-archive.md`; the production service still executes contract v1.
 */
internal object BunWorkspaceArchive {
    const val HARD_MAX_ENTRIES = 16_384
    const val HARD_MAX_TOTAL_BYTES = 64L * 1024L * 1024L
    const val HARD_MAX_ENTRY_BYTES = BunRuntimeContract.MAX_SOURCE_BYTES
    const val MAX_PATH_BYTES = BunRuntimeContract.MAX_SOURCE_NAME_BYTES
    const val MAX_PATH_DEPTH = 32
    const val MAX_SEGMENT_BYTES = 255

    const val PROJECT_DIRECTORY_NAME = "project"
    const val STAGING_DIRECTORY_NAME = ".project-staging"

    const val ERROR_EMPTY_ARCHIVE = "EMPTY_ARCHIVE"
    const val ERROR_CORRUPT_ARCHIVE = "CORRUPT_ARCHIVE"
    const val ERROR_INVALID_ENTRY_PATH = "INVALID_ENTRY_PATH"
    const val ERROR_DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    const val ERROR_PATH_CONFLICT = "PATH_CONFLICT"
    const val ERROR_TOO_MANY_ENTRIES = "TOO_MANY_ENTRIES"
    const val ERROR_ARCHIVE_TOO_LARGE = "ARCHIVE_TOO_LARGE"
    const val ERROR_ENTRY_TOO_LARGE = "ENTRY_TOO_LARGE"
    const val ERROR_ENTRY_POINT_INVALID = "ENTRY_POINT_INVALID"
    const val ERROR_ENTRY_POINT_MISSING = "ENTRY_POINT_MISSING"
    const val ERROR_CANCELLED = "CANCELLED"

    /** Extensions Bun executes directly with `bun run`; other files may be imported but not be the entry. */
    val ENTRY_POINT_EXTENSIONS = listOf(".js", ".mjs", ".cjs", ".jsx", ".ts", ".mts", ".cts", ".tsx")

    private const val COPY_BUFFER_BYTES = 32 * 1024

    /**
     * Validates one relative path. Returns the path without a trailing `/`.
     * [entryIndex] is only used for the bounded error message.
     */
    fun normalizeRelativePath(raw: String, entryIndex: Int = 0): String {
        fun invalid(reason: String): Nothing =
            throw BunWorkspaceArchiveException(ERROR_INVALID_ENTRY_PATH, "Entry $entryIndex: $reason")
        if (raw.isEmpty()) invalid("empty path")
        if (raw.toByteArray(Charsets.UTF_8).size > MAX_PATH_BYTES) invalid("path is too long")
        raw.forEach { character ->
            if (character < ' ' || character == '\u007f') invalid("path contains a control character")
            if (character == '\\') invalid("path uses a backslash separator")
            if (character == ':') invalid("path contains a colon")
        }
        if (raw.startsWith("/")) invalid("path is absolute")
        val trimmed = raw.removeSuffix("/")
        if (trimmed.isEmpty()) invalid("path has no name")
        val segments = trimmed.split('/')
        if (segments.size > MAX_PATH_DEPTH) invalid("path is too deep")
        segments.forEach { segment ->
            if (segment.isEmpty()) invalid("path contains an empty segment")
            if (segment == "." || segment == "..") invalid("path contains a dot segment")
            if (segment.toByteArray(Charsets.UTF_8).size > MAX_SEGMENT_BYTES) invalid("path segment is too long")
        }
        return trimmed
    }

    /** Validates the entry point: a relative file path whose extension Bun can execute. */
    fun normalizeEntryPoint(raw: String): String {
        val normalized = try {
            normalizeRelativePath(raw)
        } catch (error: BunWorkspaceArchiveException) {
            throw BunWorkspaceArchiveException(ERROR_ENTRY_POINT_INVALID, "Entry point is not a valid relative path")
        }
        if (raw.endsWith("/")) throw BunWorkspaceArchiveException(ERROR_ENTRY_POINT_INVALID, "Entry point is a directory")
        val lowerName = normalized.substringAfterLast('/').lowercase(Locale.ROOT)
        if (ENTRY_POINT_EXTENSIONS.none { extension -> lowerName.length > extension.length && lowerName.endsWith(extension) }) {
            throw BunWorkspaceArchiveException(ERROR_ENTRY_POINT_INVALID, "Entry point extension is not executable")
        }
        return normalized
    }

    /**
     * Expands [input] into `workspace/project` and returns the validated result.
     *
     * The archive is first written under a private staging directory and only renamed into place
     * once every entry and the entry point have passed; on any failure, including [isCancelled]
     * returning true, the staging directory is deleted and the exception is rethrown. The caller
     * keeps ownership of [workspace] itself.
     */
    fun expand(
        input: InputStream,
        workspace: File,
        entryPoint: String,
        limits: BunWorkspaceLimits = BunWorkspaceLimits(),
        isCancelled: () -> Boolean = { false },
    ): BunExpandedWorkspace {
        if (!workspace.isDirectory) throw IOException("Workspace directory is missing")
        val normalizedEntryPoint = normalizeEntryPoint(entryPoint)
        val staging = File(workspace, STAGING_DIRECTORY_NAME)
        val target = File(workspace, PROJECT_DIRECTORY_NAME)
        if (staging.exists() || target.exists()) throw IOException("Workspace already contains project state")
        if (!staging.mkdir()) throw IOException("Unable to create the workspace staging directory")
        try {
            val extraction = extract(input, staging, limits, isCancelled)
            if (normalizedEntryPoint !in extraction.files) {
                throw BunWorkspaceArchiveException(ERROR_ENTRY_POINT_MISSING, "Entry point is not a file in the archive")
            }
            if (!File(staging, normalizedEntryPoint).isFile) {
                throw BunWorkspaceArchiveException(ERROR_ENTRY_POINT_MISSING, "Entry point was not materialized")
            }
            if (!staging.renameTo(target)) throw IOException("Unable to publish the expanded workspace")
            return BunExpandedWorkspace(
                root = target,
                entryFile = File(target, normalizedEntryPoint),
                entryPath = normalizedEntryPoint,
                fileCount = extraction.files.size,
                directoryCount = extraction.explicitDirectories,
                totalBytes = extraction.totalBytes,
            )
        } catch (error: Throwable) {
            staging.deleteRecursively()
            throw error
        }
    }

    private class Extraction(
        val files: Set<String>,
        val explicitDirectories: Int,
        val totalBytes: Long,
    )

    private class Registry {
        val files = LinkedHashSet<String>()
        private val fileKeys = HashSet<String>()
        private val directoryKeys = HashSet<String>()
        private val explicitDirectoryKeys = HashSet<String>()

        fun registerFile(path: String, entryIndex: Int) {
            val key = key(path)
            if (key in fileKeys) throw duplicate(entryIndex)
            if (key in directoryKeys) throw conflict(entryIndex)
            ancestorKeys(path).forEach { ancestor ->
                if (ancestor in fileKeys) throw conflict(entryIndex)
                directoryKeys += ancestor
            }
            fileKeys += key
            files += path
        }

        fun registerDirectory(path: String, entryIndex: Int) {
            val key = key(path)
            if (key in explicitDirectoryKeys) throw duplicate(entryIndex)
            if (key in fileKeys) throw conflict(entryIndex)
            ancestorKeys(path).forEach { ancestor ->
                if (ancestor in fileKeys) throw conflict(entryIndex)
                directoryKeys += ancestor
            }
            directoryKeys += key
            explicitDirectoryKeys += key
        }

        private fun ancestorKeys(path: String): List<String> {
            val keys = ArrayList<String>()
            var end = path.indexOf('/')
            while (end >= 0) {
                keys += key(path.substring(0, end))
                end = path.indexOf('/', end + 1)
            }
            return keys
        }

        /** Two paths that differ only by Unicode form or letter case would collide on common host file systems. */
        private fun key(path: String): String = Normalizer.normalize(path, Normalizer.Form.NFC).lowercase(Locale.ROOT)

        private fun duplicate(entryIndex: Int) =
            BunWorkspaceArchiveException(ERROR_DUPLICATE_ENTRY, "Entry $entryIndex: path duplicates an earlier entry")

        private fun conflict(entryIndex: Int) =
            BunWorkspaceArchiveException(ERROR_PATH_CONFLICT, "Entry $entryIndex: path conflicts with an earlier entry")
    }

    private fun extract(
        input: InputStream,
        staging: File,
        limits: BunWorkspaceLimits,
        isCancelled: () -> Boolean,
    ): Extraction {
        val registry = Registry()
        val stagingRoot = staging.canonicalPath + File.separator
        val buffer = ByteArray(COPY_BUFFER_BYTES)
        var explicitDirectories = 0
        var totalBytes = 0L
        var entryIndex = 0
        val zip = ZipInputStream(input, Charsets.UTF_8)
        while (true) {
            if (isCancelled()) throw cancelled()
            val entry = try {
                zip.nextEntry
            } catch (error: ZipException) {
                throw corrupt()
            } catch (error: EOFException) {
                throw corrupt()
            } ?: break
            entryIndex++
            if (entryIndex > limits.maxEntries) {
                throw BunWorkspaceArchiveException(ERROR_TOO_MANY_ENTRIES, "Archive has more than ${limits.maxEntries} entries")
            }
            val isDirectory = entry.name.endsWith("/")
            val path = normalizeRelativePath(entry.name, entryIndex)
            val file = File(staging, path)
            if (!file.canonicalPath.startsWith(stagingRoot)) {
                throw BunWorkspaceArchiveException(ERROR_INVALID_ENTRY_PATH, "Entry $entryIndex: path escapes the workspace")
            }
            if (isDirectory) {
                registry.registerDirectory(path, entryIndex)
                if (readBounded(zip, null, buffer, limits, totalBytes, isCancelled) > 0L) {
                    throw BunWorkspaceArchiveException(ERROR_INVALID_ENTRY_PATH, "Entry $entryIndex: directory entry carries data")
                }
                ensureDirectory(file)
                explicitDirectories++
            } else {
                registry.registerFile(path, entryIndex)
                ensureDirectory(requireNotNull(file.parentFile))
                totalBytes += FileOutputStream(file).use { output ->
                    readBounded(zip, output, buffer, limits, totalBytes, isCancelled)
                }
            }
            try {
                zip.closeEntry()
            } catch (error: ZipException) {
                throw corrupt()
            } catch (error: EOFException) {
                throw corrupt()
            }
        }
        if (entryIndex == 0) throw BunWorkspaceArchiveException(ERROR_EMPTY_ARCHIVE, "Archive contains no entries")
        return Extraction(registry.files, explicitDirectories, totalBytes)
    }

    /** Copies one entry into [output] (or discards it when null) and returns its byte count. */
    private fun readBounded(
        zip: ZipInputStream,
        output: FileOutputStream?,
        buffer: ByteArray,
        limits: BunWorkspaceLimits,
        totalBefore: Long,
        isCancelled: () -> Boolean,
    ): Long {
        var entryBytes = 0L
        while (true) {
            val count = try {
                zip.read(buffer)
            } catch (error: ZipException) {
                throw corrupt()
            } catch (error: EOFException) {
                throw corrupt()
            }
            if (count < 0) return entryBytes
            entryBytes += count
            if (entryBytes > limits.maxEntryBytes) {
                throw BunWorkspaceArchiveException(ERROR_ENTRY_TOO_LARGE, "An entry exceeds ${limits.maxEntryBytes} bytes")
            }
            if (totalBefore + entryBytes > limits.maxTotalBytes) {
                throw BunWorkspaceArchiveException(ERROR_ARCHIVE_TOO_LARGE, "Archive exceeds ${limits.maxTotalBytes} bytes")
            }
            output?.write(buffer, 0, count)
            if (isCancelled()) throw cancelled()
        }
    }

    private fun ensureDirectory(directory: File) {
        if (directory.isDirectory) return
        if (!directory.mkdirs() && !directory.isDirectory) throw IOException("Unable to create a workspace directory")
    }

    private fun corrupt() = BunWorkspaceArchiveException(ERROR_CORRUPT_ARCHIVE, "Archive is truncated or malformed")

    private fun cancelled() = BunWorkspaceArchiveException(ERROR_CANCELLED, "Workspace expansion was cancelled")
}
