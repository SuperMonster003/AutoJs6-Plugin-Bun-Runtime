package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build
import android.system.Os
import android.system.OsConstants
import java.lang.reflect.Modifier
import java.util.Locale

/**
 * The rest of the synchronous part of Rhino's device and sensors modules in device-info.json (api-coverage P4.1c, Q154 (a)),
 * as the Node runtime's NodeDeviceProfile writes it (P3.1c, Q147 (a) / Q148 (a)): the native page size, the market name, the
 * manufacturers / brands / roms checks and the default sensor of every name Rhino's sensors.register accepts. The checks
 * follow the host's org.autojs.autojs.runtime.api.Device, util.RomUtils and ezy.assist.compat.RomUtil; this process reads
 * the same system properties as AutoJs6, both being ordinary apps.
 */
internal object BunDeviceProfile {

    /** The android.os.Build values the checks read. */
    internal class Identity(val manufacturer: String, val model: String, val display: String)

    /** The profile fields of [BunHostClientModule.deviceInfo] for this device. */
    fun read(context: Context): Map<String, Any?> {
        val identity = Identity(Build.MANUFACTURER.orEmpty(), Build.MODEL.orEmpty(), Build.DISPLAY.orEmpty())
        val property = ::property
        return linkedMapOf(
            "pageSize" to runCatching { Os.sysconf(OsConstants._SC_PAGESIZE) }.getOrNull()?.takeIf { it > 0 },
            "marketName" to marketName(identity, property),
            "manufacturers" to manufacturers(identity, property),
            "brands" to brands(identity, property),
            "roms" to roms(identity, property),
            "sensors" to runCatching { sensors(context) }.getOrDefault(emptyMap()),
        )
    }

    /** Rhino's Device.getMarketName. */
    internal fun marketName(identity: Identity, property: (String) -> String?): String =
        listOf("ro.product.marketname", "ro.semc.product.name", "ro.config.marketing_name", "ro.product.model")
            .firstNotNullOfOrNull { key -> property(key)?.takeIf { it.isNotBlank() } } ?: identity.model

    private fun contains(value: String?, text: String) = value?.lowercase(Locale.ROOT)?.contains(text) == true

    private fun isXperia(property: (String) -> String?) = contains(property("ro.semc.product.name"), "xperia")

    private fun isRedmi(property: (String) -> String?) = contains(property("ro.product.model"), "redmi")

    private fun isMiMix(identity: Identity) = contains(identity.model, "mi mix")

    /** Rhino's RomUtils.Brand. */
    internal fun brands(identity: Identity, property: (String) -> String?): Map<String, Boolean> =
        linkedMapOf("isXperia" to isXperia(property), "isRedmi" to isRedmi(property), "isMiMix" to isMiMix(identity))

    /** Rhino's Device.Manufacturers. */
    internal fun manufacturers(identity: Identity, property: (String) -> String?): Map<String, Boolean> {
        fun manufacturer(name: String) = name.trim().equals(identity.manufacturer, ignoreCase = true)
        val nova = manufacturer("nova")
        val honor = manufacturer("honor")
        return linkedMapOf(
            "isHtc" to manufacturer("htc"),
            "isLG" to manufacturer("lg"),
            "isOnePlus" to manufacturer("oneplus"),
            "isSamsung" to manufacturer("samsung"),
            "isZte" to manufacturer("zte"),
            "isLetv" to manufacturer("letv"),
            "isHuawei" to (manufacturer("huawei") || nova || honor),
            "isNova" to nova,
            "isHonor" to honor,
            "isXiaomi" to (manufacturer("xiaomi") || isRedmi(property) || isMiMix(identity)),
            "isOppo" to manufacturer("oppo"),
            "isSony" to (manufacturer("sony") || isXperia(property)),
            "isVivo" to manufacturer("vivo"),
            "isLenovo" to manufacturer("lenovo"),
            "isCoolpad" to manufacturer("yulong"),
            "isSmartisan" to manufacturer("smartisan"),
            "isMeizu" to manufacturer("meizu"),
        )
    }

