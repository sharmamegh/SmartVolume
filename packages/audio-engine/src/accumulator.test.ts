import { describe, expect, it, vi } from 'vitest';
import { MeasurementAccumulator } from './accumulator';
describe('MeasurementAccumulator', () => {
  it('aggregates bounded frame metrics and applies calibration', () => {
    vi.stubGlobal('performance', { now: () => 2000 });
    const meter = new MeasurementAccumulator();
    meter.start(0);
    meter.add({ energy: 25, count: 100, peak: 0.5, clipped: 0 });
    const result = meter.finish({ offsetDb: 10, source: 'reference-meter' }, 2000);
    expect(result.leq).toBeCloseTo(4, 0);
    expect(result.unit).toBe('estimated-dBA');
    expect(result.quality).toBe('good');
    vi.unstubAllGlobals();
  });
  it('rejects short sessions', () => {
    const meter = new MeasurementAccumulator();
    meter.start(0);
    expect(meter.finish({ offsetDb: 0, source: 'none' }, 500).quality).toBe('too-short');
  });
});
