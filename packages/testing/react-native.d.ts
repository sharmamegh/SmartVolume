declare module 'react-native' {
  import type React from 'react';

  export const AppRegistry: {
    registerComponent(name: string, getComponent: () => React.ComponentType<any>): void;
  };
  export const Pressable: React.ComponentType<any>;
  export const ScrollView: React.ComponentType<any>;
  export const Switch: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const TextInput: React.ComponentType<any>;
  export const View: React.ComponentType<any>;
  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
  };
}
