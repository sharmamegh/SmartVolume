import type { Calibration, SoundMetrics } from '@smartvolume/domain/models';
import { MeasurementAccumulator, type AggregateFrame } from './accumulator';

export interface CaptureCallbacks {
  onProgress(progress: number, level?: number): void;
}

export interface AudioCapture {
  analyze(durationSeconds: number, calibration: Calibration, callbacks: CaptureCallbacks, signal: AbortSignal): Promise<SoundMetrics>;
}

export class WebAudioCapture implements AudioCapture {
  async analyze(durationSeconds: number, calibration: Calibration, callbacks: CaptureCallbacks, signal: AbortSignal): Promise<SoundMetrics> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is unavailable in this browser.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const context = new AudioContext({ sampleRate: 48000 });
    const accumulator = new MeasurementAccumulator();
    accumulator.start();
    let timer = 0;
    try {
      await context.audioWorklet.addModule('/meter-worklet.js');
      const source = context.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(context, 'smartvolume-meter');
      const silent = context.createGain();
      silent.gain.value = 0;
      source.connect(worklet).connect(silent).connect(context.destination);
      const startedAt = performance.now();
      worklet.port.onmessage = ({ data }: MessageEvent<AggregateFrame>) => {
        accumulator.add(data);
        const elapsed = performance.now() - startedAt;
        const live = data.count ? 10 * Math.log10(Math.max(Number.EPSILON, data.energy / data.count)) : undefined;
        callbacks.onProgress(elapsed / (durationSeconds * 1000), live);
      };
      await new Promise<void>((resolve, reject) => {
        timer = window.setTimeout(resolve, durationSeconds * 1000);
        signal.addEventListener('abort', () => reject(new DOMException('Analysis cancelled', 'AbortError')), { once: true });
      });
      return accumulator.finish(calibration);
    } finally {
      clearTimeout(timer);
      stream.getTracks().forEach(track => track.stop());
      await context.close().catch(() => undefined);
    }
  }
}
