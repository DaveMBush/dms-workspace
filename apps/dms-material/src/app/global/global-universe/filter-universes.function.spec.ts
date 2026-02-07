import { describe, it, expect } from 'vitest';
import { filterUniverses } from './filter-universes.function';
import { Universe } from '../../store/universe/universe.interface';

// TDD GREEN Phase - Story AN.8
// Tests enabled and passing with implementation
// Tests were written in Story AN.7 (RED phase)

describe('filterUniverses - Symbol Filter', () => {
  const testData: Universe[] = [
    {
      id: '1',
      symbol: 'AAPL',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.5,
      distributions_per_year: 4,
      last_price: 100,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '2',
      symbol: 'MSFT',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.6,
      distributions_per_year: 4,
      last_price: 150,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '3',
      symbol: 'apple',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.4,
      distributions_per_year: 4,
      last_price: 80,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
  ];

  it('should return all rows when symbol filter is empty', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(3);
  });

  it('should filter by exact symbol match (case insensitive)', () => {
    const result = filterUniverses(testData, {
      symbolFilter: 'app',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(1); // Should match only 'apple' ('AAPL' does not contain 'app')
    expect(result[0].symbol).toBe('apple');
  });

  it('should filter by partial symbol match', () => {
    const result = filterUniverses(testData, {
      symbolFilter: 'MS',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('MSFT');
  });

  it('should filter with case insensitive search', () => {
    const result = filterUniverses(testData, {
      symbolFilter: 'APPLE',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(1);
  });

  it('should return empty array when no symbol matches', () => {
    const result = filterUniverses(testData, {
      symbolFilter: 'TSLA',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(0);
  });

  it('should handle special characters in symbol filter', () => {
    const specialData: Universe[] = [
      {
        id: '1',
        symbol: 'BRK.B',
        risk_group_id: 'equity',
        expired: false,
        distribution: 0.0,
        distributions_per_year: 0,
        last_price: 300,
        position: 0,
        is_closed_end_fund: false,
      } as Universe,
    ];
    const result = filterUniverses(specialData, {
      symbolFilter: 'BRK.',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('BRK.B');
  });
});

describe('filterUniverses - Risk Group Filter', () => {
  const testData: Universe[] = [
    {
      id: '1',
      symbol: 'AAPL',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.5,
      distributions_per_year: 4,
      last_price: 100,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '2',
      symbol: 'TLT',
      risk_group_id: 'bond',
      expired: false,
      distribution: 1.0,
      distributions_per_year: 12,
      last_price: 120,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '3',
      symbol: 'VNQ',
      risk_group_id: 'reit',
      expired: false,
      distribution: 0.8,
      distributions_per_year: 4,
      last_price: 90,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '4',
      symbol: 'MSFT',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.6,
      distributions_per_year: 4,
      last_price: 150,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
  ];

  it('should return all rows when risk group filter is null', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(4);
  });

  it('should filter by equity risk group', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: 'equity',
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(2);
    expect(result[0].risk_group_id).toBe('equity');
    expect(result[1].risk_group_id).toBe('equity');
  });

  it('should filter by bond risk group', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: 'bond',
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('TLT');
  });

  it('should filter by reit risk group', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: 'reit',
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('VNQ');
  });

  it('should return empty array when no risk group matches', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: 'commodity',
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(0);
  });
});

describe('filterUniverses - Combined Filters', () => {
  const testData: Universe[] = [
    {
      id: '1',
      symbol: 'AAPL',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.5,
      distributions_per_year: 4,
      last_price: 100,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '2',
      symbol: 'APPL', // Typo version
      risk_group_id: 'bond',
      expired: false,
      distribution: 1.0,
      distributions_per_year: 12,
      last_price: 120,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '3',
      symbol: 'MSFT',
      risk_group_id: 'equity',
      expired: true,
      distribution: 0.6,
      distributions_per_year: 4,
      last_price: 150,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '4',
      symbol: 'APP',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.3,
      distributions_per_year: 4,
      last_price: 50,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
  ];

  it('should apply symbol and risk group filters together', () => {
    const result = filterUniverses(testData, {
      symbolFilter: 'APP',
      riskGroupFilter: 'equity',
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(1); // Only APP matches ('AAPL' does not contain 'APP')
    expect(result[0].symbol).toBe('APP');
  });

  it('should apply symbol, risk group, and expired filters together', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: 'equity',
      expiredFilter: false,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(2); // AAPL and APP, not MSFT (expired)
  });

  it('should apply all four filters together', () => {
    const result = filterUniverses(testData, {
      symbolFilter: 'A',
      riskGroupFilter: 'equity',
      expiredFilter: false,
      minYieldFilter: 2.0,
    });
    expect(result).toHaveLength(2); // AAPL (2%) and APP (2.4%) both have yield >= 2%
    const symbols = result.map(function getSymbol(r) {
      return r.symbol;
    });
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('APP');
  });

  it('should return empty when combined filters match nothing', () => {
    const result = filterUniverses(testData, {
      symbolFilter: 'TSLA',
      riskGroupFilter: 'equity',
      expiredFilter: false,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(0);
  });
});

describe('filterUniverses - Expired Filter', () => {
  const testData: Universe[] = [
    {
      id: '1',
      symbol: 'AAPL',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.5,
      distributions_per_year: 4,
      last_price: 100,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '2',
      symbol: 'MSFT',
      risk_group_id: 'equity',
      expired: true,
      distribution: 0.6,
      distributions_per_year: 4,
      last_price: 150,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
    {
      id: '3',
      symbol: 'GOOGL',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.0,
      distributions_per_year: 0,
      last_price: 120,
      position: 0,
      is_closed_end_fund: false,
    } as Universe,
  ];

  it('should return all rows when expired filter is null', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(3);
  });

  it('should filter to show only non-expired rows', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: false,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(2);
    expect(result[0].expired).toBe(false);
    expect(result[1].expired).toBe(false);
  });

  it('should filter to show only expired rows', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: true,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('MSFT');
    expect(result[0].expired).toBe(true);
  });
});

describe('filterUniverses - Min Yield Filter', () => {
  const testData: Universe[] = [
    {
      id: '1',
      symbol: 'AAPL',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.5,
      distributions_per_year: 4,
      last_price: 100,
      position: 0,
      is_closed_end_fund: false,
    } as Universe, // Yield: (0.5 * 4 * 100) / 100 = 2%
    {
      id: '2',
      symbol: 'TLT',
      risk_group_id: 'bond',
      expired: false,
      distribution: 1.5,
      distributions_per_year: 12,
      last_price: 120,
      position: 0,
      is_closed_end_fund: false,
    } as Universe, // Yield: (1.5 * 12 * 100) / 120 = 15%
    {
      id: '3',
      symbol: 'VNQ',
      risk_group_id: 'reit',
      expired: false,
      distribution: 0.8,
      distributions_per_year: 4,
      last_price: 80,
      position: 0,
      is_closed_end_fund: false,
    } as Universe, // Yield: (0.8 * 4 * 100) / 80 = 4%
    {
      id: '4',
      symbol: 'GOOGL',
      risk_group_id: 'equity',
      expired: false,
      distribution: 0.0,
      distributions_per_year: 0,
      last_price: 120,
      position: 0,
      is_closed_end_fund: false,
    } as Universe, // Yield: 0%
  ];

  it('should return all rows when min yield filter is null', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(4);
  });

  it('should filter by minimum yield of 3%', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: 3,
    });
    expect(result).toHaveLength(2); // TLT (15%) and VNQ (4%)
    const symbols = result.map(function getSymbol(r) {
      return r.symbol;
    });
    expect(symbols).toContain('TLT');
    expect(symbols).toContain('VNQ');
  });

  it('should filter by minimum yield of 5%', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: 5,
    });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('TLT');
  });

  it('should exclude zero yield when min yield filter is greater than 0', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: 0.1,
    });
    expect(result).toHaveLength(3);
    const symbols = result.map(function getSymbol(r) {
      return r.symbol;
    });
    expect(symbols).not.toContain('GOOGL');
  });

  it('should handle zero minimum yield filter', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: 0,
    });
    expect(result).toHaveLength(4); // All rows including 0% yield
  });

  it('should handle high minimum yield that matches nothing', () => {
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: 20,
    });
    expect(result).toHaveLength(0);
  });
});

