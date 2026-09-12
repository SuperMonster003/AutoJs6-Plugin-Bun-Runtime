enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

rootProject.name = "autojs6-plugin-bun-runtime"

pluginManagement {
    providers.gradleProperty("autojs.buildPlugins.includeBuild").orNull?.let { includeBuild(it) }
    repositories {
        gradlePluginPortal()
        mavenCentral()
        google()
    }
    plugins {
        id("io.github.supermonster003.autojs6-platform-versions") version "1.7.4"
        id("io.github.supermonster003.autojs6-native-alignment") version "1.8.0"
        id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
    }
}

plugins {
    id("io.github.supermonster003.autojs6-platform-versions")
    id("org.gradle.toolchains.foojay-resolver-convention")
}

includeBuild("build-logic")
include(":app")
// Opt-in, test-only packaging of the real plugin implementation. Never a Release.
if (providers.gradleProperty("experimentalRuntimeDirectory").isPresent) {
    include(":experimental-binder")
    project(":experimental-binder").projectDir = file("tools/bun-runtime/experimental/api28/binder")
}
