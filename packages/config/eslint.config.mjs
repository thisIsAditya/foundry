import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      '**/cdk.out/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        tsconfigRootDir: repoRoot,
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: path.join(repoRoot, 'packages/domain'),
              from: [
                path.join(repoRoot, 'packages/db'),
                path.join(repoRoot, 'packages/agent-runtime'),
                path.join(repoRoot, 'packages/tools'),
                path.join(repoRoot, 'packages/document-intelligence'),
                path.join(repoRoot, 'packages/artifacts'),
                path.join(repoRoot, 'packages/policy'),
                path.join(repoRoot, 'apps'),
              ],
            },
            {
              target: [
                path.join(repoRoot, 'apps/web/app/(marketing)'),
                path.join(repoRoot, 'apps/web/app/(app)'),
                path.join(repoRoot, 'apps/web/components'),
                path.join(repoRoot, 'apps/web/lib/trpc/client.ts'),
              ],
              from: [
                path.join(repoRoot, 'packages/db'),
                path.join(repoRoot, 'packages/agent-runtime'),
                path.join(repoRoot, 'packages/tools'),
              ],
            },
            {
              target: path.join(repoRoot, 'apps/mobile'),
              from: [
                path.join(repoRoot, 'packages/db'),
                path.join(repoRoot, 'packages/agent-runtime'),
                path.join(repoRoot, 'packages/tools'),
              ],
            },
            {
              target: path.join(repoRoot, 'packages/document-intelligence'),
              from: [
                path.join(repoRoot, 'apps'),
                path.join(repoRoot, 'packages/db'),
                path.join(repoRoot, 'packages/agent-runtime'),
                path.join(repoRoot, 'packages/tools'),
                path.join(repoRoot, 'packages/artifacts'),
              ],
            },
            {
              target: path.join(repoRoot, 'apps/web'),
              from: [
                path.join(repoRoot, 'apps/worker'),
                path.join(repoRoot, 'packages/document-intelligence'),
                path.join(repoRoot, 'packages/tools'),
              ],
            },
            {
              target: path.join(repoRoot, 'apps/worker'),
              from: [path.join(repoRoot, 'apps/web'), path.join(repoRoot, 'apps/mobile')],
            },
            {
              target: path.join(repoRoot, 'infra/cdk'),
              from: [
                path.join(repoRoot, 'apps'),
                path.join(repoRoot, 'packages/agent-runtime'),
                path.join(repoRoot, 'packages/db'),
              ],
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='process'][callee.property.name='env']",
          message:
            'Read environment variables only through lib/env.ts (see 02-web-frontend-architecture.md §9).',
        },
      ],
    },
  },
  {
    files: ['**/env.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
);
