import { vi } from 'vitest';

// Mock prisma before importing the function
const mockCount = vi.fn();
const mockFindMany = vi.fn();

vi.mock('../../prisma/prisma-client', () => ({
  prisma: {
    trades: {
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    divDeposits: {
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { fetchStandardPage } from './fetch-standard-page.function';

describe('fetchStandardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct page for trades', async () => {
    mockCount.mockResolvedValue(3);
    mockFindMany.mockResolvedValue([
      { id: 't-1' },
      { id: 't-2' },
      { id: 't-3' },
    ]);

    const where = { accountId: 'acc-1' };
    const orderBy = { buy_date: 'desc' };
    const result = await fetchStandardPage('trades', where, orderBy);

    expect(result).toEqual({
      startIndex: 0,
      indexes: ['t-1', 't-2', 't-3'],
      length: 3,
    });
    expect(mockCount).toHaveBeenCalledWith({ where });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        select: { id: true },
        orderBy,
        skip: 0,
      })
    );
  });

  it('should return correct page for divDeposits', async () => {
    mockCount.mockResolvedValue(2);
    mockFindMany.mockResolvedValue([{ id: 'd-1' }, { id: 'd-2' }]);

    const where = { accountId: 'acc-1' };
    const orderBy = { date: 'asc' };
    const result = await fetchStandardPage('divDeposits', where, orderBy);

    expect(result).toEqual({
      startIndex: 0,
      indexes: ['d-1', 'd-2'],
      length: 2,
    });
  });

  it('should return empty page when no results', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const result = await fetchStandardPage('trades', {}, {});

    expect(result).toEqual({
      startIndex: 0,
      indexes: [],
      length: 0,
    });
  });
});
