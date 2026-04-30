import { createUniverseEntry } from './create-universe-entry.helper';
import { prisma } from '../../prisma/prisma-client';
import { fetchAndUpdatePriceData } from '../universe/fetch-and-update-price-data.function';
import { logger } from '../../../utils/structured-logger';
import { vi } from 'vitest';

vi.mock('../../prisma/prisma-client', function () {
  return {
    prisma: {
      universe: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('../universe/fetch-and-update-price-data.function', function () {
  return {
    fetchAndUpdatePriceData: vi.fn(),
  };
});

vi.mock('../../../utils/structured-logger', function () {
  return {
    logger: {
      warn: vi.fn(),
      info: vi.fn(),
    },
  };
});

const mockPrisma = prisma as any;
const mockFetchAndUpdatePriceData = fetchAndUpdatePriceData as ReturnType<
  typeof vi.fn
>;

const mockCreatedEntry = {
  id: 'test-entry-id',
  symbol: 'PDI',
  risk_group_id: 'inc-id',
  last_price: 0,
  distribution: 0,
  distributions_per_year: 0,
  ex_date: null,
  most_recent_sell_date: null,
  expired: false,
  is_closed_end_fund: false,
  createdAt: new Date('2024-09-20'),
  updatedAt: new Date('2024-09-20'),
};

describe('createUniverseEntry', function () {
  beforeEach(function () {
    vi.clearAllMocks();
    mockFetchAndUpdatePriceData.mockResolvedValue(undefined);
  });

  test('should set expired: true and is_closed_end_fund: true when isCef is true', async function () {
    mockPrisma.universe.create.mockResolvedValue({
      ...mockCreatedEntry,
      symbol: 'PDI',
      risk_group_id: 'inc-id',
      expired: true,
      is_closed_end_fund: true,
    } as any);

    await createUniverseEntry('PDI', 'inc-id', true);

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        symbol: 'PDI',
        risk_group_id: 'inc-id',
        expired: true,
        is_closed_end_fund: true,
      }),
    });
  });

  test('should set expired: false and is_closed_end_fund: false when isCef is false', async function () {
    mockPrisma.universe.create.mockResolvedValue({
      ...mockCreatedEntry,
      symbol: 'SPY',
      risk_group_id: 'eq-id',
      expired: false,
      is_closed_end_fund: false,
    } as any);

    await createUniverseEntry('SPY', 'eq-id', false);

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        symbol: 'SPY',
        risk_group_id: 'eq-id',
        expired: false,
        is_closed_end_fund: false,
      }),
    });
  });

  test('should return the created entry id', async function () {
    mockPrisma.universe.create.mockResolvedValue({
      ...mockCreatedEntry,
      id: 'returned-id',
    } as any);

    const result = await createUniverseEntry('SPY', 'eq-id', false);

    expect(result).toEqual({ id: 'returned-id' });
  });

  test('should call fetchAndUpdatePriceData after creating entry', async function () {
    mockPrisma.universe.create.mockResolvedValue(mockCreatedEntry as any);

    await createUniverseEntry('PDI', 'inc-id', true);

    expect(mockFetchAndUpdatePriceData).toHaveBeenCalledWith(
      'test-entry-id',
      'PDI',
      expect.objectContaining({ id: 'test-entry-id' }),
      { logContext: 'CUSIP resolution' }
    );
  });

  test('should log warn and still return entry when fetchAndUpdatePriceData throws', async function () {
    mockPrisma.universe.create.mockResolvedValue(mockCreatedEntry as any);
    mockFetchAndUpdatePriceData.mockRejectedValue(new Error('Fetch failed'));

    const result = await createUniverseEntry('SPY', 'eq-id', false);

    expect((logger as any).warn).toHaveBeenCalledWith(
      'Unexpected error during price/dividend fetch after CUSIP resolution',
      expect.objectContaining({ symbol: 'SPY' })
    );
    expect(result.id).toBe('test-entry-id');
  });
});
