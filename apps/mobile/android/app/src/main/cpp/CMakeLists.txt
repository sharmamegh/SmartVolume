cmake_minimum_required(VERSION 3.22.1)
project(smartvolume_audio)

set(ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../..")
add_library(
  smartvolume_audio
  SHARED
  "${ROOT}/packages/audio-engine/cpp/src/Meter.cpp"
  "${ROOT}/packages/audio-engine/native/android/SmartVolumeAudioEngineJni.cpp"
)
target_include_directories(
  smartvolume_audio
  PRIVATE
  "${ROOT}/packages/audio-engine/cpp/include"
)
find_library(log-lib log)
target_link_libraries(smartvolume_audio ${log-lib})
