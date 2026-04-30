import { addSymbol } from './add-symbol.function';
import { prisma } from '../../../prisma/prisma-client';
import {
  lookupCefConnectSymbol,
  classifySymbolRiskGroupId,
} from '../../common/cef-classification.function';
import { getDistributions } from '../../settings/common/get-distributions.function';
import { getLastPrice } from '../../settings/common/get-last-price.function';
import { recalculateUniverseVolatility } from '../../../volatility/recalculate-universe-volatility.function';
import { vi } from 'vitest';
import { logger } from '../../../../utils/structured-logger';

vi.mock('../../../prisma/prisma-client', function () {
  return {
    prisma: {
      universe: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      risk_group: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock('../../common/cef-classification.function', function () {
  return {
    lookupCefConnectSymbol: vi.fn(),
    classifySymbolRiskGroupId: vi.fn(),
  };
});

vi.mock('../../settings/common/get-distributions.function');
vi.mock('../../settings/common/get-last-price.function');
vi.mock(
  '../../../volatility/recalculate-universe-volatility.function',
  function () {
    return {
      recalculateUniverseVolatility: vi.fn(),
    };
  }
);
vi.mock('../../../../utils/structured-logger', function () {
  return {
    logger: {
      warn: vi.fn(),
      info: vi.fn(),
    },
  };
});

const mockPrisma = prisma as any;
const mockGetDistributions = getDistributions as any;
const mockGetLastPrice = getLastPrice as any;
const mockLookupCefConnectSymbol = lookupCefConnectSymbol as ReturnType<
  typeof vi.fn
>;
const mockClassifySymbolRiskGroupId = classifySymbolRiskGroupId as ReturnType<
  typeof vi.fn
>;
const mockRecalculateUniverseVolatility =
  recalculateUniverseVolatility as ReturnType<typeof vi.fn>;
const mockLogger = logger as any;

const mockRiskGroups = [
  { id: 'eq-id', name: 'Equities' },
  { id: 'inc-id', name: 'Income' },
  { id: 'tf-id', name: 'Tax Free Income' },
];

const mockDefaultRecord = {
  id: 'test-universe-id',
  symbol: 'SPY',
  risk_group_id: 'test-risk-group-id',
  distribution: 0,
  distributions_per_year: 0,
  ex_date: null,
  last_price: 0,
  most_recent_sell_date: null,
  expired: false,
  is_closed_end_fund: false,
  createdAt: new Date('2024-09-20'),
  updatedAt: new Date('2024-09-20'),
};

describe('addSymbol', function () {
  beforeEach(function () {
    vi.clearAllMocks();
    mockPrisma.risk_group.findMany.mockResolvedValue(mockRiskGroups);
    mockLookupCefConnectSymbol.mockResolvedValue(null);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });
  });

  test('should apply CEF classification when symbol is found on CefConnect', async function () {
    const request = {
      symbol: 'ETW',
      risk_group_id: 'test-risk-group-id',
    };

    const mockCefData = { Ticker: 'ETW', CategoryId: 1 };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Equities',
    });
    mockLookupCefConnectSymbol.mockResolvedValue(mockCefData);
    mockClassifySymbolRiskGroupId.mockReturnValue('eq-id');
    mockPrisma.universe.create.mockResolvedValue({
      ...mockDefaultRecord,
      symbol: 'ETW',
      risk_group_id: 'eq-id',
      is_closed_end_fund: true,
    } as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });

    await addSymbol(request);

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        risk_group_id: 'eq-id',
        is_closed_end_fund: true,
      }),
    });
  });

  test('should use request risk_group_id when symbol is not found on CefConnect', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Equities',
    });
    mockLookupCefConnectSymbol.mockResolvedValue(null);
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });

    await addSymbol(request);

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        risk_group_id: 'test-risk-group-id',
        is_closed_end_fund: false,
      }),
    });
  });

  test('should warn and use request risk_group_id when CefConnect lookup throws', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Equities',
    });
    mockLookupCefConnectSymbol.mockRejectedValue(new Error('Network error'));
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });

    const result = await addSymbol(request);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'CEF classification lookup failed; using request risk_group_id',
      expect.objectContaining({ symbol: 'SPY' })
    );
    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        risk_group_id: 'test-risk-group-id',
        is_closed_end_fund: false,
      }),
    });
    expect(result.fetchFailed).toBe(true);
  });

  test('should save symbol first then fetch price and dividend on success', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    const mockDistributionData = {
      distribution: 1.5,
      ex_date: new Date('2024-09-15'),
      distributions_per_year: 4,
    };

    const mockUpdatedRecord = {
      ...mockDefaultRecord,
      distribution: 1.5,
      distributions_per_year: 4,
      ex_date: new Date('2024-09-15'),
      last_price: 150.25,
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockResolvedValue(150.25);
    mockGetDistributions.mockResolvedValue({
      result: mockDistributionData,
      history: [],
    });
    mockPrisma.universe.update.mockResolvedValue(mockUpdatedRecord as any);

    const result = await addSymbol(request);

    expect(result).toEqual({
      id: 'test-universe-id',
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
      distribution: 1.5,
      distributions_per_year: 4,
      ex_date: '2024-09-15T00:00:00.000Z',
      last_price: 150.25,
      most_recent_sell_date: null,
      expired: false,
      is_closed_end_fund: false,
      createdAt: '2024-09-20T00:00:00.000Z',
      updatedAt: '2024-09-20T00:00:00.000Z',
      fetchFailed: false,
    });

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: {
        symbol: 'SPY',
        risk_group_id: 'test-risk-group-id',
        last_price: 0,
        distribution: 0,
        distributions_per_year: 0,
        ex_date: null,
        most_recent_sell_date: null,
        expired: false,
        is_closed_end_fund: false,
      },
    });

    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(
      'test-universe-id',
      []
    );

    expect(mockPrisma.universe.update).toHaveBeenCalledWith({
      where: { id: 'test-universe-id' },
      data: {
        last_price: 150.25,
        distribution: 1.5,
        distributions_per_year: 4,
        ex_date: new Date('2024-09-15'),
      },
    });
  });

  test('should save symbol successfully and set fetchFailed when fetch fails', async function () {
    const request = {
      symbol: 'UNKNOWN',
      risk_group_id: 'test-risk-group-id',
    };

    const mockCreatedRecord = {
      ...mockDefaultRecord,
      symbol: 'UNKNOWN',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockPrisma.universe.create.mockResolvedValue(mockCreatedRecord as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });

    const result = await addSymbol(request);

    expect(result.id).toBe('test-universe-id');
    expect(result.symbol).toBe('UNKNOWN');
    expect(result.fetchFailed).toBe(true);
    expect(result.last_price).toBeNull();
    expect(result.distribution).toBeNull();

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        symbol: 'UNKNOWN',
        last_price: 0,
        distribution: 0,
      }),
    });

    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(
      'test-universe-id',
      []
    );

    expect(mockPrisma.universe.update).not.toHaveBeenCalled();
  });

  test('should throw error if symbol already exists', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue({
      id: 'existing-id',
    } as any);

    await expect(addSymbol(request)).rejects.toThrow(
      'Symbol SPY already exists in universe'
    );
  });

  test('should throw error if risk group not found', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'non-existent-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue(null);

    await expect(addSymbol(request)).rejects.toThrow(
      'Risk group with ID non-existent-id not found'
    );
  });

  test('should handle null price and distribution data and set fetchFailed', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);

    const result = await addSymbol(request);

    expect(result.last_price).toBeNull();
    expect(result.distribution).toBeNull();
    expect(result.distributions_per_year).toBeNull();
    expect(result.ex_date).toBeNull();
    expect(result.fetchFailed).toBe(true);
  });

  test('should handle unexpected error during price/dividend fetch and return fetchFailed true', async function () {
    const request = {
      symbol: 'ERRSTOCK',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockRejectedValue(new Error('Network error'));

    const result = await addSymbol(request);

    expect(result.fetchFailed).toBe(true);
  });

  test('should handle non-Error thrown during price/dividend fetch and return fetchFailed true', async function () {
    const request = {
      symbol: 'ERRSTOCK2',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockRejectedValue('not an Error object');

    const result = await addSymbol(request);

    expect(result.fetchFailed).toBe(true);
  });

  test('should use fallbackId for risk groups missing from findMany results', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'fallback-id',
    };

    // Empty array forces all three ?? fallbackId branches to be taken
    mockPrisma.risk_group.findMany.mockResolvedValue([]);
    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'fallback-id',
      name: 'Conservative',
    });
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });

    await addSymbol(request);

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        risk_group_id: 'fallback-id',
      }),
    });
  });

  test('should use requestRiskGroupId when classifySymbolRiskGroupId returns null', async function () {
    const request = {
      symbol: 'ETW',
      risk_group_id: 'test-risk-group-id',
    };

    const mockCefData = { Ticker: 'ETW', CategoryId: 1 };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Equities',
    });
    mockLookupCefConnectSymbol.mockResolvedValue(mockCefData);
    mockClassifySymbolRiskGroupId.mockReturnValue(null);
    mockPrisma.universe.create.mockResolvedValue({
      ...mockDefaultRecord,
      symbol: 'ETW',
      risk_group_id: 'test-risk-group-id',
      is_closed_end_fund: true,
    } as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });

    await addSymbol(request);

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        risk_group_id: 'test-risk-group-id',
        is_closed_end_fund: true,
      }),
    });
  });

  test('should warn with stringified error when CefConnect lookup throws non-Error', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockLookupCefConnectSymbol.mockRejectedValue('non-error string thrown');
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });

    const result = await addSymbol(request);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'CEF classification lookup failed; using request risk_group_id',
      expect.objectContaining({
        symbol: 'SPY',
        error: 'non-error string thrown',
      })
    );
    expect(result.fetchFailed).toBe(true);
  });

  test('should convert symbol to uppercase', async function () {
    const request = {
      symbol: 'spy',
      risk_group_id: 'test-risk-group-id',
    };

    const mockCreatedRecord = {
      ...mockDefaultRecord,
      symbol: 'SPY',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });
    mockPrisma.universe.create.mockResolvedValue(mockCreatedRecord as any);

    await addSymbol(request);

    expect(mockPrisma.universe.findFirst).toHaveBeenCalledWith({
      where: { symbol: 'SPY' },
    });

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        symbol: 'SPY',
      }),
    });
  });

  test('should warn when getDistributions returns empty history, and call recalculateUniverseVolatility with []', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });

    const result = await addSymbol(request);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Empty dividend history for add-symbol; volatility set to insufficient-history',
      { symbol: 'SPY' }
    );
    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(
      'test-universe-id',
      []
    );
    expect(result.fetchFailed).toBe(true);
  });

  test('should pass real dividend history from getDistributions to recalculateUniverseVolatility (no double-fetch)', async function () {
    const historyFixture = [
      { amount: 0.3, date: new Date('2025-06-15') },
      { amount: 0.3, date: new Date('2025-07-15') },
    ];
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({
      result: {
        distribution: 0.3,
        distributions_per_year: 12,
        ex_date: new Date('2025-07-15'),
      },
      history: historyFixture,
    });

    await addSymbol(request);

    expect(mockGetDistributions).toHaveBeenCalledTimes(1);
    expect(mockGetDistributions).toHaveBeenCalledWith('SPY');
    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(
      'test-universe-id',
      historyFixture
    );
  });

  test('should set expired: true when symbol is a CEF', async function () {
    const request = {
      symbol: 'ETW',
      risk_group_id: 'test-risk-group-id',
    };

    const mockCefData = { Ticker: 'ETW', CategoryId: 1 };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Equities',
    });
    mockLookupCefConnectSymbol.mockResolvedValue(mockCefData);
    mockClassifySymbolRiskGroupId.mockReturnValue('eq-id');
    mockPrisma.universe.create.mockResolvedValue({
      ...mockDefaultRecord,
      symbol: 'ETW',
      risk_group_id: 'eq-id',
      expired: true,
      is_closed_end_fund: true,
    } as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue({ result: undefined, history: [] });

    await addSymbol(request);

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expired: true,
        is_closed_end_fund: true,
      }),
    });
  });

  test('should log Error.message when getDistributions throws Error and String(error) when recalculate throws non-Error', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockRejectedValue(new Error('fetch failed'));
    mockRecalculateUniverseVolatility.mockRejectedValue('volatility error');

    const result = await addSymbol(request);

    expect(result.fetchFailed).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Dividend history fetch failed during add-symbol; continuing with insufficient-history',
      expect.objectContaining({ symbol: 'SPY', error: 'fetch failed' })
    );
    expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(
      mockDefaultRecord.id,
      []
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Volatility recalculation failed during add-symbol',
      expect.objectContaining({ symbol: 'SPY', error: 'volatility error' })
    );
  });

  test('should log String(error) when getDistributions throws non-Error and Error.message when recalculate throws Error', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockPrisma.universe.create.mockResolvedValue(mockDefaultRecord as any);
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockRejectedValue('fetch failed');
    mockRecalculateUniverseVolatility.mockRejectedValue(
      new Error('volatility error')
    );

    const result = await addSymbol(request);

    expect(result.fetchFailed).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Dividend history fetch failed during add-symbol; continuing with insufficient-history',
      expect.objectContaining({ symbol: 'SPY', error: 'fetch failed' })
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Volatility recalculation failed during add-symbol',
      expect.objectContaining({ symbol: 'SPY', error: 'volatility error' })
    );
  });
});
