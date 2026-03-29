import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SortFilterStateService } from './sort-filter-state.service';

describe('SortFilterStateService', () => {
  let service: SortFilterStateService;
  let mockGetItem: ReturnType<typeof vi.fn>;
  let mockSetItem: ReturnType<typeof vi.fn>;
  let mockRemoveItem: ReturnType<typeof vi.fn>;
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage'
  );

  const STORAGE_KEY = 'dms-sort-filter-state';

  beforeEach(() => {
    mockGetItem = vi.fn();
    mockSetItem = vi.fn();
    mockRemoveItem = vi.fn();

    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: mockSetItem,
        removeItem: mockRemoveItem,
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(SortFilterStateService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(
        globalThis,
        'localStorage',
        originalLocalStorageDescriptor
      );
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  describe('saveSortState', () => {
    it('should recover from corrupted localStorage data before saving', () => {
      mockGetItem.mockReturnValue('not-valid-json{{{');

      expect(() =>
        service.saveSortState('universes', {
          field: 'name',
          order: 'asc',
        })
      ).not.toThrow();
      expect(mockSetItem).toHaveBeenCalled();
    });

    it('should save sort state to localStorage', () => {
      mockGetItem.mockReturnValue(null);

      service.saveSortState('universes', {
        field: 'name',
        order: 'asc',
      });

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"universes"')
      );
    });

    it('should store sort field and order for a table', () => {
      mockGetItem.mockReturnValue(null);

      service.saveSortState('universes', {
        field: 'name',
        order: 'asc',
      });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes.sort).toEqual({
        field: 'name',
        order: 'asc',
      });
    });

    it('should merge with existing sort states for other tables', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          'trades-open': { sort: { field: 'date', order: 'desc' } },
        })
      );

      service.saveSortState('universes', {
        field: 'name',
        order: 'asc',
      });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData['trades-open'].sort).toEqual({
        field: 'date',
        order: 'desc',
      });
      expect(savedData.universes.sort).toEqual({
        field: 'name',
        order: 'asc',
      });
    });

    it('should overwrite existing sort state for same table', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { sort: { field: 'name', order: 'asc' } },
        })
      );

      service.saveSortState('universes', {
        field: 'value',
        order: 'desc',
      });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes.sort).toEqual({
        field: 'value',
        order: 'desc',
      });
    });
  });

  describe('loadSortState', () => {
    it('should load sort state from localStorage', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { sort: { field: 'name', order: 'asc' } },
        })
      );

      const result = service.loadSortState('universes');

      expect(result).toEqual({ field: 'name', order: 'asc' });
      expect(mockGetItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('should return default state when no saved state exists', () => {
      mockGetItem.mockReturnValue(null);

      const result = service.loadSortState('universes');

      expect(result).toBeNull();
    });

    it('should return null when table has no saved state', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          'trades-open': { sort: { field: 'date', order: 'desc' } },
        })
      );

      const result = service.loadSortState('universes');

      expect(result).toBeNull();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockGetItem.mockReturnValue('not-valid-json{{{');

      const result = service.loadSortState('universes');

      expect(result).toBeNull();
    });
  });

  describe('clearSortState', () => {
    it('should handle corrupted localStorage data gracefully when clearing', () => {
      mockGetItem.mockReturnValue('not-valid-json{{{');

      expect(() => service.clearSortState('universes')).not.toThrow();
    });

    it('should clear sort state for a specific table', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { sort: { field: 'name', order: 'asc' } },
          'trades-open': { sort: { field: 'date', order: 'desc' } },
        })
      );

      service.clearSortState('universes');

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes).toBeUndefined();
      expect(savedData['trades-open'].sort).toEqual({
        field: 'date',
        order: 'desc',
      });
    });

    it('should remove storage key when last table state is cleared', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { sort: { field: 'name', order: 'asc' } },
        })
      );

      service.clearSortState('universes');

      expect(mockRemoveItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('should save state unchanged when table has no entry', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          other: { sort: { field: 'date', order: 'desc' } },
        })
      );

      service.clearSortState('nonexistent');

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.other.sort).toEqual({ field: 'date', order: 'desc' });
      expect(savedData.nonexistent).toBeUndefined();
    });

    it('should preserve filters when clearing sort from table with both', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: {
            sort: { field: 'name', order: 'asc' },
            filters: { symbol: 'AAPL' },
          },
        })
      );

      service.clearSortState('universes');

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes.filters).toEqual({ symbol: 'AAPL' });
      expect(savedData.universes.sort).toBeUndefined();
    });
  });

  describe('filter state', () => {
    it('should save filter state to localStorage', () => {
      mockGetItem.mockReturnValue(null);

      service.saveFilterState('universes', { symbol: 'AAPL' });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes.filters).toEqual({ symbol: 'AAPL' });
    });

    it('should load filter state from localStorage', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { filters: { symbol: 'AAPL' } },
        })
      );

      const result = service.loadFilterState('universes');

      expect(result).toEqual({ symbol: 'AAPL' });
    });

    it('should return null when no filter state exists', () => {
      mockGetItem.mockReturnValue(null);

      const result = service.loadFilterState('universes');

      expect(result).toBeNull();
    });

    it('should clear filter state for a specific table', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: {
            sort: { field: 'name', order: 'asc' },
            filters: { symbol: 'AAPL' },
          },
        })
      );

      service.clearFilterState('universes');

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes.sort).toEqual({
        field: 'name',
        order: 'asc',
      });
      expect(savedData.universes.filters).toBeUndefined();
    });

    it('should remove table entry when both sort and filter are cleared', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { filters: { symbol: 'AAPL' } },
        })
      );

      service.clearFilterState('universes');

      expect(mockRemoveItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('should save state unchanged when clearing filter for table with no entry', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          other: { filters: { symbol: 'GOOG' } },
        })
      );

      service.clearFilterState('nonexistent');

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.other.filters).toEqual({ symbol: 'GOOG' });
      expect(savedData.nonexistent).toBeUndefined();
    });

    it('should preserve filter state when saving sort state', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { filters: { symbol: 'AAPL' } },
        })
      );

      service.saveSortState('universes', { field: 'name', order: 'asc' });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes.filters).toEqual({ symbol: 'AAPL' });
      expect(savedData.universes.sort).toEqual({
        field: 'name',
        order: 'asc',
      });
    });
  });

  describe('loadAllSortFilterState', () => {
    it('should return all state for all tables', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: {
            sort: { field: 'name', order: 'asc' },
            filters: { symbol: 'AAPL' },
          },
          'trades-open': { sort: { field: 'date', order: 'desc' } },
        })
      );

      const result = service.loadAllSortFilterState();

      expect(result.universes.sort).toEqual({ field: 'name', order: 'asc' });
      expect(result.universes.filters).toEqual({ symbol: 'AAPL' });
      expect(result['trades-open'].sort).toEqual({
        field: 'date',
        order: 'desc',
      });
    });

    it('should return empty object when no state exists', () => {
      mockGetItem.mockReturnValue(null);

      const result = service.loadAllSortFilterState();

      expect(result).toEqual({});
    });
  });

  describe('multiple table configurations', () => {
    it('should handle sort states for universes table', () => {
      mockGetItem.mockReturnValue(null);

      service.saveSortState('universes', {
        field: 'name',
        order: 'asc',
      });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes).toBeDefined();
    });

    it('should handle sort states for trades-open table', () => {
      mockGetItem.mockReturnValue(null);

      service.saveSortState('trades-open', {
        field: 'openDate',
        order: 'desc',
      });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData['trades-open']).toBeDefined();
    });

    it('should handle sort states for trades-closed table', () => {
      mockGetItem.mockReturnValue(null);

      service.saveSortState('trades-closed', {
        field: 'closeDate',
        order: 'desc',
      });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData['trades-closed']).toBeDefined();
    });

    it('should maintain independent sort states across tables', () => {
      mockGetItem.mockReturnValueOnce(null).mockReturnValueOnce(
        JSON.stringify({
          universes: { sort: { field: 'name', order: 'asc' } },
        })
      );

      service.saveSortState('universes', {
        field: 'name',
        order: 'asc',
      });

      service.saveSortState('trades-open', {
        field: 'openDate',
        order: 'desc',
      });

      const savedData = JSON.parse(mockSetItem.mock.calls[1][1]);
      expect(savedData.universes.sort).toEqual({
        field: 'name',
        order: 'asc',
      });
      expect(savedData['trades-open'].sort).toEqual({
        field: 'openDate',
        order: 'desc',
      });
    });
  });
});
