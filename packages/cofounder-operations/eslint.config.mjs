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
              message:
                '@foundry/cofounder-operations must not import @foundry/db; persist through injected ports.',
            },
            {
              name: 'postgres',
              message: '@foundry/cofounder-operations must not import postgres.js.',
            },
            {
              name: 'next',
              message: '@foundry/cofounder-operations must not import Next.js.',
            },
          ],
        },
      ],
    },
  },
];