describe('filterUniverses - Edge Cases', () => {
  it('should handle empty data array', () => {
    const result = filterUniverses([], {
      symbolFilter: 'AAPL',
      riskGroupFilter: 'equity',
      expiredFilter: false,
      minYieldFilter: 2,
    });
    expect(result).toHaveLength(0);
  });

  it('should handle null last_price in yield calculation', () => {
    const testData: Universe[] = [
      {
        id: '1',
        symbol: 'AAPL',
        risk_group_id: 'equity',
        expired: false,
        distribution: 0.5,
        distributions_per_year: 4,
        last_price: null,
        position: 0,
        is_closed_end_fund: false,
      } as unknown as Universe,
    ];
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: 0.1,
    });
    expect(result).toHaveLength(0); // Yield is 0, should be filtered out
  });

  it('should handle zero last_price in yield calculation', () => {
    const testData: Universe[] = [
      {
        id: '1',
        symbol: 'AAPL',
        risk_group_id: 'equity',
        expired: false,
        distribution: 0.5,
        distributions_per_year: 4,
        last_price: 0,
        position: 0,
        is_closed_end_fund: false,
      } as Universe,
    ];
    const result = filterUniverses(testData, {
      symbolFilter: '',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: 0.1,
    });
    expect(result).toHaveLength(0); // Yield is 0, should be filtered out
  });

  it('should handle whitespace in symbol filter', () => {
    const testData: Universe[] = [
      {
        id: '1',
        symbol: 'AAPL',
        risk_group_id: 'equity',
        expired: false,
        distribution: 0.5,
        distributions_per_year: 4,
        last_price: 100,
        position: 0,
        is_closed_end_fund: false,
      } as Universe,
    ];
    const result = filterUniverses(testData, {
      symbolFilter: '  AAPL  ',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    // Note: Current implementation doesn't trim, so this tests actual behavior
    expect(result).toHaveLength(0);
  });

  it('should be case-insensitive for all symbols', () => {
    const testData: Universe[] = [
      {
        id: '1',
        symbol: 'aapl',
        risk_group_id: 'equity',
        expired: false,
        distribution: 0.5,
        distributions_per_year: 4,
        last_price: 100,
        position: 0,
        is_closed_end_fund: false,
      } as Universe,
      {
        id: '2',
        symbol: 'AAPL',
        risk_group_id: 'equity',
        expired: false,
        distribution: 0.5,
        distributions_per_year: 4,
        last_price: 100,
        position: 0,
        is_closed_end_fund: false,
      } as Universe,
    ];
    const result = filterUniverses(testData, {
      symbolFilter: 'AAPL',
      riskGroupFilter: null,
      expiredFilter: null,
      minYieldFilter: null,
    });
    expect(result).toHaveLength(2);
  });
});
