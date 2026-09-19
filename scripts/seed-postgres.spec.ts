import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSeeder } from './seed-postgres';

/**
 * Unit tests for scripts/seed-postgres.ts — Story 2.1 (issue #1391).
 *
 * Red-phase TDD scaffold: the assertions that depend on removing "Return of
 * Capital" were marked `it.skip` until Story 2.2 landed. Story 2.2 removed the
 * skip markers and deleted the entry from `divDepositTypes`, so all tests here
 * now run and pass.
 */

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));

vi.mock('@prisma/client', () => {
  // A constructor returning an object makes every `new PrismaClient()` yield the
  // same reference, so DatabaseSeeder's private prisma and these tests observe
  // the exact same mocked `divDepositType.upsert`.
  /* eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mock needs a class for `new` semantics */
  class MockPrismaClient {
    constructor() {
      return { divDepositType: { upsert } };
    }
  }
  return { PrismaClient: MockPrismaClient };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('seedDivDepositTypes', () => {
  // Unskipped structural guard (green before AND after Story 2.2): the method
  // exists and seeds through prisma.divDepositType.upsert. It does not assert on
  // the specific types, so it stays green across both stories.
  it('seeds div deposit types via prisma.divDepositType.upsert', async () => {
    const seeder = new DatabaseSeeder({ environment: 'dev', verbose: false });

    await seeder.seedDivDepositTypes();

    expect(upsert).toHaveBeenCalled();
  });

  // Story 2.1 AC #1, #2: post-removal contract (unskipped by Story 2.2).

  it('seeds exactly three types: Dividend, Interest, Capital Gains', async () => {
    const seeder = new DatabaseSeeder({ environment: 'dev', verbose: false });

    await seeder.seedDivDepositTypes();

    expect(upsert).toHaveBeenCalledTimes(3);
    const names = upsert.mock.calls.map(
      (c) => (c[0] as { create: { name: string } }).create.name,
    );
    expect(names).toEqual(['Dividend', 'Interest', 'Capital Gains']);
  });

  it('does not seed a "Return of Capital" type', async () => {
    const seeder = new DatabaseSeeder({ environment: 'dev', verbose: false });

    await seeder.seedDivDepositTypes();

    const names = upsert.mock.calls.map(
      (c) => (c[0] as { create: { name: string } }).create.name,
    );
    expect(names).not.toContain('Return of Capital');
  });
});
