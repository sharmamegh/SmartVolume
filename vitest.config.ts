import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      '@smartvolume/app': fileURLToPath(new URL('./packages/app/src', import.meta.url)),
      '@smartvolume/domain': fileURLToPath(new URL('./packages/domain/src', import.meta.url)),
      '@smartvolume/audio': fileURLToPath(new URL('./packages/audio-engine/src', import.meta.url)),
      '@smartvolume/platform': fileURLToPath(new URL('./packages/platform/src', import.meta.url)),
      '@smartvolume/storage': fileURLToPath(new URL('./packages/storage/src', import.meta.url)),
      '@smartvolume/ui': fileURLToPath(new URL('./packages/ui/src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./packages/testing/setup.ts'],
    exclude: ['tests/e2e/**', '**/node_modules/**', 'dist/**'],
    coverage: { reporter: ['text', 'html'], include: ['packages/**/src/**/*.{ts,tsx}'] }
  }
});
