Pod::Spec.new do |spec|
  spec.name = 'SmartVolumeNative'
  spec.version = '2.0.0'
  spec.summary = 'Local audio analysis, storage, and volume capabilities for SmartVolume'
  spec.homepage = 'https://github.com/sharmamegh/SmartVolume'
  spec.license = { :type => 'Proprietary' }
  spec.author = { 'SmartVolume' => 'security@smartvolume.invalid' }
  spec.platform = :ios, '15.1'
  spec.source = { :git => 'https://github.com/sharmamegh/SmartVolume.git', :tag => spec.version.to_s }
  spec.source_files = [
    'packages/audio-engine/cpp/include/**/*.h',
    'packages/audio-engine/cpp/src/Meter.cpp',
    'packages/audio-engine/native/ios/**/*.{h,m,mm,swift}',
    'packages/platform/native/ios/**/*.{h,m,mm,swift}',
    'packages/storage/native/ios/**/*.{h,m,mm,swift}'
  ]
  spec.public_header_files = 'packages/audio-engine/native/ios/SmartVolumeMeterBridge.h'
  spec.header_mappings_dir = '.'
  spec.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/packages/audio-engine/cpp/include"'
  }
  spec.dependency 'React-Core'
  spec.frameworks = 'AVFoundation', 'MediaPlayer'
end
