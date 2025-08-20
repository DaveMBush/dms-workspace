import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0,
        },
      },
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '.nx/',
        'tmp/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test-utils/**',
        '**/coverage/**',
        '**/dist/**',
        '**/.nx/**',
        '**/tmp/**',
        '**/build/**',
        '**/.vite/**',
        '**/node_modules/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.spec.js',
        '**/*.test.js',
        '**/vitest.config.*',
        '**/vitest.workspace.*',
        '**/vite.config.*',
        '**/tsconfig.*',
        '**/eslint.config.*',
        '**/nx.json',
        '**/package.json',
        '**/pnpm-lock.yaml',
        '**/.gitignore',
        '**/.eslintrc.*',
        '**/.prettierrc.*',
      ],
    },
    include: [
      'apps/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'libs/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'coverage/',
      '.nx/',
      'tmp/',
      '**/*.d.ts',
      '**/*.config.*',
    ],
  },
  resolve: {
    alias: {
      '@node-quant': resolve(__dirname, './'),
    },
  },
});
