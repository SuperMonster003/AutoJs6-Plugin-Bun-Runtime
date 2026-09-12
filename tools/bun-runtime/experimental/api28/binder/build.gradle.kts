import groovy.json.JsonSlurper
import com.android.build.api.dsl.ApplicationExtension

plugins {
    id("io.github.supermonster003.autojs6-native-alignment")
    id("org.autojs.build.utils")
    id("org.autojs.build.versions")
    id("org.autojs.build.jvm-convention")
    id("com.android.application")
}

val implementationRoot = rootProject.file("app/src")
val jscCandidateFile = providers.gradleProperty("experimentalJscCandidateFile")
@Suppress("UNCHECKED_CAST")
val jscCandidate = if (jscCandidateFile.isPresent) JsonSlurper().parse(file("../../webkit-x86_64-16k/candidate.lock.json")) as Map<String, Any> else null
layout.buildDirectory.set(rootProject.layout.buildDirectory.dir(if (jscCandidate != null) "experimental-binder-jsc16k" else "experimental-binder"))
val evidenceFile = file("../runtime-evidence.json")
@Suppress("UNCHECKED_CAST")
val evidence = JsonSlurper().parse(evidenceFile) as Map<String, Any>
@Suppress("UNCHECKED_CAST")
val artifacts = (evidence["artifacts"] as List<Map<String, Any>>).map { artifact ->
    if (jscCandidate != null && artifact["abi"] == "x86_64") jscCandidate.getValue("artifact") as Map<String, Any> else artifact
}
@Suppress("UNCHECKED_CAST")
val identity = (evidence["identity"] as Map<String, Any>).toMutableMap().also { if (jscCandidate != null) it["variant"] = jscCandidate.getValue("variant") }
@Suppress("UNCHECKED_CAST")
val source = evidence["source"] as Map<String, Any>
@Suppress("UNCHECKED_CAST")
val supervisor = JsonSlurper().parse(rootProject.file("tools/bun-runtime/supervisor/supervisor.lock.json")) as Map<String, Any>
@Suppress("UNCHECKED_CAST")
val helpers = supervisor["artifacts"] as List<Map<String, Any>>
val runtimeInput = providers.gradleProperty("experimentalRuntimeDirectory")
val runtimeRepeat = providers.gradleProperty("experimentalRuntimeRepeatDirectory")
val runtimeOutput = layout.buildDirectory.dir("generated/runtime")
evaluationDependsOn(":app")
val hostSigning = project(":app").extensions.getByType<ApplicationExtension>().signingConfigs.findByName("release")

