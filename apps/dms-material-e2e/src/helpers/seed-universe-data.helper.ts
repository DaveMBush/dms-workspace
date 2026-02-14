import type { PrismaClient } from '@prisma/client';

import type { RiskGroups } from './risk-groups.types';
import { createRiskGroups } from './shared-risk-groups.helper';

interface SeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
}

// Snake case property names match database schema
/* eslint-disable @typescript-eslint/naming-convention -- Property names match database column names */
interface UniverseRecord {
  symbol: string;
  risk_group_id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  ex_date: Date | null;
  most_recent_sell_date: Date | null;
  most_recent_sell_price: number | null;
  expired: boolean;
  is_closed_end_fund: boolean;
}
/* eslint-enable @typescript-eslint/naming-convention -- Re-enable naming convention */

/**
 * Generate unique identifier using cryptographically secure random values
 * @returns Unique ID string
 */
function generateUniqueId(): string {
  // Use crypto for secure random values instead of Math.random()
  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  const randomStr = Array.from(randomBytes)
    .map(function byteToString(b: number): string {
      return b.toString(36);
    })
    .join('')
    .substring(0, 5);
  return `${Date.now()}-${randomStr}`;
}

/**
 * Create test date values
 */
function createTestDates(): { futureDate: Date; pastDate: Date } {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 30);
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 30);
  return { futureDate, pastDate };
}

/**
 * Create expired equity record
 */
function createExpiredEquity(
  symbol: string,
  riskGroupId: string,
  pastDate: Date
): UniverseRecord {
  return {
    symbol,
    risk_group_id: riskGroupId,
    distribution: 1.25,
    distributions_per_year: 4,
    last_price: 50.0,
    ex_date: pastDate,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    expired: true,
    is_closed_end_fund: true,
  };
}

/**
 * Create active income records
 */
function createIncomeRecords(
  symbols: string[],
  riskGroupId: string,
  futureDate: Date
): UniverseRecord[] {
  return [
    {
      symbol: symbols[0],
      risk_group_id: riskGroupId,
      distribution: 0.5,
      distributions_per_year: 12,
      last_price: 25.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[1],
      risk_group_id: riskGroupId,
      distribution: 0.3,
      distributions_per_year: 12,
      last_price: 15.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
  ];
}

/**
 * Create test universe data array
 */
function createTestDataArray(
  symbols: string[],
  equitiesId: string,
  incomeId: string,
  taxFreeId: string
): UniverseRecord[] {
  const { futureDate, pastDate } = createTestDates();

  const expiredEquity = createExpiredEquity(symbols[0], equitiesId, pastDate);
  const incomeRecords = createIncomeRecords(
    [symbols[1], symbols[4]],
    incomeId,
    futureDate
  );

  return [
    expiredEquity,
    ...incomeRecords,
    {
      symbol: symbols[2],
      risk_group_id: taxFreeId,
      distribution: 0.75,
      distributions_per_year: 4,
      last_price: 30.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[3],
      risk_group_id: equitiesId,
      distribution: 2.0,
      distributions_per_year: 4,
      last_price: 100.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
  ];
}

/**
 * Initialize Prisma client with test database
 */
async function initializePrismaClient(): Promise<PrismaClient> {
  const prismaClientImport = (await import('@prisma/client')).PrismaClient;
  const { PrismaBetterSqlite3 } = await import(
    '@prisma/adapter-better-sqlite3'
  );

  const testDbUrl = 'file:./test-database.db';
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  return new prismaClientImport({ adapter });
}

/**
 * Generate unique test symbols
 */
function generateTestSymbols(): string[] {
  const uniqueId = generateUniqueId();
  return [
    `UTEST1-${uniqueId}`,
    `UTEST2-${uniqueId}`,
    `UTEST3-${uniqueId}`,
    `UTEST4-${uniqueId}`,
    `UTEST5-${uniqueId}`,
  ];
}

/**
 * Insert universe test data
 */
async function insertUniverseData(
  prisma: PrismaClient,
  symbols: string[],
  riskGroups: RiskGroups
): Promise<void> {
  const testData = createTestDataArray(
    symbols,
    riskGroups.equitiesRiskGroup.id,
    riskGroups.incomeRiskGroup.id,
    riskGroups.taxFreeIncomeRiskGroup.id
  );

  await prisma.universe.createMany({
    data: testData,
  });
}

/**
 * Cleanup function for universe test data
 */
async function cleanupUniverseData(
  prisma: PrismaClient,
  symbols: string[]
): Promise<void> {
  try {
    await prisma.universe.deleteMany({
      where: {
        symbol: {
          in: symbols,
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Seeds test data for universe table tests
 * Creates risk groups and universe records
 */
export async function seedUniverseData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const symbols = generateTestSymbols();

  try {
    const riskGroups = await createRiskGroups(prisma);
    await insertUniverseData(prisma, symbols, riskGroups);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    cleanup: async function cleanupFunction(): Promise<void> {
      await cleanupUniverseData(prisma, symbols);
    },
    symbols,
  };
}
