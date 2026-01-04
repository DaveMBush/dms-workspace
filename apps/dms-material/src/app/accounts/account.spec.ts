import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

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
    cancelEdit: ReturnType<typeof vi.fn>;
    saveEdit: ReturnType<typeof vi.fn>;
  };
  let mockAccounts: AccountInterface[];

  beforeEach(async () => {
    mockAccountService = {
      init: vi.fn(),
      addAccount: vi.fn(),
      cancelEdit: vi.fn(),
      saveEdit: vi.fn(),
    };

    mockAccounts = [
      { id: '1', name: 'Account 1', trades: [], divDeposits: [], months: [] },
      { id: '2', name: 'Account 2', trades: [], divDeposits: [], months: [] },
    ];

    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [provideRouter([])],
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
        trades: [],
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
});
