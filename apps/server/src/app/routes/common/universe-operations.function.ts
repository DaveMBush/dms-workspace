import { prisma } from '../../prisma/prisma-client';

interface Distribution {
  distribution: number;
  distributions_per_year: number;
  ex_date: Date;
}

interface UniverseRecordOptions {
  symbol: string;
  riskGroupId: string;
  lastPrice: number | null | undefined;
  distribution: Distribution | undefined;
  exDateOverride?: Date;
}

export async function createUniverseRecord(
  options: UniverseRecordOptions
): Promise<void> {
  const { symbol, riskGroupId, lastPrice, distribution, exDateOverride } =
    options;
  await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      distribution: distribution?.distribution ?? 0,
      distributions_per_year: distribution?.distributions_per_year ?? 0,
      last_price: lastPrice ?? 0,
      most_recent_sell_date: null,
      ex_date: exDateOverride ?? distribution?.ex_date ?? new Date(),
      expired: false,
    },
  });
}
