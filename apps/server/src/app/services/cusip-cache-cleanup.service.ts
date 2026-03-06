import { PrismaClient } from '@prisma/client';

import { prisma } from '../prisma/prisma-client';

interface CleanupResult {
  archivedCount: number;
  entries: Array<{
    cusip: string;
    symbol: string;
    lastUsedAt: Date;
  }>;
}

function getCleanupAgeDays(): number {
  const envVal = process.env.CUSIP_CACHE_CLEANUP_AGE_DAYS;
  if (typeof envVal === 'string' && envVal.length > 0) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 365;
}

function isCleanupEnabled(): boolean {
  return process.env.CUSIP_CACHE_CLEANUP_ENABLED === 'true';
}

async function archiveStaleEntries(
  ageDays?: number,
  client: PrismaClient = prisma
): Promise<CleanupResult> {
  const cutoffDays = ageDays ?? getCleanupAgeDays();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);

  const staleEntries = await client.cusip_cache.findMany({
    where: {
      lastUsedAt: { lt: cutoffDate },
    },
  });

  if (staleEntries.length === 0) {
    return { archivedCount: 0, entries: [] };
  }

  await client.$transaction(async function archiveTransaction(tx) {
    for (const entry of staleEntries) {
      await tx.cusip_cache_archive.create({
        data: {
          cusip: entry.cusip,
          symbol: entry.symbol,
          source: entry.source,
          resolvedAt: entry.resolvedAt,
          reason: `Unused for ${cutoffDays}+ days`,
        },
      });
    }

    const staleIds = staleEntries.map(function mapId(e) {
      return e.id;
    });
    await tx.cusip_cache.deleteMany({
      where: { id: { in: staleIds } },
    });
  });

  return {
    archivedCount: staleEntries.length,
    entries: staleEntries.map(function mapEntry(e) {
      return {
        cusip: e.cusip,
        symbol: e.symbol,
        lastUsedAt: e.lastUsedAt,
      };
    }),
  };
}

async function getArchived(
  query: { limit?: number; offset?: number },
  client: PrismaClient = prisma
): Promise<{
  entries: Array<{
    id: string;
    cusip: string;
    symbol: string;
    source: string;
    resolvedAt: Date;
    archivedAt: Date;
    reason: string | null;
  }>;
  total: number;
}> {
  const [entries, total] = await Promise.all([
    client.cusip_cache_archive.findMany({
      orderBy: { archivedAt: 'desc' },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    }),
    client.cusip_cache_archive.count(),
  ]);

  return { entries, total };
}

export const cusipCacheCleanupService = {
  archiveStaleEntries,
  getArchived,
  isCleanupEnabled,
  getCleanupAgeDays,
};
