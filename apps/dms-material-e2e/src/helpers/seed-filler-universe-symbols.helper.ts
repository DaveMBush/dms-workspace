import { generateUniqueId } from './generate-unique-id.helper';
import { createRiskGroups } from './shared-risk-groups.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';
import type { UniverseRecord } from './universe-record.types';

interface FillerSeederResult {
  cleanup(): Promise<void>;
}

function buildFillerRecord(
  symbol: string,
  riskGroupId: string
): UniverseRecord {
  return {
    symbol,
    risk_group_id: riskGroupId,
    distribution: 0.5,
    distributions_per_year: 4,
    last_price: 10.0,
    ex_date: null,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    expired: false,
    is_closed_end_fund: true,
  };
}

/**
 * Seed N minimal universe symbols so that the total DB symbol count exceeds
 * the virtual-scroll page boundary (≈50).  Symbols are prefixed with "UFILL"
 * and tagged with a unique run ID so cleanup is isolated.
 */
export async function seedFillerUniverseSymbols(
  count: number
): Promise<FillerSeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbols: string[] = [];
  for (let i = 0; i < count; i++) {
    symbols.push(`UFILL${i.toString().padStart(3, '0')}-${uniqueId}`);
  }

  try {
    const riskGroups = await createRiskGroups(prisma);
    const riskGroupId = riskGroups.equitiesRiskGroup.id;
    await prisma.universe.createMany({
      data: symbols.map(function toFillerRecord(symbol) {
        return buildFillerRecord(symbol, riskGroupId);
      }),
    });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    cleanup: async function cleanupFillerSymbols(): Promise<void> {
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
