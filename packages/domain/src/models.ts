export type MeasurementUnit = 'relative-dBFS-A' | 'estimated-dBA';
export type SessionStatus = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'completed' | 'cancelled' | 'failed';

export interface Calibration {
  offsetDb: number;
  source: 'none' | 'reference-meter' | 'factory-profile';
  updatedAt?: string;
}

export interface SoundMetrics {
  leq: number;
  peak: number;
  percentile10: number;
  percentile50: number;
  percentile90: number;
  clippedRatio: number;
  durationMs: number;
  unit: MeasurementUnit;
  quality: 'good' | 'too-quiet' | 'clipped' | 'too-short';
}

export interface Recommendation {
  percent: number;
  confidence: 'low' | 'medium' | 'high';
  rationale: string;
  cappedForSafety: boolean;
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  metrics: SoundMetrics;
  recommendation: Recommendation;
}

export interface Settings {
  sessionSeconds: number;
  preferredBaseline: number;
  maxRecommendedVolume: number;
  calibration: Calibration;
  diagnosticsOptIn: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sessionSeconds: 5,
  preferredBaseline: 42,
  maxRecommendedVolume: 75,
  calibration: { offsetDb: 0, source: 'none' },
  diagnosticsOptIn: false
};
