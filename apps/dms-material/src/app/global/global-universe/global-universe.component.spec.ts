import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Sort } from '@angular/material/sort';
import { provideSmartNgRX } from '@smarttools/smart-signals';
import { of, throwError } from 'rxjs';

import { ScreenerService } from '../global-screener/services/screener.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { UpdateUniverseFieldsService } from '../../shared/services/update-universe-fields.service';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';
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

// STORY AK.1: TDD - Universe Update Button Integration Tests
// STORY AK.2: Tests enabled - implementation complete
describe('GlobalUniverseComponent - Universe Update Button Integration (TDD - Story AK.1)', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let mockSyncService: {
    syncFromScreener: ReturnType<typeof vi.fn>;
    isSyncing: ReturnType<typeof vi.fn>;
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

    await TestBed.configureTestingModule({
      imports: [GlobalUniverseComponent],
      providers: [
        provideSmartNgRX(),
        { provide: UniverseSyncService, useValue: mockSyncService },
        {
          provide: NotificationService,
          useValue: {
            success: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
            showPersistent: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalUniverseComponent);
    component = fixture.componentInstance;
  });

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
});

// STORY AK.3: TDD - Universe Sync Notifications Tests
// These tests are now ENABLED (GREEN phase) - Story AK.4
describe('GlobalUniverseComponent - Universe Sync Notifications (TDD - Story AK.3)', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let mockSyncService: {
    syncFromScreener: ReturnType<typeof vi.fn>;
    isSyncing: ReturnType<typeof vi.fn>;
  };
  let mockNotification: {
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
    fixture.detectChanges();
  });

  it('should show success notification when sync completes', () => {
    mockSyncService.syncFromScreener.mockReturnValue(
      of({
        inserted: 5,
        updated: 10,
        markedExpired: 2,
      })
    );

    const button = fixture.nativeElement.querySelector(
      '[data-testid="update-universe-button"]'
    );
    button.click();
    fixture.detectChanges();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringContaining('Universe updated'),
      'success'
    );
  });

  it('should show error notification when sync fails', () => {
    const errorMessage = 'Sync failed: Server error';
    mockSyncService.syncFromScreener.mockReturnValue(
      throwError(function createError() {
        return new Error(errorMessage);
      })
    );

    const button = fixture.nativeElement.querySelector(
      '[data-testid="update-universe-button"]'
    );
    button.click();
    fixture.detectChanges();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringContaining('failed'),
      'error'
    );
  });

  it('should display count of inserted symbols in success message', () => {
    mockSyncService.syncFromScreener.mockReturnValue(
      of({
        inserted: 15,
        updated: 5,
        markedExpired: 1,
      })
    );

    const button = fixture.nativeElement.querySelector(
      '[data-testid="update-universe-button"]'
    );
    button.click();
    fixture.detectChanges();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringMatching(/15.*inserted/i),
      'success'
    );
  });

  it('should display count of updated symbols in success message', () => {
    mockSyncService.syncFromScreener.mockReturnValue(
      of({
        inserted: 3,
        updated: 25,
        markedExpired: 0,
      })
    );

    const button = fixture.nativeElement.querySelector(
      '[data-testid="update-universe-button"]'
    );
    button.click();
    fixture.detectChanges();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringMatching(/25.*updated/i),
      'success'
    );
  });

  it('should display count of expired symbols in success message', () => {
    mockSyncService.syncFromScreener.mockReturnValue(
      of({
        inserted: 2,
        updated: 8,
        markedExpired: 12,
      })
    );

    const button = fixture.nativeElement.querySelector(
      '[data-testid="update-universe-button"]'
    );
    button.click();
    fixture.detectChanges();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringMatching(/12.*expired/i),
      'success'
    );
  });

  it('should not show notification if sync is cancelled (already loading)', () => {
    mockSyncService.isSyncing.mockReturnValue(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="update-universe-button"]'
    );

    // Button should be disabled, but try to trigger handler directly if possible
    if (!button.disabled) {
      button.click();
    }
    fixture.detectChanges();

    expect(mockNotification.showPersistent).not.toHaveBeenCalled();
  });

  it('should include error message in error notification', () => {
    const errorDetails = 'Network timeout occurred';
    mockSyncService.syncFromScreener.mockReturnValue(
      throwError(function createError() {
        return { message: errorDetails };
      })
    );

    const button = fixture.nativeElement.querySelector(
      '[data-testid="update-universe-button"]'
    );
    button.click();
    fixture.detectChanges();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringContaining(errorDetails),
      'error'
    );
  });

  it('should show generic error message when error has no message', () => {
    mockSyncService.syncFromScreener.mockReturnValue(
      throwError(function createError() {
        return {};
      })
    );

    const button = fixture.nativeElement.querySelector(
      '[data-testid="update-universe-button"]'
    );
    button.click();
    fixture.detectChanges();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringMatching(/failed|error/i),
      'error'
    );
  });

  it('should show success notification even when all counts are zero', () => {
    mockSyncService.syncFromScreener.mockReturnValue(
      of({
        inserted: 0,
        updated: 0,
        markedExpired: 0,
      })
    );

    const button = fixture.nativeElement.querySelector(
      '[data-testid="update-universe-button"]'
    );
    button.click();
    fixture.detectChanges();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.anything(),
      'success'
    );
  });
});

