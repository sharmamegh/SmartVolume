#pragma once

#include "JSValue.h"
#include <NativeModules.h>
#include <winrt/Windows.Storage.h>
#include <audioclient.h>
#include <endpointvolume.h>
#include <ksmedia.h>
#include <mmdeviceapi.h>
#include <mmreg.h>
#include <wrl/client.h>
#include <algorithm>
#include <atomic>
#include <chrono>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <thread>
#include <vector>
#include "../../../../../packages/audio-engine/cpp/include/smartvolume/Meter.h"

using namespace winrt::Microsoft::ReactNative;
using Microsoft::WRL::ComPtr;

namespace winrt::SmartVolume {
namespace detail {
inline std::wstring widen(std::string const &value) {
  return winrt::to_hstring(value).c_str();
}

inline std::string metrics_json(
    smartvolume::Metrics const &value, double offset, double duration_ms) {
  const auto leq = value.leqDbfsA + offset;
  const char *quality = duration_ms < 1000 ? "too-short"
      : value.clippedRatio > 0.001 ? "clipped"
      : leq < -90 ? "too-quiet" : "good";
  std::ostringstream json;
  json << "{\"leq\":" << leq << ",\"peak\":" << value.peakDbfs + offset
       << ",\"percentile10\":" << value.percentile10 + offset
       << ",\"percentile50\":" << value.percentile50 + offset
       << ",\"percentile90\":" << value.percentile90 + offset
       << ",\"clippedRatio\":" << value.clippedRatio
       << ",\"durationMs\":" << duration_ms
       << ",\"unit\":\"" << (offset == 0 ? "relative-dBFS-A" : "estimated-dBA")
       << "\",\"quality\":\"" << quality << "\"}";
  return json.str();
}

inline std::string capture_wasapi(
    double duration_ms, double offset, std::atomic_bool const &running) {
  winrt::check_hresult(CoInitializeEx(nullptr, COINIT_MULTITHREADED));
  struct ApartmentGuard {
    ~ApartmentGuard() { CoUninitialize(); }
  } apartment_guard;
  ComPtr<IMMDeviceEnumerator> enumerator;
  winrt::check_hresult(CoCreateInstance(
      __uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&enumerator)));
  ComPtr<IMMDevice> device;
  winrt::check_hresult(enumerator->GetDefaultAudioEndpoint(eCapture, eCommunications, &device));
  ComPtr<IAudioClient> client;
  winrt::check_hresult(device->Activate(
      __uuidof(IAudioClient), CLSCTX_ALL, nullptr,
      reinterpret_cast<void **>(client.GetAddressOf())));
  WAVEFORMATEX *format = nullptr;
  winrt::check_hresult(client->GetMixFormat(&format));
  std::unique_ptr<WAVEFORMATEX, decltype(&CoTaskMemFree)> format_guard(
      format, &CoTaskMemFree);
  winrt::check_hresult(client->Initialize(
      AUDCLNT_SHAREMODE_SHARED, 0, 10'000'000, 0, format, nullptr));
  ComPtr<IAudioCaptureClient> capture;
  winrt::check_hresult(client->GetService(IID_PPV_ARGS(&capture)));
  smartvolume::Meter meter(format->nSamplesPerSec);
  meter.reset();
  winrt::check_hresult(client->Start());
  const auto started = std::chrono::steady_clock::now();
  while (running.load()) {
    const auto elapsed = std::chrono::duration<double, std::milli>(
        std::chrono::steady_clock::now() - started).count();
    if (elapsed >= duration_ms) break;
    UINT32 packet = 0;
    winrt::check_hresult(capture->GetNextPacketSize(&packet));
    while (packet > 0) {
      BYTE *data = nullptr;
      UINT32 frames = 0;
      DWORD flags = 0;
      winrt::check_hresult(capture->GetBuffer(
          &data, &frames, &flags, nullptr, nullptr));
      std::vector<float> mono(frames, 0);
      if (!(flags & AUDCLNT_BUFFERFLAGS_SILENT)) {
        const auto channels = std::max<WORD>(1, format->nChannels);
        const bool is_float = format->wFormatTag == WAVE_FORMAT_IEEE_FLOAT ||
            (format->wFormatTag == WAVE_FORMAT_EXTENSIBLE &&
             IsEqualGUID(reinterpret_cast<WAVEFORMATEXTENSIBLE *>(format)->SubFormat,
                         KSDATAFORMAT_SUBTYPE_IEEE_FLOAT));
        if (is_float) {
          auto *samples = reinterpret_cast<float *>(data);
          for (UINT32 frame = 0; frame < frames; ++frame) mono[frame] = samples[frame * channels];
        } else {
          auto *samples = reinterpret_cast<int16_t *>(data);
          for (UINT32 frame = 0; frame < frames; ++frame) {
            mono[frame] = static_cast<float>(samples[frame * channels]) / 32768.0f;
          }
        }
      }
      meter.process(mono.data(), mono.size());
      winrt::check_hresult(capture->ReleaseBuffer(frames));
      winrt::check_hresult(capture->GetNextPacketSize(&packet));
    }
    std::this_thread::sleep_for(std::chrono::milliseconds(5));
  }
  client->Stop();
  if (!running.load()) throw std::runtime_error("Measurement cancelled.");
  const auto elapsed = std::chrono::duration<double, std::milli>(
      std::chrono::steady_clock::now() - started).count();
  return metrics_json(meter.metrics(), offset, elapsed);
}
}  // namespace detail

