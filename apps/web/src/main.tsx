import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRegistry } from 'react-native';
import { SmartVolumeApp } from '@smartvolume/app/SmartVolumeApp';
import './styles.css';

AppRegistry.registerComponent('SmartVolume', () => SmartVolumeApp);
const root = createRoot(document.getElementById('root')!);
root.render(<SmartVolumeApp />);
