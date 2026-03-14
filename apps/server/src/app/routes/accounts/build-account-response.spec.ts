import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerAccountRoutes from './index';

// Story AX.5: TDD Tests for openTrades PartialArrayDefinition conversion
// RED phase — these tests call the actual route and assert openTrades is
// a PartialArrayDefinition shape. Currently the server returns string[],
// so these tests will FAIL when un-skipped (correct RED behavior).
// Disabled with describe.skip() to allow CI to pass.
// Will be re-enabled in Story AX.6.

// Hoisted mocks
const { mockPrismaTrades, mockPrismaDivDeposits, mockPrismaAccounts } =
  vi.hoisted(() => ({
    mockPrismaTrades: { findMany: vi.fn(), count: vi.fn() },
    mockPrismaDivDeposits: { findMany: vi.fn(), count: vi.fn() },
    mockPrismaAccounts: { findMany: vi.fn() },
  }));

vi.mock('../../prisma/prisma-client', () => ({
  prisma: {
    trades: mockPrismaTrades,
    divDeposits: mockPrismaDivDeposits,
    accounts: mockPrismaAccounts,
  },
}));

// Stub sub-route registrations
vi.mock('./indexes', () => ({
  default: vi.fn(),
}));

function makeTradeId(id: string): { id: string } {
  return { id };
}

describe('buildAccountResponse - openTrades as PartialArrayDefinition (AX.5)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify({ logger: false });
    await app.register(registerAccountRoutes, { prefix: '/api/accounts' });
    await app.ready();
    mockPrismaTrades.findMany.mockReset();
    mockPrismaDivDeposits.findMany.mockReset();
    mockPrismaAccounts.findMany.mockReset();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return openTrades as PartialArrayDefinition with startIndex 0', async () => {
    const openTradeIds = Array.from({ length: 15 }, function createId(_, i) {
      return makeTradeId(`trade-${i}`);
    });
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany.mockResolvedValue(openTradeIds);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].openTrades).toEqual({
      startIndex: 0,
      indexes: [
        'trade-0',
        'trade-1',
        'trade-2',
        'trade-3',
        'trade-4',
        'trade-5',
        'trade-6',
        'trade-7',
        'trade-8',
        'trade-9',
      ],
      length: 15,
    });
  });

  it('should return first 10 trade IDs in indexes when more than 10 exist', async () => {
    const openTradeIds = Array.from({ length: 25 }, function createId(_, i) {
      return makeTradeId(`trade-${i}`);
    });
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany.mockResolvedValue(openTradeIds);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].openTrades.indexes).toHaveLength(10);
    expect(body[0].openTrades.indexes[0]).toBe('trade-0');
    expect(body[0].openTrades.indexes[9]).toBe('trade-9');
  });

  it('should return total length equal to all open trades count', async () => {
    const openTradeIds = Array.from({ length: 42 }, function createId(_, i) {
      return makeTradeId(`trade-${i}`);
    });
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany.mockResolvedValue(openTradeIds);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].openTrades.length).toBe(42);
  });

  it('should filter open trades by sell_date null', async () => {
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany.mockResolvedValue([]);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    // Verify the open trades query includes sell_date: null filter
    // The first findMany call is for open trades (getOpenTradeIds)
    expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'acc-1',
          OR: expect.arrayContaining([
            expect.objectContaining({ sell_date: null }),
          ]),
        }),
      })
    );
  });

  it('should apply buildTradeOrderBy for open trades ordering', async () => {
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany.mockResolvedValue([]);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    // Default ordering when no sort header provided
    expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      })
    );
  });

  it('should return all IDs when fewer than 10 open trades exist', async () => {
    const openTradeIds = Array.from({ length: 5 }, function createId(_, i) {
      return makeTradeId(`trade-${i}`);
    });
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany.mockResolvedValue(openTradeIds);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].openTrades.indexes).toHaveLength(5);
    expect(body[0].openTrades.length).toBe(5);
  });

  it('should return empty PartialArrayDefinition when no open trades exist', async () => {
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany.mockResolvedValue([]);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].openTrades).toEqual({
      startIndex: 0,
      indexes: [],
      length: 0,
    });
  });
});
