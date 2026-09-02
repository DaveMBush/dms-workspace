import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreeningData } from '../screener/screening-data.interface';
import { axiosGetWithBackoff } from './axios-get-with-backoff.function';
import {
  classifySymbolRiskGroupId,
  lookupCefConnectSymbol,
  RiskGroupMap,
} from './cef-classification.function';

vi.mock('./axios-get-with-backoff.function', () => ({
  axiosGetWithBackoff: vi.fn(),
}));

const mockAxiosGetWithBackoff = vi.mocked(axiosGetWithBackoff);

function makeScreeningData(
  overrides: Partial<ScreeningData> = {},
): ScreeningData {
  return {
    CategoryId: 1,
    Ticker: 'TEST',
    AvgDailyVolume: 1000,
    CurrentDistribution: 0.1,
    DistributionFrequency: 'Monthly',
    InceptionDate: '2010-01-01',
    Price: 10,
    Strategy: 'Equity',
    ...overrides,
  };
}

const RISK_GROUPS: RiskGroupMap = {
  equities: 'equities-id',
  income: 'income-id',
  taxFree: 'tax-free-id',
};

describe('lookupCefConnectSymbol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ScreeningData when symbol is found in API response', async () => {
    const entry = makeScreeningData({ Ticker: 'PDI' });
    mockAxiosGetWithBackoff.mockResolvedValueOnce({
      data: [entry],
    } as unknown as Awaited<ReturnType<typeof axiosGetWithBackoff>>);

    const result = await lookupCefConnectSymbol('PDI');

    expect(result).toEqual(entry);
  });

  it('uppercases and trims the symbol when searching', async () => {
    const entry = makeScreeningData({ Ticker: 'PDI' });
    mockAxiosGetWithBackoff.mockResolvedValueOnce({
      data: [entry],
    } as unknown as Awaited<ReturnType<typeof axiosGetWithBackoff>>);

    const result = await lookupCefConnectSymbol('pdi');

    expect(result).toEqual(entry);
  });

  it('returns null when symbol is not in API response', async () => {
    const entry = makeScreeningData({ Ticker: 'PDI' });
    mockAxiosGetWithBackoff.mockResolvedValueOnce({
      data: [entry],
    } as unknown as Awaited<ReturnType<typeof axiosGetWithBackoff>>);

    const result = await lookupCefConnectSymbol('NOTFOUND');

    expect(result).toBeNull();
  });

  it('propagates error when axiosGetWithBackoff throws', async () => {
    mockAxiosGetWithBackoff.mockRejectedValueOnce(new Error('Network failure'));

    await expect(lookupCefConnectSymbol('PDI')).rejects.toThrow(
      'Network failure',
    );
  });

  it('returns null immediately for empty string without calling API', async () => {
    const result = await lookupCefConnectSymbol('');

    expect(result).toBeNull();
    expect(mockAxiosGetWithBackoff).not.toHaveBeenCalled();
  });

  it('returns null immediately for whitespace-only string without calling API', async () => {
    const result = await lookupCefConnectSymbol('   ');

    expect(result).toBeNull();
    expect(mockAxiosGetWithBackoff).not.toHaveBeenCalled();
  });
});

describe('classifySymbolRiskGroupId', () => {
  it.each([
    [5, 'equities-id'],
    [25, 'equities-id'],
    [26, 'equities-id'],
    [15, 'income-id'],
    [22, 'tax-free-id'],
  ])('classifies CategoryId %i as %s', (categoryId, expected) => {
    const data = makeScreeningData({ CategoryId: categoryId });

    const result = classifySymbolRiskGroupId(data, RISK_GROUPS);

    expect(result).toBe(expected);
  });

  it('returns null when CategoryId is out of all known ranges', () => {
    const data = makeScreeningData({ CategoryId: 27 });

    const result = classifySymbolRiskGroupId(data, RISK_GROUPS);

    expect(result).toBeNull();
  });
});