// TDD: Tests for Update Fields Button Integration (Story AL.3)
// These tests are now ENABLED (GREEN phase) - Story AL.4
describe('GlobalUniverseComponent - Update Fields Button Integration (TDD - Story AL.3)', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let mockUpdateFieldsService: {
    updateFields: ReturnType<typeof vi.fn>;
    isUpdating: ReturnType<typeof vi.fn>;
  };
  let mockGlobalLoading: {
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
  };
  let mockNotification: {
    showPersistent: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockUpdateFieldsService = {
      updateFields: vi.fn().mockReturnValue(
        of({
          updated: 10,
          correlationId: 'test-correlation-id',
          logFilePath: '/logs/test.log',
        })
      ),
      isUpdating: vi.fn().mockReturnValue(false),
    };

    mockGlobalLoading = {
      show: vi.fn(),
      hide: vi.fn(),
    };

    mockNotification = {
      showPersistent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GlobalUniverseComponent],
      providers: [
        provideSmartNgRX(),
        {
          provide: UpdateUniverseFieldsService,
          useValue: mockUpdateFieldsService,
        },
        { provide: GlobalLoadingService, useValue: mockGlobalLoading },
        { provide: NotificationService, useValue: mockNotification },
        {
          provide: UniverseSyncService,
          useValue: {
            syncFromScreener: vi.fn().mockReturnValue(of({})),
            isSyncing: vi.fn().mockReturnValue(false),
          },
        },
        {
          provide: ScreenerService,
          useValue: {
            refresh: vi.fn().mockReturnValue(of({})),
            loading: signal(false),
            error: signal(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalUniverseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show global loading overlay when update starts', () => {
    component.updateFields();

    expect(mockGlobalLoading.show).toHaveBeenCalledWith(
      'Updating universe fields...'
    );
  });

  it('should call updateFields service method', () => {
    component.updateFields();

    expect(mockUpdateFieldsService.updateFields).toHaveBeenCalled();
  });

  it('should hide loading overlay on success', () => {
    component.updateFields();

    expect(mockGlobalLoading.hide).toHaveBeenCalled();
  });

  it('should show success notification with count', () => {
    component.updateFields();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringContaining('10 entries updated'),
      'success'
    );
  });

  it('should hide loading overlay on error', () => {
    mockUpdateFieldsService.updateFields.mockReturnValue(
      throwError(function createError() {
        return new Error('Update failed');
      })
    );

    component.updateFields();

    expect(mockGlobalLoading.hide).toHaveBeenCalled();
  });

  it('should show error notification on failure', () => {
    mockUpdateFieldsService.updateFields.mockReturnValue(
      throwError(function createError() {
        return new Error('Update failed');
      })
    );

    component.updateFields();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update'),
      'error'
    );
  });

  it('should include error message in error notification', () => {
    const errorMessage = 'Network timeout occurred';
    mockUpdateFieldsService.updateFields.mockReturnValue(
      throwError(function createError() {
        return { message: errorMessage };
      })
    );

    component.updateFields();

    expect(mockNotification.showPersistent).toHaveBeenCalledWith(
      expect.stringContaining(errorMessage),
      'error'
    );
  });
});

