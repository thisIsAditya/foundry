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
              message: '@foundry/ui must not import @foundry/db.',
            },
            {
              name: 'next',
              message: '@foundry/ui must not import Next.js.',
            },
            {
              name: 'react-native',
              message: 'React Native primitives belong in @foundry/ui-native.',
            },
          ],
        },
      ],
    },
  },
];
