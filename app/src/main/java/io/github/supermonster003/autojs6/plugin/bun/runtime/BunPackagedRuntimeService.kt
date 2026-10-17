package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.autojs.plugin.bun.runtime.api.BunPluginActions

/** Explicit entry point for installed project applications; host-only components stay protected. */
class BunPackagedRuntimeService : BunRuntimeService() {
    override val callerPermission: String get() = BunPluginActions.PACKAGED_RUNTIME_PERMISSION
}
