import { generateUniqueId } from './generate-unique-id.helper';
import { createRiskGroups } from './shared-risk-groups.helper';
import type { UniverseRecord } from './universe-record.types';

interface SeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
}

const DEEP_SCROLL_ROW_COUNT = 150;

function buildDeepScrollRecords(
  symbols: string[],
  riskGroupId: string,
  exDate: Date
): UniverseRecord[] {
  return symbols.map(function mapDeepScrollRecord(symbol): UniverseRecord {
    return {
      symbol,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: 50.0,
      ex_date: exDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    };
  });
}

/**
 * Seeds 150 universe rows for deep-scroll testing.
 * Spanning at least 3 lazy-load pages (TOP_PAGE_SIZE = 50 per page).
 * Symbol prefix UDSCRL avoids collision and sorts non-alphabetically
 * so placeholders do not cluster at beginning of the sorted list.
 */
export async function seedDeepScrollUniverseData(): Promise<SeederResult> {
  const prismaClientImport = (await import('@prisma/client')).PrismaClient;
  const { PrismaBetterSqlite3 } = await import(
    '@prisma/adapter-better-sqlite3'
  );
  const adapter = new PrismaBetterSqlite3({ url: 'file:./test-database.db' });
  const prisma = new prismaClientImport({ adapter });

  const uniqueId = generateUniqueId();
  const symbols = Array.from(
    { length: DEEP_SCROLL_ROW_COUNT },
    function generateSymbol(_: unknown, i: number): string {
      return `UDSCRL${String(i).padStart(3, '0')}-${uniqueId}`;
    }
  );

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  try {
    const riskGroups = await createRiskGroups(prisma);
    const records = buildDeepScrollRecords(
      symbols,
      riskGroups.equitiesRiskGroup.id,
      futureDate
    );
    await prisma.universe.createMany({ data: records });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    symbols,
    cleanup: async function cleanupDeepScrollUniverse(): Promise<void> {
      try {
        await prisma.universe.deleteMany({
          where: { symbol: { in: symbols } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