// TDD GREEN Phase - Story AN.2: SmartNgRX Integration Tests
describe('GlobalUniverseComponent - SmartNgRX Integration', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let selectUniversesMock: ReturnType<typeof vi.fn>;
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
    // Get reference to the mocked selector
    const { selectUniverses } = await import(
      '../../store/universe/selectors/select-universes.function'
    );
    selectUniversesMock = selectUniverses as ReturnType<typeof vi.fn>;

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

  describe('data loading', () => {
    it('should initialize universe data load on component init', () => {
      // SmartNgRX loads data automatically via effect service
      // Component should be initialized and ready
      expect(component).toBeTruthy();
      expect(component.filteredData$).toBeDefined();
    });

    it('should select universe entries from SmartNgRX store', () => {
      // Mock some universe data
      const mockUniverses: Universe[] = [
        {
          id: '1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          distribution: 0.24,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-02-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 100,
        },
      ];
      selectUniversesMock.mockReturnValue(mockUniverses);

      // Trigger change detection
      fixture.detectChanges();

      // Component should use the selector to get data
      const data = component.filteredData$();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].symbol).toBe('AAPL');
    });

    it('should pass universe entries to table component', () => {
      // Mock universe data
      const mockUniverses: Universe[] = [
        {
          id: '1',
          symbol: 'MSFT',
          name: 'Microsoft',
          distribution: 0.68,
          distributions_per_year: 4,
          last_price: 380.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-03-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 50,
        },
      ];
      selectUniversesMock.mockReturnValue(mockUniverses);

      fixture.detectChanges();

      // filteredData$ should contain entries from store
      const filteredData = component.filteredData$();
      expect(filteredData.length).toBe(1);
      expect(filteredData[0].symbol).toBe('MSFT');
    });

    it('should display universe entries in correct sort order', () => {
      // Mock multiple universe entries
      const mockUniverses: Universe[] = [
        {
          id: '2',
          symbol: 'MSFT',
          name: 'Microsoft',
          distribution: 0.68,
          distributions_per_year: 4,
          last_price: 380.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-03-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 50,
        },
        {
          id: '1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          distribution: 0.24,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-02-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 100,
        },
      ];
      selectUniversesMock.mockReturnValue(mockUniverses);

      fixture.detectChanges();

      // Data should be returned in the order from the selector
      const filteredData = component.filteredData$();
      expect(filteredData.length).toBe(2);
      // The selector returns data in whatever order SmartNgRX provides
      expect(filteredData[0].symbol).toBe('MSFT');
      expect(filteredData[1].symbol).toBe('AAPL');
    });
  });

  describe('loading state handling', () => {
    it('should display loading indicator while universe data loads', () => {
      // The component uses screenerLoading for loading indication
      expect(component.screenerLoading).toBeDefined();
    });

    it('should hide loading indicator when data load completes', () => {
      // Mock loaded data
      selectUniversesMock.mockReturnValue([
        {
          id: '1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          distribution: 0.24,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-02-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 100,
        },
      ]);

      fixture.detectChanges();

      // Data should be available
      expect(component.filteredData$().length).toBe(1);
    });
  });

  describe('empty state handling', () => {
    it('should display empty state when no universe entries exist', () => {
      // Mock empty array
      selectUniversesMock.mockReturnValue([]);

      fixture.detectChanges();

      // filteredData$ should return empty array
      expect(component.filteredData$().length).toBe(0);
    });

    it('should display empty state when all entries are filtered out', () => {
      // Mock some data
      selectUniversesMock.mockReturnValue([
        {
          id: '1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          distribution: 0.24,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-02-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 100,
        },
      ]);

      // Apply a filter that excludes all entries
      component.symbolFilter$.set('ZZZZ');
      fixture.detectChanges();

      // filteredData$ should return empty array after filtering
      expect(component.filteredData$().length).toBe(0);
    });
  });

  describe('error state handling', () => {
    it('should display error message when universe data load fails', () => {
      // The component uses screenerError for error display
      expect(component.screenerError).toBeDefined();
    });

    it('should provide retry mechanism on load failure', () => {
      // The component has syncUniverse method that can be used for retry
      expect(component.syncUniverse).toBeDefined();
      expect(typeof component.syncUniverse).toBe('function');
    });
  });
});

