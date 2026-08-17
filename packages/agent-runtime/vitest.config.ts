import base from '@foundry/config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    passWithNoTests: false,
  },
});
