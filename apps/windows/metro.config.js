const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const fs = require('fs');
const path = require('path');
const rnwPath = fs.realpathSync(
  path.resolve(require.resolve('react-native-windows/package.json'), '..'),
);

//

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */

const config = {
  watchFolders: [path.resolve(__dirname, '../..')],
  resolver: {
    extraNodeModules: {
      'react-native': path.resolve(
        require.resolve('react-native/package.json'),
        '..',
      ),
      '@smartvolume/app': path.resolve(__dirname, '../../packages/app/src'),
      '@smartvolume/audio': path.resolve(__dirname, '../../packages/audio-engine/src'),
      '@smartvolume/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@smartvolume/platform': path.resolve(__dirname, '../../packages/platform/src'),
      '@smartvolume/storage': path.resolve(__dirname, '../../packages/storage/src'),
      '@smartvolume/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
    blockList: [
      // This stops "npx @react-native-community/cli run-windows" from causing the metro server to crash if its already running
      new RegExp(
        `${path.resolve(__dirname, 'windows').replace(/[/\\]/g, '/')}.*`,
      ),
      // This prevents "npx @react-native-community/cli run-windows" from hitting: EBUSY: resource busy or locked, open msbuild.ProjectImports.zip or other files produced by msbuild
      new RegExp(`${rnwPath}/build/.*`),
      new RegExp(`${rnwPath}/target/.*`),
      /.*\.ProjectImports\.zip/,
    ],
    nodeModulesPaths: [
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, 'node_modules'),
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
