#import "SmartVolumeMeterBridge.h"
#include "smartvolume/Meter.h"
#include <memory>

@implementation SmartVolumeMeterBridge {
  std::unique_ptr<smartvolume::Meter> _meter;
}
- (instancetype)init {
  if ((self = [super init])) _meter = std::make_unique<smartvolume::Meter>();
  return self;
}
- (void)reset { _meter->reset(); }
- (void)resetWithSampleRate:(double)sampleRate {
  _meter = std::make_unique<smartvolume::Meter>(sampleRate);
  _meter->reset();
}
- (void)process:(const float *)samples count:(NSUInteger)count {
  _meter->process(samples, count);
}
- (NSString *)finishWithCalibrationOffset:(double)offset durationMs:(double)durationMs {
  const auto value = _meter->metrics();
  const auto quality = durationMs < 1000 ? "too-short"
      : value.clippedRatio > 0.001 ? "clipped"
      : value.leqDbfsA + offset < -90 ? "too-quiet" : "good";
  NSDictionary *payload = @{
    @"leq": @(value.leqDbfsA + offset),
    @"peak": @(value.peakDbfs + offset),
    @"percentile10": @(value.percentile10 + offset),
    @"percentile50": @(value.percentile50 + offset),
    @"percentile90": @(value.percentile90 + offset),
    @"clippedRatio": @(value.clippedRatio),
    @"durationMs": @(durationMs),
    @"unit": offset == 0 ? @"relative-dBFS-A" : @"estimated-dBA",
    @"quality": [NSString stringWithUTF8String:quality]
  };
  NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
  return [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
}
@end
