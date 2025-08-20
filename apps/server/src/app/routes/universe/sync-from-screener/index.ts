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

interface PrismaClientLike {
  screener: {
    findMany(args: unknown): Promise<Array<{ symbol: string; risk_group_id: string }>>;
  };
  universe: {
    findFirst(args: unknown): Promise<{
      id: string;
      last_price: number;
      distribution: number;
      distributions_per_year: number;
      ex_date: Date | null;
      expired: boolean;
    } | null>;
    update(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<unknown | { count: number }>;
  };
  $transaction?<T>(fn: (client: PrismaClientLike) => Promise<T>): Promise<T>;
}

async function selectEligibleScreener(client: PrismaClientLike): Promise<
  Array<{ symbol: string; risk_group_id: string }>
> {
  return client.screener.findMany({
    where: {
      has_volitility: true,
      objectives_understood: true,
      graph_higher_before_2008: true,
    },
    select: { symbol: true, risk_group_id: true },
  });
}

interface UniverseDerivedValues {
  lastPrice: number | null | undefined;
  distribution: Awaited<ReturnType<typeof getDistributions>>;
}

interface UniverseExistingSubset {
  id: string;
  last_price: number;
  distribution: number;
  distributions_per_year: number;
  ex_date: Date | null;
  expired: boolean;
}

async function updateExistingUniverse(
  client: PrismaClientLike,
  existing: UniverseExistingSubset,
  riskGroupId: string,
  values: UniverseDerivedValues
): Promise<void> {
  await client.universe.update({
    where: { id: existing.id },
    data: {
      risk_group_id: riskGroupId,
      last_price: values.lastPrice ?? existing.last_price,
      distribution: values.distribution?.distribution ?? existing.distribution,
      distributions_per_year:
        values.distribution?.distributions_per_year ?? existing.distributions_per_year,
      ex_date: values.distribution?.ex_date ?? existing.ex_date ?? null,
      expired: false,
    },
  });
}

async function createNewUniverse(
  client: PrismaClientLike,
  symbol: string,
  riskGroupId: string,
  values: UniverseDerivedValues
): Promise<void> {
  await client.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      distribution: values.distribution?.distribution ?? 0,
      distributions_per_year: values.distribution?.distributions_per_year ?? 0,
      last_price: values.lastPrice ?? 0,
      most_recent_sell_date: null,
      ex_date: values.distribution?.ex_date ?? new Date(),
      expired: false,
    },
  });
}

async function upsertUniverse(
  client: PrismaClientLike,
  symbol: string,
  riskGroupId: string
): Promise<'inserted' | 'updated'> {
  const existing = await client.universe.findFirst({ where: { symbol } });
  const lastPrice = await getLastPrice(symbol);
  const distribution = await getDistributions(symbol);

  if (existing) {
    await updateExistingUniverse(client, existing, riskGroupId, { lastPrice, distribution });
    return 'updated';
  }

  await createNewUniverse(client, symbol, riskGroupId, { lastPrice, distribution });
  return 'inserted';
}

async function markExpired(client: PrismaClientLike, notInSymbols: string[]): Promise<number> {
  const result = await client.universe.updateMany({
    where: {
      symbol: { notIn: notInSymbols },
      expired: false,
    },
    data: { expired: true },
  });
  const count = (result as { count?: number } | undefined)?.count;
  return typeof count === 'number' ? count : 0;
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

      const summary = await prisma.$transaction(async function runTransaction(client) {
        const selected = await selectEligibleScreener(client);
        const selectedCount = Array.isArray(selected) ? selected.length : 0;
        const selectedSymbols: string[] = [];
        let inserted = 0;
        let updated = 0;

        for (let i = 0; i < selectedCount; i++) {
          const row = selected[i];
          if (row === undefined || row === null) {
            continue;
          }
          selectedSymbols.push(row.symbol);
          const result = await upsertUniverse(client, row.symbol, row.risk_group_id);
          if (result === 'inserted') {
            inserted++;
          } else {
            updated++;
          }
        }

        const markedExpired = await markExpired(client, selectedSymbols);

        const resultSummary: SyncSummary = {
          inserted,
          updated,
          markedExpired,
          selectedCount,
        };
        return resultSummary;
      });

      reply.status(200).send(summary);
    }
  );
}


