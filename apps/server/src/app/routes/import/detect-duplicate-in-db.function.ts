import { prisma } from '../../prisma/prisma-client';

interface DbDuplicateCheckParams {
  accountId: string;
  universeId: string;
  date: string;
  quantity: number;
  price: number;
}

interface DuplicateDbResult {
  isDuplicate: boolean;
  severity?: string;
  message?: string;
}

/**
 * Checks if a transaction already exists in the database.
 * Returns a warning (not an error) if a duplicate is found.
 *
 * @param params.date - Expected in ISO format (YYYY-MM-DD).
 *   Callers must convert from display formats (e.g., MM/DD/YYYY) before calling.
 */
export async function detectDuplicateInDb(
  params: DbDuplicateCheckParams
): Promise<DuplicateDbResult> {
  const existing = await prisma.trades.findFirst({
    where: {
      accountId: params.accountId,
      universeId: params.universeId,
      buy_date: new Date(params.date),
      quantity: params.quantity,
      buy: params.price,
    },
  });

  if (existing !== null) {
    return {
      isDuplicate: true,
      severity: 'warning',
      message: 'Possible duplicate: Same transaction found in database',
    };
  }

  return { isDuplicate: false };
}
