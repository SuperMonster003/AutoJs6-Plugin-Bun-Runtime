package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class BunHostInfoSnapshotTest {
    private val host = BunHostFacts(
        packageName = "org.autojs.autojs6",
        versionName = "6.8.0",
        versionCode = 5280L,
        versionDate = "Sep 15, 2026",
        languageTag = "zh-Hans-CN",
    )
    private val plugin = BunPluginFacts(
        packageName = "io.github.supermonster003.autojs6.plugin.bun.runtime",
        versionName = "0.2.3",
        versionCode = 8L,
        runtimeVersion = "1.4.0",
        runtimeRevision = "1.4.0+34cbb9a40",
        runtimeAbi = "arm64-v8a",
    )
    private val execution = BunExecutionFacts(
        executionId = "bun-engine-0-abc",
        sourceName = "main.ts",
        workspaceArchive = true,
    )

    @Test
    fun rendersAFixedSingleLineLayout() {
        val expected = "{\"hostInfoVersion\":1," +
            "\"host\":{\"packageName\":\"org.autojs.autojs6\",\"versionName\":\"6.8.0\",\"versionCode\":5280," +
            "\"versionDate\":\"Sep 15, 2026\",\"languageTag\":\"zh-Hans-CN\"}," +
            "\"plugin\":{\"packageName\":\"io.github.supermonster003.autojs6.plugin.bun.runtime\",\"versionName\":\"0.2.3\"," +
            "\"versionCode\":8,\"runtimeVersion\":\"1.4.0\",\"runtimeRevision\":\"1.4.0+34cbb9a40\",\"runtimeAbi\":\"arm64-v8a\"}," +
            "\"execution\":{\"executionId\":\"bun-engine-0-abc\",\"sourceName\":\"main.ts\",\"workspaceArchive\":true}}"
        assertEquals(expected, BunHostInfoSnapshot.render(host, plugin, execution))
        assertEquals(BunRuntimeContract.HOST_INFO_VERSION, 1)
    }

    @Test
    fun omitsAbsentAdvisoryFields() {
        val rendered = BunHostInfoSnapshot.render(host.copy(versionDate = null, languageTag = null), plugin, execution.copy(workspaceArchive = false))
        assertTrue(rendered.contains("\"versionCode\":5280},\"plugin\""))
        assertTrue(rendered.endsWith("\"workspaceArchive\":false}}"))
        assertTrue("versionDate" !in rendered && "languageTag" !in rendered)
    }

    @Test
    fun escapesEveryJsonSensitiveCharacter() {
        assertEquals("\"plain\"", BunHostInfoSnapshot.quote("plain"))
        assertEquals("\"a\\\"b\\\\c\"", BunHostInfoSnapshot.quote("a\"b\\c"))
        assertEquals("\"\\n\\r\\t\\b\\f\"", BunHostInfoSnapshot.quote("\n\r\t\b\u000C"))
        assertEquals("\"\\u0000\\u001f\\u007f\\u2028\\u2029\"", BunHostInfoSnapshot.quote("\u0000\u001F\u007F\u2028\u2029"))
        assertEquals("\"项目 émoji 🙂 /path\"", BunHostInfoSnapshot.quote("项目 émoji 🙂 /path"))

        val rendered = BunHostInfoSnapshot.render(host, plugin, execution.copy(sourceName = "we\"ird\\name\n.ts"))
        assertTrue(rendered.contains("\"sourceName\":\"we\\\"ird\\\\name\\n.ts\""))
        assertTrue('\n' !in rendered)
    }

    @Test
    fun boundsTheRenderedDocument() {
        val large = execution.copy(sourceName = "s".repeat(BunRuntimeContract.MAX_HOST_INFO_BYTES))
        try {
            BunHostInfoSnapshot.render(host, plugin, large)
            fail("Oversized snapshot must be rejected")
        } catch (expected: IllegalArgumentException) {
            assertEquals("Host info snapshot is too large", expected.message)
        }
        // The largest inputs the parser lets through still fit comfortably.
        val maxima = BunHostInfoSnapshot.render(
            host.copy(
                packageName = "org." + "p".repeat(BunRuntimeContract.MAX_HOST_INFO_VALUE_BYTES - 4),
                versionDate = "d".repeat(BunRuntimeContract.MAX_HOST_INFO_VALUE_BYTES),
                languageTag = "l".repeat(BunRuntimeContract.MAX_HOST_INFO_VALUE_BYTES),
            ),
            plugin,
            execution.copy(executionId = "e".repeat(128), sourceName = "n".repeat(BunRuntimeContract.MAX_SOURCE_NAME_BYTES)),
        )
        assertTrue(maxima.toByteArray(Charsets.UTF_8).size <= BunRuntimeContract.MAX_HOST_INFO_BYTES)
    }
}
