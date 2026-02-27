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

  let account = await prisma.accounts.findFirst({
    where: { name: accountName },
  });

  if (!account) {
    // Auto-create account if it doesn't exist
    account = await prisma.accounts.create({
      data: { name: accountName },
    });
  }

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
  createIfNotFound: boolean = false
): Promise<{ id: string } | null> {
  const universeEntry = await prisma.universe.findFirst({
    where: { symbol },
  });

  if (!universeEntry && createIfNotFound) {
    // Auto-create universe entry for new symbols on BUY
    // Get default risk group (first one available)
    const defaultRiskGroup = await prisma.risk_group.findFirst();

    if (!defaultRiskGroup) {
      throw new Error(
        'No risk groups found in database. Cannot create universe entry.'
      );
    }

    const newUniverse = await prisma.universe.create({
      data: {
        symbol,
        risk_group_id: defaultRiskGroup.id,
        last_price: 0,
        distribution: 0,
        distributions_per_year: 0,
        ex_date: null,
        most_recent_sell_date: null,
        expired: false,
        is_closed_end_fund: true,
      },
    });

    return newUniverse;
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
  let depositType = await prisma.divDepositType.findFirst({
    where: { name: 'Dividend' },
  });

  // Auto-create "Dividend" type if it doesn't exist
  if (!depositType) {
    depositType = await prisma.divDepositType.create({
      data: { name: 'Dividend' },
    });
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
  let depositType = await prisma.divDepositType.findFirst({
    where: { name: 'Cash Deposit' },
  });

  // Auto-create "Cash Deposit" type if it doesn't exist
  if (!depositType) {
    depositType = await prisma.divDepositType.create({
      data: { name: 'Cash Deposit' },
    });
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
  const moneyMarketSymbols = ['SPAXX', 'FDRXX', 'FDIC', 'FCASH'];
  return moneyMarketSymbols.includes(symbol.toUpperCase());
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
  return {
    date: row.date,
    action: row.action,
    symbol: row.symbol,
    description: row.description,
    quantity: row.quantity,
    price: row.price,
    totalAmount: row.totalAmount,
    account: row.account,
  } as UnknownTransaction;
}

async function handleBuyRow(
  row: FidelityCsvRow,
  result: MappedTransactionResult,
  accountId: string
): Promise<void> {
  const universe = await resolveSymbol(row.symbol, true);
  if (universe) {
    result.trades.push(mapPurchase(row, accountId, universe.id));
  }
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
 * Maps a single CSV row to the appropriate result category.
 * Uses pattern matching since action strings contain additional details.
 */
async function mapSingleRow(
  row: FidelityCsvRow,
  result: MappedTransactionResult,
  accountCache: Map<string, { id: string }>
): Promise<void> {
  const action = row.action.toUpperCase();
  const account = await resolveAccount(row.account, accountCache);

  if (isMoneyMarketFund(row.symbol) && isMoneyMarketTradeAction(action)) {
    result.divDeposits.push(await mapCashDeposit(row, account.id));
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
  if (action.startsWith('ELECTRONIC FUNDS TRANSFER')) {
    result.divDeposits.push(await mapCashDeposit(row, account.id));
    return;
  }
  result.unknownTransactions.push(createUnknownTransaction(row));
}
