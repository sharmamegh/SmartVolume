#import <CoreAudio/CoreAudio.h>
#include <algorithm>

namespace smartvolume::macos {
bool apply_default_output_volume(double percent) {
  AudioObjectPropertyAddress outputAddress{
      kAudioHardwarePropertyDefaultOutputDevice,
      kAudioObjectPropertyScopeGlobal,
      kAudioObjectPropertyElementMain};
  AudioDeviceID device = kAudioObjectUnknown;
  UInt32 size = sizeof(device);
  if (AudioObjectGetPropertyData(kAudioObjectSystemObject, &outputAddress, 0, nullptr,
                                 &size, &device) != noErr) return false;
  Float32 scalar = static_cast<Float32>(std::clamp(percent, 0.0, 100.0) / 100.0);
  AudioObjectPropertyAddress volumeAddress{
      kAudioHardwareServiceDeviceProperty_VirtualMasterVolume,
      kAudioDevicePropertyScopeOutput,
      kAudioObjectPropertyElementMain};
  Boolean settable = false;
  if (!AudioObjectHasProperty(device, &volumeAddress) ||
      AudioObjectIsPropertySettable(device, &volumeAddress, &settable) != noErr ||
      !settable) return false;
  return AudioObjectSetPropertyData(device, &volumeAddress, 0, nullptr,
                                    sizeof(scalar), &scalar) == noErr;
}
}
