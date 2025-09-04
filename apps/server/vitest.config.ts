import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/server',
  plugins: [],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/server',
      provider: 'v8' as const,
    },
    env: {
      DATABASE_PROVIDER: 'sqlite',
      DATABASE_URL: 'file:./test-database.db',
      NODE_ENV: 'test',
    },
  },
  // Avoid eslint parserOptions.project errors by keeping this file simple
});
