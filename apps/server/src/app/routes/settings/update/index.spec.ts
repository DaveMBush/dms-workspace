import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StructuredLogger } from '../../../../utils/structured-logger';

// Hoisted mocks — created before module resolution
const h = vi.hoisted(() => ({
  prismaFindMany: vi.fn(),
  prismaUpdate: vi.fn().mockResolvedValue({}),
  getDistributions: vi.fn(),
  getLastPrice: vi.fn(),
  recalculateUniverseVolatility: vi.fn(),
}));

vi.mock('../../../prisma/prisma-client', () => ({
  prisma: {
    universe: {
      findMany: h.prismaFindMany,
      update: h.prismaUpdate,
    },
  },
}));

vi.mock('../common/get-distributions.function', () => ({
  getDistributions: h.getDistributions,
}));

vi.mock('../common/get-last-price.function', () => ({
  getLastPrice: h.getLastPrice,
}));

vi.mock('../../../volatility/recalculate-universe-volatility.function', () => ({
  recalculateUniverseVolatility: h.recalculateUniverseVolatility,
}));

import { testExports } from './index';

const mockHistory = [
  { amount: 0.25, date: new Date('2024-01-15') },
  { amount: 0.24, date: new Date('2023-10-15') },
  { amount: 0.24, date: new Date('2023-07-15') },
];

const mockUniverse = {
  id: 'test-universe-id',
  symbol: 'TST',
  distribution: 0.24,
  distributions_per_year: 4,
  last_price: 150,
  ex_date: new Date('2023-07-01'),
  risk_group_id: 'rg-1',
  expired: false,
  is_closed_end_fund: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  version: 1,
  volatility_long: null,
  volatility_short: null,
  volatility_calculated_at: null,
  most_recent_sell_date: null,
  most_recent_sell_price: null,
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as StructuredLogger;

describe('settings/update route — volatility recalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.prismaUpdate.mockResolvedValue({});
  });

  it('should call recalculateUniverseVolatility with universe.id and history when distributions are available', async () => {
    // Arrange
    h.getLastPrice.mockResolvedValue(155.0);
    h.getDistributions.mockResolvedValue({
      result: {
        distribution: 0.26,
        distributions_per_year: 4,
        ex_date: new Date('2024-02-01'),
      },
      history: mockHistory,
    });
    h.recalculateUniverseVolatility.mockResolvedValue(undefined);

    // Act
    const result = await testExports.processUniverse(mockUniverse, mockLogger);

    // Assert
    expect(result.success).toBe(true);
    expect(h.recalculateUniverseVolatility).toHaveBeenCalledOnce();
    expect(h.recalculateUniverseVolatility).toHaveBeenCalledWith(
      mockUniverse.id,
      mockHistory
    );
  });

  it('should call recalculateUniverseVolatility with empty array when no distribution history', async () => {
    // Arrange
    h.getLastPrice.mockResolvedValue(155.0);
    h.getDistributions.mockResolvedValue({
      result: undefined,
      history: [],
    });
    h.recalculateUniverseVolatility.mockResolvedValue(undefined);

    // Act
    const result = await testExports.processUniverse(mockUniverse, mockLogger);

    // Assert
    expect(result.success).toBe(true);
    expect(h.recalculateUniverseVolatility).toHaveBeenCalledOnce();
    expect(h.recalculateUniverseVolatility).toHaveBeenCalledWith(
      mockUniverse.id,
      []
    );
  });

  it('should mark symbol as failed when recalculateUniverseVolatility throws', async () => {
    // Arrange
    h.getLastPrice.mockResolvedValue(155.0);
    h.getDistributions.mockResolvedValue({
      result: {
        distribution: 0.26,
        distributions_per_year: 4,
        ex_date: new Date('2024-02-01'),
      },
      history: mockHistory,
    });
    h.recalculateUniverseVolatility.mockRejectedValue(
      new Error('Volatility calculation failed')
    );

    // Act
    const result = await testExports.processUniverse(mockUniverse, mockLogger);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Volatility calculation failed');
  });

  it('updateAllUniverses should continue processing when one volatility recalculation fails', async () => {
    // Arrange — two universes; first fails volatility, second succeeds
    const mockUniverse2 = {
      ...mockUniverse,
      id: 'test-universe-id-2',
      symbol: 'TST2',
    };

    h.prismaFindMany.mockResolvedValue([mockUniverse, mockUniverse2]);

    // Both universes return distributions without errors
    h.getLastPrice.mockResolvedValue(155.0);
    h.getDistributions.mockResolvedValue({
      result: {
        distribution: 0.26,
        distributions_per_year: 4,
        ex_date: new Date('2024-02-01'),
      },
      history: mockHistory,
    });

    // First universe: volatility fails; second: succeeds
    h.recalculateUniverseVolatility
      .mockRejectedValueOnce(new Error('Volatility calculation failed'))
      .mockResolvedValueOnce(undefined);

    // Act
    const summary = await testExports.updateAllUniverses(mockLogger);

    // Assert — batch continues; one failure, one success
    expect(summary.totalProcessed).toBe(2);
    expect(summary.successful).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0].symbol).toBe(mockUniverse.symbol);
    expect(summary.errors[0].error).toContain('Volatility calculation failed');
    expect(h.recalculateUniverseVolatility).toHaveBeenCalledTimes(2);
  });
});
