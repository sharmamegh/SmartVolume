package dev.mnsharma.smartvolume.platform

import android.content.Context
import android.media.AudioManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.math.roundToInt

class SmartVolumeControlModule(
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
    override fun getName() = "SmartVolumeControl"

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun apply(percent: Double, promise: Promise) {
        val audio = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val target = (percent.coerceIn(0.0, 100.0) * max / 100.0).roundToInt()
        audio.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0)
        promise.resolve(null)
    }
}
