package dev.mnsharma.smartvolume

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import dev.mnsharma.smartvolume.audio.SmartVolumeAudioEngineModule
import dev.mnsharma.smartvolume.platform.SmartVolumeControlModule
import dev.mnsharma.smartvolume.storage.SmartVolumeStorageModule

class SmartVolumePackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(
        SmartVolumeAudioEngineModule(context),
        SmartVolumeControlModule(context),
        SmartVolumeStorageModule(context),
    )

    override fun createViewManagers(
        context: ReactApplicationContext,
    ): List<ViewManager<in Nothing, in Nothing>> = emptyList()
}
