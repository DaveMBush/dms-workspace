import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerAccountRoutes from './index';

// Story AX.9: TDD Tests for soldTrades PartialArrayDefinition conversion
// RED phase — these tests call the actual route and assert soldTrades is
// a PartialArrayDefinition shape. Currently the server returns string[],
// so these tests will FAIL when un-skipped (correct RED behavior).
// Disabled with describe.skip() to allow CI to pass.
// Will be re-enabled in Story AX.10.

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

function makeSoldTrade(id: string) {
  return { id, ['sell_date' as string]: new Date('2024-01-15') };
}

describe('buildAccountResponse - soldTrades as PartialArrayDefinition (AX.9)', () => {
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

  it('should return soldTrades as PartialArrayDefinition with startIndex 0', async () => {
    const soldTradeData = Array.from(
      { length: 15 },
      function createSoldTrade(_, i) {
        return makeSoldTrade(`sold-${i}`);
      }
    );
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    // First findMany call returns open trades, second returns sold trades
    mockPrismaTrades.findMany
      .mockResolvedValueOnce([]) // open trades
      .mockResolvedValueOnce(soldTradeData); // sold trades
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].soldTrades).toEqual({
      startIndex: 0,
      indexes: [
        'sold-0',
        'sold-1',
        'sold-2',
        'sold-3',
        'sold-4',
        'sold-5',
        'sold-6',
        'sold-7',
        'sold-8',
        'sold-9',
      ],
      length: 15,
    });
  });

  it('should return first 10 sold trade IDs in indexes when more than 10 exist', async () => {
    const soldTradeData = Array.from(
      { length: 25 },
      function createSoldTrade(_, i) {
        return makeSoldTrade(`sold-${i}`);
      }
    );
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(soldTradeData);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].soldTrades.indexes).toHaveLength(10);
    expect(body[0].soldTrades.indexes[0]).toBe('sold-0');
    expect(body[0].soldTrades.indexes[9]).toBe('sold-9');
  });

  it('should return total length equal to all sold trades count', async () => {
    const soldTradeData = Array.from(
      { length: 42 },
      function createSoldTrade(_, i) {
        return makeSoldTrade(`sold-${i}`);
      }
    );
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(soldTradeData);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].soldTrades.length).toBe(42);
  });

  it('should filter sold trades by sell_date IS NOT NULL', async () => {
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

    // Verify the sold trades query includes sell_date: { not: null } filter
    // The second findMany call is for sold trades
    const soldTradesCall = mockPrismaTrades.findMany.mock.calls[1];
    expect(soldTradesCall[0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'acc-1',
          sell_date: { not: null },
        }),
      })
    );
  });

  it('should return all IDs when fewer than 10 sold trades exist', async () => {
    const soldTradeData = Array.from(
      { length: 5 },
      function createSoldTrade(_, i) {
        return makeSoldTrade(`sold-${i}`);
      }
    );
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(soldTradeData);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].soldTrades.indexes).toHaveLength(5);
    expect(body[0].soldTrades.length).toBe(5);
  });

  it('should return empty PartialArrayDefinition when no sold trades exist', async () => {
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1', name: 'Test' },
    ]);
    mockPrismaTrades.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].soldTrades).toEqual({
      startIndex: 0,
      indexes: [],
      length: 0,
    });
  });
});
