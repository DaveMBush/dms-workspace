import { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../../prisma/prisma-client';
import registerDivDepositRoutes from './index';

vi.mock('../../prisma/prisma-client', () => ({
  prisma: {
    divDeposits: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Div Deposits Routes', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    const fastifyModule = await import('fastify');
    fastify = fastifyModule.default();
    await fastify.register(
      async (instance) => {
        registerDivDepositRoutes(instance);
      },
      { prefix: '/div-deposits' }
    );
    await fastify.ready();
    vi.clearAllMocks();
  });

  describe('POST /', () => {
    it('should return div deposits with symbol when universe is linked', async () => {
      const mockDivDeposits = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 100,
          accountId: 'acc1',
          divDepositTypeId: 'type1',
          universeId: 'universe1',
          universe: { symbol: 'PDI' },
        },
      ];

      vi.mocked(prisma.divDeposits.findMany).mockResolvedValue(
        mockDivDeposits as never
      );

      const response = await fastify.inject({
        method: 'POST',
        url: '/div-deposits',
        payload: ['1'],
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1',
        accountId: 'acc1',
        divDepositTypeId: 'type1',
        universeId: 'universe1',
        symbol: 'PDI',
      });
    });

    it('should return div deposits with null symbol when universe is not linked', async () => {
      const mockDivDeposits = [
        {
          id: '2',
          date: new Date('2024-01-02'),
          amount: 200,
          accountId: 'acc2',
          divDepositTypeId: 'type2',
          universeId: null,
          universe: null,
        },
      ];

      vi.mocked(prisma.divDeposits.findMany).mockResolvedValue(
        mockDivDeposits as never
      );

      const response = await fastify.inject({
        method: 'POST',
        url: '/div-deposits',
        payload: ['2'],
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '2',
        accountId: 'acc2',
        divDepositTypeId: 'type2',
        universeId: null,
        symbol: null,
      });
    });
  });

  describe('POST /add', () => {
    it('should create div deposit and return it with symbol', async () => {
      const mockCreatedDivDeposit = {
        id: '3',
        date: new Date('2024-01-03'),
        amount: 300,
        accountId: 'acc3',
        divDepositTypeId: 'type3',
        universeId: 'universe3',
        universe: { symbol: 'XYZ' },
      };

      vi.mocked(prisma.divDeposits.create).mockResolvedValue(
        mockCreatedDivDeposit as never
      );

      const response = await fastify.inject({
        method: 'POST',
        url: '/div-deposits/add',
        payload: {
          date: '2024-01-03',
          amount: 300,
          accountId: 'acc3',
          divDepositTypeId: 'type3',
          universeId: 'universe3',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '3',
        symbol: 'XYZ',
      });
    });
  });

  describe('PUT /', () => {
    it('should update div deposit and return it with symbol', async () => {
      const mockUpdatedDivDeposits = [
        {
          id: '4',
          date: new Date('2024-01-04'),
          amount: 400,
          accountId: 'acc4',
          divDepositTypeId: 'type4',
          universeId: 'universe4',
          universe: { symbol: 'ABC' },
        },
      ];

      vi.mocked(prisma.divDeposits.update).mockResolvedValue({} as never);
      vi.mocked(prisma.divDeposits.findMany).mockResolvedValue(
        mockUpdatedDivDeposits as never
      );

      const response = await fastify.inject({
        method: 'PUT',
        url: '/div-deposits',
        payload: {
          id: '4',
          date: '2024-01-04',
          amount: 400,
          accountId: 'acc4',
          divDepositTypeId: 'type4',
          universeId: 'universe4',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '4',
        symbol: 'ABC',
      });
    });
  });

  describe('DELETE /:id', () => {
    it('should soft-delete div deposit by setting deletedAt', async () => {
      vi.mocked(prisma.divDeposits.update).mockResolvedValue({} as never);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/div-deposits/5',
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result).toMatchObject({ success: true });
      expect(prisma.divDeposits.update).toHaveBeenCalledWith({
        where: { id: '5' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      });
    });
  });
});
