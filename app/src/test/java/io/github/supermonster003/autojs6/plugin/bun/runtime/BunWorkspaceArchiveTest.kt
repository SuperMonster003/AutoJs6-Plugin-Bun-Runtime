package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.util.Random
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class BunWorkspaceArchiveTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    @Test
    fun expandsNestedProjectWithUnicodePathsAndExplicitDirectories() {
        val main = text("import { greet } from './lib/util.ts'; console.log(greet('世界'));")
        val util = text("export const greet = (name: string) => `hi \${name}`;")
        val data = text("{\"ok\":true}")
        val readme = text("# demo")
        val archive = zip(
            "src/main.ts" to main,
            "src/lib/util.ts" to util,
            "data/数据.json" to data,
            "assets/empty/" to null,
            "README.md" to readme,
        )
        val workspace = workspace()

        val expanded = BunWorkspaceArchive.expand(ByteArrayInputStream(archive), workspace, "src/main.ts")

        assertEquals(File(workspace, BunWorkspaceArchive.PROJECT_DIRECTORY_NAME), expanded.root)
        assertEquals("src/main.ts", expanded.entryPath)
        assertEquals(File(expanded.root, "src/main.ts"), expanded.entryFile)
        assertTrue(expanded.entryFile.isFile)
        assertEquals(4, expanded.fileCount)
        assertEquals(1, expanded.directoryCount)
        assertEquals((main.size + util.size + data.size + readme.size).toLong(), expanded.totalBytes)
        assertEquals("{\"ok\":true}", File(expanded.root, "data/数据.json").readText())
        assertEquals(String(util), File(expanded.root, "src/lib/util.ts").readText())
        assertTrue(File(expanded.root, "assets/empty").isDirectory)
        assertFalse(File(workspace, BunWorkspaceArchive.STAGING_DIRECTORY_NAME).exists())
        assertEquals(listOf(BunWorkspaceArchive.PROJECT_DIRECTORY_NAME), workspace.list().orEmpty().toList())
        Files.walk(expanded.root.toPath()).use { stream ->
            stream.iterator().asSequence().forEach { path ->
                assertFalse("$path must not be a symlink", Files.isSymbolicLink(path))
                assertTrue("$path must be a regular file or directory", Files.isRegularFile(path) || Files.isDirectory(path))
            }
        }
    }

    @Test
    fun implicitDirectoriesMayLaterAppearAsExplicitEntries() {
        val archive = zip("lib/a.js" to text("export default 1;"), "lib/" to null, "main.js" to text("import './lib/a.js';"))

        val expanded = BunWorkspaceArchive.expand(ByteArrayInputStream(archive), workspace(), "main.js")

        assertEquals(2, expanded.fileCount)
        assertEquals(1, expanded.directoryCount)
        assertTrue(File(expanded.root, "lib/a.js").isFile)
    }

    @Test
    fun rejectsUnsafeEntryPaths() {
        val unsafe = listOf(
            "",
            "../escape.js",
            "a/../../escape.js",
            "/abs.js",
            "a\\b.js",
            "C:/x.js",
            "a//b.js",
            "./a.js",
            "a/./b.js",
            "a\u0000b.js",
            "a\nb.js",
            "a\u007fb.js",
            "a/".repeat(BunWorkspaceArchive.MAX_PATH_DEPTH) + "x.js",
            "x".repeat(BunWorkspaceArchive.MAX_SEGMENT_BYTES + 1) + ".js",
            ("a".repeat(250) + "/").repeat(5) + "x.js",
        )
        assertTrue(unsafe.last().toByteArray(Charsets.UTF_8).size > BunWorkspaceArchive.MAX_PATH_BYTES)
        unsafe.forEach { name ->
            val error = expectFailure(zip("main.js" to text("1"), name to text("2")))
            assertEquals("path '$name' must be rejected", BunWorkspaceArchive.ERROR_INVALID_ENTRY_PATH, error.code)
            assertTrue(error.message.orEmpty().startsWith("Entry 2:"))
            assertFalse("messages never echo entry names", error.message.orEmpty().contains("escape"))
        }
        val directoryWithData = expectFailure(zip("main.js" to text("1"), "dir/" to text("payload")))
        assertEquals(BunWorkspaceArchive.ERROR_INVALID_ENTRY_PATH, directoryWithData.code)
    }

    @Test
    fun acceptsDeepAndLongButBoundedPaths() {
        val deepest = "a/".repeat(BunWorkspaceArchive.MAX_PATH_DEPTH - 1) + "x.js"
        val longestSegment = "x".repeat(BunWorkspaceArchive.MAX_SEGMENT_BYTES - 3) + ".js"
        val archive = zip("main.js" to text("1"), deepest to text("2"), longestSegment to text("3"))

        val expanded = BunWorkspaceArchive.expand(ByteArrayInputStream(archive), workspace(), "main.js")

        assertEquals(3, expanded.fileCount)
        assertTrue(File(expanded.root, deepest).isFile)
    }

    @Test
    fun rejectsDuplicatesAcrossCaseAndUnicodeForms() {
        // ZipOutputStream refuses identical names itself, so splice two archives' local records together.
        val exact = expectFailure(concatenateLocalRecords(zip("main.js" to text("1")), zip("main.js" to text("2"))))
        assertEquals(BunWorkspaceArchive.ERROR_DUPLICATE_ENTRY, exact.code)
        assertTrue(exact.message.orEmpty().startsWith("Entry 2:"))

        val caseOnly = expectFailure(zip("Main.js" to text("1"), "main.js" to text("2")))
        assertEquals(BunWorkspaceArchive.ERROR_DUPLICATE_ENTRY, caseOnly.code)

        val unicodeForms = expectFailure(zip("main.js" to text("0"), "caf\u00e9.js" to text("1"), "cafe\u0301.js" to text("2")))
        assertEquals(BunWorkspaceArchive.ERROR_DUPLICATE_ENTRY, unicodeForms.code)
        assertTrue(unicodeForms.message.orEmpty().startsWith("Entry 3:"))

        val directories = expectFailure(zip("main.js" to text("0"), "lib/" to null, "LIB/" to null))
        assertEquals(BunWorkspaceArchive.ERROR_DUPLICATE_ENTRY, directories.code)
    }

    @Test
    fun rejectsFileAndDirectoryConflicts() {
        listOf(
            zip("main.js" to text("0"), "lib" to text("file"), "lib/a.js" to text("1")),
            zip("main.js" to text("0"), "lib/a.js" to text("1"), "lib" to text("file")),
            zip("main.js" to text("0"), "lib/" to null, "lib" to text("file")),
            zip("main.js" to text("0"), "LIB/x.js" to text("1"), "lib" to text("file")),
            zip("main.js" to text("0"), "a/b" to text("file"), "A/B/c.js" to text("1")),
        ).forEachIndexed { index, archive ->
            val error = expectFailure(archive)
            assertEquals("archive $index must conflict", BunWorkspaceArchive.ERROR_PATH_CONFLICT, error.code)
        }
    }

    @Test
    fun enforcesEntryCountAndByteLimits() {
        val tooMany = expectFailure(
            zip("main.js" to text("1"), "b.js" to text("2"), "c.js" to text("3")),
            limits = BunWorkspaceLimits(maxEntries = 2),
        )
        assertEquals(BunWorkspaceArchive.ERROR_TOO_MANY_ENTRIES, tooMany.code)

        val tooLarge = expectFailure(
            zip("main.js" to text("123456"), "b.js" to text("123456")),
            limits = BunWorkspaceLimits(maxTotalBytes = 10),
        )
        assertEquals(BunWorkspaceArchive.ERROR_ARCHIVE_TOO_LARGE, tooLarge.code)

        val entryTooLarge = expectFailure(
            zip("main.js" to text("12345")),
            limits = BunWorkspaceLimits(maxEntryBytes = 4),
        )
        assertEquals(BunWorkspaceArchive.ERROR_ENTRY_TOO_LARGE, entryTooLarge.code)

        val exactlyAtLimit = BunWorkspaceArchive.expand(
            ByteArrayInputStream(zip("main.js" to text("12345"), "b.js" to text("12345"))),
            workspace(),
            "main.js",
            BunWorkspaceLimits(maxEntries = 2, maxTotalBytes = 10, maxEntryBytes = 5),
        )
        assertEquals(10L, exactlyAtLimit.totalBytes)
    }

    @Test
    fun clampsRequestedLimitsIntoHardCaps() {
        val defaults = BunWorkspaceLimits.clamped(maxEntries = 1_000_000, maxTotalBytes = -1L, maxEntryBytes = null)
        assertEquals(BunWorkspaceLimits(), defaults)
        assertEquals(BunWorkspaceArchive.HARD_MAX_ENTRIES, defaults.maxEntries)
        assertEquals(BunWorkspaceArchive.HARD_MAX_TOTAL_BYTES, defaults.maxTotalBytes)
        assertEquals(BunWorkspaceArchive.HARD_MAX_ENTRY_BYTES, defaults.maxEntryBytes)

        val tightened = BunWorkspaceLimits.clamped(maxEntries = 5, maxTotalBytes = 1_024L, maxEntryBytes = 512L)
        assertEquals(BunWorkspaceLimits(5, 1_024L, 512L), tightened)

        listOf(
            { BunWorkspaceLimits(maxEntries = 0) },
            { BunWorkspaceLimits(maxTotalBytes = 0L) },
            { BunWorkspaceLimits(maxEntryBytes = BunWorkspaceArchive.HARD_MAX_ENTRY_BYTES + 1) },
        ).forEach { construct ->
            try {
                construct()
                fail("Out-of-range limits must be rejected")
            } catch (expected: IllegalArgumentException) {
                assertFalse(expected is BunWorkspaceArchiveException)
            }
        }
    }

    @Test
    fun validatesEntryPoint() {
        val missing = expectFailure(zip("main.js" to text("1")), entryPoint = "other.js")
        assertEquals(BunWorkspaceArchive.ERROR_ENTRY_POINT_MISSING, missing.code)

        listOf("src/", "src", "config.json", "../main.js", ".js", "", "/main.js").forEach { entryPoint ->
            val error = expectFailure(zip("src/" to null, "main.js" to text("1"), "config.json" to text("{}")), entryPoint = entryPoint)
            assertEquals("entry point '$entryPoint' must be invalid", BunWorkspaceArchive.ERROR_ENTRY_POINT_INVALID, error.code)
        }

        assertEquals("Src/Main.TS", BunWorkspaceArchive.normalizeEntryPoint("Src/Main.TS"))
        assertEquals("app.bun.tsx", BunWorkspaceArchive.normalizeEntryPoint("app.bun.tsx"))
        BunWorkspaceArchive.ENTRY_POINT_EXTENSIONS.forEach { extension ->
            assertEquals("entry$extension", BunWorkspaceArchive.normalizeEntryPoint("entry$extension"))
        }
    }

    @Test
    fun rejectsEmptyNonArchiveAndTruncatedInput() {
        val plainSource = expectFailure(text("console.log('not a zip');"))
        assertEquals(BunWorkspaceArchive.ERROR_EMPTY_ARCHIVE, plainSource.code)

        val noEntries = expectFailure(zip())
        assertEquals(BunWorkspaceArchive.ERROR_EMPTY_ARCHIVE, noEntries.code)

        val random = ByteArray(200 * 1024).also { Random(7L).nextBytes(it) }
        val complete = zip("main.js" to text("1"), "blob.bin" to random)
        val truncated = expectFailure(complete.copyOf(complete.size / 2))
        assertEquals(BunWorkspaceArchive.ERROR_CORRUPT_ARCHIVE, truncated.code)
    }

    @Test
    fun cancellationRemovesStagingAndPublishesNothing() {
        var checks = 0
        val error = expectFailure(
            zip("main.js" to text("1"), "b.js" to text("2"), "c.js" to text("3")),
            isCancelled = { ++checks > 1 },
        )
        assertEquals(BunWorkspaceArchive.ERROR_CANCELLED, error.code)
        assertTrue(checks >= 2)
    }

    @Test
    fun refusesMissingWorkspaceOrExistingProjectState() {
        val archive = zip("main.js" to text("1"))

        val occupied = workspace()
        assertTrue(File(occupied, BunWorkspaceArchive.PROJECT_DIRECTORY_NAME).mkdir())
        try {
            BunWorkspaceArchive.expand(ByteArrayInputStream(archive), occupied, "main.js")
            fail("Existing project state must not be overwritten")
        } catch (expected: IOException) {
            assertEquals(listOf(BunWorkspaceArchive.PROJECT_DIRECTORY_NAME), occupied.list().orEmpty().toList())
        }

        val missing = File(temporaryFolder.root, "missing-workspace")
        try {
            BunWorkspaceArchive.expand(ByteArrayInputStream(archive), missing, "main.js")
            fail("A missing workspace must be rejected")
        } catch (expected: IOException) {
            assertFalse(missing.exists())
        }
    }

    private fun workspace(): File = temporaryFolder.newFolder()

    private fun text(value: String): ByteArray = value.toByteArray(Charsets.UTF_8)

    private fun zip(vararg entries: Pair<String, ByteArray?>): ByteArray {
        val bytes = ByteArrayOutputStream()
        ZipOutputStream(bytes, Charsets.UTF_8).use { output ->
            entries.forEach { (name, content) ->
                output.putNextEntry(ZipEntry(name))
                content?.let(output::write)
                output.closeEntry()
            }
        }
        return bytes.toByteArray()
    }

    /** Keeps every archive's local file records and only the last archive's central directory. */
    private fun concatenateLocalRecords(vararg archives: ByteArray): ByteArray {
        val output = ByteArrayOutputStream()
        archives.forEachIndexed { index, archive ->
            if (index == archives.lastIndex) {
                output.write(archive)
            } else {
                val endOfCentralDirectory = archive.size - 22
                assertEquals(0x50, archive[endOfCentralDirectory].toInt() and 0xff)
                assertEquals(0x4b, archive[endOfCentralDirectory + 1].toInt() and 0xff)
                assertEquals(0x05, archive[endOfCentralDirectory + 2].toInt() and 0xff)
                assertEquals(0x06, archive[endOfCentralDirectory + 3].toInt() and 0xff)
                val centralDirectoryOffset = (0 until 4).sumOf { byte ->
                    (archive[endOfCentralDirectory + 16 + byte].toInt() and 0xff) shl (8 * byte)
                }
                output.write(archive, 0, centralDirectoryOffset)
            }
        }
        return output.toByteArray()
    }

    private fun expectFailure(
        archive: ByteArray,
        entryPoint: String = "main.js",
        limits: BunWorkspaceLimits = BunWorkspaceLimits(),
        isCancelled: () -> Boolean = { false },
    ): BunWorkspaceArchiveException {
        val workspace = workspace()
        try {
            BunWorkspaceArchive.expand(ByteArrayInputStream(archive), workspace, entryPoint, limits, isCancelled)
        } catch (error: BunWorkspaceArchiveException) {
            assertEquals("workspace must be empty after a rejected archive", emptyList<String>(), workspace.list().orEmpty().toList())
            return error
        }
        fail("Expected the archive to be rejected")
        throw AssertionError("unreachable")
    }
    @Test
    fun platformPathValidatorRejectionsReportInvalidEntryPath() {
        // Android 14+ (targetSdk 34+) throws ZipException("Invalid zip entry path: <name>") from getNextEntry.
        assertEquals(
            BunWorkspaceArchive.ERROR_INVALID_ENTRY_PATH,
            BunWorkspaceArchive.classifyEntryFailure("Invalid zip entry path: ../escape.js"),
        )
        assertEquals(BunWorkspaceArchive.ERROR_INVALID_ENTRY_PATH, BunWorkspaceArchive.classifyEntryFailure("invalid ZIP entry path: /abs.js"))
        listOf(null, "", "invalid block type", "invalid entry size (expected 3 but got 5 bytes)").forEach { message ->
            assertEquals("'$message' stays corrupt", BunWorkspaceArchive.ERROR_CORRUPT_ARCHIVE, BunWorkspaceArchive.classifyEntryFailure(message))
        }
    }
}
