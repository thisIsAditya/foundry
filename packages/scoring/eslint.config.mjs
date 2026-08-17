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
              message: '@foundry/scoring must not import postgres.js.',
            },
            {
              name: 'next',
              message: '@foundry/scoring must not import Next.js.',
            },
          ],
        },
      ],
    },
  },
];