REACT_MODULE(SmartVolumeAudioEngine, L"SmartVolumeAudioEngine")
struct SmartVolumeAudioEngine {
  REACT_METHOD(Start, L"start")
  void Start(
      double duration_ms,
      double calibration_offset_db,
      ReactPromise<std::string> &&promise) noexcept {
    if (running_.exchange(true)) {
      promise.Reject("A measurement is already running.");
      return;
    }
    auto pending = std::make_shared<ReactPromise<std::string>>(std::move(promise));
    std::thread([this, pending, duration_ms, calibration_offset_db] {
      try {
        auto result = detail::capture_wasapi(duration_ms, calibration_offset_db, running_);
        running_.store(false);
        pending->Resolve(result);
      } catch (std::exception const &error) {
        running_.store(false);
        pending->Reject(error.what());
      }
    }).detach();
  }

  REACT_METHOD(Cancel, L"cancel")
  void Cancel() noexcept { running_.store(false); }

 private:
  std::atomic_bool running_{false};
};

REACT_MODULE(SmartVolumeControl, L"SmartVolumeControl")
struct SmartVolumeControl {
  REACT_METHOD(IsAvailable, L"isAvailable")
  void IsAvailable(ReactPromise<bool> &&promise) noexcept { promise.Resolve(true); }

  REACT_METHOD(Apply, L"apply")
  void Apply(double percent, ReactPromise<void> &&promise) noexcept {
    try {
      ComPtr<IMMDeviceEnumerator> enumerator;
      winrt::check_hresult(CoCreateInstance(
          __uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&enumerator)));
      ComPtr<IMMDevice> device;
      winrt::check_hresult(enumerator->GetDefaultAudioEndpoint(eRender, eMultimedia, &device));
      ComPtr<IAudioEndpointVolume> endpoint;
      winrt::check_hresult(device->Activate(
          __uuidof(IAudioEndpointVolume), CLSCTX_ALL, nullptr,
          reinterpret_cast<void **>(endpoint.GetAddressOf())));
      const auto scalar = static_cast<float>(std::clamp(percent, 0.0, 100.0) / 100.0);
      winrt::check_hresult(endpoint->SetMasterVolumeLevelScalar(scalar, nullptr));
      promise.Resolve();
    } catch (winrt::hresult_error const &error) {
      promise.Reject(error.message().c_str());
    }
  }
};

REACT_MODULE(SmartVolumeStorage, L"SmartVolumeStorage")
struct SmartVolumeStorage {
  REACT_METHOD(Get, L"get")
  void Get(std::string key, ReactPromise<std::string> &&promise) noexcept {
    auto values = Windows::Storage::ApplicationData::Current().LocalSettings().Values();
    auto value = values.TryLookup(winrt::to_hstring(key));
    promise.Resolve(value ? winrt::to_string(winrt::unbox_value<hstring>(value)) : "");
  }
  REACT_METHOD(Set, L"set")
  void Set(std::string key, std::string value, ReactPromise<void> &&promise) noexcept {
    auto values = Windows::Storage::ApplicationData::Current().LocalSettings().Values();
    values.Insert(winrt::to_hstring(key), winrt::box_value(winrt::to_hstring(value)));
    promise.Resolve();
  }
  REACT_METHOD(Remove, L"remove")
  void Remove(std::string key, ReactPromise<void> &&promise) noexcept {
    Windows::Storage::ApplicationData::Current().LocalSettings().Values().Remove(winrt::to_hstring(key));
    promise.Resolve();
  }
};
}  // namespace winrt::SmartVolume

#include "../../../../../packages/audio-engine/cpp/src/Meter.cpp"
