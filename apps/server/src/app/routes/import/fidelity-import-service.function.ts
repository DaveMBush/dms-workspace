import { prisma } from '../../prisma/prisma-client';
import { parseFidelityCsv } from './fidelity-csv-parser.function';
import { mapFidelityTransactions } from './fidelity-data-mapper.function';
import { ImportResult } from './import-result.interface';
import { MappedDivDeposit } from './mapped-div-deposit.interface';
import { MappedSale } from './mapped-sale.interface';
import { MappedTrade } from './mapped-trade.interface';
import { MappedTransactionResult } from './mapped-transaction-result.interface';
import { UnknownTransaction } from './unknown-transaction.interface';

/**
 * Creates a trade record in the database for a purchase.
 * Checks for duplicate trades to ensure idempotency.
 */
async function processPurchase(trade: MappedTrade): Promise<void> {
  const existing = await prisma.trades.findFirst({
    where: {
      universeId: trade.universeId,
      accountId: trade.accountId,
      buy: trade.buy,
      buy_date: new Date(trade.buy_date),
      quantity: trade.quantity,
    },
  });
  if (existing) {
    return;
  }
  await prisma.trades.create({
    data: {
      universeId: trade.universeId,
      accountId: trade.accountId,
      buy: trade.buy,
      sell: trade.sell,
      buy_date: new Date(trade.buy_date),
      quantity: trade.quantity,
    },
  });
}

/**
 * Processes a sale by finding a matching open trade and updating it with sell data.
 * Returns an error message if no matching open trade is found.
 */
async function processSale(sale: MappedSale): Promise<string | null> {
  const openTrade = await prisma.trades.findFirst({
    where: {
      universeId: sale.universeId,
      accountId: sale.accountId,
      quantity: sale.quantity,
      sell: 0,
      sell_date: null,
    },
  });
  if (!openTrade) {
    return `No matching open trade found for sale: account=${sale.accountId}, universe=${sale.universeId}, quantity=${sale.quantity}`;
  }
  await prisma.trades.update({
    where: { id: openTrade.id },
    data: {
      sell: sale.sell,
      sell_date: new Date(sale.sell_date),
    },
  });
  return null;
}

/**
 * Creates a dividend deposit record in the database.
 * Checks for duplicate deposits to ensure idempotency.
 */
async function processDivDeposit(deposit: MappedDivDeposit): Promise<void> {
  const existing = await prisma.divDeposits.findFirst({
    where: {
      date: new Date(deposit.date),
      amount: deposit.amount,
      accountId: deposit.accountId,
      divDepositTypeId: deposit.divDepositTypeId,
      universeId: deposit.universeId,
    },
  });
  if (existing) {
    return;
  }
  await prisma.divDeposits.create({
    data: {
      date: new Date(deposit.date),
      amount: deposit.amount,
      accountId: deposit.accountId,
      divDepositTypeId: deposit.divDepositTypeId,
      universeId: deposit.universeId,
    },
  });
}

/**
 * Collects warnings for unknown transaction types.
 */
function collectUnknownWarnings(unknowns: UnknownTransaction[]): string[] {
  return unknowns.map(function mapUnknownToWarning(u) {
    return `Unknown transaction type "${u.action}" for symbol ${u.symbol} on ${u.date}`;
  });
}

function formatError(prefix: string, error: unknown): string {
  return `${prefix}: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Processes all purchase trades and collects errors.
 */
async function processTrades(
  trades: MappedTrade[],
  errors: string[]
): Promise<number> {
  let count = 0;
  for (const trade of trades) {
    try {
      await processPurchase(trade);
      count++;
    } catch (error) {
      errors.push(formatError('Failed to import purchase', error));
    }
  }
  return count;
}

/**
 * Processes a single sale and returns 1 if successful, 0 if an error was recorded.
 */
async function processSingleSale(
  sale: MappedSale,
  errors: string[]
): Promise<number> {
  const saleError = await processSale(sale);
  if (typeof saleError === 'string') {
    errors.push(saleError);
    return 0;
  }
  return 1;
}

/**
 * Processes all sales and collects errors.
 */
async function processSales(
  sales: MappedSale[],
  errors: string[]
): Promise<number> {
  let count = 0;
  for (const sale of sales) {
    try {
      count += await processSingleSale(sale, errors);
    } catch (error) {
      errors.push(formatError('Failed to import sale', error));
    }
  }
  return count;
}

/**
 * Processes all dividend/cash deposits and collects errors.
 */
async function processDeposits(
  deposits: MappedDivDeposit[],
  errors: string[]
): Promise<number> {
  let count = 0;
  for (const deposit of deposits) {
    try {
      await processDivDeposit(deposit);
      count++;
    } catch (error) {
      errors.push(formatError('Failed to import deposit', error));
    }
  }
  return count;
}

/**
 * Processes all mapped transactions and returns the import result.
 */
async function processAllTransactions(
  mapped: MappedTransactionResult
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings = collectUnknownWarnings(mapped.unknownTransactions);

  const tradeCount = await processTrades(mapped.trades, errors);
  const saleCount = await processSales(mapped.sales, errors);
  const depositCount = await processDeposits(mapped.divDeposits, errors);

  return {
    success: errors.length === 0,
    imported: tradeCount + saleCount + depositCount,
    errors,
    warnings,
  };
}

/**
 * Orchestrates the full Fidelity CSV import process:
 * 1. Parses the CSV content
 * 2. Maps rows to internal transaction structures
 * 3. Processes each transaction type (purchases, sales, dividends, cash deposits)
 * 4. Collects and returns errors/warnings
 *
 * @param csvContent - Raw CSV file content
 * @returns Import result with counts, errors, and warnings
 */
export async function importFidelityTransactions(
  csvContent: string
): Promise<ImportResult> {
  let rows;
  try {
    rows = parseFidelityCsv(csvContent);
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
    };
  }
  if (rows.length === 0) {
    return { success: true, imported: 0, errors: [], warnings: [] };
  }

  let mapped;
  try {
    mapped = await mapFidelityTransactions(rows);
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
    };
  }

  return processAllTransactions(mapped);
}
