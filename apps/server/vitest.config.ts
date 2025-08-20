import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  // Avoid eslint parserOptions.project errors by keeping this file simple
});


