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
  openTradeIds: { id: string }[];
  openCount: number;
  soldTradeIds?: { id: string }[];
  soldCount?: number;
  soldMonthDates?: Array<{ sell_date: Date | null }>;
  divDepositIds?: { id: string }[];
  divCount?: number;
  divMonthDates?: Array<{ date: Date }>;
}): void {
  mockPrismaAccounts.findMany.mockResolvedValue([
    { id: 'acc-1', name: 'Test' },
  ]);
  mockPrismaTrades.count
    .mockResolvedValueOnce(options.openCount)
    .mockResolvedValueOnce(options.soldCount ?? 0);
  mockPrismaTrades.findMany
    .mockResolvedValueOnce(options.openTradeIds)
    .mockResolvedValueOnce(options.soldTradeIds ?? [])
    .mockResolvedValueOnce(options.soldMonthDates ?? []);
  mockPrismaDivDeposits.count.mockResolvedValueOnce(options.divCount ?? 0);
  mockPrismaDivDeposits.findMany
    .mockResolvedValueOnce(options.divDepositIds ?? [])
    .mockResolvedValueOnce(options.divMonthDates ?? []);
}

describe('buildAccountResponse - openTrades lazy loading (Story 40.3)', () => {
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

  it('should return openTrades as PartialArrayDefinition with startIndex 0', async () => {
    const openTradeIds = Array.from({ length: 15 }, function createId(_, i) {
      return makeTradeId(`trade-${i}`);
    });
    setupMocks({ openTradeIds, openCount: 15 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].openTrades).toEqual({
      startIndex: 0,
      indexes: openTradeIds.map(function mapId(t) {
        return t.id;
      }),
      length: 15,
    });
  });

  it('should use count + skip/take for open trades pagination', async () => {
    setupMocks({ openTradeIds: [], openCount: 0 });

    await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    expect(mockPrismaTrades.count).toHaveBeenCalled();
    expect(mockPrismaTrades.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        skip: 0,
        take: ACCOUNT_PAGE_SIZE,
      })
    );
  });

  it('should return total length from count, not array length', async () => {
    const page = Array.from(
      { length: ACCOUNT_PAGE_SIZE },
      function createId(_, i) {
        return makeTradeId(`trade-${i}`);
      }
    );
    setupMocks({ openTradeIds: page, openCount: 120 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    const body = JSON.parse(response.body);
    expect(body[0].openTrades.indexes).toHaveLength(ACCOUNT_PAGE_SIZE);
    expect(body[0].openTrades.length).toBe(120);
  });

  it('should filter open trades by sell_date null', async () => {
    setupMocks({ openTradeIds: [], openCount: 0 });

    await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

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
    setupMocks({ openTradeIds: [], openCount: 0 });

    await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: ['acc-1'],
    });

    expect(mockPrismaTrades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      })
    );
  });

  it('should return all IDs when fewer than page size exist', async () => {
    const openTradeIds = Array.from({ length: 5 }, function createId(_, i) {
      return makeTradeId(`trade-${i}`);
    });
    setupMocks({ openTradeIds, openCount: 5 });

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
    setupMocks({ openTradeIds: [], openCount: 0 });

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
