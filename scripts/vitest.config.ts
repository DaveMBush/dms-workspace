import { defineConfig } from 'vitest/config';

// Vitest config for the repo-root `scripts/` directory (seed scripts, etc.).
// Kept separate from apps/server so unit tests for top-level scripts can run as
// their own nx project (`nx run scripts:test`) without dragging in the server's
// Prisma/sqlite test environment or 100% coverage gate.
// eslint-disable-next-line import/no-default-export -- vitest requires a default export
export default defineConfig({
  root: __dirname,
  cacheDir: '../node_modules/.vite/scripts',
  plugins: [],
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.spec.ts'],
    reporters: ['default'],
  },
});
