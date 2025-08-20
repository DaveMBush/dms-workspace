import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/rms',
  plugins: [],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    reporters: ['default'],
    passWithNoTests: true, // Allow passing when no tests are found
    coverage: {
      reportsDirectory: '../../coverage/apps/rms',
      provider: 'v8' as const,
    },
  },
});
