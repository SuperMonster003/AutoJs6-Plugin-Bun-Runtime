import groovy.json.JsonSlurper
import java.util.Properties

plugins {
    id("org.autojs.build.utils")
    id("org.autojs.build.versions")
    id("org.autojs.build.signs")
    id("org.autojs.build.jvm-convention")
    id("com.android.application")
}

val globalApplicationId = "io.github.supermonster003.autojs6.plugin.bun.runtime"
val pluginPermission = "org.autojs.permission.PLUGIN"
val androidTestPermissionName = providers.gradleProperty("androidTestPermissionName")
    .orElse(pluginPermission)
    .map(String::trim)
val requiredApiLevel = providers.gradleProperty("requiredApiLevel")
    .map(String::trim)
val requiredPageSizeBytes = providers.gradleProperty("requiredPageSizeBytes")
    .map(String::trim)
val instrumentationApplicationIdSuffix = providers.gradleProperty("instrumentationApplicationIdSuffix")
    .map(String::trim)
var isSignsValid = false
val bunRuntimeLockFile = rootProject.file("tools/bun-runtime/runtime.lock.json")
@Suppress("UNCHECKED_CAST")
val bunRuntimeArtifacts = ((JsonSlurper().parse(bunRuntimeLockFile) as Map<String, Any>)["artifacts"] as List<Map<String, Any>>)
    .associateBy { artifact -> artifact.getValue("abi") as String }
val bunSupervisorLockFile = rootProject.file("tools/bun-runtime/supervisor/supervisor.lock.json")
@Suppress("UNCHECKED_CAST")
val bunSupervisorArtifacts = ((JsonSlurper().parse(bunSupervisorLockFile) as Map<String, Any>)["artifacts"] as List<Map<String, Any>>)
    .associateBy { artifact -> artifact.getValue("abi") as String }

fun runtimeLockString(abi: String, key: String): String =
    bunRuntimeArtifacts.getValue(abi).getValue(key) as String

fun runtimeLockLong(abi: String, key: String): Long =
    (bunRuntimeArtifacts.getValue(abi).getValue(key) as Number).toLong()

