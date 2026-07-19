#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN
@interface SmartVolumeMeterBridge : NSObject
- (void)reset;
- (void)resetWithSampleRate:(double)sampleRate;
- (void)process:(const float *)samples count:(NSUInteger)count;
- (NSString *)finishWithCalibrationOffset:(double)offset durationMs:(double)durationMs;
@end
NS_ASSUME_NONNULL_END
