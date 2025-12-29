import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/dms',
  plugins: [],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    reporters: ['default'],
    passWithNoTests: true, // Allow passing when no tests are found
    coverage: {
      reportsDirectory: '../../coverage/apps/dms',
      provider: 'v8' as const,
    },
    env: {
      DATABASE_PROVIDER: 'sqlite',
      DATABASE_URL: 'file:./test-database.db',
      NODE_ENV: 'test',
    },
  },
});
