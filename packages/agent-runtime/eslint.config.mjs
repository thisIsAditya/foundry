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
                '@foundry/agent-runtime must not import @foundry/db; persist through injected IO.',
            },
            {
              name: 'postgres',
              message: '@foundry/agent-runtime must not import postgres.js.',
            },
            {
              name: 'next',
              message: '@foundry/agent-runtime must not import Next.js.',
            },
          ],
        },
      ],
    },
  },
];
