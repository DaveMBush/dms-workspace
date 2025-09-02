import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GlobalUniverseStorageService } from './global-universe-storage.service';

const { mockGetLocalStorageItem, mockSetLocalStorageItem } = vi.hoisted(() => ({
  mockGetLocalStorageItem: vi.fn(),
  mockSetLocalStorageItem: vi.fn(),
}));

vi.mock('./get-local-storage-item.function', () => ({
  getLocalStorageItem: mockGetLocalStorageItem,
}));

vi.mock('./set-local-storage-item.function', () => ({
  setLocalStorageItem: mockSetLocalStorageItem,
}));

describe('GlobalUniverseStorageService', () => {
  let service: GlobalUniverseStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GlobalUniverseStorageService();
  });

  describe('expired filter default behavior', () => {
    test('loadExpiredFilter always returns null to activate expired-with-positions filtering', () => {
      // Test that regardless of what might be saved, it always returns null
      mockGetLocalStorageItem.mockReturnValue(true);
      expect(service.loadExpiredFilter()).toBeNull();

      mockGetLocalStorageItem.mockReturnValue(false);
      expect(service.loadExpiredFilter()).toBeNull();

      mockGetLocalStorageItem.mockReturnValue(null);
      expect(service.loadExpiredFilter()).toBeNull();

      // Verify getLocalStorageItem is not called since we always return null
      expect(mockGetLocalStorageItem).not.toHaveBeenCalled();
    });

    test('saveExpiredFilter still works for user explicit choices during session', () => {
      service.saveExpiredFilter(true);
      expect(mockSetLocalStorageItem).toHaveBeenCalledWith(
        'global-universe-filters-expired',
        true
      );

      service.saveExpiredFilter(false);
      expect(mockSetLocalStorageItem).toHaveBeenCalledWith(
        'global-universe-filters-expired',
        false
      );

      service.saveExpiredFilter(null);
      expect(mockSetLocalStorageItem).toHaveBeenCalledWith(
        'global-universe-filters-expired',
        null
      );
    });

    test('demonstrates default behavior workflow', () => {
      // On application startup: loadExpiredFilter returns null
      const initialExpiredFilter = service.loadExpiredFilter();
      expect(initialExpiredFilter).toBeNull();

      // User can still explicitly set filter during session
      service.saveExpiredFilter(true);
      expect(mockSetLocalStorageItem).toHaveBeenCalledWith(
        'global-universe-filters-expired',
        true
      );

      // On next application startup: still returns null (default behavior)
      const nextStartupExpiredFilter = service.loadExpiredFilter();
      expect(nextStartupExpiredFilter).toBeNull();
    });
  });

  describe('other filter methods work normally', () => {
    test('loadMinYieldFilter uses localStorage normally', () => {
      const mockYield = 5.5;
      mockGetLocalStorageItem.mockReturnValue(mockYield);

      const result = service.loadMinYieldFilter();

      expect(mockGetLocalStorageItem).toHaveBeenCalledWith(
        'global-universe-filters-minYield',
        null
      );
      expect(result).toBe(mockYield);
    });

    test('loadSymbolFilter uses localStorage normally', () => {
      const mockSymbol = 'AAPL';
      mockGetLocalStorageItem.mockReturnValue(mockSymbol);

      const result = service.loadSymbolFilter();

      expect(mockGetLocalStorageItem).toHaveBeenCalledWith(
        'global-universe-filters-symbol',
        ''
      );
      expect(result).toBe(mockSymbol);
    });

    test('loadRiskGroupFilter uses localStorage normally', () => {
      const mockRiskGroup = 'Income';
      mockGetLocalStorageItem.mockReturnValue(mockRiskGroup);

      const result = service.loadRiskGroupFilter();

      expect(mockGetLocalStorageItem).toHaveBeenCalledWith(
        'global-universe-filters-riskGroup',
        null
      );
      expect(result).toBe(mockRiskGroup);
    });
  });
});