android {
    namespace = globalApplicationId
    compileSdk = versions.sdkVersionCompile

    defaultConfig {
        applicationId = globalApplicationId
        minSdk = versions.sdkVersionMin
        targetSdk = versions.sdkVersionTarget
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        manifestPlaceholders["androidTestPermissionName"] = androidTestPermissionName.get().also { permissionName ->
            require(permissionName.matches(Regex("[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+"))) {
                "androidTestPermissionName must be a fully-qualified Android permission name, but was '$permissionName'"
            }
        }
        requiredApiLevel.orNull?.let { apiLevel ->
            require(apiLevel.toIntOrNull() != null) {
                "requiredApiLevel must be an integer, but was '$apiLevel'"
            }
            testInstrumentationRunnerArguments["requiredApiLevel"] = apiLevel
        }
        requiredPageSizeBytes.orNull?.let { pageSizeBytes ->
            val pageSize = pageSizeBytes.toIntOrNull()
            require(pageSize != null && pageSize > 0 && (pageSize and (pageSize - 1)) == 0) {
                "requiredPageSizeBytes must be a positive power of two, but was '$pageSizeBytes'"
            }
            testInstrumentationRunnerArguments["requiredPageSizeBytes"] = pageSizeBytes
        }
        versionCode = versions.appVersionCode
        versionName = versions.appVersionName
        bunSupervisorArtifacts.forEach { (abi, artifact) ->
            buildConfigField("String", "BUN_SUPERVISOR_${abi.uppercase().replace('-', '_')}_SHA256",
                "\"${artifact.getValue("binarySha256")}\"")
        }

        resValue("string", "app_name", "Bun Runtime")
        resValue("string", "plugin_author", "SuperMonster003")
        resValue("string", "plugin_id", "bun-runtime")
        resValue("string", "plugin_engine", "bun")
        resValue("string", "plugin_variant", "bun-1.4.0-android")
        resValue("string", "plugin_version_date", utils.getDateString("MMM d, yyyy", "GMT+08:00"))
        buildConfigField(
            "String",
            "BUN_RUNTIME_ARM64_V8A_SHA256",
            "\"${runtimeLockString("arm64-v8a", "binarySha256")}\"",
        )
        buildConfigField(
            "long",
            "BUN_RUNTIME_ARM64_V8A_BYTES",
            "${runtimeLockLong("arm64-v8a", "binaryBytes")}L",
        )
        buildConfigField(
            "String",
            "BUN_RUNTIME_X86_64_SHA256",
            "\"${runtimeLockString("x86_64", "binarySha256")}\"",
        )
        buildConfigField(
            "long",
            "BUN_RUNTIME_X86_64_BYTES",
            "${runtimeLockLong("x86_64", "binaryBytes")}L",
        )
    }

    signingConfigs {
        val props = Properties().also { properties ->
            File("${project.rootDir}/sign.properties").takeIf(File::exists)?.let { file ->
                file.inputStream().use(properties::load)
                isSignsValid = properties.isNotEmpty()
            }
        }
        if (isSignsValid) {
            create("release") {
                storeFile = props["storeFile"]?.let { file(it as String) }
                keyPassword = props["keyPassword"] as String
                keyAlias = props["keyAlias"] as String
                storePassword = props["storePassword"] as String
            }
        }
    }

    buildTypes {
        val releaseSigning = takeIf { isSignsValid }?.let { signingConfigs.getByName("release") }
        debug {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            instrumentationApplicationIdSuffix.orNull?.let { suffix ->
                require(suffix.matches(Regex("\\.[a-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)*"))) {
                    "instrumentationApplicationIdSuffix must be a dot-prefixed Android package suffix, but was '$suffix'"
                }
                applicationIdSuffix = suffix
            }
            releaseSigning?.let { signingConfig = it }
        }
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            releaseSigning?.let { signingConfig = it }
        }
    }

    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "x86_64")
            isUniversalApk = true
        }
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
            keepDebugSymbols += "**/libbun_exec.so"
            keepDebugSymbols += "**/libbun_supervisor.so"
        }
    }

    buildFeatures {
        aidl = true
        resValues = true
        buildConfig = true
    }

    sourceSets {
        getByName("androidTest").assets.directories.add(rootProject.file("samples").absolutePath)
    }
}

dependencies {
    implementation(files("$rootDir/libs/common-plugin-api.aar"))
    implementation(files("$rootDir/libs/bun-runtime-api.aar"))
    implementation("org.jetbrains.kotlin:kotlin-parcelize-runtime:${System.getProperty("gradle.kotlin.version")}")

    testImplementation(libs.junit)
    androidTestImplementation(libs.test.ext.junit)
    androidTestImplementation(libs.test.runner)
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
}

tasks.register<Exec>("verifyBunRuntimeArtifacts") {
    group = "verification"
    description = "Verifies pinned Bun Android executables and compatibility metadata before packaging."
    inputs.files(
        rootProject.file("tools/bun-runtime/verify-runtime.mjs"),
        rootProject.file("tools/bun-runtime/runtime.lock.json"),
        rootProject.file("version.properties"),
        rootProject.file(".readme/common.json"),
        rootProject.file("app/src/main/jniLibs/arm64-v8a/libbun_exec.so"),
        rootProject.file("app/src/main/jniLibs/x86_64/libbun_exec.so"),
    )
    commandLine("node", rootProject.file("tools/bun-runtime/verify-runtime.mjs"))
}

tasks.register<Exec>("verifyApiArtifacts") {
    group = "verification"
    description = "Verifies the controlled host/plugin Binder API AARs."
    inputs.file(rootProject.file("libs/api-artifacts.lock.json"))
    inputs.files(
        rootProject.file("libs/common-plugin-api.aar"),
        rootProject.file("libs/bun-runtime-api.aar"),
    )
    commandLine("node", rootProject.file("tools/verify-api-artifacts.mjs"))
}

