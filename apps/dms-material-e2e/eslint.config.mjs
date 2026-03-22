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
      'sonarjs/todo-tag': 'off',
    },
  },
];
