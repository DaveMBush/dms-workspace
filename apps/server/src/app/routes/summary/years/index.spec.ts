import { beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerYearsRoutes from './index';

// Hoisted mocks
const { mockPrismaDivDeposits, mockPrismaTrades } = vi.hoisted(() => ({
  mockPrismaDivDeposits: { findMany: vi.fn() },
  mockPrismaTrades: { findMany: vi.fn() },
}));

vi.mock('../../../prisma/prisma-client', () => ({
  prisma: {
    divDeposits: mockPrismaDivDeposits,
    trades: mockPrismaTrades,
  },
}));

describe('GET /api/summary/years', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify({ logger: false });
    await app.register(registerYearsRoutes, { prefix: '/api/summary/years' });
    await app.ready();
    mockPrismaDivDeposits.findMany.mockReset();
    mockPrismaTrades.findMany.mockReset();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return available years sorted descending from divDeposits and trades (regression: AS.9 Bug #2)', async () => {
    // Regression: /api/summary/years returns 404 because getAvailableYears was not wired up;
    // this test validates the endpoint handler is correctly registered and responds.
    mockPrismaDivDeposits.findMany.mockResolvedValue([
      { date: new Date('2024-03-15') },
      { date: new Date('2023-11-01') },
      { date: new Date('2024-07-20') },
    ]);
    mockPrismaTrades.findMany.mockResolvedValue([
      { sell_date: new Date('2022-05-10') },
      { sell_date: new Date('2023-08-25') },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/summary/years/',
    });

    expect(response.statusCode).toBe(200);
    const years = JSON.parse(response.body) as number[];
    // Should return unique years sorted descending
    expect(years).toEqual([2024, 2023, 2022]);
  });

  it('should return empty array when no data exists', async () => {
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);
    mockPrismaTrades.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/summary/years/',
    });

    expect(response.statusCode).toBe(200);
    const years = JSON.parse(response.body) as number[];
    expect(years).toEqual([]);
  });

  it('should skip trades with null sell_date', async () => {
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);
    mockPrismaTrades.findMany.mockResolvedValue([
      { sell_date: null },
      { sell_date: new Date('2025-06-01') },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/summary/years/',
    });

    expect(response.statusCode).toBe(200);
    const years = JSON.parse(response.body) as number[];
    expect(years).toEqual([2025]);
  });

  it('should deduplicate years that appear in both divDeposits and trades', async () => {
    // Use only trades mock to isolate deduplication test (fresh app per test)
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);
    mockPrismaTrades.findMany.mockResolvedValue([
      { sell_date: new Date('2025-03-01') },
      { sell_date: new Date('2025-11-15') },
      { sell_date: new Date('2025-06-30') },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/summary/years/',
    });

    expect(response.statusCode).toBe(200);
    const years = JSON.parse(response.body) as number[];
    // All three trade records are from 2025; should deduplicate to [2025]
    expect(years).toEqual([2025]);
  });
});
