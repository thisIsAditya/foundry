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
              message: '@foundry/document-intelligence must not import @foundry/db.',
            },
            {
              name: 'postgres',
              message: '@foundry/document-intelligence must not import postgres.js.',
            },
            {
              name: 'next',
              message: '@foundry/document-intelligence must not import Next.js.',
            },
          ],
        },
      ],
    },
  },
];
