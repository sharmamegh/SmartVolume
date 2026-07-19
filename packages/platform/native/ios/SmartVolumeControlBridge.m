#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SmartVolumeControl, NSObject)
RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(apply:(double)percent
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
