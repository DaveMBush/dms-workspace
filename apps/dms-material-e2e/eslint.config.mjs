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
];
