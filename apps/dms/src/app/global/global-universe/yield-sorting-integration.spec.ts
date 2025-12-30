import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createSortComputedSignals } from './sort-computed-signals.function';
import { UniverseDataService } from './universe-data.service';
import type { UniverseDisplayData } from './universe-display-data.interface';

// Mock the selector functions
const { mockSelectUniverses, mockSelectAccountChildren } = vi.hoisted(() => ({
  mockSelectUniverses: vi.fn(),
  mockSelectAccountChildren: vi.fn(),
}));

vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: mockSelectUniverses,
}));

vi.mock(
  '../../store/trades/selectors/select-account-children.function',
  () => ({
    selectAccountChildren: mockSelectAccountChildren,
  })
);

/**
 * Integration tests for yield column sorting functionality
 *
 * Tests sorting behavior for both market yield and average purchase yield columns:
 * - Single column sorting (ascending/descending)
 * - Multi-column sorting combinations
 * - Sort stability and performance
 * - Account-specific sorting behavior
 */
describe('yield sorting integration tests', () => {
  let service: UniverseDataService;

  const mockUniverseData: UniverseDisplayData[] = [
    {
      symbol: 'VTI',
      riskGroup: 'ETF',
      distribution: 0.58,
      distributions_per_year: 4,
      last_price: 245.5,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: new Date('2024-03-15'),
      yield_percent: 0.945, // 100 * 4 * (0.58 / 245.5)
      avg_purchase_yield_percent: 1.026, // Better yield due to lower avg purchase price
      expired: false,
      position: 18072.5,
    },
    {
      symbol: 'SCHD',
      riskGroup: 'ETF',
      distribution: 0.74,
      distributions_per_year: 4,
      last_price: 78.25,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: new Date('2024-06-15'),
      yield_percent: 3.784, // 100 * 4 * (0.74 / 78.25)
      avg_purchase_yield_percent: 4.083, // Better yield due to lower avg purchase price
      expired: false,
      position: 7250.0,
    },
    {
      symbol: 'QQQ',
      riskGroup: 'ETF',
      distribution: 0.52,
      distributions_per_year: 4,
      last_price: 380.0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: new Date('2024-09-15'),
      yield_percent: 0.547, // 100 * 4 * (0.52 / 380.0)
      avg_purchase_yield_percent: 0.533, // Worse yield due to higher avg purchase price
      expired: false,
      position: 9750.0,
    },
    {
      symbol: 'VNQ',
      riskGroup: 'REIT',
      distribution: 0.92,
      distributions_per_year: 4,
      last_price: 89.25,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: new Date('2024-12-15'),
      yield_percent: 4.134, // 100 * 4 * (0.92 / 89.25)
      avg_purchase_yield_percent: 4.329, // Better yield due to lower avg purchase price
      expired: false,
      position: 2125.0,
    },
    {
      symbol: 'GROWTH_STOCK',
      riskGroup: 'Individual',
      distribution: 0.0,
      distributions_per_year: 0,
      last_price: 150.0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: new Date('2024-01-01'),
      yield_percent: 0.0, // No dividend
      avg_purchase_yield_percent: 0.0, // No dividend
      expired: false,
      position: 7000.0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock returns
    mockSelectUniverses.mockReturnValue([]);
    mockSelectAccountChildren.mockReturnValue({
      entities: {},
      ids: [],
    });

    service = new UniverseDataService();
  });

  describe('single column sorting - market yield', () => {
    test('sorts by yield_percent ascending correctly', () => {
      const sortCriteria = [{ field: 'yield_percent', order: 1 }];
      const sorted = [...mockUniverseData].sort((a, b) => {
        const valueA = service.getFieldValueFromDisplayData(a, 'yield_percent');
        const valueB = service.getFieldValueFromDisplayData(b, 'yield_percent');
        return (valueA as number) - (valueB as number);
      });

      // Expected order: GROWTH_STOCK (0.0), QQQ (0.547), VTI (0.945), SCHD (3.784), VNQ (4.134)
      expect(sorted[0].symbol).toBe('GROWTH_STOCK');
      expect(sorted[1].symbol).toBe('QQQ');
      expect(sorted[2].symbol).toBe('VTI');
      expect(sorted[3].symbol).toBe('SCHD');
      expect(sorted[4].symbol).toBe('VNQ');

      // Verify sort order is maintained
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].yield_percent).toBeGreaterThanOrEqual(
          sorted[i - 1].yield_percent
        );
      }
    });

    test('sorts by yield_percent descending correctly', () => {
      const sortCriteria = [{ field: 'yield_percent', order: -1 }];
      const sorted = [...mockUniverseData].sort((a, b) => {
        const valueA = service.getFieldValueFromDisplayData(a, 'yield_percent');
        const valueB = service.getFieldValueFromDisplayData(b, 'yield_percent');
        return (valueB as number) - (valueA as number);
      });

      // Expected order: VNQ (4.134), SCHD (3.784), VTI (0.945), QQQ (0.547), GROWTH_STOCK (0.0)
      expect(sorted[0].symbol).toBe('VNQ');
      expect(sorted[1].symbol).toBe('SCHD');
      expect(sorted[2].symbol).toBe('VTI');
      expect(sorted[3].symbol).toBe('QQQ');
      expect(sorted[4].symbol).toBe('GROWTH_STOCK');

      // Verify sort order is maintained
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].yield_percent).toBeLessThanOrEqual(
          sorted[i - 1].yield_percent
        );
      }
    });
  });

  describe('single column sorting - average purchase yield', () => {
    test('sorts by avg_purchase_yield_percent ascending correctly', () => {
      const sorted = [...mockUniverseData].sort((a, b) => {
        const valueA = service.getFieldValueFromDisplayData(
          a,
          'avg_purchase_yield_percent'
        );
        const valueB = service.getFieldValueFromDisplayData(
          b,
          'avg_purchase_yield_percent'
        );
        return (valueA as number) - (valueB as number);
      });

      // Expected order: GROWTH_STOCK (0.0), QQQ (0.533), VTI (1.026), SCHD (4.083), VNQ (4.329)
      expect(sorted[0].symbol).toBe('GROWTH_STOCK');
      expect(sorted[1].symbol).toBe('QQQ');
      expect(sorted[2].symbol).toBe('VTI');
      expect(sorted[3].symbol).toBe('SCHD');
      expect(sorted[4].symbol).toBe('VNQ');

      // Verify sort order is maintained
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].avg_purchase_yield_percent).toBeGreaterThanOrEqual(
          sorted[i - 1].avg_purchase_yield_percent
        );
      }
    });

    test('sorts by avg_purchase_yield_percent descending correctly', () => {
      const sorted = [...mockUniverseData].sort((a, b) => {
        const valueA = service.getFieldValueFromDisplayData(
          a,
          'avg_purchase_yield_percent'
        );
        const valueB = service.getFieldValueFromDisplayData(
          b,
          'avg_purchase_yield_percent'
        );
        return (valueB as number) - (valueA as number);
      });

      // Expected order: VNQ (4.329), SCHD (4.083), VTI (1.026), QQQ (0.533), GROWTH_STOCK (0.0)
      expect(sorted[0].symbol).toBe('VNQ');
      expect(sorted[1].symbol).toBe('SCHD');
      expect(sorted[2].symbol).toBe('VTI');
      expect(sorted[3].symbol).toBe('QQQ');
      expect(sorted[4].symbol).toBe('GROWTH_STOCK');

      // Verify sort order is maintained
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].avg_purchase_yield_percent).toBeLessThanOrEqual(
          sorted[i - 1].avg_purchase_yield_percent
        );
      }
    });
  });

  describe('multi-column sorting scenarios', () => {
    test('sorts by avg_purchase_yield_percent then by symbol as tiebreaker', () => {
      // Add duplicate yield values to test tiebreaker
      const dataWithDuplicates: UniverseDisplayData[] = [
        ...mockUniverseData,
        {
          symbol: 'VXUS', // Same yield as VTI to test tiebreaker
          riskGroup: 'ETF',
          distribution: 0.45,
          distributions_per_year: 2,
          last_price: 87.5,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-06-30'),
          yield_percent: 1.029,
          avg_purchase_yield_percent: 1.026, // Same as VTI
          expired: false,
          position: 6050.0,
        },
      ];

      const sorted = [...dataWithDuplicates].sort((a, b) => {
        const yieldA = service.getFieldValueFromDisplayData(
          a,
          'avg_purchase_yield_percent'
        );
        const yieldB = service.getFieldValueFromDisplayData(
          b,
          'avg_purchase_yield_percent'
        );

        if (yieldA !== yieldB) {
          return (yieldA as number) - (yieldB as number);
        }

        // Tiebreaker by symbol
        const symbolA = service.getFieldValueFromDisplayData(a, 'symbol');
        const symbolB = service.getFieldValueFromDisplayData(b, 'symbol');
        return (symbolA as string).localeCompare(symbolB as string);
      });

      // Find VTI and VXUS in results (both have 1.026% yield)
      const vtiIndex = sorted.findIndex((item) => item.symbol === 'VTI');
      const vxusIndex = sorted.findIndex((item) => item.symbol === 'VXUS');

      expect(vtiIndex).toBeGreaterThan(-1);
      expect(vxusIndex).toBeGreaterThan(-1);
      expect(vtiIndex).toBeLessThan(vxusIndex); // VTI should come before VXUS alphabetically

      // Both should have the same yield
      expect(sorted[vtiIndex].avg_purchase_yield_percent).toBeCloseTo(1.026, 3);
      expect(sorted[vxusIndex].avg_purchase_yield_percent).toBeCloseTo(
        1.026,
        3
      );
    });

    test('sorts by yield_percent then by avg_purchase_yield_percent', () => {
      const sorted = [...mockUniverseData].sort((a, b) => {
        const yieldA = service.getFieldValueFromDisplayData(a, 'yield_percent');
        const yieldB = service.getFieldValueFromDisplayData(b, 'yield_percent');

        if (yieldA !== yieldB) {
          return (yieldA as number) - (yieldB as number);
        }

        // Tiebreaker by avg purchase yield
        const avgYieldA = service.getFieldValueFromDisplayData(
          a,
          'avg_purchase_yield_percent'
        );
        const avgYieldB = service.getFieldValueFromDisplayData(
          b,
          'avg_purchase_yield_percent'
        );
        return (avgYieldA as number) - (avgYieldB as number);
      });

      // Verify primary sort by yield_percent
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].yield_percent).toBeGreaterThanOrEqual(
          sorted[i - 1].yield_percent
        );
      }
    });
  });

  describe('sort stability and consistency', () => {
    test('maintains stable sort across multiple operations', () => {
      // Perform sort multiple times
      const sort1 = [...mockUniverseData].sort((a, b) => {
        const valueA = service.getFieldValueFromDisplayData(
          a,
          'avg_purchase_yield_percent'
        );
        const valueB = service.getFieldValueFromDisplayData(
          b,
          'avg_purchase_yield_percent'
        );
        return (valueB as number) - (valueA as number);
      });

      const sort2 = [...mockUniverseData].sort((a, b) => {
        const valueA = service.getFieldValueFromDisplayData(
          a,
          'avg_purchase_yield_percent'
        );
        const valueB = service.getFieldValueFromDisplayData(
          b,
          'avg_purchase_yield_percent'
        );
        return (valueB as number) - (valueA as number);
      });

      // Results should be identical
      expect(sort1.length).toBe(sort2.length);
      for (let i = 0; i < sort1.length; i++) {
        expect(sort1[i].symbol).toBe(sort2[i].symbol);
        expect(sort1[i].avg_purchase_yield_percent).toBe(
          sort2[i].avg_purchase_yield_percent
        );
      }
    });

    test('handles edge cases in sorting (null, undefined, zero values)', () => {
      const edgeCaseData: UniverseDisplayData[] = [
        {
          symbol: 'NULL_YIELD',
          riskGroup: 'Test',
          distribution: 0.5,
          distributions_per_year: 4,
          last_price: 100.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-01-01'),
          yield_percent: 2.0,
          avg_purchase_yield_percent: 0, // Zero value
          expired: false,
          position: 1000.0,
        },
        {
          symbol: 'NORMAL_YIELD',
          riskGroup: 'Test',
          distribution: 0.5,
          distributions_per_year: 4,
          last_price: 100.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-01-01'),
          yield_percent: 2.0,
          avg_purchase_yield_percent: 1.5,
          expired: false,
          position: 1000.0,
        },
      ];

      const sorted = [...edgeCaseData].sort((a, b) => {
        const valueA =
          service.getFieldValueFromDisplayData(
            a,
            'avg_purchase_yield_percent'
          ) ?? 0;
        const valueB =
          service.getFieldValueFromDisplayData(
            b,
            'avg_purchase_yield_percent'
          ) ?? 0;
        return (valueA as number) - (valueB as number);
      });

      expect(sorted[0].symbol).toBe('NULL_YIELD'); // 0 comes first
      expect(sorted[1].symbol).toBe('NORMAL_YIELD'); // 1.5 comes second
    });
  });

  describe('sort performance with large datasets', () => {
    test('handles sorting of 1000+ records efficiently', () => {
      // Generate large dataset
      const largeDataset: UniverseDisplayData[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          symbol: `STOCK_${i.toString().padStart(4, '0')}`,
          riskGroup: i % 2 === 0 ? 'ETF' : 'Individual',
          distribution: Math.random() * 2,
          distributions_per_year: 4,
          last_price: 50 + Math.random() * 200,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-01-01'),
          yield_percent: Math.random() * 10,
          avg_purchase_yield_percent: Math.random() * 12, // Slightly higher range
          expired: false,
          position: Math.random() * 10000,
        })
      );

      const startTime = performance.now();

      const sorted = [...largeDataset].sort((a, b) => {
        const valueA = service.getFieldValueFromDisplayData(
          a,
          'avg_purchase_yield_percent'
        );
        const valueB = service.getFieldValueFromDisplayData(
          b,
          'avg_purchase_yield_percent'
        );
        return (valueB as number) - (valueA as number);
      });

      const endTime = performance.now();
      const sortTime = endTime - startTime;

      expect(sorted.length).toBe(1000);
      expect(sortTime).toBeLessThan(100); // Should complete in under 100ms

      // Verify sort correctness
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].avg_purchase_yield_percent).toBeLessThanOrEqual(
          sorted[i - 1].avg_purchase_yield_percent
        );
      }
    });
  });

  describe('account-specific sorting behavior', () => {
    test('maintains sort consistency when switching accounts', () => {
      // Simulate account switching by modifying avg_purchase_yield_percent
      const account1Data = mockUniverseData.map((item) => ({
        ...item,
        avg_purchase_yield_percent: item.avg_purchase_yield_percent * 0.9, // Lower yields
      }));

      const account2Data = mockUniverseData.map((item) => ({
        ...item,
        avg_purchase_yield_percent: item.avg_purchase_yield_percent * 1.1, // Higher yields
      }));

      // Sort both datasets
      const account1Sorted = [...account1Data].sort((a, b) => {
        const valueA = service.getFieldValueFromDisplayData(
          a,
          'avg_purchase_yield_percent'
        );
        const valueB = service.getFieldValueFromDisplayData(
          b,
          'avg_purchase_yield_percent'
        );
        return (valueB as number) - (valueA as number);
      });

      const account2Sorted = [...account2Data].sort((a, b) => {
        const valueA = service.getFieldValueFromDisplayData(
          a,
          'avg_purchase_yield_percent'
        );
        const valueB = service.getFieldValueFromDisplayData(
          b,
          'avg_purchase_yield_percent'
        );
        return (valueB as number) - (valueA as number);
      });

      // Should maintain relative order (same symbols in same positions)
      for (let i = 0; i < account1Sorted.length; i++) {
        expect(account1Sorted[i].symbol).toBe(account2Sorted[i].symbol);
      }

      // Account 2 should have consistently higher yields
      for (let i = 0; i < account1Sorted.length; i++) {
        if (account1Sorted[i].avg_purchase_yield_percent > 0) {
          expect(account2Sorted[i].avg_purchase_yield_percent).toBeGreaterThan(
            account1Sorted[i].avg_purchase_yield_percent
          );
        }
      }
    });
  });

  describe('sort icon and order signal functionality', () => {
    test('creates sort signals correctly for yield columns', () => {
      const mockSortCriteria = vi
        .fn()
        .mockReturnValue([{ field: 'avg_purchase_yield_percent', order: -1 }]);
      const mockGetSortOrder = vi.fn().mockImplementation((field: string) => {
        if (field === 'avg_purchase_yield_percent') {
          return -1;
        }
        if (field === 'yield_percent') {
          return null;
        }
        return null;
      });

      const signals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );

      expect(signals).toHaveProperty('avgPurchaseYieldSortIcon$');
      expect(signals).toHaveProperty('avgPurchaseYieldSortOrder$');
      expect(signals).toHaveProperty('yieldPercentSortIcon$');
      expect(signals).toHaveProperty('yieldPercentSortOrder$');

      // Verify computed values
      expect(signals.avgPurchaseYieldSortOrder$()).toBe(-1);
      expect(signals.yieldPercentSortOrder$()).toBeNull();
    });

    test('handles multiple sort criteria correctly', () => {
      const mockSortCriteria = vi.fn().mockReturnValue([
        { field: 'avg_purchase_yield_percent', order: 1 },
        { field: 'yield_percent', order: -1 },
      ]);
      const mockGetSortOrder = vi.fn().mockImplementation((field: string) => {
        if (field === 'avg_purchase_yield_percent') {
          return 1;
        }
        if (field === 'yield_percent') {
          return -1;
        }
        return null;
      });

      const signals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );

      expect(signals.avgPurchaseYieldSortOrder$()).toBe(1);
      expect(signals.yieldPercentSortOrder$()).toBe(-1);
    });
  });
});
