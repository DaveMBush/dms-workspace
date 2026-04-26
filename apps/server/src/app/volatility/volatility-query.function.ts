import { prisma } from '../prisma/prisma-client';
import { calculateVolatility } from './volatility-calculation.function';
import { VolatilityResult } from './volatility-result.interface';

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function buildFiveYearsAgo(): Date {
  return new Date(Date.now() - FIVE_YEARS_MS);
}

function buildOneYearAgo(): Date {
  return new Date(Date.now() - ONE_YEAR_MS);
}

function groupAmountsBySymbol(
  records: Array<{
    amount: number;
    date: Date;
    universe: { symbol: string } | null;
  }>
): Map<string, Array<{ date: Date; amount: number }>> {
  const bySymbol = new Map<string, Array<{ date: Date; amount: number }>>();
  for (const record of records) {
    if (record.universe === null) {
      continue;
    }
    const symbol = record.universe.symbol;
    if (!bySymbol.has(symbol)) {
      bySymbol.set(symbol, []);
    }
    bySymbol.get(symbol)!.push({ date: record.date, amount: record.amount });
  }
  return bySymbol;
}

function buildVolatilityResult(
  symbol: string,
  history: Array<{ date: Date; amount: number }>,
  oneYearAgo: Date
): VolatilityResult {
  const amounts5yr = history.map(function getAmount(r) {
    return r.amount;
  });
  const amounts1yr = history
    .filter(function filterOneYear(r) {
      return r.date >= oneYearAgo;
    })
    .map(function getAmount(r) {
      return r.amount;
    });

  return {
    symbol,
    volatility1yr: calculateVolatility(amounts1yr),
    volatility5yr: calculateVolatility(amounts5yr),
  };
}

export async function fetchVolatilityForAllSymbols(): Promise<
  VolatilityResult[]
> {
  const fiveYearsAgo = buildFiveYearsAgo();
  const oneYearAgo = buildOneYearAgo();

  const universeSymbols = await prisma.universe.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      symbol: 'asc',
    },
    select: {
      symbol: true,
    },
  });

  const allRecords = await prisma.divDeposits.findMany({
    where: {
      date: { gte: fiveYearsAgo },
      deletedAt: null,
      universeId: { not: null },
    },
    orderBy: { date: 'asc' },
    select: {
      amount: true,
      date: true,
      universe: { select: { symbol: true } },
    },
  });

  const bySymbol = groupAmountsBySymbol(allRecords);

  return universeSymbols.map(function buildResult({
    symbol,
  }): VolatilityResult {
    const history = bySymbol.get(symbol) ?? [];
    return buildVolatilityResult(symbol, history, oneYearAgo);
  });
}
