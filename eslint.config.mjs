import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist', 'coverage', '**/native/**', '**/cpp/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
        AudioWorkletProcessor: 'readonly',
        currentTime: 'readonly',
        registerProcessor: 'readonly',
        sampleRate: 'readonly'
      }
    },
  }
];
