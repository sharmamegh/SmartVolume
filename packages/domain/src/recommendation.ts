import type { Recommendation, Settings, SoundMetrics } from './models';

export function recommendVolume(metrics: SoundMetrics, settings: Settings): Recommendation {
  if (!Number.isFinite(metrics.leq) || metrics.quality !== 'good') {
    return { percent: settings.preferredBaseline, confidence: 'low', rationale: 'A reliable measurement is required.', cappedForSafety: false };
  }
  const normalizedInput = metrics.unit === 'estimated-dBA'
    ? (metrics.leq - 30) / 55
    : (metrics.leq + 55) / 45;
  const normalized = Math.max(0, Math.min(1, normalizedInput));
  const proposed = Math.round(settings.preferredBaseline + normalized * 38);
  const cap = Math.min(80, settings.maxRecommendedVolume);
  const percent = Math.max(10, Math.min(cap, proposed));
  return {
    percent,
    confidence: settings.calibration.source === 'none' ? 'medium' : 'high',
    rationale: settings.calibration.source === 'none'
      ? 'Based on a relative A-weighted measurement. Calibrate for an estimated sound level.'
      : 'Based on your calibrated A-weighted ambient sound level.',
    cappedForSafety: proposed > cap
  };
}
