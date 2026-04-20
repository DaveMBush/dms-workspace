import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['**/main.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
