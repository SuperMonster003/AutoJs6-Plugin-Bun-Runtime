package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.Context
import android.os.Bundle
import org.autojs.plugin.bun.runtime.api.BunPluginIds
import org.autojs.plugin.bun.runtime.api.BunPluginCapabilityKeys
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.autojs.plugin.common.api.PluginCapabilityKeys
import org.autojs.plugin.common.api.PluginInfo
import java.util.zip.ZipFile

internal val DISTRIBUTED_ABIS = arrayOf("arm64-v8a", "x86_64")
internal const val INSTRUCTION_REFERENCE = "@raw/plugin_instruction"

internal fun Context.packagedRuntimeAbis(): Array<String> {
    val archivePaths = buildList {
        add(applicationInfo.sourceDir)
        addAll(applicationInfo.splitSourceDirs.orEmpty())
    }
    val packaged = archivePaths.flatMapTo(linkedSetOf()) { archivePath ->
        runCatching {
            ZipFile(archivePath).use { archive ->
                archive.entries().asSequence()
                    .map { it.name }
                    .mapNotNull { name ->
                        DISTRIBUTED_ABIS.firstOrNull { abi -> name == "lib/$abi/libbun_exec.so" }
                    }
                    .toList()
            }
        }.getOrDefault(emptyList())
    }
    return DISTRIBUTED_ABIS.filter(packaged::contains).toTypedArray()
}

internal fun Context.bunPluginInfo(): PluginInfo {
    val appContext = applicationContext
    val packageInfo = appContext.packageManager.getPackageInfo(appContext.packageName, 0)
    return PluginInfo().apply {
        name = getString(R.string.app_name)
        description = getString(R.string.plugin_description)
        instruction = INSTRUCTION_REFERENCE
        author = getString(R.string.plugin_author)
        collaborators = arrayOf("oven-sh/Bun contributors")
        versionName = packageInfo.versionName.orEmpty()
        versionCode = packageInfo.longVersionCode
        versionDate = getString(R.string.plugin_version_date)
        id = BunPluginIds.ID
        engine = BunPluginIds.ENGINE
        variant = BuildConfig.BUN_RUNTIME_VARIANT
        supportedAbis = appContext.packagedRuntimeAbis()
        capabilities = Bundle().apply {
            putLong(PluginCapabilityKeys.REQUIRES_HOST_VERSION, BunRuntimeContract.REQUIRES_HOST_VERSION)
            putInt(BunPluginCapabilityKeys.CONTRACT_VERSION, BunRuntimeContract.PROTOCOL_VERSION)
            putString(BunPluginCapabilityKeys.RUNTIME_VERSION, BuildConfig.BUN_RUNTIME_VERSION)
            putString(BunPluginCapabilityKeys.RUNTIME_REVISION, BuildConfig.BUN_RUNTIME_REVISION)
            putString(BunPluginCapabilityKeys.SOURCE_TRANSPORT, "parcel-file-descriptor")
            putString(BunPluginCapabilityKeys.EXECUTION_MODEL, "isolated-process-single-source")
            putBoolean(BunPluginCapabilityKeys.SUPPORTS_TYPESCRIPT, true)
            putBoolean(BunPluginCapabilityKeys.SUPPORTS_CANCELLATION, true)
            putBoolean(BunPluginCapabilityKeys.SUPPORTS_STREAMING_OUTPUT, true)
            putBoolean(BunPluginCapabilityKeys.SUPPORTS_WORKSPACE_ARCHIVE, true)
            putBoolean(BunPluginCapabilityKeys.SUPPORTS_HOST_INFO, true)
        }
    }
}
