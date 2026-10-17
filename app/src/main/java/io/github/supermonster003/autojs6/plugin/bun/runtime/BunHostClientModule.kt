package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.res.AssetManager
import java.io.File

/** Explicitly imported SDK, scoped to the execution and removed with its workspace. */
internal object BunHostClientModule {
    const val ENVIRONMENT_VARIABLE = "AUTOJS6_HOST_CLIENT_MODULE"
    private const val DIRECTORY = "autojs6"
    private const val FILE_NAME = "host-client.mjs"

    fun materialize(assets: AssetManager, workspace: File): File {
        val directory = File(workspace, DIRECTORY)
        check(directory.isDirectory || directory.mkdir()) { "Unable to create the host client directory" }
        return File(directory, FILE_NAME).also { destination ->
            assets.open("$DIRECTORY/$FILE_NAME").use { source ->
                destination.outputStream().use { target -> source.copyTo(target) }
            }
        }
    }
}
