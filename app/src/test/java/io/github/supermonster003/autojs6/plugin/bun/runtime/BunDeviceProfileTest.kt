package io.github.supermonster003.autojs6.plugin.bun.runtime

import io.github.supermonster003.autojs6.plugin.bun.runtime.BunDeviceProfile.Identity
import org.junit.Assert.assertEquals
import org.junit.Test

class BunDeviceProfileTest {
    private fun properties(vararg pairs: Pair<String, String>): (String) -> String? = mapOf(*pairs)::get

    private fun trueKeys(map: Map<String, Boolean>) = map.filterValues { it }.keys.toList()

    @Test
    fun marketNameTakesTheFirstNonBlankPropertyElseTheModel() {
        val identity = Identity("Xiaomi", "22120RN86C", "TKQ1")
        assertEquals("Redmi Note 12", BunDeviceProfile.marketName(identity, properties("ro.product.marketname" to "Redmi Note 12", "ro.product.model" to "x")))
        assertEquals("x", BunDeviceProfile.marketName(identity, properties("ro.product.marketname" to " ", "ro.product.model" to "x")))
        assertEquals("22120RN86C", BunDeviceProfile.marketName(identity, properties()))
    }

    @Test
    fun manufacturersFollowRhinosDeviceManufacturers() {
        val redmi = properties("ro.product.model" to "Redmi Note 12")
        assertEquals(listOf("isXiaomi"), trueKeys(BunDeviceProfile.manufacturers(Identity("Xiaomi", "x", ""), properties())))
        // Redmi models and the Mi MIX count as Xiaomi whatever the manufacturer says, Xperia as Sony, nova / honor as Huawei.
        assertEquals(listOf("isXiaomi"), trueKeys(BunDeviceProfile.manufacturers(Identity("other", "x", ""), redmi)))
        assertEquals(listOf("isXiaomi"), trueKeys(BunDeviceProfile.manufacturers(Identity("other", "MI MIX 3", ""), properties())))
        assertEquals(listOf("isSony"), trueKeys(BunDeviceProfile.manufacturers(Identity("other", "x", ""), properties("ro.semc.product.name" to "Xperia 5"))))
        assertEquals(listOf("isHuawei", "isHonor"), trueKeys(BunDeviceProfile.manufacturers(Identity("HONOR", "x", ""), properties())))
        assertEquals(listOf("isCoolpad"), trueKeys(BunDeviceProfile.manufacturers(Identity("YuLong", "x", ""), properties())))
        assertEquals(17, BunDeviceProfile.manufacturers(Identity("", "", ""), properties()).size)
    }

    @Test
    fun brandsFollowRhinosRomUtilsBrand() {
        assertEquals(listOf("isXperia", "isRedmi", "isMiMix"), BunDeviceProfile.brands(Identity("", "", ""), properties()).keys.toList())
        assertEquals(listOf("isRedmi"), trueKeys(BunDeviceProfile.brands(Identity("Xiaomi", "x", ""), properties("ro.product.model" to "REDMI K60"))))
    }

    @Test
    fun romsFollowRhinosRomUtils() {
        assertEquals(listOf("isMiui"), trueKeys(BunDeviceProfile.roms(Identity("Xiaomi", "x", ""), properties("ro.miui.ui.version.name" to "V140"))))
        assertEquals(listOf("isFlyme"), trueKeys(BunDeviceProfile.roms(Identity("Meizu", "x", "Flyme 9.2"), properties())))
        // isQiku: the manufacturer, only when no other ROM is found.
        assertEquals(listOf("isQiku"), trueKeys(BunDeviceProfile.roms(Identity("360", "x", ""), properties())))
        assertEquals(listOf("isEmui"), trueKeys(BunDeviceProfile.roms(Identity("QiKU", "x", ""), properties("ro.build.version.emui" to "EmotionUI_9"))))
        assertEquals(9, BunDeviceProfile.roms(Identity("", "", ""), properties()).size)
    }
}
