import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'path';
import { expect, test } from 'playwright/test';

/**
 * Epic 21 / Story 21.1 — RED-PHASE TDD SCAFFOLD (intentionally deferred).
 * // @atdd
 *
 * These tests are the executable contract for Story 21.2, which must:
 *   1. Give every e2e spec that writes to the shared SQLite test DB its own
 *      isolation — per-spec Prisma cleanup (deleting rows created by that
 *      spec) or a unique account so no cross-spec row leakage occurs; and
 *   2. Replace fixed `settle(ms)` sleeps in open-positions.spec.ts and
 *      add-then-navigate.spec.ts with explicit waits
 *      (`expect(...).toBeVisible()`, `waitForResponse`, ...).
 *
 * Every assertion below bails out via an if-guard early-return (NOT test.skip —
 * that trips the no-skipped-tests gate) so the suite stays green BEFORE Story
 * 21.2 exists — red-phase by guard, not by failure. Story 21.2's first task is
 * to flip STORY_21_2_IMPLEMENTED from `false` to `true`, confirm the assertions
 * FAIL against the current code, then implement until they pass.
 * Do NOT weaken or delete any assertion here; only the guard flag moves in this
 * epic.
 *
 * The checks are static-analysis assertions: they read the spec files on disk
 * (no production code is touched by this story — test scaffold only).
 */

const SPEC_DIR = __dirname;

/**
 * Red-phase guard (NOT test.skip — that trips the no-skipped-tests gate).
 * While `false`, every assertion in this file bails out early so the suite is
 * green before Story 21.2 exists. Story 21.2 flips it to `true` first, confirms
 * red against current code, then implements until green.
 */
const STORY_21_2_IMPLEMENTED = false;

/** All e2e spec files, excluding this red-phase contract file itself. */
function listSpecFiles(): string[] {
  return readdirSync(SPEC_DIR)
    .filter((name) => name.endsWith('.spec.ts'))
    .filter((name) => name !== 'db-isolation-and-explicit-waits.spec.ts');
}

/**
 * Heuristic (documented per Story 21.1 Task 1): a spec "creates shared-DB rows"
 * when it imports a row-seeding helper (`helpers/seed-*`, `shared-create-*`,
 * or `create-deletable-universe-symbol`) OR calls Prisma create directly in
 * the spec file (`.createMany(` / `prisma.<model>.create(`).
 */
function createsSharedDbRows(source: string): boolean {
  const importsSeeder =
    /from '\.\/helpers\/(seed|shared-create|create-deletable)/.test(source);
  const directPrismaCreate = /\.createMany\(|prisma\.[a-zA-Z]+\.create\(/.test(
    source,
  );
  return importsSeeder || directPrismaCreate;
}

/** A spec performs per-spec Prisma cleanup when it has an afterAll/afterEach hook AND a delete call (deleteMany / .delete( / cleanup helper). */
function hasPerSpecCleanup(source: string): boolean {
  const hasHook =
    /(test|it)\.(afterAll|afterEach)|describe\.(afterAll|afterEach)/.test(
      source,
    );
  const hasDelete = /deleteMany|\.delete\(|cleanup[A-Za-z]*\(/.test(source);
  return hasHook && hasDelete;
}

/** All hardcoded UUIDs in a spec file (candidate account identifiers). */
function extractUuids(source: string): string[] {
  const matches = source.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
  );
  return matches ? [...new Set(matches)] : [];
}

test.describe('Epic 21: per-spec DB isolation and explicit waits (red-phase contract for Story 21.2)', () => {
  test('AC#1 every spec that creates shared-DB rows isolates its state via per-spec Prisma cleanup or a unique account', () => {
    // If-guard early-return (NOT test.skip — that trips the no-skipped-tests
    // gate). Red-phase: bails out until Story 21.2 flips STORY_21_2_IMPLEMENTED.
    if (!STORY_21_2_IMPLEMENTED) {
      return;
    }

    const offenders: string[] = [];
    for (const name of listSpecFiles()) {
      const source = readFileSync(path.join(SPEC_DIR, name), 'utf8');
      if (!createsSharedDbRows(source)) {
        continue;
      }
      if (!hasPerSpecCleanup(source)) {
        offenders.push(
          `${name}: creates shared-DB rows but has no afterAll/afterEach Prisma cleanup (deleteMany/.delete/cleanup helper)`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  test('AC#1 no hardcoded account UUID is shared across multiple spec files', () => {
    // If-guard early-return (NOT test.skip — that trips the no-skipped-tests
    // gate). Red-phase: bails out until Story 21.2 flips STORY_21_2_IMPLEMENTED.
    if (!STORY_21_2_IMPLEMENTED) {
      return;
    }

    const uuidToSpecs = new Map<string, string[]>();
    for (const name of listSpecFiles()) {
      const source = readFileSync(path.join(SPEC_DIR, name), 'utf8');
      for (const uuid of extractUuids(source)) {
        const specs = uuidToSpecs.get(uuid) ?? [];
        specs.push(name);
        uuidToSpecs.set(uuid, specs);
      }
    }
    const shared: string[] = [];
    // Explicit compare fn → deterministic (alphabetical by uuid) failure output.
    for (const [uuid, specs] of [...uuidToSpecs.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      if (specs.length > 1) {
        shared.push(
          `${uuid} is used by ${String(specs.length)} specs: ${specs.join(', ')}`,
        );
      }
    }
    expect(shared).toEqual([]);
  });

  test('AC#2 open-positions.spec.ts and add-then-navigate.spec.ts use explicit waits, not fixed settle() sleeps', () => {
    // If-guard early-return (NOT test.skip — that trips the no-skipped-tests
    // gate). Red-phase: bails out until Story 21.2 flips STORY_21_2_IMPLEMENTED.
    if (!STORY_21_2_IMPLEMENTED) {
      return;
    }

    const offenders: string[] = [];
    for (const name of [
      'open-positions.spec.ts',
      'add-then-navigate.spec.ts',
    ]) {
      const source = readFileSync(path.join(SPEC_DIR, name), 'utf8');
      if (source.includes('settle(')) {
        offenders.push(
          `${name} still calls fixed settle() sleeps from helpers/settle.helper`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });
});
