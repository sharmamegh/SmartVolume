Pod::Spec.new do |spec|
  spec.name = 'SmartVolumeNativeMacOS'
  spec.version = '2.0.0'
  spec.summary = 'Local macOS audio analysis, storage, and volume capabilities'
  spec.homepage = 'https://github.com/sharmamegh/SmartVolume'
  spec.license = { :type => 'Proprietary' }
  spec.author = { 'SmartVolume' => 'security@smartvolume.invalid' }
  spec.platform = :osx, '14.0'
  spec.source = { :git => 'https://github.com/sharmamegh/SmartVolume.git', :tag => spec.version.to_s }
  spec.source_files = [
    'packages/audio-engine/cpp/include/**/*.h',
    'packages/audio-engine/cpp/src/Meter.cpp',
    'packages/audio-engine/native/macos/SmartVolumeMacModules.mm'
  ]
  spec.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/packages/audio-engine/cpp/include"'
  }
  spec.dependency 'React-Core'
  spec.frameworks = 'AVFoundation', 'CoreAudio'
end
