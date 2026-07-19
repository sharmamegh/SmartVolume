package dev.mnsharma.smartvolume.audio

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class SmartVolumeAudioEngineModule(
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
    private val executor = Executors.newSingleThreadExecutor()
    private val running = AtomicBoolean(false)

    override fun getName() = "SmartVolumeAudioEngine"

    @ReactMethod
    fun start(durationMs: Double, calibrationOffsetDb: Double, promise: Promise) {
        if (!running.compareAndSet(false, true)) {
            promise.reject("E_BUSY", "A measurement is already running.")
            return
        }
        if (ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            running.set(false)
            promise.reject("E_PERMISSION", "Microphone permission is required.")
            return
        }
        executor.execute {
            val sampleRate = 48_000
            val minimum = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val bufferSize = maxOf(minimum, 4096)
            val recorder = createRecorder(sampleRate, bufferSize)
            val meter = nativeCreateMeter()
            val startedAt = System.nanoTime()
            try {
                check(recorder.state == AudioRecord.STATE_INITIALIZED) { "Microphone could not be initialized." }
                recorder.startRecording()
                val frame = ShortArray(bufferSize)
                while (running.get() && elapsedMs(startedAt) < durationMs) {
                    val count = recorder.read(frame, 0, frame.size, AudioRecord.READ_BLOCKING)
                    if (count < 0) error("Microphone read failed with code $count")
                    if (count > 0) nativeProcess(meter, frame, count)
                }
                if (!running.get()) {
                    promise.reject("E_CANCELLED", "Measurement cancelled.")
                } else {
                    promise.resolve(nativeFinish(meter, calibrationOffsetDb, elapsedMs(startedAt)))
                }
            } catch (error: Throwable) {
                promise.reject("E_CAPTURE", error.message, error)
            } finally {
                running.set(false)
                if (recorder.recordingState == AudioRecord.RECORDSTATE_RECORDING) recorder.stop()
                recorder.release()
                nativeDestroyMeter(meter)
            }
        }
    }

    @ReactMethod
    fun cancel() {
        running.set(false)
    }

    override fun invalidate() {
        running.set(false)
        executor.shutdownNow()
        super.invalidate()
    }

    private fun elapsedMs(startedAt: Long) = (System.nanoTime() - startedAt) / 1_000_000.0

    private fun createRecorder(sampleRate: Int, bufferSize: Int): AudioRecord {
        fun recorder(source: Int) = AudioRecord(
            source,
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize * 2,
        )
        val unprocessed = recorder(MediaRecorder.AudioSource.UNPROCESSED)
        if (unprocessed.state == AudioRecord.STATE_INITIALIZED) return unprocessed
        unprocessed.release()
        return recorder(MediaRecorder.AudioSource.MIC)
    }

    private external fun nativeCreateMeter(): Long
    private external fun nativeProcess(handle: Long, samples: ShortArray, count: Int)
    private external fun nativeFinish(handle: Long, calibrationOffsetDb: Double, durationMs: Double): String
    private external fun nativeDestroyMeter(handle: Long)

    companion object {
        init {
            System.loadLibrary("smartvolume_audio")
        }
    }
}
