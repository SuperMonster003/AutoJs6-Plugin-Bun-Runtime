package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.fail
import org.junit.Test

class BunWorkspaceRequestTest {
    @Test
    fun acceptsTheCurrentArchiveVersionAndClampsLimits() {
        val request = BunExecutionRequestParser.parseWorkspace(
            version = BunRuntimeContract.WORKSPACE_ARCHIVE_VERSION,
            entryPoint = "src/Main.bun.TS",
            maxEntries = 0,
            maxBytes = -1L,
        )
        assertEquals("src/Main.bun.TS", request.entryPoint)
        assertEquals(BunWorkspaceLimits(), request.limits)

        val tightened = BunExecutionRequestParser.parseWorkspace(
            version = BunRuntimeContract.WORKSPACE_ARCHIVE_VERSION,
            entryPoint = "main.js",
            maxEntries = 12,
            maxBytes = 4_096L,
        )
        assertEquals(12, tightened.limits.maxEntries)
        assertEquals(4_096L, tightened.limits.maxTotalBytes)
        assertEquals(BunWorkspaceArchive.HARD_MAX_ENTRY_BYTES, tightened.limits.maxEntryBytes)

        val oversized = BunExecutionRequestParser.parseWorkspace(
            version = BunRuntimeContract.WORKSPACE_ARCHIVE_VERSION,
            entryPoint = "main.js",
            maxEntries = Int.MAX_VALUE,
            maxBytes = Long.MAX_VALUE,
        )
        assertEquals(BunRuntimeContract.MAX_WORKSPACE_ENTRIES, oversized.limits.maxEntries)
        assertEquals(BunRuntimeContract.MAX_WORKSPACE_BYTES, oversized.limits.maxTotalBytes)
    }

    @Test
    fun hardCapsMatchTheSharedContract() {
        assertEquals(BunRuntimeContract.MAX_WORKSPACE_ENTRIES, BunWorkspaceArchive.HARD_MAX_ENTRIES)
        assertEquals(BunRuntimeContract.MAX_WORKSPACE_BYTES, BunWorkspaceArchive.HARD_MAX_TOTAL_BYTES)
        assertEquals(BunRuntimeContract.MAX_SOURCE_BYTES, BunWorkspaceArchive.HARD_MAX_ENTRY_BYTES)
        assertEquals(BunRuntimeContract.MAX_SOURCE_NAME_BYTES, BunWorkspaceArchive.MAX_PATH_BYTES)
    }

    @Test
    fun rejectsUnknownVersionsAndInvalidEntryPoints() {
        assertRejected("Unsupported workspace archive version") {
            BunExecutionRequestParser.parseWorkspace(BunRuntimeContract.WORKSPACE_ARCHIVE_VERSION + 1, "main.js", 0, 0L)
        }
        assertRejected("Unsupported workspace archive version") {
            BunExecutionRequestParser.parseWorkspace(-1, "main.js", 0, 0L)
        }
        assertRejected("Workspace entry point is missing") {
            BunExecutionRequestParser.parseWorkspace(BunRuntimeContract.WORKSPACE_ARCHIVE_VERSION, null, 0, 0L)
        }
        assertRejected("Workspace entry point is missing") {
            BunExecutionRequestParser.parseWorkspace(BunRuntimeContract.WORKSPACE_ARCHIVE_VERSION, "   ", 0, 0L)
        }
        assertRejected("Workspace entry point is too long") {
            BunExecutionRequestParser.parseWorkspace(
                BunRuntimeContract.WORKSPACE_ARCHIVE_VERSION,
                "a".repeat(BunRuntimeContract.MAX_SOURCE_NAME_BYTES) + ".js",
                0,
                0L,
            )
        }
        listOf("../main.js", "/main.js", "src/", "config.json", "C:/main.js").forEach { entryPoint ->
            try {
                BunExecutionRequestParser.parseWorkspace(BunRuntimeContract.WORKSPACE_ARCHIVE_VERSION, entryPoint, 0, 0L)
                fail("Entry point '$entryPoint' must be rejected")
            } catch (expected: BunWorkspaceArchiveException) {
                assertEquals(BunWorkspaceArchive.ERROR_ENTRY_POINT_INVALID, expected.code)
            }
        }
    }

    private fun assertRejected(message: String, block: () -> Unit) {
        try {
            block()
            fail("Expected rejection: $message")
        } catch (expected: IllegalArgumentException) {
            assertFalse(expected is BunWorkspaceArchiveException)
            assertEquals(message, expected.message)
        }
    }
}
