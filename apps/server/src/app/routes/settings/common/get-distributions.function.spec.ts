import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getDistributions } from './get-distributions.function';

// Hoisted mocks
const { mockAxiosGetWithBackoff, mockSleep } = vi.hoisted(() => ({
  mockAxiosGetWithBackoff: vi.fn(),
  mockSleep: vi.fn(async () => Promise.resolve()),
}));

vi.mock('../../common/axios-get-with-backoff.function', () => ({
  axiosGetWithBackoff: mockAxiosGetWithBackoff,
}));

vi.mock('./sleep.function', () => ({
  sleep: mockSleep,
}));

describe('getDistributions', () => {
  const TEST_DATE_2025_09_15 = '2025-09-15';
  const TEST_DATE_2025_06_15 = '2025-06-15';
  const TEST_DATE_2025_03_15 = '2025-03-15';
  const TEST_DATE_2024_12_15 = '2024-12-15';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-08-21T10:00:00Z'));
  });

  afterEach(() => {
    try {
      vi.useRealTimers();
    } catch {
      // Ignore errors when restoring timers
    }
  });

  test('returns distribution data for valid response', async () => {
    const mockData = {
      Data: [
        { TotDiv: 0.5, ExDivDateDisplay: TEST_DATE_2025_09_15 },
        { TotDiv: 0.45, ExDivDateDisplay: TEST_DATE_2025_06_15 },
        { TotDiv: 0.48, ExDivDateDisplay: TEST_DATE_2025_03_15 },
        { TotDiv: 0.52, ExDivDateDisplay: TEST_DATE_2024_12_15 },
      ],
    };

    mockAxiosGetWithBackoff.mockResolvedValueOnce({ data: mockData });

    const result = await getDistributions('TEST');

    expect(result).toEqual({
      distribution: 0.5,
      ex_date: new Date('2025-09-15'),
      distributions_per_year: 4,
    });
  });

  test('returns undefined for empty response', async () => {
    mockAxiosGetWithBackoff.mockResolvedValueOnce({ data: { Data: [] } });

    const result = await getDistributions('EMPTY');

    expect(result).toBeUndefined();
  });

  test('returns default values on API error', async () => {
    mockAxiosGetWithBackoff.mockRejectedValueOnce(new Error('API error'));

    const result = await getDistributions('ERROR');

    expect(result).toEqual({
      distribution: 0,
      ex_date: new Date('2025-08-21T10:00:00Z'),
      distributions_per_year: 0,
    });
  });

  test('calculates distributions per year correctly for quarterly pattern', async () => {
    const mockData = {
      Data: [
        { TotDiv: 0.5, ExDivDateDisplay: '2025-06-15' },
        { TotDiv: 0.5, ExDivDateDisplay: '2025-03-15' },
        { TotDiv: 0.5, ExDivDateDisplay: '2024-12-15' },
        { TotDiv: 0.5, ExDivDateDisplay: '2024-09-15' },
      ],
    };

    mockAxiosGetWithBackoff.mockResolvedValueOnce({ data: mockData });

    const result = await getDistributions('QUARTERLY');

    expect(result?.distributions_per_year).toBe(4);
  });

  test('calculates distributions per year correctly for monthly pattern', async () => {
    const mockData = {
      Data: [
        { TotDiv: 0.1, ExDivDateDisplay: '2025-08-15' },
        { TotDiv: 0.1, ExDivDateDisplay: '2025-07-15' },
        { TotDiv: 0.1, ExDivDateDisplay: '2025-06-15' },
        { TotDiv: 0.1, ExDivDateDisplay: '2025-05-15' },
      ],
    };

    mockAxiosGetWithBackoff.mockResolvedValueOnce({ data: mockData });

    const result = await getDistributions('MONTHLY');

    expect(result?.distributions_per_year).toBe(12);
  });

  test('calculates distributions per year correctly for annual pattern', async () => {
    const mockData = {
      Data: [
        { TotDiv: 2.0, ExDivDateDisplay: '2024-12-15' },
        { TotDiv: 1.95, ExDivDateDisplay: '2023-12-15' },
      ],
    };

    mockAxiosGetWithBackoff.mockResolvedValueOnce({ data: mockData });

    const result = await getDistributions('ANNUAL');

    expect(result?.distributions_per_year).toBe(1);
  });

  test('finds next distribution when available', async () => {
    const mockData = {
      Data: [
        { TotDiv: 0.6, ExDivDateDisplay: '2025-09-15' }, // Future
        { TotDiv: 0.5, ExDivDateDisplay: '2025-06-15' }, // Past
      ],
    };

    mockAxiosGetWithBackoff.mockResolvedValueOnce({ data: mockData });

    const result = await getDistributions('FUTURE');

    expect(result?.distribution).toBe(0.6);
    expect(result?.ex_date).toEqual(new Date('2025-09-15'));
  });

  test('falls back to most recent past distribution when no future available', async () => {
    const mockData = {
      Data: [
        { TotDiv: 0.5, ExDivDateDisplay: '2025-06-15' }, // Past
        { TotDiv: 0.45, ExDivDateDisplay: '2025-03-15' }, // Past
      ],
    };

    mockAxiosGetWithBackoff.mockResolvedValueOnce({ data: mockData });

    const result = await getDistributions('PAST');

    expect(result?.distribution).toBe(0.5);
    expect(result?.ex_date).toEqual(new Date('2025-06-15'));
  });

  test('filters out invalid dates', async () => {
    const mockData = {
      Data: [
        { TotDiv: 0.5, ExDivDateDisplay: 'invalid-date' },
        { TotDiv: 0.6, ExDivDateDisplay: '2025-09-15' },
      ],
    };

    mockAxiosGetWithBackoff.mockResolvedValueOnce({ data: mockData });

    const result = await getDistributions('INVALID');

    expect(result?.distribution).toBe(0.6);
    expect(result?.ex_date).toEqual(new Date('2025-09-15'));
  });

  test('handles single distribution correctly', async () => {
    const mockData = {
      Data: [{ TotDiv: 1.0, ExDivDateDisplay: '2025-12-15' }],
    };

    mockAxiosGetWithBackoff.mockResolvedValueOnce({ data: mockData });

    const result = await getDistributions('SINGLE');

    expect(result).toEqual({
      distribution: 1.0,
      ex_date: new Date('2025-12-15'),
      distributions_per_year: 1,
    });
  });

  test('enforces rate limiting between requests', async () => {
    mockAxiosGetWithBackoff.mockResolvedValue({ data: { Data: [] } });

    // Clear any previous state by advancing time
    vi.advanceTimersByTime(61000);

    // First call
    await getDistributions('SYMBOL1');
    const sleepCallsAfterFirst = mockSleep.mock.calls.length;

    // Second call immediately after (should trigger rate limit)
    await getDistributions('SYMBOL2');
    const sleepCallsAfterSecond = mockSleep.mock.calls.length;

    expect(sleepCallsAfterSecond).toBeGreaterThan(sleepCallsAfterFirst);
  });
});