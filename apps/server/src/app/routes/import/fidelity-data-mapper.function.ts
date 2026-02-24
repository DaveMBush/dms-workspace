import { FidelityCsvRow } from './fidelity-csv-row.interface';
import { MappedTransactionResult } from './mapped-transaction-result.interface';

/**
 * Maps parsed Fidelity CSV rows to internal data structures by looking up
 * accounts, symbols, and deposit types in the database.
 *
 * @param rows - Array of parsed CSV rows
 * @returns Categorized transaction results
 * @throws Error if account or symbol not found in database
 *
 * @remarks
 * This is a stub for TDD RED phase. Implementation will be added in Story AR.1.
 */
export async function mapFidelityTransactions(
  rows: FidelityCsvRow[]
): Promise<MappedTransactionResult> {
  await Promise.resolve(rows);
  throw new Error('Not implemented - TDD RED phase stub');
}
