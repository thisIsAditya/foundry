import config from '@foundry/config/eslint';
import globals from 'globals';

export default [
  ...config,
  {
    ignores: ['.expo/**', 'dist/**', 'babel.config.js', 'metro.config.js'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