android {
    namespace = "io.github.supermonster003.autojs6.plugin.bun.runtime"
    compileSdk = versions.sdkVersionCompile
    defaultConfig {
        applicationId = "io.github.supermonster003.autojs6.plugin.bun.runtime.api28binder" + if (jscCandidate != null) ".jsc16k" else ""
        minSdk = 28
        targetSdk = versions.sdkVersionTarget
        versionCode = versions.appVersionCode
        versionName = "${versions.appVersionName}-api28-binder-test-only"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        manifestPlaceholders["androidTestPermissionName"] = providers.gradleProperty("androidTestPermissionName")
            .getOrElse("org.autojs.permission.PLUGIN")
        resValue("string", "app_name", "Bun Runtime")
        resValue("string", "plugin_author", "SuperMonster003")
        resValue("string", "plugin_id", "bun-runtime")
        resValue("string", "plugin_engine", "bun")
        resValue("string", "plugin_variant", identity.getValue("variant") as String)
        resValue("string", "plugin_version_date", "Sep 12, 2026")
        buildConfigField("String", "BUN_RUNTIME_VERSION", "\"1.4.0\"")
        buildConfigField("String", "BUN_RUNTIME_REVISION", "\"1.4.0+${(source.getValue("downstreamHeadCommit") as String).take(9)}\"")
        buildConfigField("String", "BUN_RUNTIME_VARIANT", "\"${identity.getValue("variant")}\"")
        buildConfigField("int", "BUN_MIN_API", "28")
        buildConfigField("boolean", "BUN_EXPERIMENTAL", "true")
        buildConfigField("long", "BUN_X86_MAX_PAGE_SIZE_BYTES", if (jscCandidate != null) "65536L" else "4096L")
        artifacts.forEach { artifact ->
            val field = (artifact.getValue("abi") as String).uppercase().replace('-', '_')
            buildConfigField("String", "BUN_RUNTIME_${field}_SHA256", "\"${artifact.getValue("sha256")}\"")
            buildConfigField("long", "BUN_RUNTIME_${field}_BYTES", "${artifact.getValue("bytes")}L")
        }
        helpers.forEach { artifact ->
            val field = (artifact.getValue("abi") as String).uppercase().replace('-', '_')
            buildConfigField("String", "BUN_SUPERVISOR_${field}_SHA256", "\"${artifact.getValue("binarySha256")}\"")
        }
    }
    sourceSets {
        getByName("main") {
            manifest.srcFile(implementationRoot.resolve("main/AndroidManifest.xml"))
            java.directories.apply { clear(); add(implementationRoot.resolve("main/java").absolutePath) }
            kotlin.directories.add(implementationRoot.resolve("main/java").absolutePath)
            res.directories.apply { clear(); add(implementationRoot.resolve("main/res").absolutePath) }
            assets.directories.apply { clear(); add(implementationRoot.resolve("main/assets").absolutePath) }
            assets.directories.add(layout.buildDirectory.dir("generated/binder-assets").get().asFile.absolutePath)
            jniLibs.directories.apply { clear(); add(runtimeOutput.get().asFile.absolutePath) }
        }
        getByName("debug").manifest.srcFile("AndroidManifest.xml")
        getByName("androidTest") {
            manifest.srcFile(implementationRoot.resolve("androidTest/AndroidManifest.xml"))
            java.directories.apply { clear(); add(implementationRoot.resolve("androidTest/java").absolutePath) }
            kotlin.directories.add(implementationRoot.resolve("androidTest/java").absolutePath)
            assets.directories.apply { clear(); add(rootProject.file("samples").absolutePath) }
        }
    }
    buildFeatures { aidl = true; resValues = true; buildConfig = true }
    val testSigning = hostSigning?.let { host -> signingConfigs.create("hostCompatibleTest") { initWith(host) } }
    buildTypes { debug { isMinifyEnabled = false; testSigning?.let { signingConfig = it } } }
    packaging.jniLibs {
        useLegacyPackaging = true
        keepDebugSymbols += "**/libbun_exec.so"
        keepDebugSymbols += "**/libbun_supervisor.so"
    }
    splits.abi {
        isEnable = true
        reset()
        if (jscCandidate != null) include("x86_64") else include("arm64-v8a", "x86_64")
        isUniversalApk = false
    }
}

// This module cannot produce a release. Existing host-compatible signing is
// needed for the real signature-permission gate; secrets remain in :app config.
androidComponents.beforeVariants(androidComponents.selector().withBuildType("release")) { it.enable = false }

dependencies {
    implementation(files(rootProject.file("libs/common-plugin-api.aar")))
    implementation(files(rootProject.file("libs/bun-runtime-api.aar")))
    implementation("org.jetbrains.kotlin:kotlin-parcelize-runtime:${System.getProperty("gradle.kotlin.version")}")
    androidTestImplementation(libs.test.ext.junit)
    androidTestImplementation(libs.test.runner)
}

val prepareRuntime = tasks.register<Exec>("prepareExperimentalRuntime") {
    dependsOn(":app:verifyApiArtifacts")
    inputs.file(evidenceFile)
    inputs.dir(runtimeInput)
    inputs.dir(runtimeRepeat)
    outputs.dir(runtimeOutput)
    outputs.dir(layout.buildDirectory.dir("generated/binder-assets"))
    // Check actual bytes on every build, including repeated source/helper gates.
    outputs.upToDateWhen { false }
    commandLine("node", file("prepare-runtime.mjs"), "--input-directory", runtimeInput.get(),
        "--repeat-directory", runtimeRepeat.get(), "--output-directory", runtimeOutput.get().asFile)
    jscCandidateFile.orNull?.let { args("--jsc-candidate-file", it) }
}
tasks.matching { it.name.startsWith("merge") && (it.name.endsWith("NativeLibs") || it.name.endsWith("JniLibFolders")) }.configureEach {
    dependsOn(prepareRuntime)
}
tasks.matching { it.name == "mergeDebugAssets" }.configureEach { dependsOn(prepareRuntime) }
tasks.matching { it.name.contains("Lint") || it.name.startsWith("lint") }.configureEach { dependsOn(prepareRuntime) }
