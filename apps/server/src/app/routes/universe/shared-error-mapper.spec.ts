/* eslint-disable sonarjs/super-linear-regex -- regexes parse bounded route source files */
// Story 14.1, Task 1 (AC #1): contract for the unified per-domain error mapper
// covering `universe/index.ts` and `universe/add-symbol/index.ts`.
//
// These assertions were RED against the pre-unification code: both routes
// hand-rolled their failure responses locally (`reply.status(4xx/5xx).send(...)`),
// and no shared per-domain mapper module existed. Story 14.2 removed the `it.skip`
// markers, created `error-mapper.function.ts`, and pointed both routes at it; these
// tests now pin that contract. No production code is touched in this story (14.1).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const universeRoutePath = join(__dirname, 'index.ts');
const addSymbolRoutePath = join(__dirname, 'add-symbol', 'index.ts');

/**
 * A shared per-domain mapper module must live in the `universe` domain folder.
 * Story 14.2 creates it (e.g. `error-mapper.function.ts`) and points both routes at it.
 */
const SHARED_MAPPER_CANDIDATES = [
  'error-mapper.function.ts',
  'shared-error-mapper.function.ts',
  'universe-error-mapper.function.ts',
];

/** Matches a hand-rolled failure response: `.status(4xx|5xx)` followed by `.send(`. */
const HAND_ROLLED_FAILURE_RE = /\.status\(\s*[45]\d{2}\s*\)[^;]*?\.send\s*\(/g;

/** Matches any `import ... from '...'` statement (single- or multi-line). */
const IMPORT_FROM_RE = /import\s+[^'"]*from\s*['"]([^'"]+)['"]/gs;

function readSource(path: string): string {
  return readFileSync(path, 'utf-8');
}

/** Extracts local identifiers from a single import clause. */
function parseImportClause(clause: string): Set<string> {
  const names = new Set<string>();
  const named = /\{([^}]*)\}/.exec(clause);
  if (named) {
    const parts = named[1]
      .split(',')
      .map((p) => p.trim().replace(/^type\s+/, ''))
      .filter(Boolean);
    for (const name of parts) {
      names.add(
        name
          .split(/\s+as\s+/)
          .pop()!
          .trim(),
      );
    }
  } else {
    const def = /default\s+([A-Za-z_$][\w$]*)/.exec(clause);
    if (def) {
      names.add(def[1]);
    }
  }
  return names;
}

/** Returns the set of local identifiers imported from each module path. */
function importMap(source: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const match of source.matchAll(IMPORT_FROM_RE)) {
    const spec = match[1];
    const clause = match[0].slice(6, match[0].indexOf('from'));
    const names = parseImportClause(clause);
    const existing = map.get(spec) ?? new Set<string>();
    for (const n of names) {
      existing.add(n);
    }
    map.set(spec, existing);
  }
  return map;
}

describe('universe shared per-domain error mapper contract (Story 14.1)', () => {
  it('a shared per-domain error mapper module exists in the universe domain', function assertSharedMapperModuleExists() {
    const found = SHARED_MAPPER_CANDIDATES.filter((name) =>
      existsSync(join(__dirname, name)),
    );
    expect(found.length).toBeGreaterThan(0);
  });

  it('universe/index.ts delegates failure responses to the shared mapper and has no hand-rolled local handler', function assertUniverseRouteDelegates() {
    const source = readSource(universeRoutePath);

    // No inline `.status(4xx/5xx).send(...)` failure handlers remain.
    expect(source.match(HAND_ROLLED_FAILURE_RE)).toBeNull();

    // The route imports from the shared mapper module.
    const map = importMap(source);
    const mapperImports = [...map.entries()].filter(([spec]) =>
      SHARED_MAPPER_CANDIDATES.some((name) => spec.endsWith(name)),
    );
    expect(mapperImports.length).toBeGreaterThan(0);
  });

  it('universe/add-symbol/index.ts delegates failure responses to the shared mapper and has no hand-rolled local handler', function assertAddSymbolRouteDelegates() {
    const source = readSource(addSymbolRoutePath);

    // No inline `.status(4xx/5xx).send(...)` failure handlers remain.
    expect(source.match(HAND_ROLLED_FAILURE_RE)).toBeNull();

    // The route imports from the shared mapper module.
    const map = importMap(source);
    const mapperImports = [...map.entries()].filter(([spec]) =>
      SHARED_MAPPER_CANDIDATES.some((name) => spec.endsWith(name)),
    );
    expect(mapperImports.length).toBeGreaterThan(0);
  });

  it('both routes reference the same shared error mapper module', function assertSameMapperReference() {
    const universeMap = importMap(readSource(universeRoutePath));
    const addSymbolMap = importMap(readSource(addSymbolRoutePath));

    // Both routes must import from an identical relative spec (same file).
    const commonSpecs = [...universeMap.keys()].filter((spec) => {
      if (!addSymbolMap.has(spec)) {
        return false;
      }
      // The shared mapper is a domain-local module, not a package or unrelated helper.
      return spec.startsWith('.') && spec.includes('mapper');
    });
    expect(commonSpecs.length).toBeGreaterThan(0);

    // And they must share at least one imported identifier from that module —
    // i.e. the same function reference is used by both routes.
    const sharedNames = commonSpecs.some((spec) => {
      const a = universeMap.get(spec)!;
      const b = addSymbolMap.get(spec)!;
      return [...a].some((n) => b.has(n));
    });
    expect(sharedNames).toBe(true);
  });
});
