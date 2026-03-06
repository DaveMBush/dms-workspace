import { PrismaClient } from '@prisma/client';

import { prisma } from '../prisma/prisma-client';

type AuditAction = 'CREATE' | 'DELETE' | 'UPDATE';
type AuditSource = 'API' | 'BULK_IMPORT' | 'MANUAL';

interface AuditLogEntry {
  cusip: string;
  symbol: string;
  action: AuditAction;
  source: AuditSource;
  userId?: string;
  reason?: string;
}

interface AuditLogQuery {
  cusip?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

async function logCacheChange(
  entry: AuditLogEntry,
  client: PrismaClient = prisma
): Promise<void> {
  await client.cusip_cache_audit.create({
    data: {
      cusip: entry.cusip,
      symbol: entry.symbol,
      action: entry.action,
      source: entry.source,
      userId: entry.userId,
      reason: entry.reason,
    },
  });
}

function buildDateFilter(
  startDate: Date | undefined,
  endDate: Date | undefined
): Record<string, Date> | undefined {
  if (startDate === undefined && endDate === undefined) {
    return undefined;
  }
  const filter: Record<string, Date> = {};
  if (startDate !== undefined) {
    filter.gte = startDate;
  }
  if (endDate !== undefined) {
    filter.lte = endDate;
  }
  return filter;
}

function buildWhereClause(query: AuditLogQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (typeof query.cusip === 'string' && query.cusip.length > 0) {
    where.cusip = query.cusip;
  }
  if (typeof query.action === 'string' && query.action.length > 0) {
    where.action = query.action;
  }
  const dateFilter = buildDateFilter(query.startDate, query.endDate);
  if (dateFilter !== undefined) {
    where.createdAt = dateFilter;
  }

  return where;
}

async function queryAuditLog(
  query: AuditLogQuery,
  client: PrismaClient = prisma
): Promise<{
  entries: Array<{
    id: string;
    cusip: string;
    symbol: string;
    action: string;
    source: string;
    userId: string | null;
    reason: string | null;
    createdAt: Date;
  }>;
  total: number;
}> {
  const where = buildWhereClause(query);

  const [entries, total] = await Promise.all([
    client.cusip_cache_audit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    }),
    client.cusip_cache_audit.count({ where }),
  ]);

  return { entries, total };
}

export const cusipAuditLogService = {
  logCacheChange,
  queryAuditLog,
};