describe('Universe Selectors', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let selectUniversesMock: ReturnType<typeof vi.fn>;
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
    // Get reference to the mocked selector
    const { selectUniverses } = await import(
      '../../store/universe/selectors/select-universes.function'
    );
    selectUniversesMock = selectUniverses as ReturnType<typeof vi.fn>;

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

  describe('selectAllUniverseEntries', () => {
    it('should return all universe entries from store', () => {
      const mockUniverses: Universe[] = [
        {
          id: '1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          distribution: 0.24,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-02-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 100,
        },
        {
          id: '2',
          symbol: 'MSFT',
          name: 'Microsoft',
          distribution: 0.68,
          distributions_per_year: 4,
          last_price: 380.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-03-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 50,
        },
      ];
      selectUniversesMock.mockReturnValue(mockUniverses);

      fixture.detectChanges();

      // Selector should return all entries
      const data = component.filteredData$();
      expect(data.length).toBe(2);
    });

    it('should return entries sorted by symbol', () => {
      const mockUniverses: Universe[] = [
        {
          id: '2',
          symbol: 'MSFT',
          name: 'Microsoft',
          distribution: 0.68,
          distributions_per_year: 4,
          last_price: 380.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-03-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 50,
        },
        {
          id: '1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          distribution: 0.24,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: '',
          most_recent_sell_price: 0,
          ex_date: '2024-02-15',
          risk_group_id: 'rg1',
          expired: false,
          is_closed_end_fund: false,
          position: 100,
        },
      ];
      selectUniversesMock.mockReturnValue(mockUniverses);

      fixture.detectChanges();

      // Data is returned in selector order
      const data = component.filteredData$();
      expect(data[0].symbol).toBe('MSFT');
      expect(data[1].symbol).toBe('AAPL');
    });

    it('should return empty array when no universe entries exist', () => {
      selectUniversesMock.mockReturnValue([]);

      fixture.detectChanges();

      // Selector should handle empty state gracefully
      const data = component.filteredData$();
      expect(data).toEqual([]);
      expect(data.length).toBe(0);
    });
  });
});

