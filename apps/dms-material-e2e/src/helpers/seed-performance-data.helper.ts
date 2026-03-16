import { createTestDates } from './create-test-dates.helper';
import { generateUniqueId } from './generate-unique-id.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';
import type { UniverseRecord } from './universe-record.types';

interface PerfSeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
  recordCount: number;
}

/**
 * Generate a batch of unique test symbols
 */
function generatePerfSymbols(count: number): string[] {
  const uniqueId = generateUniqueId();
  const symbols: string[] = [];
  for (let i = 0; i < count; i++) {
    symbols.push(`PERF${i.toString().padStart(4, '0')}-${uniqueId}`);
  }
  return symbols;
}

/**
 * Create universe records for performance testing
 */
function createPerfUniverseRecords(
  symbols: string[],
  equitiesId: string,
  incomeId: string
): UniverseRecord[] {
  const { futureDate, pastDate } = createTestDates();
  return symbols.map(function createPerfRecord(
    symbol: string,
    index: number
  ): UniverseRecord {
    const isExpired = index % 20 === 0;
    const riskGroupId = index % 2 === 0 ? equitiesId : incomeId;
    return {
      symbol,
      risk_group_id: riskGroupId,
      distribution: Math.round((0.5 + (index % 50) * 0.1) * 100) / 100,
      distributions_per_year: [1, 2, 4, 12][index % 4],
      last_price: Math.round((10 + (index % 200)) * 100) / 100,
      ex_date: isExpired ? pastDate : futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: isExpired,
      is_closed_end_fund: index % 3 !== 0,
    };
  });
}

/**
 * Seeds a large dataset for performance testing.
 * Creates `count` universe records for virtual scrolling and lazy loading tests.
 */
export async function seedPerformanceData(
  count = 1000
): Promise<PerfSeederResult> {
  const prisma = await initializePrismaClient();
  const symbols = generatePerfSymbols(count);

  try {
    const riskGroups = await createRiskGroups(prisma);
    const records = createPerfUniverseRecords(
      symbols,
      riskGroups.equitiesRiskGroup.id,
      riskGroups.incomeRiskGroup.id
    );

    // Insert in batches of 500 to avoid SQLite limits
    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await prisma.universe.createMany({ data: batch });
    }
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    recordCount: count,
    symbols,
    cleanup: async function cleanupPerfData(): Promise<void> {
      try {
        // Delete in batches to avoid SQLite variable limits
        const batchSize = 500;
        for (let i = 0; i < symbols.length; i += batchSize) {
          const batch = symbols.slice(i, i + batchSize);
          await prisma.universe.deleteMany({
            where: { symbol: { in: batch } },
          });
        }
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
