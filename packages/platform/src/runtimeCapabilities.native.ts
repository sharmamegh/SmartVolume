import { NativeModules, Platform } from 'react-native';
import type { PlatformCapabilities, PlatformKind } from './capabilities';

const nativeVolume = NativeModules.SmartVolumeControl as {
  isAvailable(): Promise<boolean>;
  apply(percent: number): Promise<void>;
};

export function getPlatformCapabilities(): PlatformCapabilities {
  const platform = Platform.OS as PlatformKind;
  return {
    platform,
    canMeasure: true,
    volumeControl: platform === 'android'
      ? 'direct'
      : platform === 'ios'
        ? 'system-ui'
        : 'runtime-check',
    async applyVolume(percent: number) {
      if (!(await nativeVolume.isAvailable())) {
        throw new Error('The active audio route does not allow volume control.');
      }
      await nativeVolume.apply(Math.max(0, Math.min(100, percent)));
    },
  };
}
