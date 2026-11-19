// Story 24.1 contract tests, turned green by Story 24.2: the two non-conforming
// route files were renamed to `*.function.ts` and eslint.config.mjs now
// enforces alphabetical import ordering (see import-order-fixture.ts).

import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

/**
 * Story 24.1 Task 1 (AC #1): the spine convention names function/helper/const
 * modules `*.function.ts`. Two route files do not conform and no documented
 * exception exists for either:
 *   - accounts/account-page-size.const.ts
 *   - import/build-cef-classification.helper.ts
 */

/**
 * Where a documented naming exception is recorded, if one ever is: one file
 * basename per line in `naming-exceptions.md` next to this spec. Story 24.1
 * does not create it; the assertions below only read it.
 */
const exceptionsFile = join(__dirname, 'naming-exceptions.md');

function hasDocumentedException(fileName: string): boolean {
  if (!existsSync(exceptionsFile)) {
    return false;
  }
  const content = readFileSync(exceptionsFile, 'utf-8');
  // Whole-word match so e.g. `foo.const.ts` does not satisfy an exception for
  // `x-foo.const.ts`.
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[\\s\\W])${escaped}(?=[\\s\\W]|$)`).test(content);
}

/**
 * A known non-conforming file "conforms" when either:
 *   - it has been renamed to the spine convention (same stem, `*.function.ts`), or
 *   - a documented exception for its original basename exists.
 */
function conforms(dir: string, originalName: string): boolean {
  const stem = stemOf(originalName);
  if (existsSync(join(dir, `${stem}.function.ts`))) {
    return true;
  }
  return hasDocumentedException(originalName);
}

/**
 * Strip the trailing `.const.ts` / `.helper.ts`-style suffixes so that e.g.
 * `account-page-size.const.ts` yields stem `account-page-size`, matching the
 * spine-convention rename target `account-page-size.function.ts`. Stripping a
 * single extension would leave `account-page-size.const` and never match.
 */
function stemOf(originalName: string): string {
  return originalName.replace(/\.[^.]*\.[^.]*$/, '');
}

describe('suffix conformance (Story 24.1)', () => {
  it('accounts/account-page-size.const.ts carries the *.function.ts suffix or a documented exception', () => {
    const dir = join(__dirname, 'accounts');
    const original = 'account-page-size.const.ts';
    const stem = stemOf(original);

    // The module must still exist — renamed to the convention or not.
    expect(
      existsSync(join(dir, original)) ||
        existsSync(join(dir, `${stem}.function.ts`)),
    ).toBe(true);

    expect(conforms(dir, original)).toBe(true);
  });

  it('import/build-cef-classification.helper.ts carries the *.function.ts suffix or a documented exception', () => {
    const dir = join(__dirname, 'import');
    const original = 'build-cef-classification.helper.ts';
    const stem = stemOf(original);

    // The module must still exist — renamed to the convention or not.
    expect(
      existsSync(join(dir, original)) ||
        existsSync(join(dir, `${stem}.function.ts`)),
    ).toBe(true);

    expect(conforms(dir, original)).toBe(true);
  });
});

/**
 * Story 24.1 Task 2 (AC #2): eslint.config.mjs must configure an
 * `import/order` rule that fails on a deliberately mis-ordered import
 * fixture. The fixture lives next to this spec and is covered by
 * `nx lint server`; it passes every currently active rule, so only the
 * future import/order rule (Story 24.2) should flag it.
 */

/** Repo root: apps/server/src/app/routes -> up five levels. */
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

/** The deliberately mis-ordered fixture file (node:path before node:fs). */
const importOrderFixturePath =
  'apps/server/src/app/routes/import-order-fixture.ts';

async function lintFile(filePath: string): Promise<string> {
  const eslintBin = join(repoRoot, 'node_modules', '.bin', 'eslint');
  try {
    const { stdout } = await execFileAsync(eslintBin, [filePath], {
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    // ESLint exits non-zero on lint errors; that is expected here.
    const err = error as { stdout?: string; stderr?: string };
    return `${err.stdout ?? ''}\n${err.stderr ?? ''}`;
  }
}

describe('import/order rule (Story 24.1)', () => {
  it('eslint.config.mjs configures an import/order rule', () => {
    const eslintConfig = readFileSync(
      join(repoRoot, 'eslint.config.mjs'),
      'utf-8',
    );
    // Must match the exact `import/order` rule id — not import/no-duplicates,
    // import/prefer-default-export or any other import/* rule.
    expect(eslintConfig).toMatch(/['"]import\/order['"]/);
  });

  it('linting the mis-ordered fixture produces an import/order error', async () => {
    const output = await lintFile(importOrderFixturePath);
    // The fixture must be flagged by the import/order rule specifically.
    expect(output).toContain('import/order');
  }, 30_000); // eslint cold start takes ~5s; leave headroom for CI
});
