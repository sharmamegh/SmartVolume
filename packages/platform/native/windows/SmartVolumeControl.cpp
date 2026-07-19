#include <algorithm>
#include <mmdeviceapi.h>
#include <endpointvolume.h>
#include <wrl/client.h>

namespace smartvolume::windows {
using Microsoft::WRL::ComPtr;

bool apply_default_output_volume(double percent) {
  ComPtr<IMMDeviceEnumerator> enumerator;
  if (FAILED(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
                              IID_PPV_ARGS(&enumerator)))) return false;
  ComPtr<IMMDevice> device;
  if (FAILED(enumerator->GetDefaultAudioEndpoint(eRender, eMultimedia, &device))) return false;
  ComPtr<IAudioEndpointVolume> endpoint;
  if (FAILED(device->Activate(__uuidof(IAudioEndpointVolume), CLSCTX_ALL, nullptr,
                              reinterpret_cast<void**>(endpoint.GetAddressOf())))) return false;
  const auto scalar = static_cast<float>(std::clamp(percent, 0.0, 100.0) / 100.0);
  return SUCCEEDED(endpoint->SetMasterVolumeLevelScalar(scalar, nullptr));
}
}
