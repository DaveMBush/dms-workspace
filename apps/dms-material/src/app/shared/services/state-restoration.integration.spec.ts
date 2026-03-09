import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { StatePersistenceService } from '../../shared/services/state-persistence.service';
import { AccountPanelComponent } from '../../account-panel/account-panel.component';

// Mock SmartNgRX dependencies to avoid initialization
vi.mock('../../store/trades/selectors/select-trades.function', () => ({
  selectTrades: vi.fn().mockReturnValue([]),
}));
vi.mock('../../store/trades/selectors/select-trades-entity.function', () => ({
  selectTradesEntity: vi.fn().mockReturnValue([]),
}));
vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));
vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue([]),
}));
vi.mock(
  '../../store/accounts/selectors/select-accounts-entity.function',
  () => ({
    selectAccountsEntity: vi.fn().mockReturnValue([]),
  })
);
vi.mock('../../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));
vi.mock('../../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: vi.fn().mockReturnValue([]),
}));
vi.mock(
  '../../store/div-deposit-types/selectors/select-div-deposit-types.function',
  () => ({
    selectDivDepositTypes: vi.fn().mockReturnValue([]),
  })
);
vi.mock(
  '../../store/div-deposit-types/selectors/select-div-deposit-type-entity.function',
  () => ({
    selectDivDepositTypeEntity: vi.fn().mockReturnValue({}),
  })
);

describe('State Restoration on App Load', () => {
  let mockStatePersistenceService: {
    saveState: ReturnType<typeof vi.fn>;
    loadState: ReturnType<typeof vi.fn>;
    clearState: ReturnType<typeof vi.fn>;
  };
  let fixture: ComponentFixture<AccountPanelComponent>;
  let component: AccountPanelComponent;
  let router: Router;

  beforeEach(async () => {
    mockStatePersistenceService = {
      saveState: vi.fn(),
      loadState: vi.fn().mockReturnValue(null),
      clearState: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AccountPanelComponent],
      providers: [
        provideRouter([]),
        {
          provide: StatePersistenceService,
          useValue: mockStatePersistenceService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPanelComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should restore global tab selection before account selection', () => {
    const callOrder: string[] = [];
    mockStatePersistenceService.loadState.mockImplementation(function trackLoad(
      key: string
    ) {
      callOrder.push(key);
      if (key === 'global-tab-selection') {
        return 'screener';
      }
      if (key === 'selected-account') {
        return 'account-1';
      }
      return null;
    });

    component.ngOnInit();

    const globalTabIndex = callOrder.indexOf('global-tab-selection');
    const selectedAccountIndex = callOrder.indexOf('selected-account');
    expect(globalTabIndex).toBeGreaterThanOrEqual(0);
    expect(selectedAccountIndex).toBeGreaterThanOrEqual(0);
    expect(globalTabIndex).toBeLessThan(selectedAccountIndex);
  });

  it('should restore account selection after global tab', () => {
    const callOrder: string[] = [];
    mockStatePersistenceService.loadState.mockImplementation(function trackLoad(
      key: string
    ) {
      callOrder.push(key);
      if (key === 'global-tab-selection') {
        return 'screener';
      }
      if (key === 'selected-account') {
        return 'account-1';
      }
      if (key === 'account-tab-account-1') {
        return 'open';
      }
      return null;
    });

    component.ngOnInit();

    const selectedAccountIndex = callOrder.indexOf('selected-account');
    const accountTabIndex = callOrder.indexOf('account-tab-account-1');
    expect(selectedAccountIndex).toBeGreaterThanOrEqual(0);
    expect(accountTabIndex).toBeGreaterThanOrEqual(0);
    expect(selectedAccountIndex).toBeLessThan(accountTabIndex);
  });

  it('should restore account tab for restored account', () => {
    const accountId = 'account-1';
    Object.defineProperty(component, 'accountId', {
      get: () => accountId,
      configurable: true,
    });
    mockStatePersistenceService.loadState.mockImplementation(function getState(
      key: string
    ) {
      if (key === 'account-tab-' + accountId) {
        return 'sold';
      }
      return null;
    });

    const routerSpy = vi.spyOn(router, 'navigate');
    component.ngOnInit();

    expect(routerSpy).toHaveBeenCalledWith(['/account', accountId, 'sold']);
  });

  it('should handle no saved state gracefully', () => {
    mockStatePersistenceService.loadState.mockReturnValue(null);

    const routerSpy = vi.spyOn(router, 'navigate');

    expect(function initSafely() {
      component.ngOnInit();
      fixture.detectChanges();
    }).not.toThrow();

    expect(routerSpy).not.toHaveBeenCalled();
  });

  it('should handle partial state with only some values saved', () => {
    mockStatePersistenceService.loadState.mockImplementation(function getState(
      key: string
    ) {
      if (key === 'global-tab-selection') {
        return 'distribution';
      }
      return null;
    });

    const routerSpy = vi.spyOn(router, 'navigate');

    expect(function initSafely() {
      component.ngOnInit();
      fixture.detectChanges();
    }).not.toThrow();

    // With no account selected and no accountId route param, should not navigate
    expect(routerSpy).not.toHaveBeenCalled();
  });

  it('should complete full restoration in correct order', () => {
    const accountId = 'account-5';
    Object.defineProperty(component, 'accountId', {
      get: () => accountId,
      configurable: true,
    });

    const callOrder: string[] = [];
    mockStatePersistenceService.loadState.mockImplementation(
      function trackAndReturn(key: string) {
        callOrder.push(key);
        if (key === 'global-tab-selection') {
          return 'screener';
        }
        if (key === 'selected-account') {
          return accountId;
        }
        if (key === 'account-tab-' + accountId) {
          return 'div-dep';
        }
        return null;
      }
    );

    component.ngOnInit();

    // All three state keys should be loaded in order
    expect(callOrder).toContain('global-tab-selection');
    expect(callOrder).toContain('selected-account');
    expect(callOrder).toContain('account-tab-' + accountId);

    // Order: global tab → selected account → account tab
    const globalIdx = callOrder.indexOf('global-tab-selection');
    const accountIdx = callOrder.indexOf('selected-account');
    const tabIdx = callOrder.indexOf('account-tab-' + accountId);
    expect(globalIdx).toBeLessThan(accountIdx);
    expect(accountIdx).toBeLessThan(tabIdx);
  });

  it('should handle invalid saved state gracefully', () => {
    Object.defineProperty(component, 'accountId', {
      get: () => 'account-1',
      configurable: true,
    });

    mockStatePersistenceService.loadState.mockReturnValue({
      corrupted: true,
    });

    expect(function initSafely() {
      component.ngOnInit();
      fixture.detectChanges();
    }).not.toThrow();
  });
});
