package io.github.supermonster003.autojs6.plugin.bun.runtime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.OutputStream
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

class SupervisedProcessTest {
    @Test
    fun closingScriptStdinDoesNotCloseTheControlPipe() {
        val delegate = RecordingProcess()
        val process = SupervisedProcess(delegate)
        process.outputStream.close()
        assertEquals(0, delegate.controlCloses.get())
        assertTrue(process.isAlive)
    }

    @Test
    fun concurrentTerminationIsIdempotentAndDoesNotUseJavaSignals() {
        val delegate = RecordingProcess()
        val process = SupervisedProcess(delegate)
        val threads = Executors.newFixedThreadPool(8)
        try {
            val requests = (1..100).map { threads.submit { process.destroyForcibly(); process.destroy() } }
            requests.forEach { it.get(5, TimeUnit.SECONDS) }
            assertEquals(1, delegate.controlCloses.get())
            assertEquals(0, delegate.javaDestroys.get())
            // Requesting termination is not proof of a completed reap.
            assertTrue(process.isAlive)
            assertFalse(process.waitFor(0, TimeUnit.MILLISECONDS))
        } finally {
            threads.shutdownNow()
        }
    }

    @Test
    fun terminationKeepsBothOutputStreamsAvailableForDraining() {
        val delegate = RecordingProcess()
        val process = SupervisedProcess(delegate)
        assertSame(process, process.destroyForcibly())
        assertSame(delegate.inputStream, process.inputStream)
        assertSame(delegate.errorStream, process.errorStream)
        assertEquals("stdout", process.inputStream.reader().readText())
        assertEquals("stderr", process.errorStream.reader().readText())
        delegate.exited = true
        assertFalse(process.isAlive)
        assertTrue(process.waitFor(1, TimeUnit.SECONDS))
        assertEquals(137, process.exitValue())
        assertEquals(137, process.waitFor())
    }

    private class RecordingProcess : Process() {
        val controlCloses = AtomicInteger()
        val javaDestroys = AtomicInteger()
        var exited = false
        private val stdout = ByteArrayInputStream("stdout".toByteArray())
        private val stderr = ByteArrayInputStream("stderr".toByteArray())
        private val control = object : OutputStream() {
            override fun write(value: Int) = Unit
            override fun close() { controlCloses.incrementAndGet() }
        }
        override fun getOutputStream() = control
        override fun getInputStream() = stdout
        override fun getErrorStream() = stderr
        override fun waitFor() = exitValue()
        override fun waitFor(timeout: Long, unit: TimeUnit) = exited
        override fun exitValue(): Int = if (exited) 137 else throw IllegalThreadStateException()
        override fun isAlive() = !exited
        override fun destroy() { javaDestroys.incrementAndGet() }
    }
}
