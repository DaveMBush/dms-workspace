import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'import/no-default-export': 'off',
      // Electron main process is Node.js (not Angular/RxJS) - Observables not applicable
      'no-restricted-syntax': 'off',
      // Electron callbacks wrap Node.js APIs that don't support async natively
      '@typescript-eslint/promise-function-async': 'off',
    },
  },
  {
    files: ['**/main.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
