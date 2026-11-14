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
    (file) =>
      file.endsWith('.ts') && file !== 'index.ts' && !file.endsWith('.spec.ts'),
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
  it('deleteUniverseAndTrades is not defined inline in universe/index.ts', function assertDeleteNotInline() {
    const source = readFileSync(universeRoutePath, 'utf-8');
    expect(
      localDefinitionRe('deleteUniverseAndTrades').exec(source),
    ).toBeNull();
  });

  it('isUniverseDeletable is not defined inline in universe/index.ts', function assertIsDeletableNotInline() {
    const source = readFileSync(universeRoutePath, 'utf-8');
    expect(localDefinitionRe('isUniverseDeletable').exec(source)).toBeNull();
  });

  it('deleteUniverseAndTrades and isUniverseDeletable are exported from a local services module', function assertExportedFromServices() {
    for (const name of ['deleteUniverseAndTrades', 'isUniverseDeletable']) {
      expect(
        isExportedByLocalModule(name),
        `${name} must be exported by a local services module`,
      ).toBe(true);
    }
  });
});

// Story 18.1, Task 2 (AC #2): contract that the add and get endpoints produce
// identical response shapes through ONE shared response mapper — no hand-built
// zero responses duplicated between them.
//
// These assertions are RED against current production code: `mapUniverseToResponse`
// is defined inline in `index.ts` (line 47), only the get/update routes call it,
// and the add route (`handleAddUniverseRoute`) hand-builds a zero-filled response
// literal. Story 18.2's first task removes the `it.skip` markers, confirms they
// fail, then extracts until they pass. No production code is touched in this
// story (18.1).

/** Extracts the source text of a top-level (column-0) function declaration. */
function topLevelFunctionSource(name: string): string {
  const source = readFileSync(universeRoutePath, 'utf-8');
  const start = source.indexOf(`function ${name}`);
  if (start === -1) {
    return '';
  }
  // Nested handlers are indented, so `\nfunction` only matches the next top-level declaration.
  const nextDecl = /\nfunction\s+\w+/.exec(source.slice(start));
  return source.slice(start, nextDecl ? start + nextDecl.index : source.length);
}

describe('universe shared response mapper contract (Story 18.1)', () => {
  it('mapUniverseToResponse is exported from a local module as the shared response mapper', function assertSharedMapperExported() {
    expect(
      isExportedByLocalModule('mapUniverseToResponse'),
      'a local services/mapper module must export mapUniverseToResponse',
    ).toBe(true);
  });

  it('the add and get routes both build responses through the shared mapper (no inline definition)', function assertBothRoutesUseSharedMapper() {
    const source = readFileSync(universeRoutePath, 'utf-8');
    expect(
      localDefinitionRe('mapUniverseToResponse').exec(source),
      'mapUniverseToResponse must not be defined inline in universe/index.ts',
    ).toBeNull();
    for (const route of ['handleAddUniverseRoute', 'handleGetUniversesRoute']) {
      const body = topLevelFunctionSource(route);
      expect(body, `${route} source not found`).not.toBe('');
      expect(
        body,
        `${route} must call the shared mapUniverseToResponse mapper`,
      ).toContain('mapUniverseToResponse(');
    }
  });

  it('the add route does not hand-build zero responses', function assertNoHandBuiltZeroResponses() {
    const body = topLevelFunctionSource('handleAddUniverseRoute');
    expect(body, 'handleAddUniverseRoute source not found').not.toBe('');
    // Numeric response fields defaulted to 0 (e.g. `distribution: result.distribution ?? 0`,
    // `position: 0`) are the duplicated hand-built zero responses AC #2 forbids.
    const zeroLiteralRe =
      /\b(distribution|distributions_per_year|last_price|position|avg_purchase_yield_percent)\s*:\s*(?:result\.\w+\s*\?\?\s*)?0\b/;
    expect(
      zeroLiteralRe.test(body),
      'add route must not hand-build zero response fields',
    ).toBe(false);
  });
});
