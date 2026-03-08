import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { StatePersistenceService } from '../shared/services/state-persistence.service';
import { AccountPanelComponent } from './account-panel.component';
import { DividendDepositsComponentService } from './dividend-deposits/dividend-deposits-component.service';

// Mock the entire selectTrades module to avoid SmartNgRX initialization
vi.mock('../store/trades/selectors/select-trades.function', () => ({
  selectTrades: vi.fn().mockReturnValue([]),
}));

// Mock selectTradesEntity to avoid SmartNgRX initialization
vi.mock('../store/trades/selectors/select-trades-entity.function', () => ({
  selectTradesEntity: vi.fn().mockReturnValue([]),
}));

// Mock selectUniverses to avoid SmartNgRX initialization from AddPositionDialogComponent
vi.mock('../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));

// Mock selectTopEntities to avoid SmartNgRX initialization
vi.mock('../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue([]),
}));

// Mock selectAccountsEntity to avoid SmartNgRX initialization
vi.mock('../store/accounts/selectors/select-accounts-entity.function', () => ({
  selectAccountsEntity: vi.fn().mockReturnValue([]),
}));

// Mock selectAccounts to avoid SmartNgRX initialization
vi.mock('../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));

// Mock selectDivDepositEntity to avoid SmartNgRX initialization
vi.mock('../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: vi.fn().mockReturnValue([]),
}));

// Mock selectDivDepositTypes to avoid SmartNgRX initialization from DivDepModal
vi.mock(
  '../store/div-deposit-types/selectors/select-div-deposit-types.function',
  () => ({
    selectDivDepositTypes: vi.fn().mockReturnValue([]),
  })
);

// Mock selectDivDepositTypeEntity to avoid SmartNgRX initialization
vi.mock(
  '../store/div-deposit-types/selectors/select-div-deposit-type-entity.function',
  () => ({
    selectDivDepositTypeEntity: vi.fn().mockReturnValue({}),
  })
);

