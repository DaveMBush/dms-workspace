import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      'sonarjs/todo-tag': 'off', // Allow TODO(E3) deferred-test annotations
      'sonarjs/no-unused-vars': 'off', // Allow unused vars with _ prefix
      'no-console': 'off', // E2E tests use console for debugging
      'no-underscore-dangle': 'off', // Allow _ prefix for unused vars
      '@typescript-eslint/naming-convention': [
        'error',
        // Allow all formats for const declarations in test files
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
      ],
    },
  },
  {
    // E2E test helpers use Prisma and dynamic patterns that require unsafe access
    files: ['**/helpers/**/*.ts', '**/helpers/**/*.js'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
      ],
      'sonarjs/todo-tag': 'off',
    },
  },
  {
    // E2E test helpers use Prisma and dynamic patterns that require unsafe access
    files: ['**/helpers/**/*.ts', '**/helpers/**/*.js'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE'],
        },
      ],
      'sonarjs/todo-tag': 'off',
    },
  },
];