tasks.register<Exec>("verifyBunSupervisorArtifacts") {
    group = "verification"
    description = "Verifies first-party Bun supervisor source, hashes and aligned PIE executables."
    inputs.files(rootProject.fileTree("tools/bun-runtime/supervisor"))
    inputs.file(rootProject.file("tools/bun-runtime/verify-runtime.mjs"))
    inputs.files(bunSupervisorArtifacts.values.map { rootProject.file(it.getValue("binaryPath") as String) })
    commandLine("node", rootProject.file("tools/bun-runtime/supervisor/verify-supervisor.mjs"))
}

fun registerApkRuntimeVerification(variant: String) =
    tasks.register<Exec>("verify${variant.replaceFirstChar(Char::uppercase)}ApkRuntimeIntegrity") {
        group = "verification"
        description = "Verifies $variant APK alignment and embedded Bun payload bytes against the runtime lock."
        dependsOn("assemble${variant.replaceFirstChar(Char::uppercase)}")
        inputs.files(
            rootProject.file("tools/bun-runtime/verify-apk-runtime.mjs"),
            bunRuntimeLockFile,
        )
        inputs.dir(layout.buildDirectory.dir("outputs/apk/$variant"))
        commandLine(
            "node",
            rootProject.file("tools/bun-runtime/verify-apk-runtime.mjs"),
            "--apk-directory",
            layout.buildDirectory.dir("outputs/apk/$variant").get().asFile,
            "--variant",
            variant,
        )
    }

val verifyDebugApkRuntimeIntegrity = registerApkRuntimeVerification("debug")
val verifyReleaseApkRuntimeIntegrity = registerApkRuntimeVerification("release")

tasks.matching { it.name.startsWith("merge") && it.name.endsWith("NativeLibs") }.configureEach {
    dependsOn("verifyBunRuntimeArtifacts")
    dependsOn("verifyBunSupervisorArtifacts")
    dependsOn("verifyApiArtifacts")
}

tasks.register<Copy>("appendDigestToReleasedFiles") {
    description = "Replaces prior candidates with signed ABI and universal APKs carrying CRC32 in each name."
    val ext = utils.FILE_EXTENSION_APK
    val src = layout.buildDirectory.dir("outputs/apk/release")
    val dst = layout.projectDirectory.dir("releases")
    val releasePrefix = "${rootProject.name}-v${versions.appVersionName}"
    val expected = setOf(
        "app-arm64-v8a-release.$ext",
        "app-universal-release.$ext",
        "app-x86_64-release.$ext",
    )
    dependsOn("assembleRelease")
    dependsOn(verifyReleaseApkRuntimeIntegrity)
    outputs.upToDateWhen { false }
    doFirst {
        check(isSignsValid) {
            "Release signing configuration is missing or incomplete; refusing to collect unsigned APKs"
        }
        val actual = src.get().asFile.listFiles { file -> file.isFile && file.extension == ext }
            .orEmpty().mapTo(mutableSetOf()) { it.name }
        check(actual == expected) { "Expected exactly ${expected.sorted()}, but found ${actual.sorted()}" }
        dst.asFile.listFiles { file ->
            file.isFile && file.extension == ext && file.name.startsWith("$releasePrefix-")
        }.orEmpty().forEach { file ->
            check(file.delete()) { "Cannot remove superseded release candidate: ${file.absolutePath}" }
        }
    }
    from(src)
    into(dst)
    include("*.$ext")
    rename { name ->
        val abi = name.replace(Regex("^app-(.+?)-release(\\.$ext)$"), "$1")
        val prefix = "$releasePrefix-$abi"
        "$prefix-${utils.digestCRC32(src.get().file(name).asFile)}.$ext"
    }
}
