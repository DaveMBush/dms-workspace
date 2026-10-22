// Story 7.1: red-phase tests for the yahoo-finance2 v4 upgrade contract.
// AC #1 (declared version) must FAIL while `yahoo-finance2` is still on the v3
// line (`^3.13.0`) in the root package.json; AC #2 (consumer specs mock the
// instance module, never the raw package) already passes because that is how
// the codebase is structured — this test locks it in. Story 7.2 removes the
// `.skip()` markers, confirms red, then bumps the dependency to `^4.0.4` until green.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// src -> server -> apps -> workspace root
const workspaceRoot = join(__dirname, '..', '..', '..');

interface PackageJsonLike {
  dependencies?: Record<string, string>;
}

/** Matches a real `import`/`export ... from` of the raw `yahoo-finance2` package. */
const yahooImportRe =
  /\b(?:import|export)\b[^;]*?\bfrom\s*['"]yahoo-finance2['"]/g;

/** Matches a real `require()` of the raw package (CJS-style imports). */
const yahooRequireRe = /\brequire\s*\(\s*['"]yahoo-finance2['"]\s*\)/g;

/** Matches a vi.mock() targeting the instance module re-export point. */
const mockInstanceModuleRe =
  /vi\.mock\(\s*['"][^'"]*yahoo-finance\.instance['"]/;

// Consumer specs that must mock `yahoo-finance.instance` rather than import the raw package
const consumerSpecs: Array<{ name: string; path: string }> = [
  {
    name: 'resolve-cusip.function.spec.ts',
    path: join(__dirname, 'app/routes/import/resolve-cusip.function.spec.ts'),
  },
  {
    name: 'get-last-price.function.spec.ts',
    path: join(
      __dirname,
      'app/routes/settings/common/get-last-price.function.spec.ts',
    ),
  },
];

describe('yahoo-finance2 v4 upgrade contract (Story 7.1)', () => {
  // eslint-disable-next-line vitest/no-disabled-tests -- BLOCKED: intentionally disabled TDD RED phase test; Story 7.2 removes the skip, confirms red, then bumps the dependency to ^4.0.4 until green
  it.skip('should declare yahoo-finance2 targeting ^4.0.4 in root package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(workspaceRoot, 'package.json'), 'utf-8'),
    ) as PackageJsonLike;

    expect(pkg.dependencies?.['yahoo-finance2']).toBe('^4.0.4');
  });

  // eslint-disable-next-line vitest/no-disabled-tests -- BLOCKED: intentionally disabled TDD RED phase test; Story 7.2 removes the skip, confirms red, then bumps the dependency to ^4.0.4 until green
  it.skip('should have consumer specs mock the instance module, not import yahoo-finance2', () => {
    for (const spec of consumerSpecs) {
      const content = readFileSync(spec.path, 'utf-8');

      // Must mock the single re-export point so tests survive v3→v4 internals changes
      expect(mockInstanceModuleRe.test(content)).toBe(true);

      // Must not import or require the raw package directly
      yahooImportRe.lastIndex = 0;
      const importMatch = yahooImportRe.exec(content);
      yahooRequireRe.lastIndex = 0;
      const requireMatch = yahooRequireRe.exec(content);
      expect(importMatch).toBeNull();
      expect(requireMatch).toBeNull();
    }
  });
});
