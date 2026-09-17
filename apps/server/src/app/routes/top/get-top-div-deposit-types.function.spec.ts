import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTopDivDepositTypes } from './get-top-div-deposit-types.function';

const { findMany, create } = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../../prisma/prisma-client', () => ({
  prisma: {
    divDepositType: { findMany, create },
  },
}));

// Canonical-seed guards (Story 2.1 AC #3). These assert behavior that is already
// true today and must stay green both before and after Story 2.2, so they are
// intentionally NOT skipped (unlike the red-phase seed-script assertions in
// scripts/seed-postgres.spec.ts).
describe('getTopDivDepositTypes', () => {
  beforeEach(() => {
    findMany.mockReset();
    create.mockReset();
  });

  it('creates exactly "Dividend" and "Deposit" when the table is empty', async () => {
    // First read: empty. Second read (after seeding): the two created rows.
    findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'div-id' }, { id: 'dep-id' }]);

    const ids = await getTopDivDepositTypes();

    expect(create).toHaveBeenCalledTimes(2);
    const createdNames = create.mock.calls.map((c) => c[0].data.name);
    expect(createdNames).toEqual(['Dividend', 'Deposit']);
    expect(ids).toEqual(['div-id', 'dep-id']);
  });

  it('does not create when types already exist and returns all ids', async () => {
    findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

    const ids = await getTopDivDepositTypes();

    expect(create).not.toHaveBeenCalled();
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('never creates or returns a "Return of Capital" type', async () => {
    findMany.mockResolvedValue([]);

    const ids = await getTopDivDepositTypes();

    const createdNames = create.mock.calls.map((c) => c[0].data.name);
    expect(createdNames).not.toContain('Return of Capital');
    expect(ids.join(',')).not.toContain('Return of Capital');
  });
});
