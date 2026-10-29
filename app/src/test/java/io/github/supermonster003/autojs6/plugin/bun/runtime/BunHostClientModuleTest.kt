package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.junit.Assert.assertEquals
import org.junit.Test

class BunHostClientModuleTest {
    @Test
    fun deviceInfoKeepsTheFloatMetricsTheClientConvertsWith() {
        assertEquals(
            "{\"sdkInt\":35,\"density\":2.75,\"densityDpi\":440,\"scaledDensity\":2.200000047683716}",
            BunHostClientModule.deviceInfo(35, 2.75f, 440, 2.2f),
        )
    }

    @Test
    fun deviceInfoCarriesTheExternalStoragePathForFilesSdcardPath() {
        assertEquals(
            "{\"sdkInt\":35,\"density\":2.0,\"densityDpi\":320,\"scaledDensity\":2.0,\"externalStoragePath\":\"/storage/emulated/0\"}",
            BunHostClientModule.deviceInfo(35, 2f, 320, 2f, "/storage/emulated/0"),
        )
        // Quotes are escaped so the client always parses the file.
        assertEquals(
            "{\"sdkInt\":35,\"density\":2.0,\"densityDpi\":320,\"scaledDensity\":2.0,\"externalStoragePath\":\"/a\\\"b\"}",
            BunHostClientModule.deviceInfo(35, 2f, 320, 2f, "/a\"b"),
        )
    }

    @Test
    fun invalidDensitiesFallBackToOne() {
        assertEquals(
            "{\"sdkInt\":33,\"density\":1.0,\"densityDpi\":0,\"scaledDensity\":1.0}",
            BunHostClientModule.deviceInfo(33, Float.NaN, -1, 0f),
        )
    }
}