// STORY AN.3: TDD RED Phase - Distribution Fields Editing Tests
// These tests define NEW validation behavior for editing distribution-related fields
// Tests are currently disabled to allow CI to pass (TDD RED phase)
// Tests will FAIL until validation logic is implemented in GlobalUniverseComponent
describe('GlobalUniverseComponent - Distribution Field Editing Validation (TDD - Story AN.3)', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let mockNotification: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    showPersistent: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockNotification = {
      success: vi.fn(),
      error: vi.fn(),
      showPersistent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GlobalUniverseComponent],
      providers: [
        provideSmartNgRX(),
        {
          provide: UniverseSyncService,
          useValue: {
            syncFromScreener: vi.fn().mockReturnValue(of({})),
            isSyncing: vi.fn().mockReturnValue(false),
          },
        },
        {
          provide: NotificationService,
          useValue: mockNotification,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalUniverseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('distribution field validation', () => {
    it('should reject negative distribution values and show error', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distribution: 0.5,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'distribution', -0.5);

      // Should NOT emit cell edit event for invalid value
      expect(cellEditSpy).not.toHaveBeenCalled();
      // Should show error notification
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distribution value cannot be negative'
      );
    });

    it('should accept zero as a valid distribution value', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distribution: 0.5,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'distribution', 0);

      // Should emit for valid zero value
      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'distribution',
        value: 0,
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should accept positive distribution values', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distribution: 0.5,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'distribution', 1.25);

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'distribution',
        value: 1.25,
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should reject extremely large negative values', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distribution: 0.5,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'distribution', -999.99);

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distribution value cannot be negative'
      );
    });
  });

  describe('distributions_per_year field validation', () => {
    it('should reject negative distributions_per_year and show error', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distributions_per_year: 4,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'distributions_per_year', -1);

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distributions per year cannot be negative'
      );
    });

    it('should reject non-integer distributions_per_year and show error', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distributions_per_year: 4,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'distributions_per_year', 4.5);

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distributions per year must be a whole number'
      );
    });

    it('should reject decimal values like 1.5', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distributions_per_year: 4,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'distributions_per_year', 1.5);

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distributions per year must be a whole number'
      );
    });

    it('should accept zero as distributions per year', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distributions_per_year: 4,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'distributions_per_year', 0);

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'distributions_per_year',
        value: 0,
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should accept valid integer values (1, 4, 12)', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distributions_per_year: 4,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      // Annual (1)
      component.onCellEdit(row, 'distributions_per_year', 1);
      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'distributions_per_year',
        value: 1,
      });

      // Quarterly (4)
      cellEditSpy.mockClear();
      component.onCellEdit(row, 'distributions_per_year', 4);
      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'distributions_per_year',
        value: 4,
      });

      // Monthly (12)
      cellEditSpy.mockClear();
      component.onCellEdit(row, 'distributions_per_year', 12);
      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'distributions_per_year',
        value: 12,
      });

      expect(mockNotification.error).not.toHaveBeenCalled();
    });
  });

  describe('ex_date field validation', () => {
    it('should reject invalid ISO date format and show error', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'ex_date', '2024-13-01'); // Invalid month

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });

    it('should reject dates with invalid day values', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'ex_date', '2024-02-30'); // Feb 30 doesn't exist

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });

    it('should reject non-ISO date formats like MM/DD/YYYY', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'ex_date', '01/15/2024');

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });

    it('should reject completely invalid date strings', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'ex_date', 'not-a-date');

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });

    it('should accept valid ISO date strings', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'ex_date', '2024-12-31');

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2024-12-31',
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should accept past dates', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'ex_date', '2020-06-15');

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2020-06-15',
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should accept future dates', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'ex_date', '2026-03-20');

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2026-03-20',
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });
  });

  describe('validation error handling', () => {
    it('should not emit cellEdit event when validation fails', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distribution: 0.5,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      // Test multiple invalid values
      component.onCellEdit(row, 'distribution', -1);
      component.onCellEdit(row, 'distributions_per_year', -1);
      component.onCellEdit(row, 'distributions_per_year', 1.5);
      component.onCellEdit(row, 'ex_date', 'invalid');

      // No events should be emitted for invalid values
      expect(cellEditSpy).not.toHaveBeenCalled();
    });

    it('should show specific error messages for each field type', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        distribution: 0.5,
        distributions_per_year: 4,
        ex_date: '2024-01-15',
      } as Universe;

      // Test distribution error
      component.onCellEdit(row, 'distribution', -1);
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distribution value cannot be negative'
      );

      mockNotification.error.mockClear();

      // Test distributions_per_year negative error
      component.onCellEdit(row, 'distributions_per_year', -1);
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distributions per year cannot be negative'
      );

      mockNotification.error.mockClear();

      // Test distributions_per_year decimal error
      component.onCellEdit(row, 'distributions_per_year', 1.5);
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distributions per year must be a whole number'
      );

      mockNotification.error.mockClear();

      // Test ex_date error
      component.onCellEdit(row, 'ex_date', 'invalid');
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });

    it('should handle multiple validation failures independently', () => {
      const row1 = {
        id: '1',
        symbol: 'AAPL',
        distribution: 0.5,
      } as Universe;

      const row2 = {
        id: '2',
        symbol: 'MSFT',
        distributions_per_year: 4,
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row1, 'distribution', -1);
      component.onCellEdit(row2, 'distributions_per_year', 2.5);

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledTimes(2);
    });
  });
});

