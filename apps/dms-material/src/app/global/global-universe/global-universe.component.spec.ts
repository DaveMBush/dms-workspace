import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Sort } from '@angular/material/sort';
import { provideSmartNgRX } from '@smarttools/smart-signals';
import { of, throwError } from 'rxjs';

import { ScreenerService } from '../global-screener/services/screener.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { Universe } from '../../store/universe/universe.interface';
import { GlobalUniverseComponent } from './global-universe.component';

// Mock SmartNgRX selectors
vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));

vi.mock('../../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));

vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue({ entities: {}, ids: [] }),
}));

vi.mock(
  '../../store/risk-group/selectors/select-risk-group-entities.function',
  () => ({
    selectRiskGroupEntities: vi.fn().mockReturnValue({ entities: {}, ids: [] }),
  })
);

vi.mock(
  '../../store/risk-group/selectors/select-risk-group-entity.function',
  () => ({
    selectRiskGroupEntity: vi.fn().mockReturnValue({ id: '', name: '' }),
  })
);

describe('GlobalUniverseComponent', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let mockSyncService: {
    syncFromScreener: ReturnType<typeof vi.fn>;
    isSyncing: ReturnType<typeof vi.fn>;
  };
  let mockNotification: {
    success: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    showPersistent: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockSyncService = {
      syncFromScreener: vi.fn().mockReturnValue(
        of({
          inserted: 5,
          updated: 10,
          markedExpired: 2,
        })
      ),
      isSyncing: vi.fn().mockReturnValue(false),
    };
    mockNotification = {
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      showPersistent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GlobalUniverseComponent],
      providers: [
        provideSmartNgRX(),
        { provide: UniverseSyncService, useValue: mockSyncService },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalUniverseComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should define columns including actions', () => {
      expect(component.columns.length).toBeGreaterThan(0);
      expect(
        component.columns.find(function findActions(c) {
          return c.field === 'actions';
        })
      ).toBeTruthy();
    });

    it('should have symbol column', () => {
      const symbolCol = component.columns.find(function findSymbol(c) {
        return c.field === 'symbol';
      });
      expect(symbolCol).toBeDefined();
      expect(symbolCol?.header).toBe('Symbol');
    });

    it('should have risk group column', () => {
      const col = component.columns.find(function findRiskGroup(c) {
        return c.field === 'risk_group_id';
      });
      expect(col).toBeDefined();
    });

    it('should have distribution column as editable', () => {
      const col = component.columns.find(function findDistribution(c) {
        return c.field === 'distribution';
      });
      expect(col).toBeDefined();
      expect(col?.editable).toBe(true);
    });

    it('should have distributions_per_year column as editable', () => {
      const col = component.columns.find(function findDistPerYear(c) {
        return c.field === 'distributions_per_year';
      });
      expect(col).toBeDefined();
      expect(col?.editable).toBe(true);
    });

    it('should have ex_date column as editable date', () => {
      const col = component.columns.find(function findExDate(c) {
        return c.field === 'ex_date';
      });
      expect(col).toBeDefined();
      expect(col?.editable).toBe(true);
      expect(col?.type).toBe('date');
    });

    it('should initialize sort state with default values', () => {
      expect(component.sortField$()).toBe('symbol');
      expect(component.sortDirection$()).toBe('asc');
    });
  });

  describe('syncUniverse', () => {
    it('should call sync service on syncUniverse', () => {
      component.syncUniverse();
      expect(mockSyncService.syncFromScreener).toHaveBeenCalled();
    });

    it('should show success notification on successful sync', () => {
      component.syncUniverse();
      expect(mockNotification.showPersistent).toHaveBeenCalledWith(
        expect.stringContaining('5 inserted'),
        'success'
      );
    });

    it('should include update count in success message', () => {
      component.syncUniverse();
      expect(mockNotification.showPersistent).toHaveBeenCalledWith(
        expect.stringContaining('10 updated'),
        'success'
      );
    });

    it('should include expired count in success message', () => {
      component.syncUniverse();
      expect(mockNotification.showPersistent).toHaveBeenCalledWith(
        expect.stringContaining('2 expired'),
        'success'
      );
    });

    it('should show error notification on sync failure', () => {
      mockSyncService.syncFromScreener.mockReturnValue(
        throwError(function createError() {
          return new Error('Sync failed');
        })
      );
      component.syncUniverse();
      expect(mockNotification.showPersistent).toHaveBeenCalledWith(
        expect.stringContaining('Failed'),
        'error'
      );
    });
  });

  describe('updateFields', () => {
    it('should set isUpdatingFields to true when called', () => {
      component.updateFields();
      expect(component.isUpdatingFields$()).toBe(true);
    });

    it('should show success notification after update completes', () => {
      vi.useFakeTimers();
      component.updateFields();
      vi.advanceTimersByTime(1100);
      expect(mockNotification.showPersistent).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated'),
        'success'
      );
      vi.useRealTimers();
    });

    it('should set isUpdatingFields to false after update completes', () => {
      vi.useFakeTimers();
      component.updateFields();
      vi.advanceTimersByTime(1100);
      expect(component.isUpdatingFields$()).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('showAddSymbolDialog', () => {
    it('should open the AddSymbolDialog', () => {
      const mockDialogRef = {
        afterClosed: vi.fn().mockReturnValue(of(null)),
      };
      const dialogSpy = vi
        .spyOn(TestBed.inject(MatDialog), 'open')
        .mockReturnValue(mockDialogRef as any);

      component.showAddSymbolDialog();

      expect(dialogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: '400px',
        })
      );
    });
  });

  describe('shouldShowDeleteButton', () => {
    it('should return true when position is 0 and not closed end fund', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        position: 0,
        is_closed_end_fund: false,
      } as Universe;
      expect(component.shouldShowDeleteButton(row)).toBe(true);
    });

    it('should return false when position is not 0', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        position: 100,
        is_closed_end_fund: false,
      } as Universe;
      expect(component.shouldShowDeleteButton(row)).toBe(false);
    });

    it('should return false when is closed end fund', () => {
      const row = {
        id: '1',
        symbol: 'CEF',
        position: 0,
        is_closed_end_fund: true,
      } as Universe;
      expect(component.shouldShowDeleteButton(row)).toBe(false);
    });
  });

  describe('deleteUniverse', () => {
    it('should emit symbolDeleted event', () => {
      const row = { id: '1', symbol: 'AAPL' } as Universe;
      const spy = vi.spyOn(component.symbolDeleted, 'emit');
      component.table = { refresh: vi.fn() } as never;
      component.deleteUniverse(row);
      expect(spy).toHaveBeenCalledWith(row);
    });

    it('should show success notification with symbol', () => {
      const row = { id: '1', symbol: 'AAPL' } as Universe;
      component.table = { refresh: vi.fn() } as never;
      component.deleteUniverse(row);
      expect(mockNotification.success).toHaveBeenCalledWith(
        expect.stringContaining('AAPL')
      );
    });
  });

  describe('cell editing', () => {
    it('should emit cell edit event with correct data', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distribution: 2.5,
      } as Universe;
      const spy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'distribution', 3.0);
      expect(spy).toHaveBeenCalledWith({
        row,
        field: 'distribution',
        value: 3.0,
      });
    });
  });

  describe('filtering', () => {
    it('should have riskGroups defined', () => {
      expect(component.riskGroups.length).toBeGreaterThan(0);
    });

    it('should have expiredOptions defined', () => {
      expect(component.expiredOptions.length).toBe(2);
    });

    it('should update symbolFilter signal', () => {
      component.onSymbolFilterChange('AAPL');
      expect(component.symbolFilter$()).toBe('AAPL');
    });

    it('should update riskGroupFilter signal', () => {
      component.onRiskGroupFilterChange('Equities');
      expect(component.riskGroupFilter$()).toBe('Equities');
    });

    it('should update expiredFilter signal', () => {
      component.onExpiredFilterChange(true);
      expect(component.expiredFilter$()).toBe(true);
    });

    it('should update minYieldFilter signal', () => {
      component.onMinYieldFilterChange(5);
      expect(component.minYieldFilter$()).toBe(5);
    });

    it('should update account filter signal', () => {
      component.onAccountChange('account-1');
      expect(component.selectedAccountId$()).toBe('account-1');
    });
  });

  describe('sorting', () => {
    it('should update sort state on sort change', () => {
      const sort: Sort = { active: 'risk_group_id', direction: 'desc' };
      component.table = { refresh: vi.fn() } as never;
      component.onSortChange(sort);
      expect(component.sortField$()).toBe('risk_group_id');
      expect(component.sortDirection$()).toBe('desc');
    });

    it('should call refresh after sort change', () => {
      const refreshMock = vi.fn();
      component.table = { refresh: refreshMock } as never;
      const sort: Sort = { active: 'symbol', direction: 'asc' };
      component.onSortChange(sort);
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  describe('calculateYield', () => {
    it('should calculate yield correctly', () => {
      const row = {
        distribution: 0.5,
        distributions_per_year: 4,
        last_price: 100,
      } as Universe;
      const result = component.calculateYield(row);
      expect(result).toBe(2); // (0.5 * 4 * 100) / 100 = 2%
    });

    it('should return 0 when last_price is 0', () => {
      const row = {
        distribution: 0.5,
        distributions_per_year: 4,
        last_price: 0,
      } as Universe;
      const result = component.calculateYield(row);
      expect(result).toBe(0);
    });

    it('should return 0 when last_price is null', () => {
      const row = {
        distribution: 0.5,
        distributions_per_year: 4,
        last_price: null,
      } as unknown as Universe;
      const result = component.calculateYield(row);
      expect(result).toBe(0);
    });
  });
});

// TDD: Tests for Refresh Button Integration
// These tests are now enabled (TDD green phase)
describe('GlobalUniverseComponent - Refresh Button', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let screenerService: ScreenerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalUniverseComponent],
      providers: [
        provideSmartNgRX(),
        {
          provide: ScreenerService,
          useValue: {
            refresh: vi.fn().mockReturnValue(of({})),
            loading: signal(false),
            error: signal(null),
          },
        },
        {
          provide: UniverseSyncService,
          useValue: {
            syncFromScreener: vi.fn().mockReturnValue(of({})),
            isSyncing: vi.fn().mockReturnValue(false),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            success: vi.fn(),
            error: vi.fn(),
            showPersistent: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalUniverseComponent);
    component = fixture.componentInstance;
    screenerService = TestBed.inject(ScreenerService);
    fixture.detectChanges();
  });

  it('should have refresh button in template', () => {
    const button = fixture.nativeElement.querySelector(
      '[data-testid="refresh-button"]'
    );
    expect(button).toBeTruthy();
  });

  it('should call screenerService.refresh() on button click', () => {
    component.onRefresh();
    expect(screenerService.refresh).toHaveBeenCalled();
  });

  it('should show loading indicator during refresh', () => {
    (screenerService.loading as any).set(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="refresh-button"]'
    );
    expect(button.disabled).toBe(true);
  });

  it('should trigger universe data reload after successful refresh', async () => {
    const refreshSpy = vi
      .spyOn(screenerService, 'refresh')
      .mockReturnValue(of({ success: true }));
    const tableRefreshSpy = vi.fn();
    component.table = { refresh: tableRefreshSpy } as never;

    component.onRefresh();

    await vi.waitFor(() => {
      expect(tableRefreshSpy).toHaveBeenCalled();
    });
  });

  it('should handle refresh errors gracefully', () => {
    (screenerService.error as any).set('Failed to refresh');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector(
      '[data-testid="error-message"]'
    );
    expect(errorEl).toBeTruthy();
  });

  it('should disable refresh button while loading', () => {
    (screenerService.loading as any).set(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="refresh-button"]'
    );
    expect(button.disabled).toBe(true);
  });

  it('should display error message when refresh fails', () => {
    const errorMessage = 'Network error occurred';
    (screenerService.error as any).set(errorMessage);
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector(
      '[data-testid="error-message"]'
    );
    expect(errorEl.textContent).toContain(errorMessage);
  });
});
