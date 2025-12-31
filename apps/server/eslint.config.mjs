import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
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
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-ignored-exceptions': 'off',
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
