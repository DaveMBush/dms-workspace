/* eslint-disable @typescript-eslint/naming-convention -- API compatibility */
import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { axiosGetWithBackoff } from '../common/axios-get-with-backoff.function';
import {
  extractHoldingsCount,
  extractTopHoldingsPercent,
  fetchCefPage,
} from './cef-page-scraping.function';
import { getConsistentDistributions } from './get-consistent-distributions.function';
import { ScreeningData } from './screening-data.interface';
import { filterQualifyingSymbols } from './screening-requirements.function';

interface RiskGroupMap {
  equities: string;
  income: string;
  taxFree: string;
}

function createRequestHeaders(): Record<string, string> {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    Referer: 'https://www.cefconnect.com/closed-end-funds-screener',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };
}

async function loadRiskGroups(): Promise<RiskGroupMap> {
  const riskGroups = await prisma.risk_group.findMany();
  const equities = riskGroups.find(function findEquities(group): boolean {
    return group.name === 'Equities';
  })!;
  const income = riskGroups.find(function findIncome(group): boolean {
    return group.name === 'Income';
  })!;
  const taxFree = riskGroups.find(function findTaxFree(group): boolean {
    return group.name === 'Tax Free Income';
  })!;

  return {
    equities: equities.id,
    income: income.id,
    taxFree: taxFree.id,
  };
}

async function fetchScreeningData(): Promise<ScreeningData[]> {
  const url = 'https://www.cefconnect.com/api/v3/dailypricing';
  const response = await axiosGetWithBackoff<ScreeningData[]>(url, {
    headers: createRequestHeaders(),
  });

  const data = response.data;
  if (data.length === 0) {
    return [];
  }

  return data;
}

function determineRiskGroupId(
  symbol: ScreeningData,
  riskGroups: RiskGroupMap
): string | null {
  if (
    symbol.CategoryId <= 10 ||
    symbol.CategoryId === 25 ||
    symbol.CategoryId === 26
  ) {
    return riskGroups.equities;
  }
  if (symbol.CategoryId >= 11 && symbol.CategoryId <= 20) {
    return riskGroups.income;
  }
  if (symbol.CategoryId >= 21 && symbol.CategoryId <= 24) {
    return riskGroups.taxFree;
  }
  return null;
}

interface ScreenerRecord {
  id: string;
  symbol: string;
  risk_group_id: string;
  has_volitility: boolean;
  objectives_understood: boolean;
  graph_higher_before_2008: boolean;
  distribution: number;
  last_price: number;
  ex_date: Date | null;
  distributions_per_year: number;
}

function shouldSkipNewSymbol(
  holdings: number,
  totalPercentTopHoldings: number,
  consistentDistributions: boolean,
  existingSymbol: ScreenerRecord | null
): boolean {
  return (
    existingSymbol === null &&
    (holdings < 50 || totalPercentTopHoldings > 40 || !consistentDistributions)
  );
}

function shouldDeleteExistingSymbol(
  holdings: number,
  totalPercentTopHoldings: number,
  consistentDistributions: boolean,
  existingSymbol: ScreenerRecord | null
): boolean {
  return (
    existingSymbol !== null &&
    (holdings < 50 || totalPercentTopHoldings > 40 || !consistentDistributions)
  );
}

function createScreenerData(
  symbol: ScreeningData,
  riskGroupId: string
): ScreenerRecord {
  return {
    symbol: symbol.Ticker,
    risk_group_id: riskGroupId,
    has_volitility: false,
    objectives_understood: false,
    graph_higher_before_2008: false,
    distribution: symbol.CurrentDistribution,
    last_price: symbol.Price,
    ex_date: null,
    distributions_per_year: symbol.DistributionFrequency === 'Monthly' ? 12 : 4,
  } as ScreenerRecord;
}

async function processSymbol(
  symbol: ScreeningData,
  riskGroups: RiskGroupMap
): Promise<void> {
  // processing symbol
  const riskGroupId = determineRiskGroupId(symbol, riskGroups);
  if (riskGroupId === null) {
    // skip: no risk group
    return;
  }

  const existingSymbol = await prisma.screener.findUnique({
    where: { symbol: symbol.Ticker },
  });

  const $ = await fetchCefPage(symbol.Ticker);
  const holdings = extractHoldingsCount($);
  const totalPercentTopHoldings = extractTopHoldingsPercent($);
  const consistentDistributions = await getConsistentDistributions(
    symbol.Ticker
  );

  if (
    shouldSkipNewSymbol(
      holdings,
      totalPercentTopHoldings,
      consistentDistributions,
      existingSymbol
    )
  ) {
    return;
  }

  if (
    shouldDeleteExistingSymbol(
      holdings,
      totalPercentTopHoldings,
      consistentDistributions,
      existingSymbol
    )
  ) {
    await prisma.screener.delete({
      where: { symbol: symbol.Ticker },
    });
    return;
  }

  if (existingSymbol) {
    return;
  }

  await prisma.screener.create({
    data: createScreenerData(symbol, riskGroupId),
  });
}

async function cleanupOldSymbols(
  qualifyingSymbols: ScreeningData[]
): Promise<void> {
  await prisma.screener.deleteMany({
    where: {
      symbol: {
        notIn: qualifyingSymbols.map(function mapToTicker(
          symbol: ScreeningData
        ): string {
          return symbol.Ticker;
        }),
      },
    },
  });
}

export default function registerScreenerRoutes(fastify: FastifyInstance): void {
  fastify.get(
    '/',
    async function handleScreenerRequest(_request, _reply): Promise<void> {
      const riskGroups = await loadRiskGroups();
      const data = await fetchScreeningData();

      if (data.length === 0) {
        return;
      }

      const qualifyingSymbols = filterQualifyingSymbols(data);
      for (const symbol of qualifyingSymbols) {
        await processSymbol(symbol, riskGroups);
      }

      await cleanupOldSymbols(qualifyingSymbols);
    }
  );
}
