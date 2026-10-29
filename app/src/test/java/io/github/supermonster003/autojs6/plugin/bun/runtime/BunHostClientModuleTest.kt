package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import java.nio.file.Files

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
    fun deviceInfoCarriesThePositiveDisplaySizeForSetScreenMetrics() {
        assertEquals(
            "{\"sdkInt\":35,\"density\":2.0,\"densityDpi\":320,\"scaledDensity\":2.0,\"width\":1080,\"height\":2400,\"externalStoragePath\":\"/storage/emulated/0\"}",
            BunHostClientModule.deviceInfo(35, 2f, 320, 2f, "/storage/emulated/0", 1080, 2400),
        )
        assertEquals(
            "{\"sdkInt\":35,\"density\":2.0,\"densityDpi\":320,\"scaledDensity\":2.0}",
            BunHostClientModule.deviceInfo(35, 2f, 320, 2f, null, 1080, 0),
        )
    }

    @Test
    fun invalidDensitiesFallBackToOne() {
        assertEquals(
            "{\"sdkInt\":33,\"density\":1.0,\"densityDpi\":0,\"scaledDensity\":1.0}",
            BunHostClientModule.deviceInfo(33, Float.NaN, -1, 0f),
        )
    }

    @Test
    fun materializeCopiesTheClientAndTheGlobalLibrariesNextToIt() {
        val assets = mapOf(
            "autojs6/host-client.mjs" to "export {};",
            "autojs6/libraries/dayjs.min.js" to "dayjs",
            "autojs6/libraries/pangu.min.js" to "pangu",
        )
        val workspace = Files.createTempDirectory("bun-host-client").toFile()
        try {
            val client = BunHostClientModule.materialize(
                workspace,
                "{}",
                { path -> if (path == "autojs6/libraries") arrayOf("dayjs.min.js", "pangu.min.js") else null },
                { path -> assets.getValue(path).byteInputStream() },
            )
            assertEquals(File(workspace, "autojs6/host-client.mjs"), client)
            assertEquals("export {};", client.readText())
            assertEquals("{}", File(workspace, "autojs6/device-info.json").readText())
            assertEquals(listOf("dayjs.min.js", "pangu.min.js"), File(workspace, "autojs6/libraries").list()!!.sorted())
            assertEquals("pangu", File(workspace, "autojs6/libraries/pangu.min.js").readText())
        } finally {
            workspace.deleteRecursively()
        }
    }
}
