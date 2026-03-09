import { CusipCacheSource } from '@prisma/client';

import { cusipCacheTransactions } from './upsert-with-audit';
import { cusipCacheValidators } from './validation';

interface BulkMapping {
  cusip: string;
  symbol: string;
  source?: string;
}

interface BulkResults {
  added: number;
  errors: string[];
}

function validateMapping(mapping: BulkMapping): string | null {
  if (!cusipCacheValidators.isValidCusip(mapping.cusip)) {
    return `Invalid CUSIP: ${mapping.cusip}`;
  }
  if (!cusipCacheValidators.isNonEmptySymbol(mapping.symbol)) {
    return `Empty symbol for CUSIP: ${mapping.cusip}`;
  }
  if (!cusipCacheValidators.isValidSource(mapping.source)) {
    return `Invalid source for CUSIP ${mapping.cusip}: ${mapping.source}`;
  }
  return null;
}

async function processBulkMappings(
  mappings: BulkMapping[],
  reason: string | undefined
): Promise<BulkResults> {
  const results: BulkResults = { added: 0, errors: [] };

  for (const mapping of mappings) {
    const error = validateMapping(mapping);
    if (error !== null) {
      results.errors.push(error);
      continue;
    }

    const effectiveSource: CusipCacheSource =
      mapping.source === 'YAHOO_FINANCE' ? 'YAHOO_FINANCE' : 'OPENFIGI';

    await cusipCacheTransactions.upsertWithAudit({
      cusip: mapping.cusip.toUpperCase(),
      symbol: mapping.symbol.toUpperCase(),
      source: effectiveSource,
      auditSource: 'BULK_IMPORT',
      reason,
    });

    results.added++;
  }

  return results;
}

export { processBulkMappings };
