import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./axios-get-with-backoff.function', () => ({
  axiosGetWithBackoff: vi.fn(),
}));

import { axiosGetWithBackoff } from './axios-get-with-backoff.function';
import {
  RiskGroupMap,
  classifySymbolRiskGroupId,
  lookupCefConnectSymbol,
} from './cef-classification.function';
import { ScreeningData } from '../screener/screening-data.interface';

const mockAxiosGetWithBackoff = vi.mocked(axiosGetWithBackoff);

function makeScreeningData(
  overrides: Partial<ScreeningData> = {}
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
      'Network failure'
    );
  });
});

describe('classifySymbolRiskGroupId', () => {
  it('returns equities risk_group_id when CategoryId is <= 10', () => {
    const data = makeScreeningData({ CategoryId: 5 });

    const result = classifySymbolRiskGroupId(data, RISK_GROUPS);

    expect(result).toBe('equities-id');
  });

  it('returns equities risk_group_id when CategoryId is 25', () => {
    const data = makeScreeningData({ CategoryId: 25 });

    const result = classifySymbolRiskGroupId(data, RISK_GROUPS);

    expect(result).toBe('equities-id');
  });

  it('returns equities risk_group_id when CategoryId is 26', () => {
    const data = makeScreeningData({ CategoryId: 26 });

    const result = classifySymbolRiskGroupId(data, RISK_GROUPS);

    expect(result).toBe('equities-id');
  });

  it('returns income risk_group_id when CategoryId is in 11-20 range', () => {
    const data = makeScreeningData({ CategoryId: 15 });

    const result = classifySymbolRiskGroupId(data, RISK_GROUPS);

    expect(result).toBe('income-id');
  });

  it('returns taxFree risk_group_id when CategoryId is in 21-24 range', () => {
    const data = makeScreeningData({ CategoryId: 22 });

    const result = classifySymbolRiskGroupId(data, RISK_GROUPS);

    expect(result).toBe('tax-free-id');
  });

  it('returns null when CategoryId is out of all known ranges', () => {
    const data = makeScreeningData({ CategoryId: 27 });

    const result = classifySymbolRiskGroupId(data, RISK_GROUPS);

    expect(result).toBeNull();
  });
});
