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
              message: '@foundry/policy must not import postgres.js.',
            },
            {
              name: 'next',
              message: '@foundry/policy must not import Next.js.',
            },
          ],
        },
      ],
    },
  },
];
