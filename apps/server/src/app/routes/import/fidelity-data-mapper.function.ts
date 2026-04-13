import { prisma } from '../../prisma/prisma-client';
import {
  buildCefClassification,
  createUniverseEntry,
} from './fidelity-cef-universe.helper';
import { FidelityCsvRow } from './fidelity-csv-row.interface';
import { isInLieuRow } from './is-in-lieu-row.function';
import { isSplitFromRow } from './is-split-from-row.function';
import { isSplitRow } from './is-split-row.function';
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
 * Creates the account if it doesn't exist.
 */
async function resolveAccount(
  accountName: string,
  cache: Map<string, { id: string }>
): Promise<{ id: string }> {
  const cached = cache.get(accountName);
  if (cached) {
    return cached;
  }

  const account =
    (await prisma.accounts.findFirst({ where: { name: accountName } })) ??
    (await prisma.accounts.create({ data: { name: accountName } }));

  cache.set(accountName, account);
  return account;
}

/**
 * Resolves a symbol from the universe table.
 * For BUY transactions, creates the symbol if it doesn't exist.
 * For other transactions, returns null if symbol not found.
 */
async function resolveSymbol(
  symbol: string,
  /* v8 ignore next */
  createIfNotFound: boolean = false
): Promise<{ id: string } | null> {
  const universeEntry = await prisma.universe.findFirst({ where: { symbol } });
  if (!universeEntry && createIfNotFound) {
    const { riskGroupId, isCef } = await buildCefClassification(symbol);
    return createUniverseEntry(symbol, riskGroupId, isCef);
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
    throw new Error(`Invalid quantity for purchase: ${row.quantity} (must be non-negative)`);
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
  const depositType =
    (await prisma.divDepositType.findFirst({ where: { name: 'Dividend' } })) ??
    (await prisma.divDepositType.create({ data: { name: 'Dividend' } }));

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
  const depositType =
    (await prisma.divDepositType.findFirst({ where: { name: 'Cash Deposit' } })) ??
    (await prisma.divDepositType.create({ data: { name: 'Cash Deposit' } }));

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
    pendingSplits: [],
  };

  const accountCache = new Map<string, { id: string }>();

  // Sort by date (oldest first) to ensure proper processing order
  const sortedRows = [...rows].sort(compareByDate);

  for (const row of sortedRows) {
    await mapSingleRow(row, result, accountCache);
  }

  return result;
}

/**
 * Comparator for sorting CSV rows by date (oldest first).
 */
function compareByDate(a: FidelityCsvRow, b: FidelityCsvRow): number {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

/**
 * Checks if a symbol is a money market fund that should be treated as cash.
 * Money market funds like SPAXX are used as cash holding accounts.
 */
function isMoneyMarketFund(symbol: string): boolean {
  return ['SPAXX', 'FDRXX', 'FDIC', 'FCASH'].includes(symbol.toUpperCase());
}

function isMoneyMarketTradeAction(action: string): boolean {
  return (
    action.startsWith('YOU BOUGHT') ||
    action.startsWith('PURCHASE INTO CORE ACCOUNT') ||
    action.startsWith('REINVESTMENT') ||
    action.startsWith('YOU SOLD') ||
    action.startsWith('REDEMPTION FROM CORE ACCOUNT')
  );
}

function isBuyAction(action: string): boolean {
  return (
    action.startsWith('YOU BOUGHT') ||
    action.startsWith('PURCHASE INTO CORE ACCOUNT') ||
    action.startsWith('REINVESTMENT')
  );
}

function isSellAction(action: string): boolean {
  return (
    action.startsWith('YOU SOLD') ||
    action.startsWith('REDEMPTION FROM CORE ACCOUNT')
  );
}

function createUnknownTransaction(row: FidelityCsvRow): UnknownTransaction {
  return row as UnknownTransaction;
}

async function handleBuyRow(
  row: FidelityCsvRow,
  result: MappedTransactionResult,
  accountId: string
): Promise<void> {
  const universe = await resolveSymbol(row.symbol, true);
  /* v8 ignore start */
  if (universe) {
    result.trades.push(mapPurchase(row, accountId, universe.id));
  }
  /* v8 ignore stop */
}

async function handleSellRow(
  row: FidelityCsvRow,
  result: MappedTransactionResult,
  accountId: string
): Promise<void> {
  const universe = await resolveSymbol(row.symbol, false);
  if (universe) {
    result.sales.push(mapSale(row, accountId, universe.id));
  } else {
    result.divDeposits.push(await mapCashDeposit(row, accountId));
  }
}

async function handleDividendRow(
  row: FidelityCsvRow,
  result: MappedTransactionResult,
  accountId: string
): Promise<void> {
  const shouldAutoCreate = isMoneyMarketFund(row.symbol);
  const universe = await resolveSymbol(row.symbol, shouldAutoCreate);
  if (universe) {
    result.divDeposits.push(await mapDividend(row, accountId, universe.id));
  }
}

/**
 * Handles a split CSV row by calculating the split ratio and deferring the lot
 * adjustment to after all buy trades have been committed to the database.
 *
 * TO rows (negative quantity, old-CUSIP symbol) are skipped because they carry no
 * information beyond what the matching FROM row already provides.
 *
 * Account scoping is applied so that only lots belonging to the CSV row's account are
 * adjusted, preventing premature adjustments for other accounts not yet split.
 */
async function handleSplitRow(
  row: FidelityCsvRow,
  result: MappedTransactionResult,
  accountCache: Map<string, { id: string }>
): Promise<void> {
  // Only process FROM rows; TO rows and unrecognised split rows are silently skipped.
  if (!isSplitFromRow(row)) {
    return;
  }

  result.pendingSplits.push({
    symbol: row.symbol,
    csvQuantity: row.quantity,
    accountId: (await resolveAccount(row.account, accountCache)).id,
  });
}

/**
 * Maps a single CSV row to the appropriate result category.
 * Uses pattern matching since action strings contain additional details.
 */
async function mapSingleRow(
  row: FidelityCsvRow,
  result: MappedTransactionResult,
  accountCache: Map<string, { id: string }>
): Promise<void> {
  // In-lieu rows are skipped entirely.
  if (isInLieuRow(row)) {
    return;
  }

  // Split rows: accumulate deferred split data (Stories 48.2–48.3, 57.2, 63.2).
  // Actual lot adjustment is deferred to processAllTransactions after processTrades commits buys.
  if (isSplitRow(row)) {
    await handleSplitRow(row, result, accountCache);
    return;
  }

  const action = row.action.toUpperCase();
  const account = await resolveAccount(row.account, accountCache);

  if (isMoneyMarketFund(row.symbol) && isMoneyMarketTradeAction(action)) {
    // Skip money market trade actions — these are implied cash sweep movements.
    // The actual dividends are captured separately via DIVIDEND RECEIVED.
    return;
  }
  if (isBuyAction(action)) {
    await handleBuyRow(row, result, account.id);
    return;
  }
  if (isSellAction(action)) {
    await handleSellRow(row, result, account.id);
    return;
  }
  if (action.startsWith('DIVIDEND RECEIVED')) {
    await handleDividendRow(row, result, account.id);
    return;
  }
  if (
    action.startsWith('ELECTRONIC FUNDS TRANSFER') ||
    action.startsWith('MONEY LINE RECEIVED')
  ) {
    result.divDeposits.push(await mapCashDeposit(row, account.id));
    return;
  }
  result.unknownTransactions.push(createUnknownTransaction(row));
}
