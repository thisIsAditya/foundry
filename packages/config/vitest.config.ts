import base from './vitest.config.base.ts';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    passWithNoTests: false,
  },
});
