package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunPluginIds
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class BunRuntimeBuildIdentityTest {
    @Test
    fun productionBuildStillUsesTheExactSharedContractIdentity() {
        assertEquals(BunRuntimeContract.RUNTIME_VERSION, BuildConfig.BUN_RUNTIME_VERSION)
        assertEquals(BunRuntimeContract.RUNTIME_REVISION, BuildConfig.BUN_RUNTIME_REVISION)
        assertEquals(BunPluginIds.VARIANT_BUN_1_4_0_ANDROID, BuildConfig.BUN_RUNTIME_VARIANT)
        assertEquals(33, BuildConfig.BUN_MIN_API)
        assertFalse(BuildConfig.BUN_EXPERIMENTAL)
        assertEquals(4096L, BuildConfig.BUN_X86_MAX_PAGE_SIZE_BYTES)
    }
}
