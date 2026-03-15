import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

import registerAccountIndexesRoutes from './index';

// Story AX.14: Tests for /indexes endpoint handling divDeposits childField
// Completes coverage for all three child fields

// Hoisted mocks
const { mockPrismaTrades, mockPrismaDivDeposits } = vi.hoisted(() => ({
  mockPrismaTrades: { findMany: vi.fn(), count: vi.fn() },
  mockPrismaDivDeposits: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock('../../../prisma/prisma-client', () => ({
  prisma: {
    trades: mockPrismaTrades,
    divDeposits: mockPrismaDivDeposits,
  },
}));

function makeDepositId(id: string): { id: string } {
  return { id };
}

describe('GET /indexes - divDeposits childField (AX.14)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify({ logger: false });
    await app.register(registerAccountIndexesRoutes, {
      prefix: '/api/accounts/indexes',
    });
    await app.ready();
    mockPrismaTrades.findMany.mockReset();
    mockPrismaTrades.count.mockReset();
    mockPrismaDivDeposits.findMany.mockReset();
    mockPrismaDivDeposits.count.mockReset();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should handle childField === "divDeposits" and return matching deposit IDs', async () => {
    const depositIds = Array.from({ length: 5 }, function createId(_, i) {
      return makeDepositId(`dep-${i}`);
    });
    mockPrismaDivDeposits.findMany.mockResolvedValue(depositIds);
    mockPrismaDivDeposits.count.mockResolvedValue(20);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 5,
        parentId: 'acc-1',
        childField: 'divDeposits',
      },
    });

    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.startIndex).toBe(0);
    expect(body.indexes).toEqual(['dep-0', 'dep-1', 'dep-2', 'dep-3', 'dep-4']);
    expect(body.length).toBe(20);
  });

  it('should return correct slice using skip and take', async () => {
    const depositIds = Array.from({ length: 3 }, function createId(_, i) {
      return makeDepositId(`dep-${i + 5}`);
    });
    mockPrismaDivDeposits.findMany.mockResolvedValue(depositIds);
    mockPrismaDivDeposits.count.mockResolvedValue(15);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 5,
        length: 3,
        parentId: 'acc-1',
        childField: 'divDeposits',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.startIndex).toBe(5);
    expect(body.indexes).toEqual(['dep-5', 'dep-6', 'dep-7']);
    expect(body.length).toBe(15);
  });

  it('should return correct total count from prisma count', async () => {
    mockPrismaDivDeposits.findMany.mockResolvedValue([makeDepositId('dep-1')]);
    mockPrismaDivDeposits.count.mockResolvedValue(100);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 1,
        parentId: 'acc-1',
        childField: 'divDeposits',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.length).toBe(100);
  });

  it('should return empty indexes and length 0 when no div deposits match', async () => {
    mockPrismaDivDeposits.findMany.mockResolvedValue([]);
    mockPrismaDivDeposits.count.mockResolvedValue(0);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'divDeposits',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.indexes).toEqual([]);
    expect(body.length).toBe(0);
  });

  it('should handle single div deposit correctly', async () => {
    mockPrismaDivDeposits.findMany.mockResolvedValue([
      makeDepositId('dep-only'),
    ]);
    mockPrismaDivDeposits.count.mockResolvedValue(1);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'divDeposits',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.indexes).toEqual(['dep-only']);
    expect(body.length).toBe(1);
  });

  it('should handle startIndex at end of dataset (scroll to end)', async () => {
    mockPrismaDivDeposits.findMany.mockResolvedValue([makeDepositId('dep-99')]);
    mockPrismaDivDeposits.count.mockResolvedValue(100);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 99,
        length: 10,
        parentId: 'acc-1',
        childField: 'divDeposits',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.startIndex).toBe(99);
    expect(body.indexes).toEqual(['dep-99']);
    expect(body.length).toBe(100);
  });

  it('should handle startIndex at beginning after previous request at end', async () => {
    // First request: scroll to end
    mockPrismaDivDeposits.findMany.mockResolvedValue([makeDepositId('dep-99')]);
    mockPrismaDivDeposits.count.mockResolvedValue(100);

    await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 99,
        length: 10,
        parentId: 'acc-1',
        childField: 'divDeposits',
      },
    });

    // Second request: scroll back to beginning
    const beginIds = Array.from({ length: 10 }, function createId(_, i) {
      return makeDepositId(`dep-${i}`);
    });
    mockPrismaDivDeposits.findMany.mockResolvedValue(beginIds);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'divDeposits',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.startIndex).toBe(0);
    expect(body.indexes[0]).toBe('dep-0');
    expect(body.indexes).toHaveLength(10);
  });

  it('should return empty for unknown childField', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/indexes',
      payload: {
        startIndex: 0,
        length: 10,
        parentId: 'acc-1',
        childField: 'unknownField',
      },
    });

    const body = JSON.parse(response.body);
    expect(body.indexes).toEqual([]);
    expect(body.length).toBe(0);
  });
});