    /** Rhino's RomUtils (isQiku: ezy.assist.compat.RomUtil, the manufacturer when no known ROM property or Flyme display is found). */
    internal fun roms(identity: Identity, property: (String) -> String?): Map<String, Boolean> {
        fun has(key: String) = !property(key).isNullOrEmpty()
        val miui = has("ro.miui.ui.version.name")
        val emui = has("ro.build.version.emui")
        val oppo = has("ro.build.version.opporom")
        val smartisan = has("ro.smartisan.version")
        val vivo = has("ro.vivo.os.version")
        val flyme = contains(identity.display, "flyme")
        val manufacturer = identity.manufacturer.uppercase(Locale.ROOT)
        val qiku = !(miui || emui || oppo || vivo || smartisan || flyme) && (manufacturer == "QIKU" || manufacturer == "360")
        return linkedMapOf(
            "isMiui" to miui,
            "isEmui" to emui,
            "isOppo" to oppo,
            "isSmartisan" to smartisan,
            "isVivo" to vivo,
            "isGionee" to has("ro.gn.sv.version"),
            "isLenovo" to has("ro.lenovo.lvp.version"),
            "isFlyme" to flyme,
            "isQiku" to qiku,
        )
    }

    /** Rhino's sensors table (org.autojs.autojs.runtime.api.Sensors); other names are the Sensor.TYPE_ constants in lower case. */
    @Suppress("DEPRECATION") // TYPE_ORIENTATION is in Rhino's table.
    private fun sensorTypes(): Map<String, Int> {
        val types = linkedMapOf(
            "accelerometer" to Sensor.TYPE_ACCELEROMETER,
            "ambient_temperature" to Sensor.TYPE_AMBIENT_TEMPERATURE,
            "gravity" to Sensor.TYPE_GRAVITY,
            "gyroscope" to Sensor.TYPE_GYROSCOPE,
            "light" to Sensor.TYPE_LIGHT,
            "linear_acceleration" to Sensor.TYPE_LINEAR_ACCELERATION,
            "magnetic_field" to Sensor.TYPE_MAGNETIC_FIELD,
            "orientation" to Sensor.TYPE_ORIENTATION,
            "pressure" to Sensor.TYPE_PRESSURE,
            "proximity" to Sensor.TYPE_PROXIMITY,
            "relative_humidity" to Sensor.TYPE_RELATIVE_HUMIDITY,
            "temperature" to Sensor.TYPE_AMBIENT_TEMPERATURE,
        )
        for (field in Sensor::class.java.fields) {
            if (field.type != Int::class.javaPrimitiveType || !Modifier.isStatic(field.modifiers) || !field.name.startsWith("TYPE_") || field.name == "TYPE_ALL") continue
            val key = field.name.removePrefix("TYPE_").lowercase(Locale.ROOT)
            if (key !in types) runCatching { types[key] = field.getInt(null) }
        }
        return types
    }

    /** The default sensor of each name, as the bean properties of Rhino's android.hardware.Sensor. */
    private fun sensors(context: Context): Map<String, Map<String, Any?>> {
        val manager = context.getSystemService(SensorManager::class.java) ?: return emptyMap()
        val result = linkedMapOf<String, Map<String, Any?>>()
        for ((name, type) in sensorTypes()) {
            val sensor = runCatching { manager.getDefaultSensor(type) }.getOrNull() ?: continue
            result[name] = linkedMapOf(
                "name" to sensor.name,
                "vendor" to sensor.vendor,
                "version" to sensor.version,
                "type" to sensor.type,
                "stringType" to sensor.stringType,
                "maximumRange" to sensor.maximumRange.toDouble(),
                "resolution" to sensor.resolution.toDouble(),
                "power" to sensor.power.toDouble(),
                "minDelay" to sensor.minDelay,
                "maxDelay" to sensor.maxDelay,
                "reportingMode" to sensor.reportingMode,
                "wakeUpSensor" to sensor.isWakeUpSensor,
                "fifoMaxEventCount" to sensor.fifoMaxEventCount,
                "fifoReservedEventCount" to sensor.fifoReservedEventCount,
            )
        }
        return result
    }

    /** android.os.SystemProperties.get, else the getprop command (as the host's SystemProperties). */
    private fun property(key: String): String? {
        runCatching {
            val value = Class.forName("android.os.SystemProperties").getMethod("get", String::class.java).invoke(null, key)
            if (value is String) return value
        }
        return runCatching {
            val process = ProcessBuilder("getprop", key).redirectErrorStream(true).start()
            try {
                process.inputStream.bufferedReader().use { it.readLine()?.trim().orEmpty() }
            } finally {
                process.destroy()
            }
        }.getOrNull()
    }
}
