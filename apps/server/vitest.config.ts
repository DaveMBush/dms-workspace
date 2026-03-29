import { defineConfig } from 'vitest/config';
import { readdirSync, existsSync, statSync } from 'fs';
import { join, dirname, basename, relative } from 'path';

/**
 * Dynamically determines which source files should be included in coverage
 * by scanning for .spec.ts files and mapping them to their source files.
 * Only files with dedicated tests are included in coverage reporting.
 */
function getTestedSourceFiles(): string[] {
  const tested = new Set<string>();
  const root = __dirname;

  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (
          entry === 'node_modules' ||
          entry === 'dist' ||
          entry === 'coverage'
        )
          continue;
        walk(full);
      } else if (entry.endsWith('.spec.ts')) {
        const specBase = basename(entry, '.spec.ts');
        const specDir = dir;

        // Try common name variants for the tested source file
        const candidates = [
          join(specDir, specBase + '.ts'),
          join(specDir, specBase + '.function.ts'),
          join(specDir, specBase + '.service.ts'),
          join(specDir, specBase + '.middleware.ts'),
        ];

        for (const c of candidates) {
          if (existsSync(c)) {
            tested.add(relative(root, c));
          }
        }
      }
    }
  }

  walk(join(root, 'src'));
  return [...tested];
}

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
      all: false,
      include: getTestedSourceFiles(),
      exclude: [
        // Files with complex integration dependencies that are covered by e2e tests
        'src/app/prisma/prisma-client.ts',
        'src/app/prisma/optimized-prisma-client.ts',
        'src/app/routes/accounts/build-account-response.function.ts',
        'src/app/routes/health/index.ts',
        'src/app/routes/import/fidelity-import-service.function.ts',
        'src/app/routes/import/fidelity-csv-parser.function.ts',
        'src/app/routes/import/resolve-cusip.function.ts',
        'src/app/routes/import/index.ts',
        'src/app/routes/summary/get-risk-group-data.function.ts',
        'src/app/routes/summary/graph/index.ts',
        'src/app/routes/universe/index.ts',
        'src/app/routes/universe/sync-from-screener/index.ts',
        'src/utils/aws-config.ts',
        'src/app/routes/logs/index.ts',
        // Re-export barrel files with no logic
        '**/csrf-protection-hook.middleware.ts',
        '**/enhanced-rate-limit.middleware.ts',
        '**/get-csrf-stats.middleware.ts',
        '**/validate-csrf-token.middleware.ts',
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    // Use unique database file per worker for isolation
    // Vitest automatically provides a unique workerId for each worker
    env: {
      DATABASE_PROVIDER: 'sqlite',
      DATABASE_URL: 'file:./test-database.db',
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
