package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.res.AssetManager
import java.io.File
import java.io.InputStream

/** Explicitly imported SDK, scoped to the execution and removed with its workspace. */
internal object BunHostClientModule {
    const val ENVIRONMENT_VARIABLE = "AUTOJS6_HOST_CLIENT_MODULE"
    private const val DIRECTORY = "autojs6"
    private const val FILE_NAME = "host-client.mjs"
    private const val DEVICE_INFO_FILE_NAME = "device-info.json"
    private const val LIBRARIES_DIRECTORY = "libraries"

    /**
     * Copies the client and the Rhino global libraries it compiles on first use (dayjs, pangu, cheerio, banana-i18n;
     * AutoJs6 api-coverage Q61 / Q64) and writes [deviceInfo] (see [deviceInfo]) next to it, where the client reads it.
     */
    fun materialize(assets: AssetManager, workspace: File, deviceInfo: String): File =
        materialize(workspace, deviceInfo, { path -> assets.list(path) }, { path -> assets.open(path) })

    /** [materialize] over plain asset functions, for the JVM tests. */
    internal fun materialize(workspace: File, deviceInfo: String, list: (String) -> Array<String>?, open: (String) -> InputStream): File {
        val directory = File(workspace, DIRECTORY)
        check(directory.isDirectory || directory.mkdir()) { "Unable to create the host client directory" }
        File(directory, DEVICE_INFO_FILE_NAME).writeText(deviceInfo, Charsets.UTF_8)
        val libraries = File(directory, LIBRARIES_DIRECTORY)
        list("$DIRECTORY/$LIBRARIES_DIRECTORY").orEmpty().forEach { name ->
            check(libraries.isDirectory || libraries.mkdir()) { "Unable to create the host client library directory" }
            open("$DIRECTORY/$LIBRARIES_DIRECTORY/$name").use { source ->
                File(libraries, name).outputStream().use { target -> source.copyTo(target) }
            }
        }
        return File(directory, FILE_NAME).also { destination ->
            open("$DIRECTORY/$FILE_NAME").use { source ->
                destination.outputStream().use { target -> source.copyTo(target) }
            }
        }
    }

    /**
     * The display metrics and SDK level of this device for the client's local util module (util.dpToPx / spToPx /
     * pxToDp / pxToSp convert with them as the host's DisplayUtils does, util.version.sdkInt), the values the Node
     * runtime injects as its device-info module. A density that is not a positive finite number falls back to 1.
     * [externalStoragePath] is files.sdcardPath (the shared external storage of this Android user, the host's as well).
     */
    fun deviceInfo(sdkInt: Int, density: Float, densityDpi: Int, scaledDensity: Float, externalStoragePath: String? = null): String {
        val dp = if (density.isFinite() && density > 0f) density else 1f
        val sp = if (scaledDensity.isFinite() && scaledDensity > 0f) scaledDensity else dp
        val storage = externalStoragePath?.let { path ->
            val quoted = path.map { c -> if (c == '"' || c == '\\') "\\$c" else if (c < ' ') "\\u%04x".format(c.code) else c.toString() }
            ",\"externalStoragePath\":\"" + quoted.joinToString("") + "\""
        }.orEmpty()
        return "{\"sdkInt\":$sdkInt,\"density\":${dp.toDouble()},\"densityDpi\":${densityDpi.coerceAtLeast(0)},\"scaledDensity\":${sp.toDouble()}$storage}"
    }
}
