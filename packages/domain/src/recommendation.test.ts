import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type SoundMetrics } from './models';
import { recommendVolume } from './recommendation';
const metrics: SoundMetrics = { leq: -30, peak: -12, percentile10: -25, percentile50: -32, percentile90: -40, clippedRatio: 0, durationMs: 5000, unit: 'relative-dBFS-A', quality: 'good' };
describe('recommendVolume', () => {
  it('returns a bounded recommendation', () => {
    const result = recommendVolume(metrics, DEFAULT_SETTINGS);
    expect(result.percent).toBeGreaterThanOrEqual(10);
    expect(result.percent).toBeLessThanOrEqual(DEFAULT_SETTINGS.maxRecommendedVolume);
  });
  it('falls back for invalid measurements', () => {
    expect(recommendVolume({ ...metrics, quality: 'clipped' }, DEFAULT_SETTINGS).confidence).toBe('low');
  });
  it('uses the calibrated sound-level range for estimated dBA', () => {
    const calibrated = recommendVolume(
      { ...metrics, leq: 30, unit: 'estimated-dBA' },
      { ...DEFAULT_SETTINGS, calibration: { source: 'reference-meter', offsetDb: 80 } },
    );
    expect(calibrated.percent).toBe(DEFAULT_SETTINGS.preferredBaseline);
    expect(calibrated.confidence).toBe('high');
  });
});
