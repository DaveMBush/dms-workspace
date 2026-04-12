import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHandleSocketNotification, mockSelectUniverses } = vi.hoisted(
  () => ({
    mockHandleSocketNotification: vi.fn(),
    mockSelectUniverses: vi.fn(),
  })
);

vi.mock('@smarttools/smart-signals', () => ({
  handleSocketNotification: mockHandleSocketNotification,
}));

vi.mock(
  '../../store/universe/selectors/select-universes.function',
  function mockSelectUniversesModule() {
    return {
      selectUniverses: mockSelectUniverses,
    };
  }
);

import { saveUniverseFiltersAndNotify } from './save-universe-filters-and-notify.function';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';

function createMockService(): {
  saveFilterState: ReturnType<typeof vi.fn>;
  clearFilterState: ReturnType<typeof vi.fn>;
} {
  return {
    saveFilterState: vi.fn(),
    clearFilterState: vi.fn(),
  };
}

describe('saveUniverseFiltersAndNotify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectUniverses.mockReturnValue([]);
  });

  it('should save account_id filter when account is not "all"', () => {
    const service = createMockService();
    saveUniverseFiltersAndNotify(service as unknown as SortFilterStateService, {
      symbol: '',
      riskGroup: null,
      expired: null,
      minYield: null,
      accountId: 'acct-1',
    });
    expect(service.saveFilterState).toHaveBeenCalledWith('universes', {
      account_id: 'acct-1',
    });
  });

  it('should clear filters when all defaults', () => {
    const service = createMockService();
    saveUniverseFiltersAndNotify(service as unknown as SortFilterStateService, {
      symbol: '',
      riskGroup: null,
      expired: null,
      minYield: null,
      accountId: 'all',
    });
    expect(service.clearFilterState).toHaveBeenCalledWith('universes');
  });

  it('should notify top entity on every call', () => {
    const service = createMockService();
    saveUniverseFiltersAndNotify(service as unknown as SortFilterStateService, {
      symbol: '',
      riskGroup: null,
      expired: null,
      minYield: null,
      accountId: 'all',
    });
    expect(mockHandleSocketNotification).toHaveBeenCalledWith('top', 'update', [
      '1',
    ]);
  });

  it('should notify universe entities when universes exist', () => {
    mockSelectUniverses.mockReturnValue([
      { id: 'u-1', symbol: 'AAPL' },
      { id: 'u-2', symbol: 'MSFT' },
    ]);
    const service = createMockService();
    saveUniverseFiltersAndNotify(service as unknown as SortFilterStateService, {
      symbol: '',
      riskGroup: null,
      expired: null,
      minYield: null,
      accountId: 'acct-1',
    });
    expect(mockHandleSocketNotification).toHaveBeenCalledWith(
      'universes',
      'update',
      ['u-1', 'u-2']
    );
  });

  it('should not notify universe entities when no universes loaded', () => {
    mockSelectUniverses.mockReturnValue([]);
    const service = createMockService();
    saveUniverseFiltersAndNotify(service as unknown as SortFilterStateService, {
      symbol: '',
      riskGroup: null,
      expired: null,
      minYield: null,
      accountId: 'acct-1',
    });
    expect(mockHandleSocketNotification).toHaveBeenCalledTimes(1);
    expect(mockHandleSocketNotification).toHaveBeenCalledWith('top', 'update', [
      '1',
    ]);
  });

  it('should not notify universe entities when accountId is "all" — CDK stability (Story 64.3)', () => {
    // Regression guard: when no account is selected (accountId='all'), the
    // per-entity re-fetch is unnecessary and causes SmartNgRX to mark all rows
    // as isLoading, briefly collapsing the CDK data array to 0 rows.
    // Only fire the per-entity notification when an account IS selected.
    mockSelectUniverses.mockReturnValue([
      { id: 'u-1', symbol: 'AAPL' },
      { id: 'u-2', symbol: 'MSFT' },
    ]);
    const service = createMockService();
    saveUniverseFiltersAndNotify(service as unknown as SortFilterStateService, {
      symbol: 'AAPL',
      riskGroup: null,
      expired: null,
      minYield: null,
      accountId: 'all',
    });
    // Only the 'top' entity notification should fire; universes must not be
    // marked as loading when there is no account-specific context to refresh.
    expect(mockHandleSocketNotification).toHaveBeenCalledTimes(1);
    expect(mockHandleSocketNotification).toHaveBeenCalledWith('top', 'update', [
      '1',
    ]);
  });

  it('should not notify universe entities when selectUniverses returns null', () => {
    mockSelectUniverses.mockReturnValue(null);
    const service = createMockService();
    saveUniverseFiltersAndNotify(service as unknown as SortFilterStateService, {
      symbol: '',
      riskGroup: null,
      expired: null,
      minYield: null,
      accountId: 'all',
    });
    expect(mockHandleSocketNotification).toHaveBeenCalledTimes(1);
  });
});
