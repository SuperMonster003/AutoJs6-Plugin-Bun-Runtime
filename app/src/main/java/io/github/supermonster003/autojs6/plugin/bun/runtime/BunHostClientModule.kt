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
     * [width] / [height] are the display size in pixels the Rhino Tap / Swipe coordinates scale to after SetScreenMetrics
     * (api-coverage P4.1a); they are written only when both are positive.
     * [build] holds the string fields of Rhino's device module from android.os.Build (device.brand, device.buildId and
     * so on, api-coverage P4.1c), which the client offers with the device.info grant; null values are left out.
     * [profile] holds the rest of Rhino's synchronous device and sensors members ([BunDeviceProfile]: pageSize, marketName,
     * the manufacturers / brands / roms checks and sensors), top-level members of strings, numbers, booleans and nested
     * maps; null values are left out as well.
     */
    fun deviceInfo(
        sdkInt: Int, density: Float, densityDpi: Int, scaledDensity: Float, externalStoragePath: String? = null, width: Int = 0, height: Int = 0,
        build: Map<String, String?> = emptyMap(), profile: Map<String, Any?> = emptyMap(),
    ): String {
        val dp = if (density.isFinite() && density > 0f) density else 1f
        val sp = if (scaledDensity.isFinite() && scaledDensity > 0f) scaledDensity else dp
        val storage = externalStoragePath?.let { path -> ",\"externalStoragePath\":${quote(path)}" }.orEmpty()
        val size = if (width > 0 && height > 0) ",\"width\":$width,\"height\":$height" else ""
        val fields = build.entries.filter { it.value != null }.joinToString(",") { (key, value) -> "${quote(key)}:${quote(value!!)}" }
        val buildJson = if (fields.isEmpty()) "" else ",\"build\":{$fields}"
        val profileJson = profile.entries.filter { it.value != null }.joinToString("") { (key, value) -> ",${quote(key)}:${json(value)}" }
        return "{\"sdkInt\":$sdkInt,\"density\":${dp.toDouble()},\"densityDpi\":${densityDpi.coerceAtLeast(0)},\"scaledDensity\":${sp.toDouble()}$size$storage$buildJson$profileJson}"
    }

    private fun json(value: Any?): String = when (value) {
        null -> "null"
        is String -> quote(value)
        is Boolean, is Int, is Long, is Short, is Byte -> value.toString()
        is Number -> value.toDouble().let { if (it.isFinite()) it.toString() else "null" }
        is Map<*, *> -> value.entries.joinToString(",", "{", "}") { (key, item) -> "${quote(key.toString())}:${json(item)}" }
        else -> quote(value.toString())
    }

    private fun quote(text: String): String =
        "\"" + text.map { c -> if (c == '"' || c == '\\') "\\$c" else if (c < ' ') "\\u%04x".format(c.code) else c.toString() }.joinToString("") + "\""
}
