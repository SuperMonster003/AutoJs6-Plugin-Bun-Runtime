package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.app.Service
import android.content.Intent
import android.os.IBinder
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.autojs.plugin.common.api.IPluginInfoProvider
import org.autojs.plugin.common.api.PluginInfo

class BunPluginInfoService : Service() {
    override fun onBind(intent: Intent?): IBinder = binder

    private val binder = object : IPluginInfoProvider.Stub() {
        override fun getInfo(): PluginInfo {
            enforceCallingPermission(
                BunRuntimeContract.PLUGIN_PERMISSION,
                "Bun plugin metadata requires the AutoJs6 plugin permission",
            )
            return applicationContext.bunPluginInfo()
        }
    }
}
