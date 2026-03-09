import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SortStateService } from './sort-state.service';

describe('SortStateService', () => {
  let service: SortStateService;
  let mockGetItem: ReturnType<typeof vi.fn>;
  let mockSetItem: ReturnType<typeof vi.fn>;
  let mockRemoveItem: ReturnType<typeof vi.fn>;
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage'
  );

  const STORAGE_KEY = 'dms-sort-state';

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
    service = TestBed.inject(SortStateService);
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

  describe.skip('saveSortState', () => {
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
      expect(savedData.universes).toEqual({
        field: 'name',
        order: 'asc',
      });
    });

    it('should merge with existing sort states for other tables', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          'trades-open': { field: 'date', order: 'desc' },
        })
      );

      service.saveSortState('universes', {
        field: 'name',
        order: 'asc',
      });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData['trades-open']).toEqual({
        field: 'date',
        order: 'desc',
      });
      expect(savedData.universes).toEqual({
        field: 'name',
        order: 'asc',
      });
    });

    it('should overwrite existing sort state for same table', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { field: 'name', order: 'asc' },
        })
      );

      service.saveSortState('universes', {
        field: 'value',
        order: 'desc',
      });

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes).toEqual({
        field: 'value',
        order: 'desc',
      });
    });
  });

  describe.skip('loadSortState', () => {
    it('should load sort state from localStorage', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { field: 'name', order: 'asc' },
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
          'trades-open': { field: 'date', order: 'desc' },
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

  describe.skip('clearSortState', () => {
    it('should handle corrupted localStorage data gracefully when clearing', () => {
      mockGetItem.mockReturnValue('not-valid-json{{{');

      expect(() => service.clearSortState('universes')).not.toThrow();
    });

    it('should clear sort state for a specific table', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { field: 'name', order: 'asc' },
          'trades-open': { field: 'date', order: 'desc' },
        })
      );

      service.clearSortState('universes');

      const savedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedData.universes).toBeUndefined();
      expect(savedData['trades-open']).toEqual({
        field: 'date',
        order: 'desc',
      });
    });

    it('should remove storage key when last table state is cleared', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({
          universes: { field: 'name', order: 'asc' },
        })
      );

      service.clearSortState('universes');

      expect(mockRemoveItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe.skip('multiple table configurations', () => {
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
          universes: { field: 'name', order: 'asc' },
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
      expect(savedData.universes).toEqual({
        field: 'name',
        order: 'asc',
      });
      expect(savedData['trades-open']).toEqual({
        field: 'openDate',
        order: 'desc',
      });
    });
  });
});
