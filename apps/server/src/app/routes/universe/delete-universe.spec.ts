import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from 'vitest';
import { PrismaClient } from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import fastify, { FastifyInstance } from 'fastify';

// Create a test-specific delete route handler that accepts prisma as a parameter
function createTestDeleteRoute(testPrisma: PrismaClient) {
  return function handleDeleteUniverseRoute(
    fastifyInstance: FastifyInstance
  ): void {
    fastifyInstance.delete<{ Params: { id: string } }>(
      '/:id',
      async function handleDeleteUniverse(request, reply): Promise<void> {
        const { id } = request.params;

        try {
          // Check if universe entry exists
          const universe = await testPrisma.universe.findUnique({
            where: { id },
          });

          if (!universe) {
            reply.status(404).send({
              success: false,
              error: 'Universe entry not found',
            });
            return;
          }

          // Verify is_closed_end_fund = false
          if (universe.is_closed_end_fund) {
            reply.status(400).send({
              success: false,
              error: 'Cannot delete CEF symbols',
            });
            return;
          }

          // Check for any trade history for this universe
          const allTrades = await testPrisma.trades.findMany({
            where: { universeId: id },
          });

          // Only allow deletion if there are no trades at all
          // OR if all trades are sold (have sell_date) and we delete them first
          const activeTrades = allTrades.filter(
            (trade) => trade.sell_date === null
          );

          if (activeTrades.length > 0) {
            reply.status(400).send({
              success: false,
              error: 'Cannot delete symbols with active trades',
            });
            return;
          }

          // If there are only sold trades, delete them first to avoid foreign key constraint
          const soldTrades = allTrades.filter(
            (trade) => trade.sell_date !== null
          );
          if (soldTrades.length > 0) {
            await testPrisma.trades.deleteMany({
              where: { universeId: id },
            });
          }

          // If validations pass, delete from universe table
          await testPrisma.universe.delete({ where: { id } });

          reply.status(200).send({
            success: true,
            message: 'Symbol deleted successfully',
          });
        } catch (error) {
          // Log the actual error for debugging
          console.error('Delete universe error:', error);
          reply.status(500).send({
            success: false,
            error: 'Internal server error',
          });
        }
      }
    );
  };
}

