// Story 6.1: red-phase tests asserting PrimeNg is fully removed from dms-material.
// AC #1 (package.json keys) must FAIL while `@primeng/themes` / `primeng` are still
// declared in the workspace-root package.json; AC #2 (source scan) already passes
// because no real imports exist yet. Story 6.2 removes the `.skip()` markers,
// confirms red, then deletes the packages until green.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// src -> dms-material -> apps -> workspace root
const WORKSPACE_ROOT = join(import.meta.dirname, '..', '..', '..');
const SRC_DIR = import.meta.dirname;

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** Matches a real import/require of `primeng`, `@primeng/themes`, or any `@primeng/*` specifier. */
const PRIMENG_IMPORT_RE =
  /(?:\bimport\b|\bexport\b)[^;]*?\bfrom\s*['"](@?primeng[^'"]*)['"]|require\s*\(\s*['"](@?primeng[^'"]*)['"]\s*\)/g;

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.tsx?$|\.scss$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe('PrimeNg removal (Story 6.1)', () => {
  it('should not declare @primeng/themes or primeng in workspace package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(WORKSPACE_ROOT, 'package.json'), 'utf-8')
    ) as PackageJsonLike;

    for (const depName of ['@primeng/themes', 'primeng']) {
      expect(pkg.dependencies?.[depName]).toBeUndefined();
      expect(pkg.devDependencies?.[depName]).toBeUndefined();
    }
  });

  it('should have no primeng imports in apps/dms-material/src source files', () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_DIR)) {
      const content = readFileSync(file, 'utf-8');
      let match: RegExpExecArray | null;
      PRIMENG_IMPORT_RE.lastIndex = 0;
      while ((match = PRIMENG_IMPORT_RE.exec(content)) !== null) {
        offenders.push(`${file}: ${match[1] ?? match[2]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
