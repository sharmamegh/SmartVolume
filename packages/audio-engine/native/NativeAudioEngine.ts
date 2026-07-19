import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
export interface Spec extends TurboModule {
  start(durationMs: number, calibrationOffsetDb: number): Promise<string>;
  cancel(): void;
}
export default TurboModuleRegistry.getEnforcing<Spec>('SmartVolumeAudioEngine');
