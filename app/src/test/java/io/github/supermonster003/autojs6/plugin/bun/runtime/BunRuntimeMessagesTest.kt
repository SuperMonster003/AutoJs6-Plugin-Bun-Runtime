package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BunRuntimeMessagesTest {
    @Test
    fun truncationPreservesEveryUtf8CodePointAtEachByteBoundary() {
        val points = listOf("a", "é", "中", "😀", "z")
        val input = points.joinToString("")
        for (limit in 0..input.toByteArray(Charsets.UTF_8).size + 1) {
            var expected = ""
            for (point in points) {
                if ((expected + point).toByteArray(Charsets.UTF_8).size > limit) break
                expected += point
            }
            assertEquals("UTF-8 limit=$limit", expected, boundedTerminalMessage(input, limit))
        }
    }

    @Test
    fun terminalLimitIncludesMultibyteDiagnosticTextWithoutSplittingASurrogatePair() {
        val prefix = "a".repeat(BunRuntimeContract.MAX_TERMINAL_MESSAGE_BYTES - 1)
        assertEquals(prefix, boundedTerminalMessage(prefix + "😀"))
        val actual = boundedTerminalMessage("诊断: " + "😀".repeat(16_384))
        assertTrue(actual.toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_TERMINAL_MESSAGE_BYTES)
        assertEquals(actual, actual.toByteArray(Charsets.UTF_8).toString(Charsets.UTF_8))
    }
}
