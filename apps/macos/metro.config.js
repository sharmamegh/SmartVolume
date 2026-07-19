const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '../..');
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [path.join(workspaceRoot, 'packages')],
  resolver: {
    platforms: ['macos', 'native'],
    extraNodeModules: {
      'react-native': path.join(__dirname, 'node_modules/react-native-macos'),
    },
    nodeModulesPaths: [
      path.join(workspaceRoot, 'node_modules'),
      path.join(__dirname, 'node_modules'),
    ],
  },
});
