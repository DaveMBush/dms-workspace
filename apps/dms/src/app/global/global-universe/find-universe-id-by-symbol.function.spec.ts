import { describe, expect, test, vi } from 'vitest';

import { findUniverseIdBySymbol } from './find-universe-id-by-symbol.function';

// Mock the selectUniverses function
vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn(),
}));

import { selectUniverses } from '../../store/universe/selectors/select-universes.function';

describe('findUniverseIdBySymbol', () => {
  const mockSelectUniverses = vi.mocked(selectUniverses);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockUniverse = (id: string, symbol: string) => ({
    id,
    symbol,
    name: `${symbol} Company`,
    risk_group: 'Growth',
  });

  test('finds universe ID for existing symbol', () => {
    const universes = [
      createMockUniverse('universe-1', 'AAPL'),
      createMockUniverse('universe-2', 'MSFT'),
      createMockUniverse('universe-3', 'GOOGL'),
    ];

    mockSelectUniverses.mockReturnValue(universes);

    const result = findUniverseIdBySymbol('MSFT');

    expect(result).toBe('universe-2');
    expect(mockSelectUniverses).toHaveBeenCalledOnce();
  });

  test('returns undefined for non-existing symbol', () => {
    const universes = [
      createMockUniverse('universe-1', 'AAPL'),
      createMockUniverse('universe-2', 'MSFT'),
    ];

    mockSelectUniverses.mockReturnValue(universes);

    const result = findUniverseIdBySymbol('UNKNOWN');

    expect(result).toBeUndefined();
    expect(mockSelectUniverses).toHaveBeenCalledOnce();
  });

  test('returns first match when multiple universes have same symbol', () => {
    const universes = [
      createMockUniverse('universe-1', 'AAPL'),
      createMockUniverse('universe-2', 'AAPL'), // Duplicate symbol
      createMockUniverse('universe-3', 'MSFT'),
    ];

    mockSelectUniverses.mockReturnValue(universes);

    const result = findUniverseIdBySymbol('AAPL');

    expect(result).toBe('universe-1');
  });

  test('handles empty universes array', () => {
    mockSelectUniverses.mockReturnValue([]);

    const result = findUniverseIdBySymbol('AAPL');

    expect(result).toBeUndefined();
    expect(mockSelectUniverses).toHaveBeenCalledOnce();
  });

  test('handles null/undefined universes from selector', () => {
    mockSelectUniverses.mockReturnValue(null as any);

    expect(() => findUniverseIdBySymbol('AAPL')).toThrow();
  });

  test('is case-sensitive for symbol matching', () => {
    const universes = [
      createMockUniverse('universe-1', 'AAPL'),
      createMockUniverse('universe-2', 'aapl'),
    ];

    mockSelectUniverses.mockReturnValue(universes);

    const upperResult = findUniverseIdBySymbol('AAPL');
    const lowerResult = findUniverseIdBySymbol('aapl');

    expect(upperResult).toBe('universe-1');
    expect(lowerResult).toBe('universe-2');
  });

  test('handles symbols with special characters', () => {
    const universes = [
      createMockUniverse('universe-1', 'BRK.A'),
      createMockUniverse('universe-2', 'BRK-B'),
      createMockUniverse('universe-3', 'SPX500'),
    ];

    mockSelectUniverses.mockReturnValue(universes);

    expect(findUniverseIdBySymbol('BRK.A')).toBe('universe-1');
    expect(findUniverseIdBySymbol('BRK-B')).toBe('universe-2');
    expect(findUniverseIdBySymbol('SPX500')).toBe('universe-3');
  });

  test('handles large number of universes efficiently', () => {
    // Create a large array of universes
    const universes = [];
    for (let i = 0; i < 1000; i++) {
      universes.push(createMockUniverse(`universe-${i}`, `SYMBOL${i}`));
    }

    mockSelectUniverses.mockReturnValue(universes);

    const startTime = performance.now();
    const result = findUniverseIdBySymbol('SYMBOL500');
    const endTime = performance.now();

    expect(result).toBe('universe-500');
    expect(endTime - startTime).toBeLessThan(10); // Should be fast even with 1000 items
  });

  test('finds universe at the end of a large array', () => {
    const universes = [];
    for (let i = 0; i < 100; i++) {
      universes.push(createMockUniverse(`universe-${i}`, `SYMBOL${i}`));
    }

    mockSelectUniverses.mockReturnValue(universes);

    const result = findUniverseIdBySymbol('SYMBOL99');

    expect(result).toBe('universe-99');
  });
});