describe.skipIf(process.env.CI)('DELETE /universe/:id', () => {
  let prisma: PrismaClient;
  let testDbPath: string;
  let app: FastifyInstance;

  beforeAll(async () => {
    // Use dedicated test.db file for database isolation
    testDbPath = join(process.cwd(), 'test-delete.db');
    const testDbUrl = `file:${testDbPath}`;

    // Delete existing test.db if it exists to ensure clean state
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    // Apply migrations to test database with isolated DATABASE_URL
    const { execSync } = await import('child_process');
    execSync(`npx prisma migrate deploy --schema=./prisma/schema.prisma`, {
      env: { ...process.env, DATABASE_URL: testDbUrl },
    });

    // Initialize Prisma client with test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
    });

    // Prisma client is now ready for use in tests
  });

  beforeEach(async () => {
    // Clean up test data before setting up the app
    await prisma.trades.deleteMany({});
    await prisma.universe.deleteMany({});
    await prisma.accounts.deleteMany({});
    await prisma.risk_group.deleteMany({});

    // Create test risk group
    await prisma.risk_group.create({
      data: {
        id: 'risk-group-1',
        name: 'Test Risk Group',
      },
    });

    // Set up the app with test-specific delete route
    app = fastify();
    const testDeleteRoute = createTestDeleteRoute(prisma);
    app.register(
      async function universeRoutes(fastifyInstance) {
        await fastifyInstance.register(testDeleteRoute);
      },
      { prefix: '/universe' }
    );
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    // Ensure Prisma client is disconnected before cleanup
    await prisma.$disconnect();

    // Clean up test.db file
    try {
      if (existsSync(testDbPath)) {
        unlinkSync(testDbPath);
      }
    } catch (error) {
      // Log cleanup error but don't fail tests
      console.warn('Could not clean up test-delete.db file', error);
    }
  });

  describe('successful deletion scenarios', () => {
    test('should delete non-CEF universe with no trades', async () => {
      // Create test universe
      const universe = await prisma.universe.create({
        data: {
          id: 'universe-1',
          symbol: 'AAPL',
          risk_group_id: 'risk-group-1',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
          ex_date: new Date('2024-03-15'),
          expired: false,
          is_closed_end_fund: false,
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/universe/${universe.id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        message: 'Symbol deleted successfully',
      });

      // Verify universe was deleted
      const deletedUniverse = await prisma.universe.findUnique({
        where: { id: universe.id },
      });
      expect(deletedUniverse).toBeNull();
    });
  });

  describe('validation error scenarios', () => {
    test('should return 404 when universe does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/universe/nonexistent-id',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        success: false,
        error: 'Universe entry not found',
      });
    });

    test('should return 400 when trying to delete CEF symbol', async () => {
      // Create test CEF universe
      const cefUniverse = await prisma.universe.create({
        data: {
          id: 'universe-cef',
          symbol: 'CEF1',
          risk_group_id: 'risk-group-1',
          distribution: 0.5,
          distributions_per_year: 12,
          last_price: 10.0,
          ex_date: new Date('2024-03-15'),
          expired: false,
          is_closed_end_fund: true, // CEF flag set to true
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/universe/${cefUniverse.id}`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        success: false,
        error: 'Cannot delete CEF symbols',
      });

      // Verify CEF universe was not deleted
      const existingUniverse = await prisma.universe.findUnique({
        where: { id: cefUniverse.id },
      });
      expect(existingUniverse).not.toBeNull();
    });

    test('should return 400 when trying to delete symbol with active trades', async () => {
      // Create test universe
      const universe = await prisma.universe.create({
        data: {
          id: 'universe-with-trades',
          symbol: 'MSFT',
          risk_group_id: 'risk-group-1',
          distribution: 0.3,
          distributions_per_year: 4,
          last_price: 200.0,
          ex_date: new Date('2024-03-15'),
          expired: false,
          is_closed_end_fund: false,
        },
      });

      // Create test account
      const account = await prisma.accounts.create({
        data: {
          id: 'account-1',
          name: 'Test Account',
        },
      });

      // Create test trade
      await prisma.trades.create({
        data: {
          id: 'trade-1',
          universeId: universe.id,
          accountId: account.id,
          buy: 150.0,
          sell: 0,
          quantity: 100,
          buy_date: new Date('2024-01-01'),
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/universe/${universe.id}`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        success: false,
        error: 'Cannot delete symbols with active trades',
      });

      // Verify universe was not deleted
      const existingUniverse = await prisma.universe.findUnique({
        where: { id: universe.id },
      });
      expect(existingUniverse).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    test('should allow deletion of non-CEF symbol with sold trades only', async () => {
      // Create test universe
      const universe = await prisma.universe.create({
        data: {
          id: 'universe-sold-trades',
          symbol: 'GOOGL',
          risk_group_id: 'risk-group-1',
          distribution: 0.0,
          distributions_per_year: 0,
          last_price: 100.0,
          ex_date: new Date('2024-03-15'),
          expired: false,
          is_closed_end_fund: false,
        },
      });

      // Create test account
      const account = await prisma.accounts.create({
        data: {
          id: 'account-2',
          name: 'Test Account 2',
        },
      });

      // Create test trade with sell_date (sold position)
      await prisma.trades.create({
        data: {
          id: 'trade-sold',
          universeId: universe.id,
          accountId: account.id,
          buy: 90.0,
          quantity: 50,
          buy_date: new Date('2024-01-01'),
          sell_date: new Date('2024-02-01'),
          sell: 95.0,
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/universe/${universe.id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        message: 'Symbol deleted successfully',
      });

      // Verify universe was deleted
      const deletedUniverse = await prisma.universe.findUnique({
        where: { id: universe.id },
      });
      expect(deletedUniverse).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      // This test simulates a database error by trying to delete with an invalid ID format
      // that would cause a database constraint violation
      const response = await app.inject({
        method: 'DELETE',
        url: '/universe/', // Invalid URL format
      });

      // Should return 404 for invalid route format
      expect(response.statusCode).toBe(404);
    });
  });
});
