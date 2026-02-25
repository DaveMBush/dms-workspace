import type { PrismaClient } from '@prisma/client';

import type { RiskGroups } from './risk-groups.types';
import { createRiskGroups } from './shared-risk-groups.helper';

interface ImportSeederResult {
  cleanup(): Promise<void>;
  universeId: string;
  symbol: string;
}

/**
 * Compute workspace root from __dirname.
 * This file lives at apps/dms-material-e2e/src/helpers/ (4 levels deep).
 */
function getWorkspaceRoot(): string {
  // Navigate up 4 directory levels from this helper file
  return `${__dirname}/../../../..`;
}

/**
 * Initialize Prisma client with test database.
 * Uses absolute path to workspace root to avoid cwd-dependent resolution.
 */
async function initializePrismaClient(): Promise<PrismaClient> {
  const prismaClientImport = (await import('@prisma/client')).PrismaClient;
  const { PrismaBetterSqlite3 } = await import(
    '@prisma/adapter-better-sqlite3'
  );

  const testDbUrl = `file:${getWorkspaceRoot()}/test-database.db`;
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  return new prismaClientImport({ adapter });
}

/**
 * Create test universe entry for import tests
 */
async function createTestUniverseEntry(
  prisma: PrismaClient,
  symbol: string,
  riskGroupId: string
): Promise<{ id: string }> {
  return prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: 25.5,
      ex_date: new Date('2026-03-01'),
      expired: false,
      is_closed_end_fund: true,
    },
  });
}

/**
 * Create a divDepositType "Dividend" if not already present.
 * Uses try-catch to handle potential race conditions safely.
 */
async function ensureDividendType(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.divDepositType.findFirst({
    where: { name: 'Dividend' },
  });
  if (!existing) {
    try {
      await prisma.divDepositType.create({
        data: { name: 'Dividend' },
      });
    } catch {
      // If another process created it concurrently, ignore the error
    }
  }
}

/**
 * Cleanup universe and related import test data
 */
async function cleanupImportData(
  prisma: PrismaClient,
  universeId: string
): Promise<void> {
  try {
    await prisma.trades.deleteMany({
      where: { universeId },
    });
    await prisma.divDeposits.deleteMany({
      where: { universeId },
    });
    await prisma.universe.deleteMany({
      where: { id: universeId },
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Remove leftover universe data from prior test runs
 */
async function cleanupExistingUniverse(
  prisma: PrismaClient,
  symbol: string
): Promise<void> {
  const existingUniverse = await prisma.universe.findFirst({
    where: { symbol },
  });
  if (existingUniverse) {
    await prisma.trades.deleteMany({
      where: { universeId: existingUniverse.id },
    });
    await prisma.divDeposits.deleteMany({
      where: { universeId: existingUniverse.id },
    });
    await prisma.universe.delete({
      where: { id: existingUniverse.id },
    });
  }
}

/**
 * Create seed data and return result with cleanup function
 */
async function createSeedData(
  prisma: PrismaClient,
  symbol: string
): Promise<ImportSeederResult> {
  const riskGroups: RiskGroups = await createRiskGroups(prisma);
  await ensureDividendType(prisma);
  await cleanupExistingUniverse(prisma, symbol);

  const universe = await createTestUniverseEntry(
    prisma,
    symbol,
    riskGroups.equitiesRiskGroup.id
  );

  return {
    cleanup: async function cleanupFunction(): Promise<void> {
      await cleanupImportData(prisma, universe.id);
    },
    universeId: universe.id,
    symbol,
  };
}

/**
 * Seeds universe and divDepositType data for fidelity import E2E tests.
 * Account creation should be done via the API (request.post).
 */
export async function seedImportData(): Promise<ImportSeederResult> {
  const prisma = await initializePrismaClient();
  const symbol = 'IMPORTTEST1';

  try {
    return await createSeedData(prisma, symbol);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
