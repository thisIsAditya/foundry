import config from '@foundry/config/eslint';

export default [
  ...config,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next',
              message: '@foundry/observability must not import Next.js.',
            },
            {
              name: 'react',
              message: '@foundry/observability must not import React.',
            },
          ],
        },
      ],
    },
  },
];
