import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';
import { getDistributions } from '../../settings/common/get-distributions.function';
import { getLastPrice } from '../../settings/common/get-last-price.function';

interface SyncSummary {
  inserted: number;
  updated: number;
  markedExpired: number;
  selectedCount: number;
}

function isFeatureEnabled(): boolean {
  return process.env.USE_SCREENER_FOR_UNIVERSE === 'true';
}

async function selectEligibleScreener(): Promise<
  Array<{ symbol: string; risk_group_id: string }>
> {
  return prisma.screener.findMany({
    where: {
      has_volitility: true,
      objectives_understood: true,
      graph_higher_before_2008: true,
    },
    select: { symbol: true, risk_group_id: true },
  });
}

async function updateExistingUniverse(
  existing: Awaited<ReturnType<typeof prisma.universe.findFirst>>,
  riskGroupId: string,
  lastPrice: number | null | undefined,
  distribution: Awaited<ReturnType<typeof getDistributions>>
): Promise<void> {
  await prisma.universe.update({
    where: { id: existing!.id },
    data: {
      risk_group_id: riskGroupId,
      last_price: lastPrice ?? existing!.last_price,
      distribution: distribution?.distribution ?? existing!.distribution,
      distributions_per_year:
        distribution?.distributions_per_year ?? existing!.distributions_per_year,
      ex_date: distribution?.ex_date ?? existing!.ex_date ?? null,
      expired: false,
    },
  });
}

async function createNewUniverse(
  symbol: string,
  riskGroupId: string,
  lastPrice: number | null | undefined,
  distribution: Awaited<ReturnType<typeof getDistributions>>
): Promise<void> {
  await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      distribution: distribution?.distribution ?? 0,
      distributions_per_year: distribution?.distributions_per_year ?? 0,
      last_price: lastPrice ?? 0,
      most_recent_sell_date: null,
      ex_date: distribution?.ex_date ?? new Date(),
      expired: false,
    },
  });
}

async function upsertUniverse(
  symbol: string,
  riskGroupId: string
): Promise<'inserted' | 'updated'> {
  const existing = await prisma.universe.findFirst({ where: { symbol } });
  const lastPrice = await getLastPrice(symbol);
  const distribution = await getDistributions(symbol);

  if (existing) {
    await updateExistingUniverse(existing, riskGroupId, lastPrice, distribution);
    return 'updated';
  }

  await createNewUniverse(symbol, riskGroupId, lastPrice, distribution);
  return 'inserted';
}

async function markExpired(notInSymbols: string[]): Promise<number> {
  const result = await prisma.universe.updateMany({
    where: {
      symbol: { notIn: notInSymbols },
      expired: false,
    },
    data: { expired: true },
  });
  return result.count;
}

export default function registerSyncFromScreener(
  fastify: FastifyInstance
): void {
  fastify.post<{ Reply: SyncSummary }>('/sync-from-screener',
    async function handleSyncRequest(_, reply): Promise<void> {
      if (!isFeatureEnabled()) {
        reply.status(403).send({
          inserted: 0,
          updated: 0,
          markedExpired: 0,
          selectedCount: 0,
        });
        return;
      }

      const selected = await selectEligibleScreener();
      const selectedSymbols: string[] = [];
      let inserted = 0;
      let updated = 0;

      for (let i = 0; i < selected.length; i++) {
        const row = selected[i];
        selectedSymbols.push(row.symbol);
        const result = await upsertUniverse(row.symbol, row.risk_group_id);
        if (result === 'inserted') {
          inserted++;
        } else {
          updated++;
        }
      }

      const markedExpired = await markExpired(selectedSymbols);

      reply.status(200).send({
        inserted,
        updated,
        markedExpired,
        selectedCount: selected.length,
      });
    }
  );
}


