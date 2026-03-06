import { PrismaClient } from '@prisma/client';

import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';

interface CusipCacheMapping {
  cusip: string;
  symbol: string;
  source: 'OPENFIGI' | 'YAHOO_FINANCE';
}

/**
 * Looks up a single CUSIP in the cache.
 * Returns the cached symbol or null if not found.
 * Swallows database errors and returns null for graceful degradation.
 */
async function findByCusip(
  cusip: string,
  client: PrismaClient = prisma
): Promise<string | null> {
  try {
    const entry = await client.cusip_cache.findUnique({
      where: { cusip },
    });
    if (entry) {
      await client.cusip_cache.update({
        where: { cusip },
        data: { lastUsedAt: new Date() },
      });
      return entry.symbol;
    }
    return null;
  } catch (error: unknown) {
    logger.warn('CUSIP cache lookup failed', { cusip, error });
    return null;
  }
}

/**
 * Looks up multiple CUSIPs in the cache in a single batch query.
 * Returns a Map of CUSIP → symbol for all found entries.
 * Swallows database errors and returns an empty map for graceful degradation.
 */
async function findManyCusips(
  cusips: string[],
  client: PrismaClient = prisma
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (cusips.length === 0) {
    return result;
  }
  try {
    const entries = await client.cusip_cache.findMany({
      where: { cusip: { in: cusips } },
    });
    const foundCusips: string[] = [];
    for (const entry of entries) {
      result.set(entry.cusip, entry.symbol);
      foundCusips.push(entry.cusip);
    }
    if (foundCusips.length > 0) {
      await client.cusip_cache.updateMany({
        where: { cusip: { in: foundCusips } },
        data: { lastUsedAt: new Date() },
      });
    }
  } catch (error: unknown) {
    logger.warn('CUSIP cache batch lookup failed', {
      count: cusips.length,
      error,
    });
  }
  return result;
}

/**
 * Inserts or updates a single CUSIP→symbol mapping in the cache.
 * Swallows database errors so cache write failures don't affect import results.
 */
async function upsertMapping(
  cusip: string,
  symbol: string,
  source: 'OPENFIGI' | 'YAHOO_FINANCE',
  client: PrismaClient = prisma
): Promise<void> {
  if (symbol.length === 0) {
    return;
  }
  try {
    await client.cusip_cache.upsert({
      where: { cusip },
      update: { symbol, source },
      create: { cusip, symbol, source },
    });
  } catch (error: unknown) {
    logger.warn('CUSIP cache upsert failed', { cusip, symbol, error });
  }
}

/**
 * Inserts or updates multiple CUSIP→symbol mappings in the cache.
 * Swallows database errors so cache write failures don't affect import results.
 */
async function upsertManyMappings(
  mappings: CusipCacheMapping[],
  client: PrismaClient = prisma
): Promise<void> {
  for (const mapping of mappings) {
    if (mapping.symbol.length > 0) {
      await upsertMapping(
        mapping.cusip,
        mapping.symbol,
        mapping.source,
        client
      );
    }
  }
}

export const cusipCacheService = {
  findByCusip,
  findManyCusips,
  upsertMapping,
  upsertManyMappings,
};
