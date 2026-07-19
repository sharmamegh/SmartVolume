import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      '@smartvolume/app': fileURLToPath(new URL('../../packages/app/src', import.meta.url)),
      '@smartvolume/domain': fileURLToPath(new URL('../../packages/domain/src', import.meta.url)),
      '@smartvolume/audio': fileURLToPath(new URL('../../packages/audio-engine/src', import.meta.url)),
      '@smartvolume/platform': fileURLToPath(new URL('../../packages/platform/src', import.meta.url)),
      '@smartvolume/storage': fileURLToPath(new URL('../../packages/storage/src', import.meta.url)),
      '@smartvolume/ui': fileURLToPath(new URL('../../packages/ui/src', import.meta.url))
    }
  },
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  build: { outDir: fileURLToPath(new URL('../../dist/web', import.meta.url)), emptyOutDir: true }
});
