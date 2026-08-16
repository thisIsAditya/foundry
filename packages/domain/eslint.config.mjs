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
              name: 'postgres',
              message: '@foundry/domain must not import postgres.js.',
            },
            {
              name: 'ai',
              message: '@foundry/domain must not import the AI SDK.',
            },
            {
              name: 'react',
              message: '@foundry/domain must not import React.',
            },
            {
              name: 'next',
              message: '@foundry/domain must not import Next.js.',
            },
          ],
        },
      ],
    },
  },
];
