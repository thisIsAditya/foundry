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
              message: '@foundry/ui-native must not import @foundry/db.',
            },
            {
              name: 'next',
              message: '@foundry/ui-native must not import Next.js.',
            },
          ],
        },
      ],
    },
  },
];
