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





interface ProcessSymbolsResult {
  selectedSymbols: string[];
  inserted: number;
  updated: number;
}

function getExDateToSet(distribution: Awaited<ReturnType<typeof getDistributions>>, today: Date): Date | undefined {
  if (distribution?.ex_date && distribution.ex_date instanceof Date && !isNaN(distribution.ex_date.valueOf()) && distribution.ex_date > today) {
    return distribution.ex_date;
  }
  return undefined;
}

async function upsertUniverse(params: { symbol: string; riskGroupId: string }): Promise<'inserted' | 'updated'> {
  const { symbol, riskGroupId } = params;

  const existing = await prisma.universe.findFirst({ where: { symbol } });
  const lastPrice = await getLastPrice(symbol);
  const distribution = await getDistributions(symbol);
  const today = new Date();
  const exDateToSet = getExDateToSet(distribution, today);

  if (existing) {
    await updateExistingUniverseRecord({ existing, riskGroupId, lastPrice, distribution, exDateToSet });
    return 'updated';
  }

  await createNewUniverseRecord({ symbol, riskGroupId, lastPrice, distribution, exDateToSet });
  return 'inserted';
}

interface UpdateRecordParams {
  existing: { id: string; last_price: number; distribution: number; distributions_per_year: number; ex_date: Date | null };
  riskGroupId: string;
  lastPrice: number | null | undefined;
  distribution: Awaited<ReturnType<typeof getDistributions>>;
  exDateToSet: Date | undefined;
}

interface CreateRecordParams {
  symbol: string;
  riskGroupId: string;
  lastPrice: number | null | undefined;
  distribution: Awaited<ReturnType<typeof getDistributions>>;
  exDateToSet: Date | undefined;
}

async function updateExistingUniverseRecord(params: UpdateRecordParams): Promise<void> {
  const { existing, riskGroupId, lastPrice, distribution, exDateToSet } = params;
  await prisma.universe.update({
    where: { id: existing.id },
    data: {
      risk_group_id: riskGroupId,
      last_price: lastPrice ?? existing.last_price,
      distribution: distribution?.distribution ?? existing.distribution,
      distributions_per_year: distribution?.distributions_per_year ?? existing.distributions_per_year,
      ex_date: exDateToSet ?? existing.ex_date ?? null,
      expired: false,
    },
  });
}

async function createNewUniverseRecord(params: CreateRecordParams): Promise<void> {
  const { symbol, riskGroupId, lastPrice, distribution, exDateToSet } = params;
  await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      distribution: distribution?.distribution ?? 0,
      distributions_per_year: distribution?.distributions_per_year ?? 0,
      last_price: lastPrice ?? 0,
      most_recent_sell_date: null,
      ex_date: exDateToSet ?? new Date(),
      expired: false,
    },
  });
}

async function processSingleSymbolSafely(row: { symbol: string; risk_group_id: string }, logger: SyncLogger): Promise<'failed' | 'inserted' | 'updated'> {
  try {
    return await upsertUniverse({ symbol: row.symbol, riskGroupId: row.risk_group_id });
  } catch (error) {
    logger.error('Failed to process symbol', {
      symbol: row.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    return 'failed';
  }
}

async function processSymbols(selected: Array<{ symbol: string; risk_group_id: string }>, logger: SyncLogger): Promise<ProcessSymbolsResult> {
  const selectedSymbols: string[] = [];
  let inserted = 0;
  let updated = 0;

  for (const row of selected) {
    if (row === undefined || row === null) {
      continue;
    }
    selectedSymbols.push(row.symbol);

    const result = await processSingleSymbolSafely(row, logger);
    if (result === 'inserted') {
      inserted++;
    } else if (result === 'updated') {
      updated++;
    }
  }

  return { selectedSymbols, inserted, updated };
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
  // Step 1: Select eligible symbols in a transaction
  const selected = await prisma.$transaction(async function selectSymbolsTransaction(client) {
    return selectEligibleScreener(client);
  });

  const selectedCount = Array.isArray(selected) ? selected.length : 0;

  logger.info('Selected eligible screener records', {
    selectedCount,
    symbols: selected.map(function extractSymbol(row) { return row.symbol; }),
  });

  // Step 2: Process each symbol individually (outside transaction due to rate limiting)
  const { selectedSymbols, inserted, updated } = await processSymbols(selected, logger);

  // Step 3: Mark expired symbols in a final transaction
  const markedExpired = await prisma.$transaction(async function markExpiredTransaction(client) {
    return markExpired({ client, notInSymbols: selectedSymbols, logger });
  });

  return {
    inserted,
    updated,
    markedExpired,
    selectedCount,
  };
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



