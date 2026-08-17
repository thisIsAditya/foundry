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
              message: '@foundry/worker must not import Next.js.',
            },
            {
              name: 'react',
              message: '@foundry/worker must not import React.',
            },
          ],
        },
      ],
    },
  },
];
