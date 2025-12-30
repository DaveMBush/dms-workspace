import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getLastPrice } from './get-last-price.function';

// Hoisted mocks
const { mockQuote, mockSleep } = vi.hoisted(() => ({
  mockQuote: vi.fn(),
  mockSleep: vi.fn(async () => Promise.resolve()),
}));

vi.mock('../yahoo-finance.instance', () => ({
  yahooFinance: {
    quote: mockQuote,
  },
}));

vi.mock('./sleep.function', () => ({
  sleep: mockSleep,
}));

describe('getLastPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns regular market price for valid symbol', async () => {
    mockQuote.mockResolvedValueOnce({
      regularMarketPrice: 25.5,
    });

    const result = await getLastPrice('AAPL');

    expect(result).toBe(25.5);
    expect(mockQuote).toHaveBeenCalledWith('AAPL');
  });

  test('returns undefined for invalid symbol after max retries', async () => {
    mockQuote.mockRejectedValue(new Error('Symbol not found'));

    const result = await getLastPrice('INVALID');

    expect(result).toBeUndefined();
    expect(mockQuote).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  test('retries on failure with exponential backoff', async () => {
    mockQuote
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ regularMarketPrice: 100.25 });

    const result = await getLastPrice('RETRY');

    expect(result).toBe(100.25);
    expect(mockQuote).toHaveBeenCalledTimes(3);
    expect(mockSleep).toHaveBeenCalledTimes(2);
    expect(mockSleep).toHaveBeenCalledWith(1000);
  });

  test('stops retrying after 3 attempts', async () => {
    mockQuote.mockRejectedValue(new Error('Persistent error'));

    const result = await getLastPrice('FAIL');

    expect(result).toBeUndefined();
    expect(mockQuote).toHaveBeenCalledTimes(4);
    expect(mockSleep).toHaveBeenCalledTimes(3);
  });

  test('handles successful first attempt without retry', async () => {
    mockQuote.mockResolvedValueOnce({
      regularMarketPrice: 50.75,
    });

    const result = await getLastPrice('SUCCESS');

    expect(result).toBe(50.75);
    expect(mockQuote).toHaveBeenCalledTimes(1);
    expect(mockSleep).not.toHaveBeenCalled();
  });

  test('handles quote response without regularMarketPrice', async () => {
    mockQuote.mockResolvedValueOnce({
      symbol: 'TEST',
      // Missing regularMarketPrice
    });

    const result = await getLastPrice('NO_PRICE');

    expect(result).toBeUndefined();
  });

  test('respects retry count parameter', async () => {
    mockQuote.mockRejectedValue(new Error('Error'));

    const result = await getLastPrice('TEST', 2);

    expect(result).toBeUndefined();
    expect(mockQuote).toHaveBeenCalledTimes(2); // Initial call at retryCount=2, then retry at retryCount=3
    expect(mockSleep).toHaveBeenCalledTimes(2); // Sleep called at retryCount=2 and retryCount=3
  });
});
