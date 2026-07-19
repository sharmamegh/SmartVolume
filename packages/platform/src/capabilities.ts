export type PlatformKind = 'android' | 'ios' | 'web' | 'windows' | 'macos';
export interface PlatformCapabilities {
  platform: PlatformKind;
  canMeasure: boolean;
  volumeControl: 'direct' | 'system-ui' | 'guidance' | 'runtime-check';
  applyVolume(percent: number): Promise<void>;
}

export const webCapabilities: PlatformCapabilities = {
  platform: 'web',
  canMeasure: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
  volumeControl: 'guidance',
  async applyVolume() { throw new Error('Browsers cannot change system volume. Use your device volume controls.'); }
};
