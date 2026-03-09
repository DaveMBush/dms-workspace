import { FastifyReply, FastifyRequest } from 'fastify';

import { cusipAuditLogService } from '../../../services/cusip-audit-log.service';

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

export { handleGetAuditLog };
