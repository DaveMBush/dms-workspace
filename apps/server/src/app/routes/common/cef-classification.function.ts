/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related CEF classification functions */

import { ScreeningData } from '../screener/screening-data.interface';
import {
  isEquityCategory,
  isFixedIncomeCategory,
  isTaxFreeCategory,
} from '../screener/screening-requirements.function';
import { axiosGetWithBackoff } from './axios-get-with-backoff.function';

export interface RiskGroupMap {
  equities: string;
  income: string;
  taxFree: string;
}

function createCefConnectRequestHeaders(): Record<string, string> {
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

export async function lookupCefConnectSymbol(
  symbol: string
): Promise<ScreeningData | null> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) {
    return null;
  }
  const url = 'https://www.cefconnect.com/api/v3/dailypricing';
  const response = await axiosGetWithBackoff<ScreeningData[]>(url, {
    headers: createCefConnectRequestHeaders(),
  });
  return (
    response.data.find(function findMatchingTicker(
      entry: ScreeningData
    ): boolean {
      return entry.Ticker.trim().toUpperCase() === normalizedSymbol;
    }) ?? null
  );
}

export function classifySymbolRiskGroupId(
  data: ScreeningData,
  riskGroups: RiskGroupMap
): string | null {
  if (isEquityCategory(data.CategoryId)) {
    return riskGroups.equities;
  }
  if (isFixedIncomeCategory(data.CategoryId)) {
    return riskGroups.income;
  }
  if (isTaxFreeCategory(data.CategoryId)) {
    return riskGroups.taxFree;
  }
  return null;
}
