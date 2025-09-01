/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related screening functions */

import { ScreeningData } from './screening-data.interface';

export function isSymbolTooNew(
  inceptionDate: string,
  fiveYearsAgo: Date
): boolean {
  return new Date(inceptionDate) > fiveYearsAgo;
}

export function calculateAnnualizedYield(
  distribution: number,
  price: number,
  frequency: string
): number {
  if (frequency === 'Monthly') {
    return (12 * distribution) / price;
  }
  if (frequency === 'Quarterly') {
    return (4 * distribution) / price;
  }
  return 0;
}

export function isEquityCategory(categoryId: number): boolean {
  return categoryId <= 10 || categoryId === 25 || categoryId === 26;
}

export function isFixedIncomeCategory(categoryId: number): boolean {
  return categoryId >= 11 && categoryId <= 20;
}

export function isTaxFreeCategory(categoryId: number): boolean {
  return categoryId >= 21 && categoryId <= 24;
}

export function meetsEquityRequirements(annualizedYield: number): boolean {
  return annualizedYield >= 0.05;
}

export function meetsFixedIncomeRequirements(annualizedYield: number): boolean {
  return annualizedYield >= 0.06;
}

export function meetsTaxFreeRequirements(annualizedYield: number): boolean {
  return annualizedYield >= 0.04;
}

export function meetsDistributionRequirements(symbol: ScreeningData): boolean {
  const annualizedYield = calculateAnnualizedYield(
    symbol.CurrentDistribution,
    symbol.Price,
    symbol.DistributionFrequency
  );

  if (
    symbol.DistributionFrequency !== 'Monthly' &&
    symbol.DistributionFrequency !== 'Quarterly'
  ) {
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

export function filterQualifyingSymbols(
  data: ScreeningData[]
): ScreeningData[] {
  const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000);

  return data.filter(function filterSymbol(symbol: ScreeningData): boolean {
    if (isSymbolTooNew(symbol.InceptionDate, fiveYearsAgo)) {
      return false;
    }

    return meetsDistributionRequirements(symbol);
  });
}
