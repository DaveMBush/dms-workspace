import { FastifyInstance } from 'fastify';

import { SyncLogger } from '../../../../utils/logger';
import { prisma } from '../../../prisma/prisma-client';
import { getDistributions } from '../../settings/common/get-distributions.function';
import { getLastPrice } from '../../settings/common/get-last-price.function';

interface SyncSummary {
  inserted: number;
  updated: number;
  markedExpired: number;
  selectedCount: number;
  correlationId: string;
  logFilePath: string;
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
      symbol: string;
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
  symbol: string;
  last_price: number;
  distribution: number;
  distributions_per_year: number;
  ex_date: Date | null;
  expired: boolean;
}

interface UpdateUniverseParams {
  client: PrismaClientLike;
  existing: UniverseExistingSubset;
  riskGroupId: string;
  values: UniverseDerivedValues;
  logger: SyncLogger;
}

function logUpdateSuccess(logger: SyncLogger, existing: UniverseExistingSubset, riskGroupId: string, values: UniverseDerivedValues): void {
  logger.info('Updated existing universe record', {
    symbol: existing.symbol,
    riskGroupId,
    lastPrice: values.lastPrice,
    distribution: values.distribution?.distribution,
  });
}

function logUpdateError(logger: SyncLogger, existing: UniverseExistingSubset, riskGroupId: string, error: unknown): void {
  logger.error('Failed to update existing universe record', {
    symbol: existing.symbol,
    riskGroupId,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function updateExistingUniverse(params: UpdateUniverseParams): Promise<void> {
  const { client, existing, riskGroupId, values, logger } = params;

  try {
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
    logUpdateSuccess(logger, existing, riskGroupId, values);
  } catch (error) {
    logUpdateError(logger, existing, riskGroupId, error);
    throw error;
  }
}

interface CreateUniverseParams {
  client: PrismaClientLike;
  symbol: string;
  riskGroupId: string;
  values: UniverseDerivedValues;
  logger: SyncLogger;
}

function logCreateSuccess(logger: SyncLogger, symbol: string, riskGroupId: string, values: UniverseDerivedValues): void {
  logger.info('Created new universe record', {
    symbol,
    riskGroupId,
    lastPrice: values.lastPrice,
    distribution: values.distribution?.distribution,
  });
}

function logCreateError(logger: SyncLogger, symbol: string, riskGroupId: string, error: unknown): void {
  logger.error('Failed to create new universe record', {
    symbol,
    riskGroupId,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function createNewUniverse(params: CreateUniverseParams): Promise<void> {
  const { client, symbol, riskGroupId, values, logger } = params;

  try {
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
    logCreateSuccess(logger, symbol, riskGroupId, values);
  } catch (error) {
    logCreateError(logger, symbol, riskGroupId, error);
    throw error;
  }
}

interface UpsertUniverseParams {
  client: PrismaClientLike;
  symbol: string;
  riskGroupId: string;
  logger: SyncLogger;
}

async function upsertUniverse(params: UpsertUniverseParams): Promise<'inserted' | 'updated'> {
  const { client, symbol, riskGroupId, logger } = params;

  const existing = await client.universe.findFirst({ where: { symbol } });
  const lastPrice = await getLastPrice(symbol);
  const distribution = await getDistributions(symbol);

  if (existing) {
    await updateExistingUniverse({ client, existing, riskGroupId, values: { lastPrice, distribution }, logger });
    return 'updated';
  }

  await createNewUniverse({ client, symbol, riskGroupId, values: { lastPrice, distribution }, logger });
  return 'inserted';
}

interface MarkExpiredParams {
  client: PrismaClientLike;
  notInSymbols: string[];
  logger: SyncLogger;
}

async function markExpired(params: MarkExpiredParams): Promise<number> {
  const { client, notInSymbols, logger } = params;

  try {
    const result = await client.universe.updateMany({
      where: {
        symbol: { notIn: notInSymbols },
        expired: false,
      },
      data: { expired: true },
    });
    const count = (result as { count?: number } | undefined)?.count;
    const expiredCount = typeof count === 'number' ? count : 0;

    logger.info('Marked universe records as expired', {
      expiredCount,
      totalSymbols: notInSymbols.length,
    });

    return expiredCount;
  } catch (error) {
    logger.error('Failed to mark universe records as expired', {
      notInSymbols,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function processSyncTransaction(logger: SyncLogger): Promise<Omit<SyncSummary, 'correlationId' | 'logFilePath'>> {
  return prisma.$transaction(async function processSyncTransactionInner(client) {
    const selected = await selectEligibleScreener(client);
    const selectedCount = Array.isArray(selected) ? selected.length : 0;

    logger.info('Selected eligible screener records', {
      selectedCount,
      symbols: selected.map(function extractSymbol(row) { return row.symbol; }),
    });

    const selectedSymbols: string[] = [];
    let inserted = 0;
    let updated = 0;

    for (const row of selected) {
      if (row === undefined || row === null) {
        continue;
      }
      selectedSymbols.push(row.symbol);
      const result = await upsertUniverse({ client, symbol: row.symbol, riskGroupId: row.risk_group_id, logger });
      if (result === 'inserted') {
        inserted++;
      } else {
        updated++;
      }
    }

    const markedExpired = await markExpired({ client, notInSymbols: selectedSymbols, logger });

    return {
      inserted,
      updated,
      markedExpired,
      selectedCount,
    };
  });
}

async function handleSyncRequest(logger: SyncLogger): Promise<SyncSummary> {
  const startTime = Date.now();

  logger.info('Sync from screener operation started', {
    featureEnabled: isFeatureEnabled(),
    timestamp: new Date().toISOString(),
  });

  if (!isFeatureEnabled()) {
    logger.warn('Sync operation blocked - feature flag disabled');
    return {
      inserted: 0,
      updated: 0,
      markedExpired: 0,
      selectedCount: 0,
      correlationId: logger.getCorrelationId(),
      logFilePath: logger.getLogFilePath(),
    };
  }

  try {
    const summary = await processSyncTransaction(logger);
    const duration = Date.now() - startTime;

    logger.info('Sync from screener operation completed successfully', {
      summary,
      duration,
      correlationId: logger.getCorrelationId(),
    });

    return {
      ...summary,
      correlationId: logger.getCorrelationId(),
      logFilePath: logger.getLogFilePath(),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Sync from screener operation failed', {
      error: error instanceof Error ? error.message : String(error),
      duration,
      correlationId: logger.getCorrelationId(),
    });

    return {
      inserted: 0,
      updated: 0,
      markedExpired: 0,
      selectedCount: 0,
      correlationId: logger.getCorrelationId(),
      logFilePath: logger.getLogFilePath(),
    };
  }
}

export default function registerSyncFromScreener(
  fastify: FastifyInstance
): void {
  fastify.post<{ Reply: SyncSummary }>('/sync-from-screener',
    async function handleSyncRequestHandler(_, reply): Promise<void> {
      const logger = new SyncLogger();
      const summary = await handleSyncRequest(logger);

      if (!isFeatureEnabled()) {
        reply.status(403).send(summary);
      } else {
        reply.status(200).send(summary);
      }
    }
  );
}


