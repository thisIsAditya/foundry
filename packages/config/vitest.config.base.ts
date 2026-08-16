import type { ViteUserConfig } from 'vitest/config';

const base: ViteUserConfig = {
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
};

export default base;
