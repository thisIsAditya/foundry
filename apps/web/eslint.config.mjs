import config from '@foundry/config/eslint';
import globals from 'globals';

export default [
  ...config,
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/trpc/provider.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['lib/auth.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'pg',
              message: 'pg is allowed only in lib/auth.ts (00-tech-stack §8).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['server/**/*.ts'],
    ignores: ['server/trpc.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='process'][callee.property.name='env']",
          message:
            'Read environment variables only through lib/env.ts (see 02-web-frontend-architecture.md §9).',
        },
        {
          selector: "Identifier[name='publicProcedure']",
          message:
            'Do not use publicProcedure outside server/trpc.ts; workspace.create uses protectedProcedure (05 §4).',
        },
      ],
    },
  },
];
