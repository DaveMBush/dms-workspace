/* eslint-disable vitest/no-disabled-tests, sonarjs/no-skipped-tests -- red-phase (Story 18.2) contract tests; intentionally skipped until the universe services extraction lands */
// Story 18.1, Task 1 (AC #1): contract that `deleteUniverseAndTrades` and
// `isUniverseDeletable` live in service functions rather than inline in the
// route handler (`universe/index.ts`).
//
// These assertions are RED against current production code: both functions are
// defined inline in `index.ts` (line 173 / line 39) and no services module
// exports them. Story 18.2's first task removes the `it.skip` markers, confirms
// they fail, then extracts until they pass. No production code is touched in
// this story (18.1).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const universeRoutePath = join(__dirname, 'index.ts');

/** Matches a local function declaration for the given name (sync or async). */
function localDefinitionRe(name: string): RegExp {
  return new RegExp(`^(?:async\\s+)?function\\s+${name}\\b`, 'm');
}

/** Matches an export declaration for the given name (named function or list member). */
function exportDeclarationRe(name: string): RegExp {
  return new RegExp(
    `export\\s+(?:async\\s+)?function\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b`,
  );
}

/** Lists local `.ts` modules in the universe dir, excluding the route and specs. */
function localModuleFiles(): string[] {
  const files = readdirSync(__dirname);
  return files.filter(
    (file) => file.endsWith('.ts') && file !== 'index.ts' && !file.endsWith('.spec.ts'),
  );
}

/** True when any local module exports the given name. */
function isExportedByLocalModule(name: string): boolean {
  const re = exportDeclarationRe(name);
  for (const file of localModuleFiles()) {
    if (re.test(readFileSync(join(__dirname, file), 'utf-8'))) {
      return true;
    }
  }
  return false;
}

describe('universe service extraction contract (Story 18.1)', () => {
  it.skip('deleteUniverseAndTrades is not defined inline in universe/index.ts', function assertDeleteNotInline() {
    const source = readFileSync(universeRoutePath, 'utf-8');
    expect(localDefinitionRe('deleteUniverseAndTrades').exec(source)).toBeNull();
  });

  it.skip('isUniverseDeletable is not defined inline in universe/index.ts', function assertIsDeletableNotInline() {
    const source = readFileSync(universeRoutePath, 'utf-8');
    expect(localDefinitionRe('isUniverseDeletable').exec(source)).toBeNull();
  });

  it.skip('deleteUniverseAndTrades and isUniverseDeletable are exported from a local services module', function assertExportedFromServices() {
    for (const name of ['deleteUniverseAndTrades', 'isUniverseDeletable']) {
      expect(isExportedByLocalModule(name), `${name} must be exported by a local services module`).toBe(true);
    }
  });
});
