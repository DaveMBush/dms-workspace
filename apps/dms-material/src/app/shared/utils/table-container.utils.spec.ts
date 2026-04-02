import { signal } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { vi } from 'vitest';
import { handleSocketNotification } from '@smarttools/smart-signals';

import { SortFilterStateService } from '../services/sort-filter-state.service';
import { createSymbolFilterManager } from './create-symbol-filter-manager.function';
import { handleSortChange } from './handle-sort-change.function';
import { initSearchText } from './init-search-text.function';
import { initSortColumns } from './init-sort-columns.function';
import { saveSymbolFilter } from './save-symbol-filter.function';

vi.mock('@smarttools/smart-signals', () => ({
  handleSocketNotification: vi.fn(),
}));

vi.mock('../../store/accounts/selectors/get-account-ids.function', () => ({
  getAccountIds: vi.fn().mockReturnValue(['acc-1']),
}));

describe('table-container.utils', () => {
  let mockService: {
    loadSortState: ReturnType<typeof vi.fn>;
    loadFilterState: ReturnType<typeof vi.fn>;
    saveSortState: ReturnType<typeof vi.fn>;
    clearSortState: ReturnType<typeof vi.fn>;
    saveFilterState: ReturnType<typeof vi.fn>;
    clearFilterState: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      loadSortState: vi.fn().mockReturnValue(null),
      loadFilterState: vi.fn().mockReturnValue(null),
      saveSortState: vi.fn(),
      clearSortState: vi.fn(),
      saveFilterState: vi.fn(),
      clearFilterState: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('initSortColumns', () => {
    it('should return empty array when no persisted state', () => {
      const result = initSortColumns(
        mockService as unknown as SortFilterStateService,
        'test-table'
      );
      expect(result()).toEqual([]);
    });

    it('should restore persisted sort state', () => {
      mockService.loadSortState.mockReturnValue({
        field: 'symbol',
        order: 'asc',
      });
      const result = initSortColumns(
        mockService as unknown as SortFilterStateService,
        'test-table'
      );
      expect(result()).toEqual([{ column: 'symbol', direction: 'asc' }]);
    });
  });

  describe('initSearchText', () => {
    it('should return empty string when no persisted filter', () => {
      const result = initSearchText(
        mockService as unknown as SortFilterStateService,
        'test-table'
      );
      expect(result()).toBe('');
    });

    it('should restore persisted symbol filter', () => {
      mockService.loadFilterState.mockReturnValue({ symbol: 'AAPL' });
      const result = initSearchText(
        mockService as unknown as SortFilterStateService,
        'test-table'
      );
      expect(result()).toBe('AAPL');
    });
  });

  describe('handleSortChange', () => {
    it('should clear sort when direction is empty', () => {
      const sortColumns$ = signal([
        { column: 'symbol', direction: 'asc' as const },
      ]);
      const sort: Sort = { active: 'symbol', direction: '' };

      handleSortChange(
        sort,
        sortColumns$,
        mockService as unknown as SortFilterStateService,
        'test-table'
      );

      expect(sortColumns$()).toEqual([]);
      expect(mockService.clearSortState).toHaveBeenCalledWith('test-table');
      expect(handleSocketNotification).toHaveBeenCalledWith(
        'accounts',
        'update',
        ['acc-1']
      );
    });

    it('should set sort when direction is provided', () => {
      const sortColumns$ = signal<
        { column: string; direction: 'asc' | 'desc' }[]
      >([]);
      const sort: Sort = { active: 'buy', direction: 'desc' };

      handleSortChange(
        sort,
        sortColumns$,
        mockService as unknown as SortFilterStateService,
        'test-table'
      );

      expect(sortColumns$()).toEqual([{ column: 'buy', direction: 'desc' }]);
      expect(mockService.saveSortState).toHaveBeenCalledWith('test-table', {
        field: 'buy',
        order: 'desc',
      });
      expect(handleSocketNotification).toHaveBeenCalled();
    });
  });

  describe('saveSymbolFilter', () => {
    it('should save filter when search text is non-empty', () => {
      const searchText = signal('AAPL');

      saveSymbolFilter(
        searchText,
        mockService as unknown as SortFilterStateService,
        'test-table'
      );

      expect(mockService.saveFilterState).toHaveBeenCalledWith('test-table', {
        symbol: 'AAPL',
      });
      expect(handleSocketNotification).toHaveBeenCalled();
    });

    it('should clear filter when search text is empty', () => {
      const searchText = signal('');

      saveSymbolFilter(
        searchText,
        mockService as unknown as SortFilterStateService,
        'test-table'
      );

      expect(mockService.clearFilterState).toHaveBeenCalledWith('test-table');
      expect(handleSocketNotification).toHaveBeenCalled();
    });
  });

  describe('createSymbolFilterManager', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should update searchText immediately on filter change', () => {
      const searchText = signal('');
      const manager = createSymbolFilterManager(
        searchText,
        mockService as unknown as SortFilterStateService,
        'test-table'
      );

      manager.onSymbolFilterChange('MSFT');

      expect(searchText()).toBe('MSFT');
    });

    it('should debounce and save after 300ms', () => {
      const searchText = signal('');
      const manager = createSymbolFilterManager(
        searchText,
        mockService as unknown as SortFilterStateService,
        'test-table'
      );

      manager.onSymbolFilterChange('MSFT');
      expect(mockService.saveFilterState).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(mockService.saveFilterState).toHaveBeenCalledWith('test-table', {
        symbol: 'MSFT',
      });
    });

    it('should cancel previous timer on rapid input', () => {
      const searchText = signal('');
      const manager = createSymbolFilterManager(
        searchText,
        mockService as unknown as SortFilterStateService,
        'test-table'
      );

      manager.onSymbolFilterChange('M');
      vi.advanceTimersByTime(200);
      manager.onSymbolFilterChange('MS');
      vi.advanceTimersByTime(200);
      manager.onSymbolFilterChange('MSF');
      vi.advanceTimersByTime(300);

      expect(searchText()).toBe('MSF');
      expect(mockService.saveFilterState).toHaveBeenCalledTimes(1);
      expect(mockService.saveFilterState).toHaveBeenCalledWith('test-table', {
        symbol: 'MSF',
      });
    });

    it('should clear timer on cleanup', () => {
      const searchText = signal('');
      const manager = createSymbolFilterManager(
        searchText,
        mockService as unknown as SortFilterStateService,
        'test-table'
      );

      manager.onSymbolFilterChange('MSFT');
      manager.cleanup();
      vi.advanceTimersByTime(300);

      expect(mockService.saveFilterState).not.toHaveBeenCalled();
    });
  });
});
