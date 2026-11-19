import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    ignores: [
      'vitest.config.ts',
      'vitest.teardown.ts',
      'coverage/**',
      'eslint.config.mjs',
    ],
  },
  {
    // Story 24.2 (AC #1): enforce alphabetical import ordering in the server
    // app. Lives here rather than in the root config because `nx lint server`
    // runs eslint with cwd=apps/server, where a root-relative glob like
    // `apps/server/**/*.ts` would match nothing and silently disable the rule.
    // The plugin is registered by baseConfig; only the rule is added here.
    // `import-order-fixture.ts` is deliberately mis-ordered for Story 24.1 AC #2
    // and must stay that way — it is the canary naming-and-import-order.spec.ts
    // lints to prove this rule fires.
    files: ['src/**/*.ts'],
    rules: {
      'import/order': ['error', { alphabetize: { order: 'asc' } }],
    },
  },
  {
    // The canary fixture must stay mis-ordered (see above); exempt it from
    // this rule so `nx lint server` stays green while the root-config canary
    // still proves the rule fires.
    files: ['src/app/routes/import-order-fixture.ts'],
    rules: { 'import/order': 'off' },
  },
  {
    files: ['**/*.ts'],
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          selector: ['classMethod'],
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
        },
        {
          selector: 'classProperty',
          format: ['camelCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: 'objectLiteralProperty',
          format: null,
        },
        {
          selector: 'parameter',
          custom: {
            regex: '^_*$|^[a-z0-9]{1,}([A-Z][a-z0-9]{0,}){0,}\\$?$',
            match: true,
          },
          format: null,
        },
        {
          selector: 'parameter',
          modifiers: ['destructured'],
          format: null,
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'typeProperty',
          format: ['camelCase', 'snake_case', 'PascalCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          modifiers: ['destructured'],
          format: null,
        },
      ],
    },
  },
  {
    files: ['**/main.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'no-console': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-ignored-exceptions': 'off',
      'sonarjs/todo-tag': 'off', // Allow TODO(E82) deferred-test annotations
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@smarttools/no-anonymous-functions': 'off',
      '@typescript-eslint/no-shadow': 'off', // Allow shadowing in vi.hoisted() pattern
      '@typescript-eslint/return-await': 'off', // Allow returning non-promise values from async test functions
    },
  },
  {
    files: [
      '**/prisma/prisma-client.ts',
      '**/routes/health/index.ts',
      '**/utils/aws-config.ts',
    ],
    rules: {
      '@smarttools/one-exported-item-per-file': 'off',
      'no-console': 'off',
      '@smarttools/no-anonymous-functions': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'max-depth': 'off',
      'sonarjs/no-ignored-exceptions': 'off',
      'unused-imports/no-unused-vars': 'off',
      'no-restricted-syntax': 'off',
    },
  },
];
