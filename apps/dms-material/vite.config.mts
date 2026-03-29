/// <reference types='vitest' />
import angular from '@analogjs/vite-plugin-angular';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { existsSync, readdirSync, statSync } from 'fs';
import { basename, join, relative } from 'path';
import { defineConfig } from 'vite';

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
          join(specDir, specBase + '.component.ts'),
          join(specDir, specBase + '.service.ts'),
          join(specDir, specBase + '.pipe.ts'),
          join(specDir, specBase + '.directive.ts'),
          join(specDir, specBase + '.function.ts'),
          join(specDir, specBase + '.guard.ts'),
          join(specDir, specBase + '.interceptor.ts'),
          join(specDir, specBase + '.resolver.ts'),
          join(specDir, specBase + '.store.ts'),
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

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/dms-material',
  plugins: [angular(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  test: {
    name: 'dms-material',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/dms-material',
      provider: 'v8' as const,
      all: false,
      include: getTestedSourceFiles(),
      exclude: [
        // Files with insufficient test coverage for 100% thresholds
        'src/app/account-panel/account-panel.component.ts',
        'src/app/account-panel/div-dep-modal/div-dep-modal.component.ts',
        'src/app/account-panel/dividend-deposits/dividend-deposits-component.service.ts',
        'src/app/account-panel/dividend-deposits/dividend-deposits.component.ts',
        'src/app/account-panel/open-positions/open-positions-component.service.ts',
        'src/app/account-panel/open-positions/open-positions.component.ts',
        'src/app/account-panel/sold-positions/sold-positions-component.service.ts',
        'src/app/account-panel/sold-positions/sold-positions.component.ts',
        'src/app/accounts/account-component.service.ts',
        'src/app/accounts/account.ts',
        'src/app/accounts/account-summary/account-summary.ts',
        'src/app/auth/auth.service.ts',
        'src/app/auth/interceptors/auth.interceptor.ts',
        'src/app/auth/interceptors/sort.interceptor.ts',
        'src/app/auth/login/login.ts',
        'src/app/auth/profile/components/profile-info-card.ts',
        'src/app/auth/services/activity-tracking.service.ts',
        'src/app/auth/services/auth-metrics.service.ts',
        'src/app/auth/services/profile-actions.service.ts',
        'src/app/auth/services/profile.service.ts',
        'src/app/auth/services/session-manager.service.ts',
        'src/app/auth/services/session-timer.service.ts',
        'src/app/auth/services/token-refresh.service.ts',
        'src/app/auth/services/user-state.service.ts',
        'src/app/global/global-summary.ts',
        'src/app/global/cusip-cache/cusip-cache-admin.service.ts',
        'src/app/global/global-screener/global-screener.component.ts',
        'src/app/global/global-screener/services/screener.service.ts',
        'src/app/global/global-universe/global-universe.component.ts',
        'src/app/global/global-universe/save-universe-filters-and-notify.function.ts',
        'src/app/global/global-universe/services/universe-validation.service.ts',
        'src/app/global/import-dialog/import-dialog.component.ts',
        'src/app/global/services/summary.service.ts',
        'src/app/shared/components/base-table/base-table.component.ts',
        'src/app/shared/components/editable-cell/editable-cell.component.ts',
        'src/app/shared/components/editable-date-cell/editable-date-cell.component.ts',
        'src/app/shared/components/splitter/splitter.component.ts',
        'src/app/shared/components/summary-display/summary-display.ts',
        'src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts',
        'src/app/shared/services/performance-logging.service.ts',
        'src/app/shared/services/symbol-search.service.ts',
        'src/app/shell/shell.component.ts',
        'src/app/store/current-account/current-account.signal-store.ts',
        'src/app/store/universe/universe-effect.service.ts',
        'src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
}));
