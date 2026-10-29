package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.res.AssetManager
import java.io.File

/** Explicitly imported SDK, scoped to the execution and removed with its workspace. */
internal object BunHostClientModule {
    const val ENVIRONMENT_VARIABLE = "AUTOJS6_HOST_CLIENT_MODULE"
    private const val DIRECTORY = "autojs6"
    private const val FILE_NAME = "host-client.mjs"
    private const val DEVICE_INFO_FILE_NAME = "device-info.json"

    /** Copies the client and writes [deviceInfo] (see [deviceInfo]) next to it, where the client reads it. */
    fun materialize(assets: AssetManager, workspace: File, deviceInfo: String): File {
        val directory = File(workspace, DIRECTORY)
        check(directory.isDirectory || directory.mkdir()) { "Unable to create the host client directory" }
        File(directory, DEVICE_INFO_FILE_NAME).writeText(deviceInfo, Charsets.UTF_8)
        return File(directory, FILE_NAME).also { destination ->
            assets.open("$DIRECTORY/$FILE_NAME").use { source ->
                destination.outputStream().use { target -> source.copyTo(target) }
            }
        }
    }

    /**
     * The display metrics and SDK level of this device for the client's local util module (util.dpToPx / spToPx /
     * pxToDp / pxToSp convert with them as the host's DisplayUtils does, util.version.sdkInt), the values the Node
     * runtime injects as its device-info module. A density that is not a positive finite number falls back to 1.
     */
    fun deviceInfo(sdkInt: Int, density: Float, densityDpi: Int, scaledDensity: Float): String {
        val dp = if (density.isFinite() && density > 0f) density else 1f
        val sp = if (scaledDensity.isFinite() && scaledDensity > 0f) scaledDensity else dp
        return "{\"sdkInt\":$sdkInt,\"density\":${dp.toDouble()},\"densityDpi\":${densityDpi.coerceAtLeast(0)},\"scaledDensity\":${sp.toDouble()}}"
    }
}
