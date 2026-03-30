import { generateUniqueId } from './generate-unique-id.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

interface SeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
}

const ROW_COUNT = 60;

/* eslint-disable @typescript-eslint/naming-convention -- Property names match database column names */
interface ScreenerRecord {
  symbol: string;
  risk_group_id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
}
/* eslint-enable @typescript-eslint/naming-convention -- Re-enable naming convention */

/**
 * Generate many screener records for scroll testing
 */
function createBulkRecords(
  symbols: string[],
  riskGroupId: string
): ScreenerRecord[] {
  return symbols.map(function mapSymbol(symbol): ScreenerRecord {
    return {
      symbol,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: 50.0,
    };
  });
}

/**
 * Seeds 60 screener rows for scroll testing
 */
export async function seedScrollScreenerData(): Promise<SeederResult> {
  const prismaClientImport = (await import('@prisma/client')).PrismaClient;
  const { PrismaBetterSqlite3 } = await import(
    '@prisma/adapter-better-sqlite3'
  );

  const testDbUrl = 'file:./test-database.db';
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  const prisma = new prismaClientImport({ adapter });

  const uniqueId = generateUniqueId();
  const symbols = Array.from(
    { length: ROW_COUNT },
    function generateSymbol(_: unknown, i: number): string {
      return `SSCRL${String(i).padStart(2, '0')}-${uniqueId}`;
    }
  );

  try {
    const riskGroups = await createRiskGroups(prisma);
    const records = createBulkRecords(symbols, riskGroups.equitiesRiskGroup.id);
    await prisma.screener.createMany({ data: records });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    symbols,
    cleanup: async function cleanupScrollScreener(): Promise<void> {
      try {
        await prisma.screener.deleteMany({
          where: { symbol: { in: symbols } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
