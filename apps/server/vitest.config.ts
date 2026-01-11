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
    // Use unique database file per worker for isolation
    // Vitest automatically provides a unique workerId for each worker
    env: {
      DATABASE_PROVIDER: 'sqlite',
      DATABASE_URL: 'file:./test-database-{workerId}.db',
      NODE_ENV: 'test',
    },
    // Ensure tests run in isolated pools to prevent database conflicts
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    // Clean up test databases after all tests complete
    globalTeardown: './vitest.teardown.ts',
  },
  // Avoid eslint parserOptions.project errors by keeping this file simple
});
