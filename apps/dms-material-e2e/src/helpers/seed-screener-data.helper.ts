import type { PrismaClient } from '@prisma/client';

interface SeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
}

interface RiskGroups {
  equitiesRiskGroup: { id: string };
  incomeRiskGroup: { id: string };
  taxFreeIncomeRiskGroup: { id: string };
}

// Snake case property names match database schema
/* eslint-disable @typescript-eslint/naming-convention -- Property names match database column names */
interface ScreenerRecord {
  symbol: string;
  risk_group_id: number;
  has_volitility: boolean;
  objectives_understood: boolean;
  graph_higher_before_2008: boolean;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
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
 * Create risk groups in the database
 */
async function createRiskGroups(prisma: PrismaClient): Promise<RiskGroups> {
  const equitiesRiskGroup = await prisma.risk_group.upsert({
    where: { name: 'Equities' },
    update: {},
    create: { name: 'Equities' },
  });

  const incomeRiskGroup = await prisma.risk_group.upsert({
    where: { name: 'Income' },
    update: {},
    create: { name: 'Income' },
  });

  const taxFreeIncomeRiskGroup = await prisma.risk_group.upsert({
    where: { name: 'Tax Free Income' },
    update: {},
    create: { name: 'Tax Free Income' },
  });

  return { equitiesRiskGroup, incomeRiskGroup, taxFreeIncomeRiskGroup };
}

/**
 * Create test data array - compact format to meet line limit
 */
function createTestDataArray(
  symbols: string[],
  equitiesId: number,
  incomeId: number,
  taxFreeId: number
): ScreenerRecord[] {
  const b = { distribution: 0.0, distributions_per_year: 0, last_price: 0.0 };
  return [
    {
      ...b,
      symbol: symbols[0],
      risk_group_id: equitiesId,
      has_volitility: false,
      objectives_understood: false,
      graph_higher_before_2008: false,
    },
    {
      ...b,
      symbol: symbols[1],
      risk_group_id: equitiesId,
      has_volitility: true,
      objectives_understood: false,
      graph_higher_before_2008: false,
    },
    {
      ...b,
      symbol: symbols[2],
      risk_group_id: incomeId,
      has_volitility: false,
      objectives_understood: true,
      graph_higher_before_2008: false,
    },
    {
      ...b,
      symbol: symbols[3],
      risk_group_id: incomeId,
      has_volitility: true,
      objectives_understood: false,
      graph_higher_before_2008: true,
    },
    {
      ...b,
      symbol: symbols[4],
      risk_group_id: taxFreeId,
      has_volitility: false,
      objectives_understood: false,
      graph_higher_before_2008: false,
    },
  ];
}

/**
 * Build screener test data records
 */
function buildScreenerRecords(
  symbols: string[],
  riskGroups: RiskGroups
): ScreenerRecord[] {
  const { equitiesRiskGroup, incomeRiskGroup, taxFreeIncomeRiskGroup } =
    riskGroups;
  return createTestDataArray(
    symbols,
    equitiesRiskGroup.id,
    incomeRiskGroup.id,
    taxFreeIncomeRiskGroup.id
  );
}

/**
 * Create screener records in database
 */
async function createScreenerRecords(
  prisma: PrismaClient,
  symbols: string[],
  riskGroups: RiskGroups
): Promise<void> {
  const records = buildScreenerRecords(symbols, riskGroups);
  await Promise.all(
    records.map(async function createRecord(data) {
      return prisma.screener.create({ data });
    })
  );
}

/**
 * Seed screener test data for E2E tests
 *
 * This function should be called in test.beforeEach to set up isolated test data
 * Each test gets its own clean dataset to avoid collisions
 */
export async function seedScreenerData(): Promise<SeederResult> {
  // Import Prisma and adapter dynamically to avoid bundling issues
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaBetterSqlite3 } = await import(
    '@prisma/adapter-better-sqlite3'
  );

  // Connect to the same database that the E2E backend server uses
  const testDbUrl = 'file:./test-database.db';
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  const prisma = new PrismaClient({ adapter });

  // Generate unique symbols for this test run
  const uniqueId = generateUniqueId();
  const symbols = [
    `AAPL-${uniqueId}`,
    `MSFT-${uniqueId}`,
    `BND-${uniqueId}`,
    `VWOB-${uniqueId}`,
    `VTEB-${uniqueId}`,
  ];

  try {
    const riskGroups = await createRiskGroups(prisma);
    await createScreenerRecords(prisma, symbols, riskGroups);

    // Return cleanup function and symbols
    return {
      symbols,
      cleanup: async function cleanupScreenerData(): Promise<void> {
        try {
          await prisma.screener.deleteMany({
            where: {
              symbol: {
                in: symbols,
              },
            },
          });
        } finally {
          await prisma.$disconnect();
        }
      },
    };
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
