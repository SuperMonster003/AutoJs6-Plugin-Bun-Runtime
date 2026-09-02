package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BunExecutionRequestParserTest {
    @Test
    fun sourceNameIsReducedToAControlledWorkspaceLeaf() {
        assertEquals("entry.bun.ts", BunExecutionRequestParser.safeFileName("../../project/entry.bun.ts"))
        assertEquals("bad_name_.js", BunExecutionRequestParser.safeFileName("bad name?.js"))
        assertEquals("script.js", BunExecutionRequestParser.safeFileName("///"))
        assertEquals("script.js", BunExecutionRequestParser.safeFileName("."))
        assertEquals("script.js", BunExecutionRequestParser.safeFileName(".."))
        assertEquals("plain.js", BunExecutionRequestParser.safeFileName("plain"))
        val unicode = BunExecutionRequestParser.safeFileName("脚本".repeat(256) + ".bun.tsx")
        assertTrue(unicode.endsWith(".bun.tsx"))
        assertTrue(unicode.toByteArray(Charsets.UTF_8).size <= 240)
    }

    @Test
    fun publishedAbiSetMatchesOfficialAndroidArtifacts() {
        assertEquals(setOf("arm64-v8a", "x86_64"), DISTRIBUTED_ABIS.toSet())
        assertFalse("armeabi-v7a" in DISTRIBUTED_ABIS)
        assertTrue(INSTRUCTION_REFERENCE.startsWith("@raw/"))
    }

    @Test
    fun installedRuntimeAbiIsIdentifiedByItsLockedDigest() {
        assertEquals(
            "arm64-v8a",
            lockedRuntimeAbiForSha256(BuildConfig.BUN_RUNTIME_ARM64_V8A_SHA256),
        )
        assertEquals(
            "x86_64",
            lockedRuntimeAbiForSha256(BuildConfig.BUN_RUNTIME_X86_64_SHA256),
        )
        assertEquals(null, lockedRuntimeAbiForSha256("0".repeat(64)))
    }
}
