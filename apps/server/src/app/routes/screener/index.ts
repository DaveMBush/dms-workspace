/* eslint-disable @typescript-eslint/naming-convention -- API compatibility */
/* eslint-disable @typescript-eslint/no-explicit-any -- Cheerio element types */
import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { getConsistentDistributions } from './get-consistent-distributions.function';
import { ScreeningData } from './screening-data.interface';

interface RiskGroupMap {
  equities: string;
  income: string;
  taxFree: string;
}

type QualifyingSymbol = ScreeningData;

function createRequestHeaders(): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://www.cefconnect.com/closed-end-funds-screener',
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
  const response = await axios.get<ScreeningData[]>(url, {
    headers: createRequestHeaders(),
  });

  const data = response.data;
  if (data.length === 0) {
    return [];
  }

  return data;
}

function isSymbolTooNew(inceptionDate: string, fiveYearsAgo: Date): boolean {
  return new Date(inceptionDate) > fiveYearsAgo;
}

function calculateAnnualizedYield(distribution: number, price: number, frequency: string): number {
  if (frequency === 'Monthly') {
    return 12 * distribution / price;
  }
  if (frequency === 'Quarterly') {
    return 4 * distribution / price;
  }
  return 0;
}

function isEquityCategory(categoryId: number): boolean {
  return categoryId <= 10 || categoryId === 25 || categoryId === 26;
}

function isFixedIncomeCategory(categoryId: number): boolean {
  return categoryId >= 11 && categoryId <= 20;
}

function isTaxFreeCategory(categoryId: number): boolean {
  return categoryId >= 21 && categoryId <= 24;
}

function meetsEquityRequirements(annualizedYield: number): boolean {
  return annualizedYield >= 0.05;
}

function meetsFixedIncomeRequirements(annualizedYield: number): boolean {
  return annualizedYield >= 0.06;
}

function meetsTaxFreeRequirements(annualizedYield: number): boolean {
  return annualizedYield >= 0.04;
}

function meetsDistributionRequirements(symbol: ScreeningData): boolean {
  const annualizedYield = calculateAnnualizedYield(
    symbol.CurrentDistribution,
    symbol.Price,
    symbol.DistributionFrequency
  );

  if (symbol.DistributionFrequency !== 'Monthly' && symbol.DistributionFrequency !== 'Quarterly') {
    return false;
  }

  if (isEquityCategory(symbol.CategoryId)) {
    return meetsEquityRequirements(annualizedYield);
  }

  if (isFixedIncomeCategory(symbol.CategoryId)) {
    return meetsFixedIncomeRequirements(annualizedYield);
  }

  if (isTaxFreeCategory(symbol.CategoryId)) {
    return meetsTaxFreeRequirements(annualizedYield);
  }

  return false;
}

function filterQualifyingSymbols(data: ScreeningData[]): QualifyingSymbol[] {
  const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000);

  return data.filter(function filterSymbol(symbol: ScreeningData): boolean {
    if (isSymbolTooNew(symbol.InceptionDate, fiveYearsAgo)) {
      return false;
    }

    return meetsDistributionRequirements(symbol);
  });
}

function determineRiskGroupId(symbol: QualifyingSymbol, riskGroups: RiskGroupMap): string | null {
  if (symbol.CategoryId <= 10 || symbol.CategoryId === 25 || symbol.CategoryId === 26) {
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

async function fetchCefPage(symbol: string): Promise<cheerio.CheerioAPI> {
  const cefPage = await axios.get(`https://www.cefconnect.com/fund/${symbol}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': '',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
  });

  return cheerio.load(cefPage.data as string);
}

function extractHoldingsCount($: cheerio.CheerioAPI): number {
  return $('#ContentPlaceHolder1_cph_main_cph_main_ucPortChar_pcSummaryGrid tr')
    .map(function mapHoldingsRow(i: number, el: any): number {
      if ($(el).find('td:nth-child(1) strong').text().trim() !== 'Number of Holdings:') {
        return 0;
      }
      return parseInt($(el).find('td:nth-child(2)').text().trim(), 10);
    })
    .get()
    .reduce(function sumHoldings(a: number, b: number): number {
      return a + b;
    }, 0);
}

function extractTopHoldingsPercent($: cheerio.CheerioAPI): number {
  return $('#ContentPlaceHolder1_cph_main_cph_main_ucPortChar_TopHoldingsGrid tbody tr')
    .map(function mapTopHoldingsRow(i: number, el: any): number {
      if (i === 0) {
        return 0;
      }
      return parseFloat($(el).find('td:nth-child(3)').text());
    })
    .get()
    .reduce(function sumTopHoldings(a: number, b: number): number {
      return a + b;
    }, 0);
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

function shouldSkipNewSymbol(holdings: number, totalPercentTopHoldings: number, consistentDistributions: boolean, existingSymbol: ScreenerRecord | null): boolean {
  return existingSymbol === null && (holdings < 50 || totalPercentTopHoldings > 40 || !consistentDistributions);
}

function shouldDeleteExistingSymbol(holdings: number, totalPercentTopHoldings: number, consistentDistributions: boolean, existingSymbol: ScreenerRecord | null): boolean {
  return existingSymbol !== null && (holdings < 50 || totalPercentTopHoldings > 40 || !consistentDistributions);
}

function createScreenerData(symbol: QualifyingSymbol, riskGroupId: string): ScreenerRecord {
  return {
    id: '',
    symbol: symbol.Ticker,
    risk_group_id: riskGroupId,
    has_volitility: false,
    objectives_understood: false,
    graph_higher_before_2008: false,
    distribution: symbol.CurrentDistribution,
    last_price: symbol.Price,
    ex_date: null,
    distributions_per_year: symbol.DistributionFrequency === 'Monthly' ? 12 : 4,
  };
}

async function processSymbol(
  symbol: QualifyingSymbol,
  riskGroups: RiskGroupMap
): Promise<void> {
  const riskGroupId = determineRiskGroupId(symbol, riskGroups);
  if (riskGroupId === null) {
    return;
  }

  const existingSymbol = await prisma.screener.findUnique({
    where: { symbol: symbol.Ticker },
  });

  const $ = await fetchCefPage(symbol.Ticker);
  const holdings = extractHoldingsCount($);
  const totalPercentTopHoldings = extractTopHoldingsPercent($);
  const consistentDistributions = await getConsistentDistributions(symbol.Ticker);

  if (shouldSkipNewSymbol(holdings, totalPercentTopHoldings, consistentDistributions, existingSymbol)) {
    return;
  }

  if (shouldDeleteExistingSymbol(holdings, totalPercentTopHoldings, consistentDistributions, existingSymbol)) {
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

async function cleanupOldSymbols(qualifyingSymbols: QualifyingSymbol[]): Promise<void> {
  await prisma.screener.deleteMany({
    where: {
      symbol: {
        notIn: qualifyingSymbols.map(function mapToTicker(symbol: QualifyingSymbol): string {
          return symbol.Ticker;
        }),
      },
    },
  });
}

export function registerScreenerRoutes(fastify: FastifyInstance): void {
  fastify.get('/',
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

