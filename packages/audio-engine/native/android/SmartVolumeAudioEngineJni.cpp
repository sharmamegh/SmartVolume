#include <jni.h>
#include <algorithm>
#include <memory>
#include <sstream>
#include <vector>
#include "smartvolume/Meter.h"

using smartvolume::Meter;

extern "C" JNIEXPORT jlong JNICALL
Java_dev_mnsharma_smartvolume_audio_SmartVolumeAudioEngineModule_nativeCreateMeter(
    JNIEnv*, jobject) {
  auto meter = std::make_unique<Meter>();
  meter->reset();
  return reinterpret_cast<jlong>(meter.release());
}

extern "C" JNIEXPORT void JNICALL
Java_dev_mnsharma_smartvolume_audio_SmartVolumeAudioEngineModule_nativeProcess(
    JNIEnv* env, jobject, jlong handle, jshortArray input, jint count) {
  auto* meter = reinterpret_cast<Meter*>(handle);
  if (!meter || count <= 0) return;
  const auto safe_count = std::min(count, env->GetArrayLength(input));
  std::vector<jshort> pcm(static_cast<std::size_t>(safe_count));
  env->GetShortArrayRegion(input, 0, safe_count, pcm.data());
  std::vector<float> normalized(pcm.size());
  std::transform(pcm.begin(), pcm.end(), normalized.begin(),
                 [](jshort value) { return static_cast<float>(value) / 32768.0f; });
  meter->process(normalized.data(), normalized.size());
}

extern "C" JNIEXPORT jstring JNICALL
Java_dev_mnsharma_smartvolume_audio_SmartVolumeAudioEngineModule_nativeFinish(
    JNIEnv* env, jobject, jlong handle, jdouble calibration_offset_db,
    jdouble duration_ms) {
  const auto metrics = reinterpret_cast<Meter*>(handle)->metrics();
  const auto calibrated = calibration_offset_db != 0;
  const auto leq = metrics.leqDbfsA + calibration_offset_db;
  const auto peak = metrics.peakDbfs + calibration_offset_db;
  const char* quality = duration_ms < 1000 ? "too-short"
      : metrics.clippedRatio > 0.001 ? "clipped"
      : leq < -90 ? "too-quiet" : "good";
  std::ostringstream json;
  json << "{\"leq\":" << leq << ",\"peak\":" << peak
       << ",\"percentile10\":" << metrics.percentile10 + calibration_offset_db
       << ",\"percentile50\":" << metrics.percentile50 + calibration_offset_db
       << ",\"percentile90\":" << metrics.percentile90 + calibration_offset_db
       << ",\"clippedRatio\":"
       << metrics.clippedRatio << ",\"durationMs\":" << duration_ms
       << ",\"unit\":\"" << (calibrated ? "estimated-dBA" : "relative-dBFS-A")
       << "\",\"quality\":\"" << quality << "\"}";
  return env->NewStringUTF(json.str().c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_dev_mnsharma_smartvolume_audio_SmartVolumeAudioEngineModule_nativeDestroyMeter(
    JNIEnv*, jobject, jlong handle) {
  delete reinterpret_cast<Meter*>(handle);
}
