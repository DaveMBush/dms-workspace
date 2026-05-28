import { generateUniqueId } from './generate-unique-id.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { cleanupUniverseBySymbols } from './shared-cleanup-universe-symbols.helper';
import { createRiskGroups } from './shared-risk-groups.helper';
import type { UniverseRecord } from './universe-record.types';

interface SeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
}

const ROW_COUNT = 60;

/**
 * Generate many universe records for scroll testing
 */
function createBulkRecords(
  symbols: string[],
  riskGroupId: string
): UniverseRecord[] {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  return symbols.map(function mapSymbol(symbol): UniverseRecord {
    return {
      symbol,
      risk_group_id: riskGroupId,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: 50.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    };
  });
}

/**
 * Seeds 60 universe rows for scroll testing
 */
export async function seedScrollUniverseData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbols = Array.from(
    { length: ROW_COUNT },
    function generateSymbol(_: unknown, i: number): string {
      return `USCRL${String(i).padStart(2, '0')}-${uniqueId}`;
    }
  );

  try {
    const riskGroups = await createRiskGroups(prisma);
    const records = createBulkRecords(symbols, riskGroups.equitiesRiskGroup.id);
    await prisma.universe.createMany({ data: records });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    symbols,
    cleanup: async function cleanupScrollUniverse(): Promise<void> {
      await cleanupUniverseBySymbols(prisma, symbols);
    },
  };
}
