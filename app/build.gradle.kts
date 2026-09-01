import java.util.Properties

plugins {
    id("org.autojs.build.utils")
    id("org.autojs.build.versions")
    id("org.autojs.build.signs")
    id("org.autojs.build.jvm-convention")
    id("com.android.application")
}

val globalApplicationId = "io.github.supermonster003.autojs6.plugin.bun.runtime"
var isSignsValid = false

android {
    namespace = globalApplicationId
    compileSdk = versions.sdkVersionCompile

    defaultConfig {
        applicationId = globalApplicationId
        minSdk = versions.sdkVersionMin
        targetSdk = versions.sdkVersionTarget
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        versionCode = versions.appVersionCode
        versionName = versions.appVersionName

        resValue("string", "app_name", "Bun Runtime")
        resValue("string", "plugin_author", "SuperMonster003")
        resValue("string", "plugin_id", "bun-runtime")
        resValue("string", "plugin_engine", "bun")
        resValue("string", "plugin_variant", "bun-1.4.0-android")
        resValue("string", "plugin_version_date", utils.getDateString("MMM d, yyyy", "GMT+08:00"))
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
        }
    }

    buildFeatures {
        aidl = true
        resValues = true
        buildConfig = true
    }
}

dependencies {
    implementation(files("$rootDir/libs/common-plugin-api.aar"))
    implementation(files("$rootDir/libs/bun-runtime-api.aar"))

    testImplementation(libs.junit)
    androidTestImplementation(libs.test.ext.junit)
    androidTestImplementation(libs.test.runner)
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
}

tasks.register<Exec>("verifyBunRuntimeArtifacts") {
    group = "verification"
    description = "Verifies pinned Bun Android executables before packaging."
    inputs.file(rootProject.file("tools/bun-runtime/runtime.lock.json"))
    inputs.files(
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

tasks.matching { it.name.startsWith("merge") && it.name.endsWith("NativeLibs") }.configureEach {
    dependsOn("verifyBunRuntimeArtifacts")
    dependsOn("verifyApiArtifacts")
}

tasks.register<Copy>("appendDigestToReleasedFiles") {
    description = "Collects signed ABI and universal APKs with CRC32 in each name."
    val ext = utils.FILE_EXTENSION_APK
    val src = layout.buildDirectory.dir("outputs/apk/release")
    val dst = layout.projectDirectory.dir("releases")
    val expected = setOf(
        "app-arm64-v8a-release.$ext",
        "app-universal-release.$ext",
        "app-x86_64-release.$ext",
    )
    dependsOn("assembleRelease")
    doFirst {
        check(isSignsValid) {
            "Release signing configuration is missing or incomplete; refusing to collect unsigned APKs"
        }
        val actual = src.get().asFile.listFiles { file -> file.isFile && file.extension == ext }
            .orEmpty().mapTo(mutableSetOf()) { it.name }
        check(actual == expected) { "Expected exactly ${expected.sorted()}, but found ${actual.sorted()}" }
    }
    from(src)
    into(dst)
    include("*.$ext")
    rename { name ->
        val abi = name.replace(Regex("^app-(.+?)-release(\\.$ext)$"), "$1")
        val prefix = "${rootProject.name}-v${versions.appVersionName}-$abi"
        "$prefix-${utils.digestCRC32(src.get().file(name).asFile)}.$ext"
    }
}
