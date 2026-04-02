import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerAccountRoutes from './index';
import { ACCOUNT_PAGE_SIZE } from './account-page-size.const';

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

// Sets up mocks in the deterministic call order of buildAccountResponse:
// trades.count: (1) open, (2) sold
// trades.findMany: (1) open page, (2) sold page, (3) sold month dates
// divDeposits.count: (1) div deposits
// divDeposits.findMany: (1) div deposits page, (2) div month dates
function setupMocks(options: {
  soldTradeIds: { id: string }[];
  soldCount: number;
  soldMonthDates?: Array<{ sell_date: Date | null }>;
}): void {
  mockPrismaAccounts.findMany.mockResolvedValue([
    { id: 'acc-1', name: 'Test' },
  ]);
  mockPrismaTrades.count
    .mockResolvedValueOnce(0) // open trades count
    .mockResolvedValueOnce(options.soldCount); // sold trades count
  mockPrismaTrades.findMany
    .mockResolvedValueOnce([]) // open trades page
    .mockResolvedValueOnce(options.soldTradeIds) // sold trades page
    .mockResolvedValueOnce(options.soldMonthDates ?? []); // sold month dates
  mockPrismaDivDeposits.count.mockResolvedValueOnce(0);
  mockPrismaDivDeposits.findMany
    .mockResolvedValueOnce([]) // div deposits page
    .mockResolvedValueOnce([]); // div month dates
}

describe('buildAccountResponse - soldTrades lazy loading (Story 40.3)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify({ logger: false });
    await app.register(registerAccountRoutes, { prefix: '/api/accounts' });
    await app.ready();
    mockPrismaTrades.findMany.mockReset();
    mockPrismaTrades.count.mockReset();
    mockPrismaDivDeposits.findMany.mockReset();
    mockPrismaDivDeposits.count.mockReset();
    mockPrismaAccounts.findMany.mockReset();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return soldTrades as PartialArrayDefinition with startIndex 0', async () => {
    const soldTradeIds = Array.from({ length: 15 }, function createId(_, i) {
      return makeTradeId(`sold-${i}`);
    });
    setupMocks({ soldTradeIds, soldCount: 15 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].soldTrades).toEqual({
      startIndex: 0,
      indexes: soldTradeIds.map(function mapId(t) {
        return t.id;
      }),
      length: 15,
    });
  });

  it('should use count + skip/take for sold trades pagination', async () => {
    setupMocks({ soldTradeIds: [], soldCount: 0 });

    await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    // The second findMany call (sold page) should use skip/take
    const soldTradesCall = mockPrismaTrades.findMany.mock.calls[1];
    expect(soldTradesCall[0]).toEqual(
      expect.objectContaining({
        skip: 0,
        take: ACCOUNT_PAGE_SIZE,
      })
    );
  });

  it('should return total length from count', async () => {
    const page = Array.from(
      { length: ACCOUNT_PAGE_SIZE },
      function createId(_, i) {
        return makeTradeId(`sold-${i}`);
      }
    );
    setupMocks({ soldTradeIds: page, soldCount: 120 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].soldTrades.indexes).toHaveLength(ACCOUNT_PAGE_SIZE);
    expect(body[0].soldTrades.length).toBe(120);
  });

  it('should filter sold trades by sell_date IS NOT NULL', async () => {
    setupMocks({ soldTradeIds: [], soldCount: 0 });

    await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

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

  it('should return all IDs when fewer than page size exist', async () => {
    const soldTradeIds = Array.from({ length: 5 }, function createId(_, i) {
      return makeTradeId(`sold-${i}`);
    });
    setupMocks({ soldTradeIds, soldCount: 5 });

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
    setupMocks({ soldTradeIds: [], soldCount: 0 });

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
