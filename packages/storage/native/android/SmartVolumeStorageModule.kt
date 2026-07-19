package dev.mnsharma.smartvolume.storage

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SmartVolumeStorageModule(
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
    private val preferences = context.getSharedPreferences("smartvolume.local", 0)
    override fun getName() = "SmartVolumeStorage"

    @ReactMethod fun get(key: String, promise: Promise) = promise.resolve(preferences.getString(key, null))
    @ReactMethod fun set(key: String, value: String, promise: Promise) {
        preferences.edit().putString(key, value).apply()
        promise.resolve(null)
    }
    @ReactMethod fun remove(key: String, promise: Promise) {
        preferences.edit().remove(key).apply()
        promise.resolve(null)
    }
}
