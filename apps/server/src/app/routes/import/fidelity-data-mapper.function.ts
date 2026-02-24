import { prisma } from '../../prisma/prisma-client';
import { FidelityCsvRow } from './fidelity-csv-row.interface';
import { MappedDivDeposit } from './mapped-div-deposit.interface';
import { MappedSale } from './mapped-sale.interface';
import { MappedTrade } from './mapped-trade.interface';
import { MappedTransactionResult } from './mapped-transaction-result.interface';
import { UnknownTransaction } from './unknown-transaction.interface';

/**
 * Converts a Fidelity date string (MM/DD/YYYY) to ISO format (YYYY-MM-DD).
 * @throws Error if date format is invalid
 */
function convertDate(dateStr: string): string {
  if (!dateStr) {
    throw new Error('Missing required date field');
  }
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid date format: "${dateStr}" (expected MM/DD/YYYY)`);
  }
  return `${match[3]}-${match[1]}-${match[2]}`;
}

/**
 * Resolves an account by name, using a cache to avoid redundant DB lookups.
 */
async function resolveAccount(
  accountName: string,
  cache: Map<string, { id: string }>
): Promise<{ id: string }> {
  const cached = cache.get(accountName);
  if (cached) {
    return cached;
  }
  const account = await prisma.accounts.findFirst({
    where: { name: accountName },
  });
  if (!account) {
    throw new Error(`Account "${accountName}" not found`);
  }
  cache.set(accountName, account);
  return account;
}

/**
 * Resolves a symbol from the universe table.
 */
async function resolveSymbol(symbol: string): Promise<{ id: string }> {
  const universeEntry = await prisma.universe.findFirst({
    where: { symbol },
  });
  if (!universeEntry) {
    throw new Error(`Symbol "${symbol}" not found in universe`);
  }
  return universeEntry;
}

/**
 * Maps a purchase row to a MappedTrade.
 */
function mapPurchase(
  row: FidelityCsvRow,
  accountId: string,
  universeId: string
): MappedTrade {
  if (row.quantity < 0) {
    throw new Error(
      `Invalid quantity for purchase: ${row.quantity} (must be non-negative)`
    );
  }
  return {
    universeId,
    accountId,
    buy: row.price,
    sell: 0,
    buy_date: convertDate(row.date),
    quantity: row.quantity,
  };
}

/**
 * Maps a sale row to a MappedSale.
 */
function mapSale(
  row: FidelityCsvRow,
  accountId: string,
  universeId: string
): MappedSale {
  return {
    universeId,
    accountId,
    sell: row.price,
    sell_date: convertDate(row.date),
    quantity: row.quantity,
  };
}

/**
 * Maps a dividend row to a MappedDivDeposit.
 */
async function mapDividend(
  row: FidelityCsvRow,
  accountId: string,
  universeId: string
): Promise<MappedDivDeposit> {
  const depositType = await prisma.divDepositType.findFirst({
    where: { name: 'Dividend' },
  });
  if (!depositType) {
    throw new Error('Div deposit type "Dividend" not found');
  }
  return {
    date: convertDate(row.date),
    amount: row.totalAmount,
    accountId,
    divDepositTypeId: depositType.id,
    universeId,
  };
}

/**
 * Maps a cash deposit row to a MappedDivDeposit.
 */
async function mapCashDeposit(
  row: FidelityCsvRow,
  accountId: string
): Promise<MappedDivDeposit> {
  const depositType = await prisma.divDepositType.findFirst({
    where: { name: 'Cash Deposit' },
  });
  if (!depositType) {
    throw new Error('Div deposit type "Cash Deposit" not found');
  }
  return {
    date: convertDate(row.date),
    amount: row.totalAmount,
    accountId,
    divDepositTypeId: depositType.id,
    universeId: null,
  };
}

/**
 * Maps parsed Fidelity CSV rows to internal data structures by looking up
 * accounts, symbols, and deposit types in the database.
 *
 * @param rows - Array of parsed CSV rows
 * @returns Categorized transaction results
 * @throws Error if account or symbol not found in database
 */
export async function mapFidelityTransactions(
  rows: FidelityCsvRow[]
): Promise<MappedTransactionResult> {
  const result: MappedTransactionResult = {
    trades: [],
    sales: [],
    divDeposits: [],
    unknownTransactions: [],
  };

  const accountCache = new Map<string, { id: string }>();

  for (const row of rows) {
    await mapSingleRow(row, result, accountCache);
  }

  return result;
}

/**
 * Maps a single CSV row to the appropriate result category.
 */
async function mapSingleRow(
  row: FidelityCsvRow,
  result: MappedTransactionResult,
  accountCache: Map<string, { id: string }>
): Promise<void> {
  const account = await resolveAccount(row.account, accountCache);

  switch (row.action) {
    case 'YOU BOUGHT': {
      const universe = await resolveSymbol(row.symbol);
      result.trades.push(mapPurchase(row, account.id, universe.id));
      break;
    }
    case 'YOU SOLD': {
      const universe = await resolveSymbol(row.symbol);
      result.sales.push(mapSale(row, account.id, universe.id));
      break;
    }
    case 'DIVIDEND RECEIVED': {
      const universe = await resolveSymbol(row.symbol);
      result.divDeposits.push(await mapDividend(row, account.id, universe.id));
      break;
    }
    case 'ELECTRONIC FUNDS TRANSFER': {
      result.divDeposits.push(await mapCashDeposit(row, account.id));
      break;
    }
    default: {
      result.unknownTransactions.push({
        date: row.date,
        action: row.action,
        symbol: row.symbol,
        description: row.description,
        quantity: row.quantity,
        price: row.price,
        totalAmount: row.totalAmount,
        account: row.account,
      } as UnknownTransaction);
      break;
    }
  }
}
