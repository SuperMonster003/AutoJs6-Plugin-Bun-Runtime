package io.github.supermonster003.autojs6.plugin.bun.runtime

import android.os.IBinder
import org.autojs.plugin.bun.runtime.api.BunRuntimeContract
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.lang.reflect.Proxy

class BunHostBridgeRequestTest {
    /** The android.jar stubs throw on every call, so the fake broker is a proxy that is never invoked here. */
    private val broker = Proxy.newProxyInstance(IBinder::class.java.classLoader, arrayOf(IBinder::class.java)) { _, _, _ -> null } as IBinder

    @Test
    fun acceptsTheCurrentVersionWithGrantedCapabilities() {
        val parsed = BunExecutionRequestParser.parseHostBridge(
            version = BunRuntimeContract.HOST_CAPABILITY_BRIDGE_VERSION,
            broker = broker,
            capabilities = listOf(BunRuntimeContract.HOST_CAPABILITY_UI_TOAST, BunRuntimeContract.HOST_CAPABILITY_DEVICE_INFO),
        )
        assertSame(broker, parsed.broker)
        assertEquals(listOf("ui.toast", "device.info"), parsed.capabilities)

        val many = (1..BunRuntimeContract.MAX_HOST_CAPABILITY_COUNT).map { "ns.cap$it" }
        assertEquals(many, BunExecutionRequestParser.parseHostBridge(1, broker, many).capabilities)
    }

    @Test
    fun capabilityIdsAreDottedLowercaseNamesWithinTheByteBound() {
        listOf("ui.toast", "device.info", "a.b", "a1.b2.c3", "x." + "y".repeat(BunRuntimeContract.MAX_HOST_CAPABILITY_ID_BYTES - 2)).forEach { id ->
            assertTrue(id, BunExecutionRequestParser.isValidCapabilityId(id))
        }
        listOf(
            "", "info", "toast", "v1", ".toast", "ui.", "ui..toast", "UI.toast", "ui.Toast", "ui-toast", "ui_toast", "1ui.toast",
            "ui.1toast", "ui.toast/", "ui.toast ", " ui.toast", "ui.toast\n", "ui.tóast", "../info", "v1/info",
            "x." + "y".repeat(BunRuntimeContract.MAX_HOST_CAPABILITY_ID_BYTES - 1),
        ).forEach { id ->
            assertFalse("[$id]", BunExecutionRequestParser.isValidCapabilityId(id))
        }
    }

    @Test
    fun rejectsUnknownVersionsMissingBrokersAndMalformedLists() {
        assertRejected("Unsupported host capability bridge version") {
            BunExecutionRequestParser.parseHostBridge(BunRuntimeContract.HOST_CAPABILITY_BRIDGE_VERSION + 1, broker, listOf("ui.toast"))
        }
        assertRejected("Unsupported host capability bridge version") {
            BunExecutionRequestParser.parseHostBridge(-1, broker, listOf("ui.toast"))
        }
        assertRejected("Host capability broker is missing") {
            BunExecutionRequestParser.parseHostBridge(1, null, listOf("ui.toast"))
        }
        assertRejected("Host capability list is empty") {
            BunExecutionRequestParser.parseHostBridge(1, broker, null)
        }
        assertRejected("Host capability list is empty") {
            BunExecutionRequestParser.parseHostBridge(1, broker, emptyList())
        }
        assertRejected("Too many host capabilities") {
            BunExecutionRequestParser.parseHostBridge(1, broker, (0..BunRuntimeContract.MAX_HOST_CAPABILITY_COUNT).map { "ns.cap$it" })
        }
        assertRejected("Invalid host capability ID") {
            BunExecutionRequestParser.parseHostBridge(1, broker, listOf("ui.toast", "info"))
        }
        assertRejected("Invalid host capability ID") {
            BunExecutionRequestParser.parseHostBridge(1, broker, listOf("ui.toast", null))
        }
        assertRejected("Duplicate host capability ID") {
            BunExecutionRequestParser.parseHostBridge(1, broker, listOf("ui.toast", "device.info", "ui.toast"))
        }
    }

    private fun assertRejected(expectedMessage: String, block: () -> Unit) {
        try {
            block()
            fail("Expected rejection: $expectedMessage")
        } catch (error: IllegalArgumentException) {
            assertEquals(expectedMessage, error.message)
        }
    }
}
