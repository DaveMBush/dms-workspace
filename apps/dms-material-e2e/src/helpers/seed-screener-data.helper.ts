import { PrismaClient } from '@prisma/client';
import { generateUniqueId } from './generate-unique-id.helper';
import type { RiskGroups } from './risk-groups.types';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

type PrismaClientType = PrismaClient;

interface SeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
}

// Snake case property names match database schema
interface ScreenerRecord {
  symbol: string;
  risk_group_id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
}

/**
 * Create test data array - compact format to meet line limit
 */
function createTestDataArray(
  symbols: string[],
  equitiesId: string,
  incomeId: string,
  taxFreeId: string,
): ScreenerRecord[] {
  const b = {
    distribution: 0.0,
    distributions_per_year: 0,
    last_price: 0.0,
  };
  return [
    {
      ...b,
      symbol: symbols[0],
      risk_group_id: equitiesId,
    },
    {
      ...b,
      symbol: symbols[1],
      risk_group_id: equitiesId,
    },
    {
      ...b,
      symbol: symbols[2],
      risk_group_id: incomeId,
    },
    {
      ...b,
      symbol: symbols[3],
      risk_group_id: incomeId,
    },
    {
      ...b,
      symbol: symbols[4],
      risk_group_id: taxFreeId,
    },
  ];
}

/**
 * Build screener test data records
 */
function buildScreenerRecords(
  symbols: string[],
  riskGroups: RiskGroups,
): ScreenerRecord[] {
  const { equitiesRiskGroup, incomeRiskGroup, taxFreeIncomeRiskGroup } =
    riskGroups;
  return createTestDataArray(
    symbols,
    equitiesRiskGroup.id,
    incomeRiskGroup.id,
    taxFreeIncomeRiskGroup.id,
  );
}

/**
 * Create screener records in database
 */
async function createScreenerRecords(
  prisma: PrismaClientType,
  symbols: string[],
  riskGroups: RiskGroups,
): Promise<void> {
  const records = buildScreenerRecords(symbols, riskGroups);
  await Promise.all(
    records.map(async function createRecord(data) {
      return prisma.screener.create({ data });
    }),
  );
}

/**
 * Seed screener test data for E2E tests
 *
 * This function should be called in test.beforeEach to set up isolated test data
 * Each test gets its own clean dataset to avoid collisions
 */
export async function seedScreenerData(): Promise<SeederResult> {
  // Connects to the workspace-root test database the E2E backend server uses,
  // independent of the directory Playwright is launched from
  const prisma = await initializePrismaClient();

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
