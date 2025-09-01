/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related symbol processing functions */

import { SyncLogger } from '../../../../utils/logger';
import { getDistributions } from '../../settings/common/get-distributions.function';

export function getExDateToSet(
  distribution: Awaited<ReturnType<typeof getDistributions>>,
  today: Date
): Date | undefined {
  if (
    distribution?.ex_date &&
    distribution.ex_date instanceof Date &&
    !isNaN(distribution.ex_date.valueOf()) &&
    distribution.ex_date > today
  ) {
    return distribution.ex_date;
  }
  return undefined;
}

export async function processSingleSymbolSafely(
  row: { symbol: string; risk_group_id: string },
  logger: SyncLogger,
  upsertUniverse: (params: {
    symbol: string;
    riskGroupId: string;
  }) => Promise<'inserted' | 'updated'>
): Promise<'failed' | 'inserted' | 'updated'> {
  try {
    return await upsertUniverse({
      symbol: row.symbol,
      riskGroupId: row.risk_group_id,
    });
  } catch (error) {
    logger.error('Failed to process symbol', {
      symbol: row.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    return 'failed';
  }
}

interface ProcessSymbolsResult {
  selectedSymbols: string[];
  inserted: number;
  updated: number;
}

export async function processSymbols(
  selected: Array<{ symbol: string; risk_group_id: string }>,
  logger: SyncLogger,
  upsertUniverse: (params: {
    symbol: string;
    riskGroupId: string;
  }) => Promise<'inserted' | 'updated'>
): Promise<ProcessSymbolsResult> {
  const selectedSymbols: string[] = [];
  let inserted = 0;
  let updated = 0;

  for (const row of selected) {
    if (row === undefined || row === null) {
      continue;
    }
    selectedSymbols.push(row.symbol);

    const result = await processSingleSymbolSafely(row, logger, upsertUniverse);
    if (result === 'inserted') {
      inserted++;
    } else if (result === 'updated') {
      updated++;
    }
  }

  return { selectedSymbols, inserted, updated };
}
