#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SmartVolumeAudioEngine, NSObject)
RCT_EXTERN_METHOD(start:(double)durationMs
                  calibrationOffsetDb:(double)calibrationOffsetDb
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cancel)
@end
