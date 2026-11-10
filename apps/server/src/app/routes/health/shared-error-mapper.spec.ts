/* eslint-disable sonarjs/super-linear-regex -- regexes parse bounded route source files */
// Story 14.1, Task 2 (AC #2): contract for the unified per-domain error mapper
// covering `health/index.ts`.
//
// These assertions were RED against the pre-unification code: the health routes
// built their 503 failure responses inline (`reply.status(503)` + hand-built
// response objects), and no shared per-domain mapper module existed. Story 14.2
// removed the `it.skip` markers, created `error-mapper.function.ts`, and pointed
// the health routes at it; these tests now pin that contract. No production code
// is touched in this story (14.1).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const healthRoutePath = join(__dirname, 'index.ts');

/**
 * A shared per-domain mapper module must live in the `health` domain folder.
 * Story 14.2 creates it (e.g. `error-mapper.function.ts`) and points the route at it.
 */
const SHARED_MAPPER_CANDIDATES = [
  'error-mapper.function.ts',
  'shared-error-mapper.function.ts',
  'health-error-mapper.function.ts',
];

/** Matches a hand-rolled failure response: `.status(5xx)` (inline health failures). */
const HAND_ROLLED_FAILURE_RE = /\.status\(\s*5\d{2}\s*\)/g;

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

describe('health shared per-domain error mapper contract (Story 14.1)', () => {
  it('a shared per-domain error mapper module exists in the health domain', function assertSharedMapperModuleExists() {
    const found = SHARED_MAPPER_CANDIDATES.filter((name) =>
      existsSync(join(__dirname, name)),
    );
    expect(found.length).toBeGreaterThan(0);
  });

  it('health/index.ts produces its 5xx failure shapes through the shared mapper and has no inline hand-built failure responses', function assertHealthRouteDelegates() {
    const source = readSource(healthRoutePath);

    // No inline `.status(5xx)` failure handlers remain.
    expect(source.match(HAND_ROLLED_FAILURE_RE)).toBeNull();

    // The route imports from the shared mapper module.
    const map = importMap(source);
    const mapperImports = [...map.entries()].filter(([spec]) =>
      SHARED_MAPPER_CANDIDATES.some((name) => spec.endsWith(name)),
    );
    expect(mapperImports.length).toBeGreaterThan(0);

    // And it actually uses at least one imported identifier from that module —
    // i.e. the failure shapes are produced through the shared mapper, not inline objects.
    const usedNames = mapperImports.some(([, names]) =>
      [...names].some((n) => new RegExp(`\\b${n}\\b`).test(source)),
    );
    expect(usedNames).toBe(true);
  });

  it('health/index.ts references the same shared error mapper module as the universe routes', function assertSameMapperReference() {
    const healthMap = importMap(readSource(healthRoutePath));
    const universeMap = importMap(
      readSource(join(__dirname, '..', 'universe', 'index.ts')),
    );

    // The health route must import from a relative spec that the universe route
    // also imports — i.e. one shared per-domain mapper module across domains.
    const commonSpecs = [...healthMap.keys()].filter((spec) => {
      if (!universeMap.has(spec)) {
        return false;
      }
      return spec.startsWith('.') && spec.includes('mapper');
    });
    expect(commonSpecs.length).toBeGreaterThan(0);

    // And they must share at least one imported identifier from that module —
    // i.e. the same function reference is used by both routes.
    const sharedNames = commonSpecs.some((spec) => {
      const a = healthMap.get(spec)!;
      const b = universeMap.get(spec)!;
      return [...a].some((n) => b.has(n));
    });
    expect(sharedNames).toBe(true);
  });
});
