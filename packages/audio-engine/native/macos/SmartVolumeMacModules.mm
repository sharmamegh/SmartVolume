#import <AVFoundation/AVFoundation.h>
#import <CoreAudio/CoreAudio.h>
#import <React/RCTBridgeModule.h>
#include <algorithm>
#include <memory>
#include "smartvolume/Meter.h"

@interface SmartVolumeAudioEngine : NSObject <RCTBridgeModule>
@end

@implementation SmartVolumeAudioEngine {
  AVAudioEngine *_engine;
  std::shared_ptr<smartvolume::Meter> _meter;
  RCTPromiseRejectBlock _pendingReject;
}
RCT_EXPORT_MODULE()
+ (BOOL)requiresMainQueueSetup { return NO; }

RCT_REMAP_METHOD(start,
                 durationMs:(double)durationMs
                 calibrationOffsetDb:(double)offset
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  if (_engine) {
    reject(@"E_BUSY", @"A measurement is already running.", nil);
    return;
  }
  _pendingReject = reject;
  _engine = [AVAudioEngine new];
  AVAudioInputNode *input = _engine.inputNode;
  AVAudioFormat *format = [input inputFormatForBus:0];
  _meter = std::make_shared<smartvolume::Meter>(format.sampleRate);
  _meter->reset();
  auto meter = _meter;
  [input installTapOnBus:0 bufferSize:4096 format:format block:^(AVAudioPCMBuffer *buffer, AVAudioTime *) {
    if (buffer.floatChannelData && buffer.frameLength) {
      meter->process(buffer.floatChannelData[0], buffer.frameLength);
    }
  }];
  NSError *error = nil;
  const auto started = NSProcessInfo.processInfo.systemUptime;
  if (![_engine startAndReturnError:&error]) {
    [input removeTapOnBus:0];
    _engine = nil;
    _pendingReject = nil;
    reject(@"E_CAPTURE", error.localizedDescription, error);
    return;
  }
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(durationMs * NSEC_PER_MSEC)),
                 dispatch_get_main_queue(), ^{
    if (!self->_engine) return;
    [input removeTapOnBus:0];
    [self->_engine stop];
    self->_engine = nil;
    self->_pendingReject = nil;
    const auto value = meter->metrics();
    const auto elapsed = (NSProcessInfo.processInfo.systemUptime - started) * 1000;
    const auto quality = elapsed < 1000 ? @"too-short"
        : value.clippedRatio > 0.001 ? @"clipped"
        : value.leqDbfsA + offset < -90 ? @"too-quiet" : @"good";
    NSDictionary *payload = @{
      @"leq": @(value.leqDbfsA + offset),
      @"peak": @(value.peakDbfs + offset),
      @"percentile10": @(value.percentile10 + offset),
      @"percentile50": @(value.percentile50 + offset),
      @"percentile90": @(value.percentile90 + offset),
      @"clippedRatio": @(value.clippedRatio),
      @"durationMs": @(elapsed),
      @"unit": offset == 0 ? @"relative-dBFS-A" : @"estimated-dBA",
      @"quality": quality
    };
    NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
    resolve([[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]);
  });
}

RCT_EXPORT_METHOD(cancel) {
  if (!_engine) return;
  [_engine.inputNode removeTapOnBus:0];
  [_engine stop];
  _engine = nil;
  _pendingReject(@"E_CANCELLED", @"Measurement cancelled.", nil);
  _pendingReject = nil;
}
@end

@interface SmartVolumeControl : NSObject <RCTBridgeModule>
@end
@implementation SmartVolumeControl
RCT_EXPORT_MODULE()
+ (BOOL)requiresMainQueueSetup { return NO; }
RCT_REMAP_METHOD(isAvailable, resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@YES);
}
RCT_REMAP_METHOD(apply,
                 percent:(double)percent
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  AudioObjectPropertyAddress outputAddress{
      kAudioHardwarePropertyDefaultOutputDevice,
      kAudioObjectPropertyScopeGlobal,
      kAudioObjectPropertyElementMain};
  AudioDeviceID device = kAudioObjectUnknown;
  UInt32 size = sizeof(device);
  if (AudioObjectGetPropertyData(kAudioObjectSystemObject, &outputAddress, 0, nullptr, &size, &device) != noErr) {
    reject(@"E_ROUTE", @"The default output device is unavailable.", nil);
    return;
  }
  AudioObjectPropertyAddress volumeAddress{
      kAudioHardwareServiceDeviceProperty_VirtualMasterVolume,
      kAudioDevicePropertyScopeOutput,
      kAudioObjectPropertyElementMain};
  Boolean settable = false;
  if (AudioObjectIsPropertySettable(device, &volumeAddress, &settable) != noErr || !settable) {
    reject(@"E_UNSUPPORTED", @"The active output route does not allow volume control.", nil);
    return;
  }
  Float32 scalar = static_cast<Float32>(std::clamp(percent, 0.0, 100.0) / 100.0);
  const auto status = AudioObjectSetPropertyData(device, &volumeAddress, 0, nullptr, sizeof(scalar), &scalar);
  if (status == noErr) {
    resolve(nil);
  } else {
    reject(@"E_VOLUME", @"Volume could not be changed.", nil);
  }
}
@end

@interface SmartVolumeStorage : NSObject <RCTBridgeModule>
@end
@implementation SmartVolumeStorage
RCT_EXPORT_MODULE()
+ (BOOL)requiresMainQueueSetup { return NO; }
RCT_REMAP_METHOD(get, key:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  resolve([[NSUserDefaults standardUserDefaults] stringForKey:key]);
}
RCT_REMAP_METHOD(set,
                 key:(NSString *)key value:(NSString *)value
                 resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  [[NSUserDefaults standardUserDefaults] setObject:value forKey:key];
  resolve(nil);
}
RCT_REMAP_METHOD(remove, key:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  [[NSUserDefaults standardUserDefaults] removeObjectForKey:key];
  resolve(nil);
}
@end