describe('AccountPanelComponent', () => {
  let component: AccountPanelComponent;
  let fixture: ComponentFixture<AccountPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountPanelComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPanelComponent);
    component = fixture.componentInstance;
  });

  it('should render tab nav bar', () => {
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[mat-tab-nav-bar]')
    ).toBeTruthy();
  });

  it('should render four tab links', () => {
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('[mat-tab-link]');
    expect(links.length).toBe(4);
  });

  it('should have Summary tab', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Summary');
  });

  it('should have Open Positions tab', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Open Positions');
  });

  it('should have Sold Positions tab', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sold Positions');
  });

  it('should have Dividend Deposits tab', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Dividend Deposits');
  });

  it('should render router outlet', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  describe('onAddDividend via onAddClick', () => {
    let dialogClosedSubject: Subject<unknown>;
    let mockDialogRef: Partial<MatDialogRef<unknown>>;
    let mockDialog: Partial<MatDialog>;
    let addDivDepositSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      dialogClosedSubject = new Subject<unknown>();
      mockDialogRef = {
        afterClosed: vi
          .fn()
          .mockReturnValue(dialogClosedSubject.asObservable()),
      };
      mockDialog = {
        open: vi.fn().mockReturnValue(mockDialogRef),
      };

      Object.defineProperty(
        component,
        'dialog' as keyof AccountPanelComponent,
        {
          get: () => mockDialog,
          configurable: true,
        }
      );

      addDivDepositSpy = vi
        .spyOn(
          TestBed.inject(DividendDepositsComponentService),
          'addDivDeposit'
        )
        .mockImplementation(() => undefined);
    });

    it('should open DivDepModal dialog when on div-dep route', () => {
      Object.assign(component, {
        isDivDepRoute$: vi.fn().mockReturnValue(true),
      });
      component.onAddClick();
      expect(mockDialog.open).toHaveBeenCalledOnce();
    });

    it('should call addDivDeposit when dialog closes with a result', () => {
      Object.assign(component, {
        isDivDepRoute$: vi.fn().mockReturnValue(true),
      });
      component.onAddClick();
      const mockResult = {
        date: new Date(),
        amount: 0.5,
        divDepositTypeId: 'type-1',
        universeId: 'universe-1',
      };
      dialogClosedSubject.next(mockResult);
      expect(addDivDepositSpy).toHaveBeenCalledWith(mockResult);
    });

    it('should not call addDivDeposit when dialog closes with null', () => {
      Object.assign(component, {
        isDivDepRoute$: vi.fn().mockReturnValue(true),
      });
      component.onAddClick();
      dialogClosedSubject.next(null);
      expect(addDivDepositSpy).not.toHaveBeenCalled();
    });

    it('should not call addDivDeposit when dialog closes with undefined', () => {
      Object.assign(component, {
        isDivDepRoute$: vi.fn().mockReturnValue(true),
      });
      component.onAddClick();
      dialogClosedSubject.next(undefined);
      expect(addDivDepositSpy).not.toHaveBeenCalled();
    });

    it('should not call addDivDeposit when result lacks divDepositTypeId', () => {
      Object.assign(component, {
        isDivDepRoute$: vi.fn().mockReturnValue(true),
      });
      component.onAddClick();
      dialogClosedSubject.next({ date: new Date(), amount: 0.5 });
      expect(addDivDepositSpy).not.toHaveBeenCalled();
    });
  });

  describe('Tab Selection Persistence', () => {
    let mockStatePersistenceService: {
      saveState: ReturnType<typeof vi.fn>;
      loadState: ReturnType<typeof vi.fn>;
      clearState: ReturnType<typeof vi.fn>;
    };
    let persistenceFixture: ComponentFixture<AccountPanelComponent>;
    let persistenceComponent: AccountPanelComponent;

    beforeEach(async () => {
      mockStatePersistenceService = {
        saveState: vi.fn(),
        loadState: vi.fn().mockReturnValue(null),
        clearState: vi.fn(),
      };

      TestBed.resetTestingModule();
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

      persistenceFixture = TestBed.createComponent(AccountPanelComponent);
      persistenceComponent = persistenceFixture.componentInstance;
    });

    it('should save selected tab route per account ID', () => {
      const accountId = 'account-1';
      Object.defineProperty(persistenceComponent, 'accountId', {
        get: () => accountId,
        configurable: true,
      });

      persistenceComponent.onTabChange('open');

      expect(mockStatePersistenceService.saveState).toHaveBeenCalledWith(
        'account-tab-account-1',
        'open'
      );
    });

    it('should load saved tab for selected account on init', () => {
      const accountId = 'account-1';
      Object.defineProperty(persistenceComponent, 'accountId', {
        get: () => accountId,
        configurable: true,
      });
      mockStatePersistenceService.loadState.mockReturnValue('sold');

      persistenceComponent.ngOnInit();

      expect(mockStatePersistenceService.loadState).toHaveBeenCalledWith(
        'account-tab-account-1',
        null
      );
    });

    it('should default to summary tab when no saved selection', () => {
      const accountId = 'account-1';
      Object.defineProperty(persistenceComponent, 'accountId', {
        get: () => accountId,
        configurable: true,
      });
      mockStatePersistenceService.loadState.mockReturnValue(null);

      const router = TestBed.inject(Router);
      const routerSpy = vi.spyOn(router, 'navigate');

      persistenceComponent.ngOnInit();
      persistenceFixture.detectChanges();

      // Should not navigate to a specific sub-tab - stays on summary (default)
      expect(routerSpy).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('/open')])
      );
    });

    it('should maintain independent tab state per account', () => {
      mockStatePersistenceService.loadState.mockImplementation(
        function getState(key: string) {
          if (key === 'account-tab-account-1') {
            return 'open';
          }
          if (key === 'account-tab-account-2') {
            return 'sold';
          }
          return null;
        }
      );

      // Switch to account-1 and verify it loads 'open'
      Object.defineProperty(persistenceComponent, 'accountId', {
        get: () => 'account-1',
        configurable: true,
      });
      persistenceComponent.ngOnInit();

      expect(mockStatePersistenceService.loadState).toHaveBeenCalledWith(
        'account-tab-account-1',
        null
      );
    });

    it('should navigate to saved tab route on account switch', () => {
      const accountId = 'account-1';
      Object.defineProperty(persistenceComponent, 'accountId', {
        get: () => accountId,
        configurable: true,
      });
      mockStatePersistenceService.loadState.mockReturnValue('div-dep');

      const router = TestBed.inject(Router);
      const routerSpy = vi.spyOn(router, 'navigate');
      persistenceComponent.ngOnInit();

      expect(routerSpy).toHaveBeenCalledWith([
        '/account',
        accountId,
        'div-dep',
      ]);
    });

    it('should handle invalid saved tab gracefully', () => {
      const accountId = 'account-1';
      Object.defineProperty(persistenceComponent, 'accountId', {
        get: () => accountId,
        configurable: true,
      });
      mockStatePersistenceService.loadState.mockReturnValue('nonexistent-tab');

      expect(() => {
        persistenceComponent.ngOnInit();
        persistenceFixture.detectChanges();
      }).not.toThrow();
    });
  });
});
