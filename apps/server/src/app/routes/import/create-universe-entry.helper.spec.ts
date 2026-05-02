import { createUniverseEntry } from './create-universe-entry.helper';
import { prisma } from '../../prisma/prisma-client';
import { fetchAndUpdatePriceData } from '../universe/fetch-and-update-price-data.function';
import { getDistributions } from '../settings/common/get-distributions.function';
import { recalculateUniverseVolatility } from '../../volatility/recalculate-universe-volatility.function';
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

vi.mock('../settings/common/get-distributions.function', function () {
  return {
    getDistributions: vi.fn(),
  };
});

vi.mock(
  '../../volatility/recalculate-universe-volatility.function',
  function () {
    return {
      recalculateUniverseVolatility: vi.fn(),
    };
  }
);

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
const mockGetDistributions = getDistributions as ReturnType<typeof vi.fn>;
const mockRecalculateUniverseVolatility =
  recalculateUniverseVolatility as ReturnType<typeof vi.fn>;

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
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });
    mockRecalculateUniverseVolatility.mockResolvedValue(undefined);
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
      expect.objectContaining({ logContext: 'CUSIP resolution' })
    );
  });

  test('should call recalculateUniverseVolatility with entry id and non-empty history', async function () {
    const history = [
      { amount: 0.5, date: new Date('2024-01-01') },
      { amount: 0.5, date: new Date('2024-02-01') },
    ];
    mockGetDistributions.mockResolvedValue({ result: undefined, history });
    mockPrisma.universe.create.mockResolvedValue(mockCreatedEntry as any);

    await createUniverseEntry('PDI', 'inc-id', true);

    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledOnce();
    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(
      'test-entry-id',
      history
    );
  });

  test('should call recalculateUniverseVolatility even when getDistributions returns empty history', async function () {
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });
    mockPrisma.universe.create.mockResolvedValue(mockCreatedEntry as any);

    await createUniverseEntry('PDI', 'inc-id', false);

    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledOnce();
    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(
      'test-entry-id',
      []
    );
  });

  test('should pass prefetchedDistributionOutcome to fetchAndUpdatePriceData', async function () {
    const outcome = { result: undefined, history: [] };
    mockGetDistributions.mockResolvedValue(outcome);
    mockPrisma.universe.create.mockResolvedValue(mockCreatedEntry as any);

    await createUniverseEntry('PDI', 'inc-id', false);

    expect(mockFetchAndUpdatePriceData).toHaveBeenCalledWith(
      'test-entry-id',
      'PDI',
      expect.objectContaining({ id: 'test-entry-id' }),
      expect.objectContaining({
        logContext: 'CUSIP resolution',
        prefetchedDistributionOutcome: outcome,
      })
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

  test('should log warn and fall back to empty history when getDistributions throws an Error', async function () {
    mockGetDistributions.mockRejectedValue(
      new Error('Distribution fetch failed')
    );
    mockPrisma.universe.create.mockResolvedValue(mockCreatedEntry as any);

    const result = await createUniverseEntry('PDI', 'inc-id', true);

    expect((logger as any).warn).toHaveBeenCalledWith(
      'Dividend history fetch failed during CUSIP resolution',
      expect.objectContaining({
        symbol: 'PDI',
        error: 'Distribution fetch failed',
      })
    );
    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(
      'test-entry-id',
      []
    );
    expect(result.id).toBe('test-entry-id');
  });

  test('should log warn and fall back to empty history when getDistributions throws a non-Error', async function () {
    mockGetDistributions.mockRejectedValue('string error');
    mockPrisma.universe.create.mockResolvedValue(mockCreatedEntry as any);

    const result = await createUniverseEntry('PDI', 'inc-id', true);

    expect((logger as any).warn).toHaveBeenCalledWith(
      'Dividend history fetch failed during CUSIP resolution',
      expect.objectContaining({ symbol: 'PDI', error: 'string error' })
    );
    expect(result.id).toBe('test-entry-id');
  });

  test('should log warn and continue when recalculateUniverseVolatility throws', async function () {
    mockRecalculateUniverseVolatility.mockRejectedValue(
      new Error('Volatility failed')
    );
    mockPrisma.universe.create.mockResolvedValue(mockCreatedEntry as any);

    const result = await createUniverseEntry('PDI', 'inc-id', true);

    expect((logger as any).warn).toHaveBeenCalledWith(
      'Volatility recalculation failed during CUSIP resolution',
      expect.objectContaining({ symbol: 'PDI', error: 'Volatility failed' })
    );
    expect(result.id).toBe('test-entry-id');
  });

  test('should log warn and continue when recalculateUniverseVolatility throws a non-Error', async function () {
    mockRecalculateUniverseVolatility.mockRejectedValue('non-error string');
    mockPrisma.universe.create.mockResolvedValue(mockCreatedEntry as any);

    const result = await createUniverseEntry('PDI', 'inc-id', true);

    expect((logger as any).warn).toHaveBeenCalledWith(
      'Volatility recalculation failed during CUSIP resolution',
      expect.objectContaining({ symbol: 'PDI', error: 'non-error string' })
    );
    expect(result.id).toBe('test-entry-id');
  });
});
