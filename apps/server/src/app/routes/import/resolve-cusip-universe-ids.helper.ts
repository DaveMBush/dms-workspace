import { prisma } from '../../prisma/prisma-client';

function toCusip(mapping: { cusip: string }): string {
  return mapping.cusip;
}

function toId(entry: { id: string }): string {
  return entry.id;
}

// CUSIP-stored lots — see Epic 61, Story 61.2. Lots may have been imported under the raw
// CUSIP rather than the ticker symbol. Query universes for all CUSIP aliases of ticker.
export async function resolveCusipUniverseIds(
  ticker: string,
  tickerUniverseId: string
): Promise<string[]> {
  const cusipMappings = await prisma.cusip_cache.findMany({
    where: { symbol: ticker },
    select: { cusip: true },
  });
  if (cusipMappings.length === 0) {
    return [tickerUniverseId];
  }
  const cusipSymbols = cusipMappings.map(toCusip);
  const cusipUniverses = await prisma.universe.findMany({
    where: { symbol: { in: cusipSymbols } },
    select: { id: true },
  });
  return [tickerUniverseId, ...cusipUniverses.map(toId)];
}
