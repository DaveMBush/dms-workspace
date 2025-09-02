import { signal } from '@angular/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createSortComputedSignals } from './sort-computed-signals.function';

const { mockGetSortIcon } = vi.hoisted(() => ({
  mockGetSortIcon: vi.fn(),
}));

vi.mock('./get-sort-icon.function', () => ({
  getSortIcon: mockGetSortIcon,
}));

describe('createSortComputedSignals', () => {
  let mockSortCriteria: ReturnType<
    typeof signal<Array<{ field: string; order: number }>>
  >;
  let mockGetSortOrder: (field: string) => number | null;

  const AVG_PURCHASE_YIELD_FIELD = 'avg_purchase_yield_percent';
  const YIELD_PERCENT_FIELD = 'yield_percent';
  const PI_SORT_ICON = 'pi-sort';
  const PI_SORT_UP_ICON = 'pi-sort-up';
  const PI_SORT_DOWN_ICON = 'pi-sort-down';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSortCriteria = signal([]);
    mockGetSortOrder = vi.fn();
    mockGetSortIcon.mockReturnValue(PI_SORT_ICON);
  });

  describe('avgPurchaseYieldSortIcon$ signal', () => {
    test('creates avgPurchaseYieldSortIcon$ signal with correct field', () => {
      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );

      // Trigger the computed signal
      sortSignals.avgPurchaseYieldSortIcon$();

      expect(mockGetSortIcon).toHaveBeenCalledWith(
        AVG_PURCHASE_YIELD_FIELD,
        mockSortCriteria
      );
    });

    test('returns icon value from getSortIcon function', () => {
      const mockIconValue = PI_SORT_UP_ICON;
      mockGetSortIcon.mockReturnValue(mockIconValue);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );
      const iconResult = sortSignals.avgPurchaseYieldSortIcon$();

      expect(iconResult).toBe(mockIconValue);
    });

    test('correctly calls getSortIcon with field and sortCriteria signal', () => {
      const anotherMockIconValue = PI_SORT_UP_ICON;
      mockGetSortIcon.mockReturnValue(anotherMockIconValue);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );

      // Call the signal function
      const result = sortSignals.avgPurchaseYieldSortIcon$();

      // Verify it calls getSortIcon with the correct field and signal
      expect(mockGetSortIcon).toHaveBeenCalledWith(
        AVG_PURCHASE_YIELD_FIELD,
        mockSortCriteria
      );
      expect(result).toBe(anotherMockIconValue);
    });
  });

  describe('avgPurchaseYieldSortOrder$ signal', () => {
    test('creates avgPurchaseYieldSortOrder$ signal with correct field', () => {
      const mockGetSortOrderFn = vi.fn().mockReturnValue(1);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrderFn
      );

      // Trigger the computed signal
      sortSignals.avgPurchaseYieldSortOrder$();

      expect(mockGetSortOrderFn).toHaveBeenCalledWith(AVG_PURCHASE_YIELD_FIELD);
    });

    test('returns sort order value from getSortOrder function', () => {
      const mockGetSortOrderFn = vi.fn().mockReturnValue(-1);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrderFn
      );
      const orderResult = sortSignals.avgPurchaseYieldSortOrder$();

      expect(orderResult).toBe(-1);
    });

    test('handles null sort order values', () => {
      const mockGetSortOrderFn = vi.fn().mockReturnValue(null);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrderFn
      );
      const orderResult = sortSignals.avgPurchaseYieldSortOrder$();

      expect(orderResult).toBeNull();
    });

    test('handles ascending sort order', () => {
      const mockGetSortOrderFn = vi.fn().mockReturnValue(1);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrderFn
      );
      const orderResult = sortSignals.avgPurchaseYieldSortOrder$();

      expect(orderResult).toBe(1);
    });

    test('handles descending sort order', () => {
      const mockGetSortOrderFn = vi.fn().mockReturnValue(-1);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrderFn
      );
      const orderResult = sortSignals.avgPurchaseYieldSortOrder$();

      expect(orderResult).toBe(-1);
    });
  });

  describe('multi-column sorting scenarios', () => {
    test('handles both yield columns in sort criteria', () => {
      const mockGetSortOrderFn = vi.fn().mockImplementation((field: string) => {
        switch (field) {
          case YIELD_PERCENT_FIELD:
            return 1;
          case AVG_PURCHASE_YIELD_FIELD:
            return -1;
          default:
            return null;
        }
      });

      mockSortCriteria.set([
        { field: YIELD_PERCENT_FIELD, order: 1 },
        { field: AVG_PURCHASE_YIELD_FIELD, order: -1 },
      ]);

      // Set up different icons for different fields
      mockGetSortIcon.mockImplementation((field: string) => {
        switch (field) {
          case YIELD_PERCENT_FIELD:
            return PI_SORT_UP_ICON;
          case AVG_PURCHASE_YIELD_FIELD:
            return PI_SORT_DOWN_ICON;
          default:
            return PI_SORT_ICON;
        }
      });

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrderFn
      );

      // Test yield_percent
      expect(sortSignals.yieldPercentSortIcon$()).toBe(PI_SORT_UP_ICON);
      expect(sortSignals.yieldPercentSortOrder$()).toBe(1);

      // Test avg_purchase_yield_percent
      expect(sortSignals.avgPurchaseYieldSortIcon$()).toBe('pi-sort-down');
      expect(sortSignals.avgPurchaseYieldSortOrder$()).toBe(-1);
    });

    test('handles mixed sorting with other columns', () => {
      const mockGetSortOrderFn = vi.fn().mockImplementation((field: string) => {
        switch (field) {
          case 'avg_purchase_yield_percent':
            return 1;
          case 'symbol':
            return -1;
          case 'ex_date':
            return null;
          default:
            return null;
        }
      });

      mockSortCriteria.set([
        { field: 'avg_purchase_yield_percent', order: 1 },
        { field: 'symbol', order: -1 },
      ]);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrderFn
      );

      expect(sortSignals.avgPurchaseYieldSortOrder$()).toBe(1);
      expect(sortSignals.exDateSortOrder$()).toBeNull();
    });
  });

  describe('integration with existing sort signals', () => {
    test('includes all required sort icon signals', () => {
      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );

      expect(sortSignals.yieldPercentSortIcon$).toBeDefined();
      expect(sortSignals.avgPurchaseYieldSortIcon$).toBeDefined();
      expect(sortSignals.exDateSortIcon$).toBeDefined();
      expect(sortSignals.mostRecentSellDateSortIcon$).toBeDefined();
      expect(sortSignals.mostRecentSellPriceSortIcon$).toBeDefined();
    });

    test('includes all required sort order signals', () => {
      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );

      expect(sortSignals.yieldPercentSortOrder$).toBeDefined();
      expect(sortSignals.avgPurchaseYieldSortOrder$).toBeDefined();
      expect(sortSignals.exDateSortOrder$).toBeDefined();
      expect(sortSignals.mostRecentSellDateSortOrder$).toBeDefined();
      expect(sortSignals.mostRecentSellPriceSortOrder$).toBeDefined();
    });

    test('maintains existing yield_percent functionality', () => {
      mockGetSortIcon.mockReturnValue(PI_SORT_UP_ICON);
      const mockGetSortOrderFn = vi.fn().mockReturnValue(1);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrderFn
      );

      // Test existing yield_percent signals still work
      sortSignals.yieldPercentSortIcon$();
      sortSignals.yieldPercentSortOrder$();

      expect(mockGetSortIcon).toHaveBeenCalledWith(
        'yield_percent',
        mockSortCriteria
      );
      expect(mockGetSortOrderFn).toHaveBeenCalledWith('yield_percent');
    });
  });

  describe('sort icon display logic', () => {
    test('displays correct sort icon for ascending avg purchase yield', () => {
      const avgPurchaseYieldField = 'avg_purchase_yield_percent';
      mockSortCriteria.set([{ field: avgPurchaseYieldField, order: 1 }]);

      // Mock should return the ascending icon for this field
      const mockUpIcon = PI_SORT_UP_ICON;
      mockGetSortIcon.mockReturnValue(mockUpIcon);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );
      const iconResult = sortSignals.avgPurchaseYieldSortIcon$();

      expect(iconResult).toBe(mockUpIcon);
    });

    test('displays correct sort icon for descending avg purchase yield', () => {
      mockGetSortIcon.mockReturnValue(PI_SORT_DOWN_ICON);

      mockSortCriteria.set([
        { field: 'avg_purchase_yield_percent', order: -1 },
      ]);

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );
      const iconResult = sortSignals.avgPurchaseYieldSortIcon$();

      expect(iconResult).toBe(PI_SORT_DOWN_ICON);
    });

    test('displays default sort icon when field is not sorted', () => {
      mockGetSortIcon.mockReturnValue('pi-sort');

      mockSortCriteria.set([{ field: 'symbol', order: 1 }]); // Different field

      const sortSignals = createSortComputedSignals(
        mockSortCriteria,
        mockGetSortOrder
      );
      const iconResult = sortSignals.avgPurchaseYieldSortIcon$();

      expect(iconResult).toBe(PI_SORT_ICON);
    });
  });
});
