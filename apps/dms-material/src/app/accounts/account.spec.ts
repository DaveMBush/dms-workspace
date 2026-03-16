import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';

import { StatePersistenceService } from '../shared/services/state-persistence.service';

// Mock upstream selectors BEFORE anything else
vi.mock('../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue(signal({ entities: {} })),
}));

vi.mock('../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: signal([]),
}));

import { Account } from './account';
import { AccountComponentService } from './account-component.service';
import { Account as AccountInterface } from '../store/accounts/account.interface';

describe('Account', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;
  let mockAccountService: {
    init: ReturnType<typeof vi.fn>;
    addAccount: ReturnType<typeof vi.fn>;
    editAccount: ReturnType<typeof vi.fn>;
    cancelEdit: ReturnType<typeof vi.fn>;
    saveEdit: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
  };
  let mockAccounts: AccountInterface[];
  let mockStatePersistenceService: {
    saveState: ReturnType<typeof vi.fn>;
    loadState: ReturnType<typeof vi.fn>;
    clearState: ReturnType<typeof vi.fn>;
  };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockStatePersistenceService = {
      saveState: vi.fn(),
      loadState: vi.fn().mockReturnValue(null),
      clearState: vi.fn(),
    };

    mockAccountService = {
      init: vi.fn(),
      addAccount: vi.fn(),
      editAccount: vi.fn(),
      cancelEdit: vi.fn(),
      saveEdit: vi.fn(),
      deleteAccount: vi.fn(),
    };

    mockAccounts = [
      {
        id: '1',
        name: 'Account 1',
        openTrades: [],
        soldTrades: [],
        divDeposits: [],
        months: [],
      },
      {
        id: '2',
        name: 'Account 2',
        openTrades: [],
        soldTrades: [],
        divDeposits: [],
        months: [],
      },
    ];

    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        provideRouter([]),
        {
          provide: StatePersistenceService,
          useValue: mockStatePersistenceService,
        },
      ],
    })
      .overrideComponent(Account, {
        set: {
          viewProviders: [
            { provide: AccountComponentService, useValue: mockAccountService },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    mockRouter = {
      navigate: vi.spyOn(router, 'navigate').mockResolvedValue(true),
    };

    // Mock the accounts$ signal
    component.accounts$ = signal(mockAccounts) as any;
    component.top = { '1': { id: '1', name: 'Top 1' } } as any;
  });

  describe('initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with accounts array', () => {
      const accounts = component.accountsArray$();
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts).toHaveLength(2);
    });
  });

  describe('Add Functionality', () => {
    it('should have add account button', () => {
      fixture.detectChanges();
      const addButton = fixture.nativeElement.querySelector('.add-button');
      expect(addButton).toBeTruthy();
    });

    it('should delegate to service when addAccount is called', () => {
      (component as any).addAccount();
      expect(mockAccountService.addAccount).toHaveBeenCalled();
    });

    it('should render inline editor when addingNode is set', () => {
      component.addingNode = 'new';
      mockAccounts.push({
        id: 'new',
        name: 'New Account',
        openTrades: [],
        soldTrades: [],
        divDeposits: [],
        months: [],
      });
      component.accounts$ = signal(mockAccounts) as any;
      fixture.detectChanges();

      const editor = fixture.nativeElement.querySelector('dms-node-editor');
      expect(editor).toBeTruthy();
    });

    it('should hide account link when editing', () => {
      component.addingNode = '1';
      fixture.detectChanges();

      const accountLinks = fixture.nativeElement.querySelectorAll(
        'a[routerlink*="/account/1"]'
      );
      expect(accountLinks.length).toBe(0);
    });
  });

  describe('Save Functionality', () => {
    it('should call service saveEdit when invoked', () => {
      const account = mockAccounts[0];
      (component as any).saveEdit(account);
      expect(mockAccountService.saveEdit).toHaveBeenCalledWith(account);
    });
  });

  describe('Cancel Functionality', () => {
    it('should call service cancelEdit when invoked', () => {
      const account = mockAccounts[0];
      (component as any).cancelEdit(account);
      expect(mockAccountService.cancelEdit).toHaveBeenCalledWith(account);
    });
  });

  describe('Navigation', () => {
    it('should have onAccountSelect method', () => {
      expect(component.onAccountSelect).toBeDefined();
    });

    it('should have navigateToGlobal method', () => {
      expect(component.navigateToGlobal).toBeDefined();
    });
  });

  describe('Edit Functionality', () => {
    it('should have editAccount method', () => {
      expect((component as any).editAccount).toBeDefined();
    });

    it('should delegate to service when editAccount is called', () => {
      mockAccountService.editAccount = vi.fn();
      const account = mockAccounts[0];
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any;
      (component as any).editAccount(mockEvent, account);
      expect(mockAccountService.editAccount).toHaveBeenCalledWith(account);
    });

    it('should render inline editor when editingNode is set', () => {
      component.editingNode = '1';
      fixture.detectChanges();

      const editor = fixture.nativeElement.querySelector('dms-node-editor');
      expect(editor).toBeTruthy();
    });

    it('should hide account link when editing that account', () => {
      component.editingNode = '1';
      fixture.detectChanges();

      const accountLinks = fixture.nativeElement.querySelectorAll(
        'a[routerlink*="/account/1"]'
      );
      expect(accountLinks.length).toBe(0);
    });

    it('should not allow editing while adding account', () => {
      component.addingNode = 'new';
      component.editingNode = '';

      const account = mockAccounts[0];
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any;
      (component as any).editAccount(mockEvent, account);

      // Should not set editingNode when adding
      expect(component.editingNode).toBe('');
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no accounts', () => {
      component.accounts$ = signal([]) as any;
      fixture.detectChanges();

      const emptyMessage =
        fixture.nativeElement.querySelector('.empty-message');
      expect(emptyMessage).toBeTruthy();
    });

    it('should not show empty message when accounts exist', () => {
      fixture.detectChanges();

      const emptyMessage =
        fixture.nativeElement.querySelector('.empty-message');
      expect(emptyMessage).toBeFalsy();
    });
  });

  describe('Delete Functionality', () => {
    it('should have delete button for each account', () => {
      fixture.detectChanges();

      const deleteButtons =
        fixture.nativeElement.querySelectorAll('.delete-button');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should delegate to service when deleteAccount is called', () => {
      mockAccountService.deleteAccount = vi.fn();
      const account = mockAccounts[0];
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any;
      (component as any).deleteAccount(mockEvent, account);
      expect(mockAccountService.deleteAccount).toHaveBeenCalledWith(account);
    });

    it('should not show delete button when editing', () => {
      component.editingNode = '1';
      fixture.detectChanges();

      const deleteButton = fixture.nativeElement.querySelector(
        'a[routerlink*="/account/1"] .delete-button'
      );
      expect(deleteButton).toBeFalsy();
    });

    it('should not show delete button when adding', () => {
      component.addingNode = '1';
      fixture.detectChanges();

      const deleteButton = fixture.nativeElement.querySelector(
        'a[routerlink*="/account/1"] .delete-button'
      );
      expect(deleteButton).toBeFalsy();
    });
  });

  describe('Global Tab Selection Persistence', () => {
    it('should save selected global tab to state service when navigating', () => {
      component.navigateToGlobal('universe');

      expect(mockStatePersistenceService.saveState).toHaveBeenCalledWith(
        'global-tab-selection',
        'universe'
      );
    });

    it('should load saved global tab selection on component init', () => {
      mockStatePersistenceService.loadState.mockReturnValue('screener');

      component.ngOnInit();

      expect(mockStatePersistenceService.loadState).toHaveBeenCalledWith(
        'global-tab-selection',
        null
      );
    });

    it('should default to no tab selection when no saved state exists', () => {
      mockStatePersistenceService.loadState.mockReturnValue(null);

      component.ngOnInit();

      expect(mockStatePersistenceService.loadState).toHaveBeenCalledWith(
        'global-tab-selection',
        null
      );
    });

    it('should navigate to saved global tab on init', () => {
      mockStatePersistenceService.loadState.mockReturnValue('universe');

      component.ngOnInit();
      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/global', 'universe']);
    });

    it('should handle invalid saved tab gracefully', () => {
      mockStatePersistenceService.loadState.mockReturnValue('nonexistent-tab');

      expect(() => {
        component.ngOnInit();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('Account Selection Persistence', () => {
    it('should save selected account ID to state service on selection', () => {
      const account = mockAccounts[0];

      component.onAccountSelect(account);

      expect(mockStatePersistenceService.saveState).toHaveBeenCalledWith(
        'selected-account',
        account.id
      );
    });

    it('should load saved account ID on component init', () => {
      mockStatePersistenceService.loadState.mockReturnValue('1');

      component.ngOnInit();

      expect(mockStatePersistenceService.loadState).toHaveBeenCalledWith(
        'selected-account',
        null
      );
    });

    it('should handle no saved account gracefully', () => {
      mockStatePersistenceService.loadState.mockReturnValue(null);

      component.ngOnInit();

      expect(mockRouter.navigate).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('/account')])
      );
    });

    it('should navigate to saved account on init', () => {
      mockStatePersistenceService.loadState.mockReturnValue('1');

      component.ngOnInit();
      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/account', '1']);
    });

    it('should handle invalid/deleted account ID gracefully', () => {
      mockStatePersistenceService.loadState.mockReturnValue('nonexistent-id');

      expect(() => {
        component.ngOnInit();
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should clear saved account when account is deleted', () => {
      const event = new Event('click');
      const account = mockAccounts[0];

      component.onAccountSelect(account);
      mockStatePersistenceService.saveState.mockClear();
      (component as any).deleteAccount(event, account);

      expect(mockStatePersistenceService.clearState).toHaveBeenCalledWith(
        'selected-account'
      );
    });

    it('should clear account tab state when account is deleted', () => {
      const event = new Event('click');
      const account = mockAccounts[0];

      (component as any).deleteAccount(event, account);

      expect(mockStatePersistenceService.clearState).toHaveBeenCalledWith(
        'account-tab-' + account.id
      );
    });
  });
});
