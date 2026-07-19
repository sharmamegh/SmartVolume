import { NativeModules } from 'react-native';
import { createLocalRepository, type KeyValueStore } from './repositoryCore';

const nativeStorage = NativeModules.SmartVolumeStorage as {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

const store: KeyValueStore = {
  get: key => nativeStorage.get(key),
  set: (key, value) => nativeStorage.set(key, value),
  remove: key => nativeStorage.remove(key),
};

export * from './repositoryCore';
export const repository = createLocalRepository(store);
