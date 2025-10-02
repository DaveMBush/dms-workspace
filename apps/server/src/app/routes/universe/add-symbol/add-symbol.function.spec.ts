import { addSymbol } from './add-symbol.function';
import { prisma } from '../../../prisma/prisma-client';
import { getDistributions } from '../../settings/common/get-distributions.function';
import { getLastPrice } from '../../settings/common/get-last-price.function';
import { vi } from 'vitest';

vi.mock('../../../prisma/prisma-client', function () {
  return {
    prisma: {
      universe: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      risk_group: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock('../../settings/common/get-distributions.function');
vi.mock('../../settings/common/get-last-price.function');

const mockPrisma = prisma as any;
const mockGetDistributions = getDistributions as any;
const mockGetLastPrice = getLastPrice as any;

describe('addSymbol', function () {
  beforeEach(function () {
    vi.clearAllMocks();
  });

  test('should successfully add new symbol', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    const mockDistributionData = {
      distribution: 1.5,
      ex_date: new Date('2024-09-15'),
      distributions_per_year: 4,
    };

    const mockCreatedRecord = {
      id: 'test-universe-id',
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
      distribution: 1.5,
      distributions_per_year: 4,
      ex_date: new Date('2024-09-15'),
      last_price: 150.25,
      most_recent_sell_date: null,
      expired: false,
      is_closed_end_fund: false,
      createdAt: new Date('2024-09-20'),
      updatedAt: new Date('2024-09-20'),
    };

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockGetLastPrice.mockResolvedValue(150.25);
    mockGetDistributions.mockResolvedValue(mockDistributionData);
    mockPrisma.universe.create.mockResolvedValue(mockCreatedRecord as any);

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
    });

    expect(mockPrisma.universe.create).toHaveBeenCalledWith({
      data: {
        symbol: 'SPY',
        risk_group_id: 'test-risk-group-id',
        last_price: 150.25,
        distribution: 1.5,
        distributions_per_year: 4,
        ex_date: new Date('2024-09-15'),
        most_recent_sell_date: null,
        expired: false,
        is_closed_end_fund: false,
      },
    });
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

  test('should handle null price and distribution data', async function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    const mockCreatedRecord = {
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

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue(null);
    mockPrisma.universe.create.mockResolvedValue(mockCreatedRecord as any);

    const result = await addSymbol(request);

    expect(result.last_price).toBeNull();
    expect(result.distribution).toBeNull();
    expect(result.distributions_per_year).toBeNull();
    expect(result.ex_date).toBeNull();
  });

  test('should convert symbol to uppercase', async function () {
    const request = {
      symbol: 'spy',
      risk_group_id: 'test-risk-group-id',
    };

    const mockCreatedRecord = {
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

    mockPrisma.universe.findFirst.mockResolvedValue(null);
    mockPrisma.risk_group.findUnique.mockResolvedValue({
      id: 'test-risk-group-id',
      name: 'Conservative',
    });
    mockGetLastPrice.mockResolvedValue(undefined);
    mockGetDistributions.mockResolvedValue(null);
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
});
