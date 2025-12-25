import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import registerTopRoutes from './index';

// Hoisted mocks
const {
  mockEnsureRiskGroupsExist,
  mockPrismaAccounts,
  mockPrismaUniverse,
  mockPrismaRiskGroup,
  mockPrismaDivDepositType,
  mockPrismaHolidays,
  mockPrismaScreener,
} = vi.hoisted(() => ({
  mockEnsureRiskGroupsExist: vi.fn(),
  mockPrismaAccounts: {
    findMany: vi.fn(),
  },
  mockPrismaUniverse: {
    findMany: vi.fn(),
  },
  mockPrismaRiskGroup: {
    findMany: vi.fn(),
  },
  mockPrismaDivDepositType: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  mockPrismaHolidays: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  mockPrismaScreener: {
    findMany: vi.fn(),
  },
}));

vi.mock('../settings/common/ensure-risk-groups-exist.function', () => ({
  ensureRiskGroupsExist: mockEnsureRiskGroupsExist,
}));

vi.mock('../../prisma/prisma-client', () => ({
  prisma: {
    accounts: mockPrismaAccounts,
    universe: mockPrismaUniverse,
    risk_group: mockPrismaRiskGroup,
    divDepositType: mockPrismaDivDepositType,
    holidays: mockPrismaHolidays,
    screener: mockPrismaScreener,
  },
}));

vi.mock('nyse-holidays', () => ({
  getHolidays: vi.fn(() => []),
}));

describe('Top Route Handler', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify({ logger: false });
    await app.register(registerTopRoutes, { prefix: '/api/top' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock responses
    mockPrismaAccounts.findMany.mockResolvedValue([
      { id: 'acc-1' },
      { id: 'acc-2' },
    ]);
    mockPrismaUniverse.findMany.mockResolvedValue([{ id: 'uni-1' }]);
    mockPrismaRiskGroup.findMany.mockResolvedValue([
      { id: 'rg-1' },
      { id: 'rg-2' },
      { id: 'rg-3' },
    ]);
    mockPrismaDivDepositType.findMany.mockResolvedValue([
      { id: 'ddt-1' },
      { id: 'ddt-2' },
    ]);
    mockPrismaHolidays.findMany.mockResolvedValue([
      { date: new Date('2026-01-01') },
      { date: new Date('2026-07-04') },
    ]);
    mockPrismaScreener.findMany.mockResolvedValue([{ id: 'scr-1' }]);

    mockEnsureRiskGroupsExist.mockResolvedValue([
      { id: 'rg-1', name: 'Equities' },
      { id: 'rg-2', name: 'Income' },
      { id: 'rg-3', name: 'Tax Free Income' },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST / - Risk Group Validation', () => {
    it('should call ensureRiskGroupsExist before loading data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      expect(mockEnsureRiskGroupsExist).toHaveBeenCalledTimes(1);
    });

    it('should return risk groups in response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0]).toHaveProperty('riskGroups');
      expect(body[0].riskGroups).toEqual(['rg-1', 'rg-2', 'rg-3']);
    });

    it('should handle ensureRiskGroupsExist failure gracefully', async () => {
      mockEnsureRiskGroupsExist.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      // Should return an error response
      expect(response.statusCode).toBe(500);
      expect(mockEnsureRiskGroupsExist).toHaveBeenCalledTimes(1);
    });

    it('should proceed normally when risk groups already exist', async () => {
      mockEnsureRiskGroupsExist.mockResolvedValueOnce([
        { id: 'rg-1', name: 'Equities' },
        { id: 'rg-2', name: 'Income' },
        { id: 'rg-3', name: 'Tax Free Income' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      expect(mockEnsureRiskGroupsExist).toHaveBeenCalledTimes(1);

      const body = JSON.parse(response.body);
      expect(body[0].riskGroups).toEqual(['rg-1', 'rg-2', 'rg-3']);
    });

    it('should return empty array when no IDs provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: [],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);

      // Should not call ensureRiskGroupsExist for empty request
      expect(mockEnsureRiskGroupsExist).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial risk group creation', async () => {
      mockEnsureRiskGroupsExist.mockResolvedValueOnce([
        { id: 'rg-1', name: 'Equities' },
        { id: 'rg-2', name: 'Income' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      // Should still succeed with partial groups
      expect(response.statusCode).toBe(200);
    });

    it('should handle network timeout during risk group check', async () => {
      mockEnsureRiskGroupsExist.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/top',
        payload: ['1'],
      });

      // Should handle timeout gracefully
      expect(response.statusCode).toBe(500);
    });

    it('should handle concurrent top route calls', async () => {
      const requests = [
        app.inject({
          method: 'POST',
          url: '/api/top',
          payload: ['1'],
        }),
        app.inject({
          method: 'POST',
          url: '/api/top',
          payload: ['1'],
        }),
        app.inject({
          method: 'POST',
          url: '/api/top',
          payload: ['1'],
        }),
      ];

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
      });

      // ensureRiskGroupsExist should be called for each request
      expect(mockEnsureRiskGroupsExist).toHaveBeenCalledTimes(3);
    });
  });
});