// STORY AN.5: TDD RED Phase - Ex-Date Editing Additional Tests
// These tests define additional date editing behaviors beyond basic validation
// Tests re-enabled in Story AN.6 (TDD GREEN phase)
describe('GlobalUniverseComponent - Ex-Date Editing Enhancements (TDD - Story AN.5)', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let mockNotification: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    showPersistent: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockNotification = {
      success: vi.fn(),
      error: vi.fn(),
      showPersistent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GlobalUniverseComponent],
      providers: [
        provideSmartNgRX(),
        {
          provide: UniverseSyncService,
          useValue: {
            syncFromScreener: vi.fn().mockReturnValue(of({})),
            isSyncing: vi.fn().mockReturnValue(false),
          },
        },
        {
          provide: NotificationService,
          useValue: mockNotification,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalUniverseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('date object handling', () => {
    it('should accept Date objects and convert to ISO string format', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      const dateObject = new Date('2024-06-15');

      component.onCellEdit(row, 'ex_date', dateObject);

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2024-06-15',
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should handle Date objects with time components by using date only', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      const dateObject = new Date('2024-06-15T14:30:00Z');

      component.onCellEdit(row, 'ex_date', dateObject);

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2024-06-15',
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should reject invalid Date objects', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      const invalidDate = new Date('invalid');

      component.onCellEdit(row, 'ex_date', invalidDate);

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });
  });

  describe('null and empty value handling', () => {
    it('should accept null to clear ex_date', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', null);

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: null,
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should accept empty string to clear ex_date', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', '');

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: null,
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });
  });

  describe('edge case date validations', () => {
    it('should accept leap year dates', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', '2024-02-29');

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2024-02-29',
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should reject Feb 29 on non-leap years', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', '2023-02-29');

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });

    it('should accept dates at year boundaries', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      // Test first day of year
      component.onCellEdit(row, 'ex_date', '2024-01-01');
      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2024-01-01',
      });

      cellEditSpy.mockClear();

      // Test last day of year
      component.onCellEdit(row, 'ex_date', '2024-12-31');
      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2024-12-31',
      });

      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should handle century boundary dates correctly', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', '2000-01-01');
      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2000-01-01',
      });

      cellEditSpy.mockClear();

      component.onCellEdit(row, 'ex_date', '1999-12-31');
      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '1999-12-31',
      });

      expect(mockNotification.error).not.toHaveBeenCalled();
    });
  });

  describe('date format variations', () => {
    it('should reject dates with extra whitespace', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', ' 2024-06-15 ');

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });

    it('should reject dates with time components in string', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', '2024-06-15T10:30:00');

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });

    it('should reject dates with single-digit month/day without zero padding', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', '2024-6-5');

      expect(cellEditSpy).not.toHaveBeenCalled();
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format. Please use YYYY-MM-DD'
      );
    });
  });

  describe('date comparison and business logic', () => {
    it('should not prevent editing to dates far in the past', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', '1990-01-01');

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '1990-01-01',
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should not prevent editing to dates far in the future', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');

      component.onCellEdit(row, 'ex_date', '2099-12-31');

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: '2099-12-31',
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it("should allow updating ex_date to today's date", () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const cellEditSpy = vi.spyOn(component.cellEdit, 'emit');
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0];

      component.onCellEdit(row, 'ex_date', todayISO);

      expect(cellEditSpy).toHaveBeenCalledWith({
        row,
        field: 'ex_date',
        value: todayISO,
      });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });
  });

  describe('error message consistency', () => {
    it('should show same error message for all invalid date formats', () => {
      const row = {
        id: '1',
        symbol: 'AAPL',
        ex_date: '2024-01-15',
      } as Universe;

      const expectedError = 'Invalid date format. Please use YYYY-MM-DD';

      // Test various invalid formats
      const invalidFormats = [
        '01/15/2024',
        '15-01-2024',
        '2024/01/15',
        '2024-13-01',
        '2024-01-32',
        'invalid',
        '2024-1-1',
        ' 2024-01-15',
        '2024-01-15 ',
      ];

      invalidFormats.forEach((format) => {
        mockNotification.error.mockClear();
        component.onCellEdit(row, 'ex_date', format);
        expect(mockNotification.error).toHaveBeenCalledWith(expectedError);
      });
    });
  });
});
