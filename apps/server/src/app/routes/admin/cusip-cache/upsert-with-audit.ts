import { CusipCacheSource } from '@prisma/client';

import { prisma } from '../../../prisma/prisma-client';

interface UpsertAuditParams {
  cusip: string;
  symbol: string;
  source: CusipCacheSource;
  auditSource: string;
  reason?: string;
}

async function upsertWithAudit(params: UpsertAuditParams): Promise<unknown> {
  return prisma.$transaction(async function txUpsert(tx) {
    const existing = await tx.cusip_cache.findUnique({
      where: { cusip: params.cusip },
    });
    const action = existing !== null ? 'UPDATE' : 'CREATE';

    const entry = await tx.cusip_cache.upsert({
      where: { cusip: params.cusip },
      update: { symbol: params.symbol, source: params.source },
      create: {
        cusip: params.cusip,
        symbol: params.symbol,
        source: params.source,
      },
    });

    await tx.cusip_cache_audit.create({
      data: {
        cusip: params.cusip,
        symbol: params.symbol,
        action,
        source: params.auditSource,
        reason: params.reason,
      },
    });

    return entry;
  });
}

async function deleteWithAudit(
  id: string,
  cusip: string,
  symbol: string
): Promise<void> {
  await prisma.$transaction(async function txDelete(tx) {
    await tx.cusip_cache.delete({ where: { id } });
    await tx.cusip_cache_audit.create({
      data: {
        cusip,
        symbol,
        action: 'DELETE',
        source: 'MANUAL',
      },
    });
  });
}

export const cusipCacheTransactions = {
  upsertWithAudit,
  deleteWithAudit,
};
