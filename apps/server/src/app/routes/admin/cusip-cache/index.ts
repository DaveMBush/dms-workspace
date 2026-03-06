import { CusipCacheSource } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';
import { cusipAuditLogService } from '../../../services/cusip-audit-log.service';
import { cusipCacheCleanupService } from '../../../services/cusip-cache-cleanup.service';
import { cusipCacheTransactions } from './upsert-with-audit';
import { cusipCacheValidators } from './validation';

// --- Statistics Endpoint ---

async function handleGetStats(
  _: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const [
    totalEntries,
    entriesBySource,
    recentlyAdded,
    oldestEntry,
    newestEntry,
  ] = await Promise.all([
    prisma.cusip_cache.count(),
    prisma.cusip_cache.groupBy({
      by: ['source'],
      _count: true,
    }),
    prisma.cusip_cache.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.cusip_cache.findFirst({
      orderBy: { createdAt: 'asc' },
    }),
    prisma.cusip_cache.findFirst({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const sourceMap: Record<string, number> = {};
  for (const group of entriesBySource) {
    sourceMap[group.source] = group._count; // eslint-disable-line no-underscore-dangle -- Prisma API field
  }

  reply.send({
    totalEntries,
    entriesBySource: sourceMap,
    oldestEntry: oldestEntry?.createdAt ?? null,
    newestEntry: newestEntry?.createdAt ?? null,
    recentlyAdded: recentlyAdded.map(function mapRecent(e) {
      return {
        cusip: e.cusip,
        symbol: e.symbol,
        source: e.source,
        resolvedAt: e.resolvedAt,
      };
    }),
    timestamp: new Date().toISOString(),
  });
}

// --- Search Endpoint ---

interface SearchQuery {
  cusip?: string;
  symbol?: string;
}

async function handleSearch(
  request: FastifyRequest<{ Querystring: SearchQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { cusip, symbol } = request.query;

  const hasCusip = typeof cusip === 'string' && cusip.length > 0;
  const hasSymbol = typeof symbol === 'string' && symbol.length > 0;

  if (!hasCusip && !hasSymbol) {
    reply
      .status(400)
      .send({ error: 'Provide cusip or symbol query parameter' });
    return;
  }

  const where: Record<string, unknown> = {};
  if (hasCusip) {
    where.cusip = { contains: cusip.toUpperCase() };
  }
  if (hasSymbol) {
    where.symbol = { contains: symbol.toUpperCase() };
  }

  const entries = await prisma.cusip_cache.findMany({
    where,
    take: 100,
    orderBy: { updatedAt: 'desc' },
  });

  reply.send({ entries, count: entries.length });
}

// --- Add Mapping ---

interface AddBody {
  cusip: string;
  symbol: string;
  source?: string;
  reason?: string;
}

async function handleAdd(
  request: FastifyRequest<{ Body: AddBody }>,
  reply: FastifyReply
): Promise<void> {
  if (request.body === null || request.body === undefined) {
    reply.status(400).send({ error: 'Request body is required' });
    return;
  }
  const { cusip, symbol, source, reason } = request.body;

  if (!cusipCacheValidators.isValidCusip(cusip)) {
    reply.status(400).send({
      error: 'Invalid CUSIP format (must be 9 alphanumeric characters)',
    });
    return;
  }
  if (!cusipCacheValidators.isNonEmptySymbol(symbol)) {
    reply.status(400).send({ error: 'Symbol must be a non-empty string' });
    return;
  }
  if (!cusipCacheValidators.isValidSource(source)) {
    reply
      .status(400)
      .send({ error: 'Invalid source (must be OPENFIGI or YAHOO_FINANCE)' });
    return;
  }

  const entry = await cusipCacheTransactions.upsertWithAudit({
    cusip: cusip.toUpperCase(),
    symbol: symbol.toUpperCase(),
    source: (source ?? 'OPENFIGI') as CusipCacheSource,
    auditSource: 'MANUAL',
    reason,
  });

  reply.status(201).send(entry);
}

// --- Delete Mapping ---

interface DeleteParams {
  id: string;
}

async function handleDelete(
  request: FastifyRequest<{ Params: DeleteParams }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;

  const existing = await prisma.cusip_cache.findUnique({ where: { id } });
  if (existing === null || existing === undefined) {
    reply.status(404).send({ error: 'Cache entry not found' });
    return;
  }

  await cusipCacheTransactions.deleteWithAudit(
    id,
    existing.cusip,
    existing.symbol
  );

  reply.send({ message: 'Cache entry deleted', cusip: existing.cusip });
}

// --- Bulk Add ---

interface BulkAddBody {
  mappings: Array<{
    cusip: string;
    symbol: string;
    source?: string;
  }>;
  reason?: string;
}

async function handleBulkAdd(
  request: FastifyRequest<{ Body: BulkAddBody }>,
  reply: FastifyReply
): Promise<void> {
  if (request.body === null || request.body === undefined) {
    reply.status(400).send({ error: 'Request body is required' });
    return;
  }
  const { mappings, reason } = request.body;

  if (!Array.isArray(mappings) || mappings.length === 0) {
    reply.status(400).send({ error: 'Provide a non-empty mappings array' });
    return;
  }
  if (mappings.length > 1000) {
    reply
      .status(400)
      .send({ error: 'Maximum 1000 mappings per bulk operation' });
    return;
  }

  const results = { added: 0, errors: [] as string[] };

  for (const mapping of mappings) {
    if (!cusipCacheValidators.isValidCusip(mapping.cusip)) {
      results.errors.push(`Invalid CUSIP: ${mapping.cusip}`);
      continue;
    }
    if (!cusipCacheValidators.isNonEmptySymbol(mapping.symbol)) {
      results.errors.push(`Empty symbol for CUSIP: ${mapping.cusip}`);
      continue;
    }
    if (!cusipCacheValidators.isValidSource(mapping.source)) {
      results.errors.push(
        `Invalid source for CUSIP ${mapping.cusip}: ${mapping.source}`
      );
      continue;
    }

    await cusipCacheTransactions.upsertWithAudit({
      cusip: mapping.cusip.toUpperCase(),
      symbol: mapping.symbol.toUpperCase(),
      source: (mapping.source ?? 'OPENFIGI') as CusipCacheSource,
      auditSource: 'BULK_IMPORT',
      reason,
    });

    results.added++;
  }

  reply.send(results);
}

// --- Cleanup Endpoint ---

interface CleanupBody {
  ageDays?: number;
}

async function handleCleanup(
  request: FastifyRequest<{ Body: CleanupBody }>,
  reply: FastifyReply
): Promise<void> {
  const { ageDays } = request.body ?? {};
  const result = await cusipCacheCleanupService.archiveStaleEntries(ageDays);
  reply.send(result);
}

// --- Archived Entries ---

interface ArchivedQuery {
  limit?: string;
  offset?: string;
}

async function handleGetArchived(
  request: FastifyRequest<{ Querystring: ArchivedQuery }>,
  reply: FastifyReply
): Promise<void> {
  const limitStr = request.query.limit ?? '50';
  const offsetStr = request.query.offset ?? '0';
  const limit = parseInt(limitStr, 10);
  const offset = parseInt(offsetStr, 10);

  if (isNaN(limit) || limit < 0 || isNaN(offset) || offset < 0) {
    reply.status(400).send({ error: 'Invalid limit or offset parameter' });
    return;
  }

  const result = await cusipCacheCleanupService.getArchived({ limit, offset });
  reply.send(result);
}

// --- Audit Log ---

interface AuditQuery {
  cusip?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  offset?: string;
}

function parseOptionalString(value: string | undefined): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

function parseOptionalDate(value: string | undefined): Date | undefined {
  const str = parseOptionalString(value);
  return str !== undefined ? new Date(str) : undefined;
}

function parseOptionalInt(value: string | undefined): number | undefined {
  const str = parseOptionalString(value);
  return str !== undefined ? parseInt(str, 10) : undefined;
}

function isInvalidDate(value: string | undefined): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  return !isFinite(new Date(value).getTime());
}

function isInvalidPaginationParam(value: number | undefined): boolean {
  return value !== undefined && (isNaN(value) || value < 0);
}

async function handleGetAuditLog(
  request: FastifyRequest<{ Querystring: AuditQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { cusip, action, startDate, endDate, limit, offset } = request.query;

  if (isInvalidDate(startDate)) {
    reply.status(400).send({ error: 'Invalid startDate format' });
    return;
  }
  if (isInvalidDate(endDate)) {
    reply.status(400).send({ error: 'Invalid endDate format' });
    return;
  }

  const parsedLimit = parseOptionalInt(limit);
  const parsedOffset = parseOptionalInt(offset);

  if (isInvalidPaginationParam(parsedLimit)) {
    reply.status(400).send({ error: 'Invalid limit parameter' });
    return;
  }
  if (isInvalidPaginationParam(parsedOffset)) {
    reply.status(400).send({ error: 'Invalid offset parameter' });
    return;
  }

  const result = await cusipAuditLogService.queryAuditLog({
    cusip: parseOptionalString(cusip),
    action: parseOptionalString(action),
    startDate: parseOptionalDate(startDate),
    endDate: parseOptionalDate(endDate),
    limit: parsedLimit,
    offset: parsedOffset,
  });

  reply.send(result);
}

// --- Route Registration ---

export default function registerAdminCusipCacheRoutes(
  fastify: FastifyInstance
): void {
  // Statistics
  fastify.get('/stats', handleGetStats);

  // Search
  fastify.get('/search', handleSearch);

  // Management
  fastify.post('/add', handleAdd);
  fastify.delete('/:id', handleDelete);
  fastify.post('/bulk-add', handleBulkAdd);

  // Cleanup
  fastify.post('/cleanup', handleCleanup);
  fastify.get('/archived', handleGetArchived);

  // Audit
  fastify.get('/audit', handleGetAuditLog);
}
