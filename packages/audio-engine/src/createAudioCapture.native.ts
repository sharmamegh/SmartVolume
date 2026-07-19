import type { SoundMetrics } from '@smartvolume/domain/models';
import { PermissionsAndroid, Platform } from 'react-native';
import NativeAudioEngine from '../native/NativeAudioEngine';
import type { AudioCapture } from './webAudioCapture';

export function createAudioCapture(): AudioCapture {
  return {
    async analyze(durationSeconds, calibration, callbacks, signal): Promise<SoundMetrics> {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Microphone permission was not granted.');
        }
      }
      signal.addEventListener('abort', () => NativeAudioEngine.cancel(), { once: true });
      callbacks.onProgress(0);
      const startedAt = Date.now();
      const progressTimer = setInterval(() => {
        callbacks.onProgress((Date.now() - startedAt) / (durationSeconds * 1000));
      }, 250);
      try {
        const payload = await NativeAudioEngine.start(
          durationSeconds * 1000,
          calibration.source === 'none' ? 0 : calibration.offsetDb,
        );
        callbacks.onProgress(1);
        return JSON.parse(payload) as SoundMetrics;
      } finally {
        clearInterval(progressTimer);
      }
    },
  };
}
