import type { Calibration, SoundMetrics } from '@smartvolume/domain/models';

export interface AggregateFrame { energy: number; count: number; peak: number; clipped: number }

export class MeasurementAccumulator {
  private energy = 0;
  private count = 0;
  private peak = 0;
  private clipped = 0;
  private levels: number[] = [];
  private startedAt = 0;

  start(now = performance.now()) { this.energy = 0; this.count = 0; this.peak = 0; this.clipped = 0; this.levels = []; this.startedAt = now; }
  add(frame: AggregateFrame) {
    if (frame.count <= 0 || frame.energy < 0) return;
    this.energy += frame.energy;
    this.count += frame.count;
    this.peak = Math.max(this.peak, frame.peak);
    this.clipped += frame.clipped;
    this.levels.push(toDb(Math.sqrt(frame.energy / frame.count)));
  }
  finish(calibration: Calibration, now = performance.now()): SoundMetrics {
    const durationMs = Math.max(0, now - this.startedAt);
    const offset = calibration.source === 'none' ? 0 : calibration.offsetDb;
    const sorted = [...this.levels].sort((a, b) => a - b);
    const leq = this.count ? toDb(Math.sqrt(this.energy / this.count)) + offset : -120;
    const clippedRatio = this.count ? this.clipped / this.count : 0;
    const quality = durationMs < 1000 ? 'too-short' : clippedRatio > 0.001 ? 'clipped' : leq < -90 ? 'too-quiet' : 'good';
    return {
      leq: round(leq), peak: round(toDb(this.peak) + offset),
      percentile10: round(percentile(sorted, 0.9) + offset),
      percentile50: round(percentile(sorted, 0.5) + offset),
      percentile90: round(percentile(sorted, 0.1) + offset),
      clippedRatio, durationMs: Math.round(durationMs),
      unit: calibration.source === 'none' ? 'relative-dBFS-A' : 'estimated-dBA', quality
    };
  }
}

const toDb = (amplitude: number) => amplitude > 0 ? 20 * Math.log10(amplitude) : -120;
const round = (value: number) => Math.round(value * 10) / 10;
const percentile = (values: number[], ratio: number) => values.length ? values[Math.min(values.length - 1, Math.floor(ratio * values.length))] : -120;
