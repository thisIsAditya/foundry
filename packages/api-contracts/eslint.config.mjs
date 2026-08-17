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
              name: '@foundry/db',
              message: '@foundry/api-contracts must not import @foundry/db.',
            },
            {
              name: 'next',
              message: '@foundry/api-contracts must not import Next.js.',
            },
            {
              name: 'postgres',
              message: '@foundry/api-contracts must not import postgres.js.',
            },
          ],
        },
      ],
    },
  },
];
