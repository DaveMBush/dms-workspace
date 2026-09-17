import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSeeder } from './seed-postgres';

/**
 * Unit tests for scripts/seed-postgres.ts — Story 2.1 (issue #1391).
 *
 * Red-phase TDD scaffold: the assertions that depend on Story 2.2 removing
 * "Return of Capital" are marked `it.skip` so CI stays green BEFORE the removal
 * lands. Story 2.2's first task removes these skip markers, confirms they fail
 * against the current seed (which still contains "Return of Capital"), then makes
 * them pass by deleting that entry from `divDepositTypes`.
 */

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));

vi.mock('@prisma/client', () => {
  // A constructor returning an object makes every `new PrismaClient()` yield the
  // same reference, so DatabaseSeeder's private prisma and these tests observe
  // the exact same mocked `divDepositType.upsert`.
  class MockPrismaClient {
    constructor() {
      return { divDepositType: { upsert } };
    }
  }
  return { PrismaClient: MockPrismaClient };
});

const config = { environment: 'dev' as const, verbose: false };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('seedDivDepositTypes', () => {
  // Unskipped structural guard (green before AND after Story 2.2): the method
  // exists and seeds through prisma.divDepositType.upsert. It does not assert on
  // the specific types, so it stays green across both stories.
  it('seeds div deposit types via prisma.divDepositType.upsert', async () => {
    const seeder = new DatabaseSeeder(config);

    await seeder.seedDivDepositTypes();

    expect(upsert).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Red-phase (Story 2.1 AC #1, #2): these encode the post-removal contract and
  // are intentionally skipped until Story 2.2 deletes "Return of Capital". They
  // must be un-skipped in Story 2.2, where they turn green. Do NOT weaken or
  // delete any assertion to keep CI green — skip markers only.
  // ---------------------------------------------------------------------------

  it.skip('seeds exactly three types: Dividend, Interest, Capital Gains', async () => {
    const seeder = new DatabaseSeeder(config);

    await seeder.seedDivDepositTypes();

    expect(upsert).toHaveBeenCalledTimes(3);
    const names = upsert.mock.calls.map(
      (c) => (c[0] as { create: { name: string } }).create.name,
    );
    expect(names).toEqual(['Dividend', 'Interest', 'Capital Gains']);
  });

  it.skip('does not seed a "Return of Capital" type', async () => {
    const seeder = new DatabaseSeeder(config);

    await seeder.seedDivDepositTypes();

    const names = upsert.mock.calls.map(
      (c) => (c[0] as { create: { name: string } }).create.name,
    );
    expect(names).not.toContain('Return of Capital');
  });
});
