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

vi.mock('../../store/screen/selectors/select-screen.function', () => ({
  selectScreen: vi.fn().mockReturnValue([]),
}));

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
    it('should handle sort change event', () => {
      const sort: Sort = { active: 'risk_group_id', direction: 'desc' };
      // Sorting is now handled automatically by BaseTableComponent
      // onSortChange is just a placeholder method
      expect(() => component.onSortChange(sort)).not.toThrow();
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

  it('should call screener service refresh and show success notification', async () => {
    const refreshSpy = vi
      .spyOn(screenerService, 'refresh')
      .mockReturnValue(of({ success: true }));
    const notificationService = TestBed.inject(NotificationService);
    const notificationSpy = vi.spyOn(notificationService, 'success');

    component.onRefresh();

    await vi.waitFor(() => {
      expect(refreshSpy).toHaveBeenCalled();
      expect(notificationSpy).toHaveBeenCalledWith(
        'Universe data refreshed successfully'
      );
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

// DISABLE TESTS FOR CI
describe('GlobalUniverseComponent - Loading and Error Handling', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let screenerService: ScreenerService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const loadingSignal = signal(false);
    const errorSignal = signal<string | null>(null);
    const refreshMock = vi.fn(() => {
      // Simulate ScreenerService behavior: clear error on refresh
      (errorSignal as any).set(null);
      return of({});
    });

    await TestBed.configureTestingModule({
      imports: [GlobalUniverseComponent],
      providers: [
        provideSmartNgRX(),
        {
          provide: ScreenerService,
          useValue: {
            refresh: refreshMock,
            loading: loadingSignal,
            error: errorSignal,
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
    notificationService = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should show spinner when loading', () => {
    (screenerService.loading as any).set(true);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('mat-progress-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should hide spinner when not loading', () => {
    (screenerService.loading as any).set(false);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('mat-progress-spinner');
    expect(spinner).toBeFalsy();
  });

  it('should display error message when error occurs', () => {
    (screenerService.error as any).set('Network error');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector(
      '[data-testid="error-message"]'
    );
    expect(errorEl.textContent).toContain('Network error');
  });

  it('should show success notification on successful refresh', () => {
    const notificationSpy = vi.spyOn(notificationService, 'success');

    component.onRefresh();

    expect(notificationSpy).toHaveBeenCalledWith(
      'Universe data refreshed successfully'
    );
  });

  it('should enable retry on error', () => {
    (screenerService.error as any).set('Failed');
    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector(
      '[data-testid="retry-button"]'
    );
    expect(retryButton).toBeTruthy();
  });

  it('should clear error when retrying', () => {
    (screenerService.error as any).set('Error');
    component.onRefresh();

    expect(screenerService.error()).toBe(null);
  });

  // STORY AK.1: TDD - Universe Update Button Integration Tests
  // DISABLE TESTS FOR CI - Will be enabled in implementation story AK.2
  describe.skip('Universe Update Button Integration (TDD - Story AK.1)', () => {
    it('should call UniverseSyncService.syncFromScreener when update button is clicked', () => {
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        '[data-testid="update-universe-button"]'
      );
      button.click();
      fixture.detectChanges();

      expect(mockSyncService.syncFromScreener).toHaveBeenCalled();
    });

    it('should disable button during sync operation', () => {
      mockSyncService.isSyncing.mockReturnValue(true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '[data-testid="update-universe-button"]'
      );
      expect(button.disabled).toBe(true);
    });

    it('should enable button when not loading', () => {
      mockSyncService.isSyncing.mockReturnValue(false);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '[data-testid="update-universe-button"]'
      );
      expect(button.disabled).toBe(false);
    });

    it('should show loading state during sync', () => {
      mockSyncService.isSyncing.mockReturnValue(true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '[data-testid="update-universe-button"]'
      );
      const spinner = button.querySelector('mat-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should show sync icon when not loading', () => {
      mockSyncService.isSyncing.mockReturnValue(false);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '[data-testid="update-universe-button"]'
      );
      const icon = button.querySelector('mat-icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toContain('sync');
    });

    it('should handle sync service errors gracefully', () => {
      mockSyncService.syncFromScreener.mockReturnValue(
        throwError(function createError() {
          return new Error('Sync failed');
        })
      );

      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        '[data-testid="update-universe-button"]'
      );
      button.click();
      fixture.detectChanges();

      // Should not throw, error handling is in place
      expect(mockSyncService.syncFromScreener).toHaveBeenCalled();
    });

    it('should not trigger sync if already loading', () => {
      mockSyncService.isSyncing.mockReturnValue(true);
      mockSyncService.syncFromScreener.mockClear();
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '[data-testid="update-universe-button"]'
      );

      // Button is disabled, but try to trigger click
      if (!button.disabled) {
        button.click();
      }
      fixture.detectChanges();

      // Should not be called when disabled
      expect(mockSyncService.syncFromScreener).not.toHaveBeenCalled();
    });
  });
});
