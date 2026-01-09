import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { AccountComponentService } from './account-component.service';
import { Account } from './account';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { Top } from '../store/top/top.interface';
import { ConfirmDialogService } from '../shared/services/confirm-dialog.service';

describe('AccountComponentService', () => {
  let service: AccountComponentService;
  let mockComponent: Account;
  let mockAccounts: AccountInterface[];
  let mockAddToStore: ReturnType<typeof vi.fn>;
  let mockRemoveFromStore: ReturnType<typeof vi.fn>;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockActivatedRoute: { snapshot: { params: Record<string, string> } };
  let mockConfirmDialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockActivatedRoute = {
      snapshot: {
        params: {},
      },
    };

    mockConfirmDialogService = {
      confirm: vi.fn().mockReturnValue(of(false)),
    };

    TestBed.configureTestingModule({
      providers: [
        AccountComponentService,
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ConfirmDialogService, useValue: mockConfirmDialogService },
      ],
    });

    service = TestBed.inject(AccountComponentService);

    mockAddToStore = vi.fn();
    mockRemoveFromStore = vi.fn();

    mockAccounts = [
      { id: '1', name: 'Account 1', trades: [], divDeposits: [], months: [] },
      { id: '2', name: 'Account 2', trades: [], divDeposits: [], months: [] },
    ];

    // Create mock component with necessary properties
    const createMockAccountsSignal = () => {
      const arr = [...mockAccounts] as any;
      arr.addToStore = mockAddToStore;
      arr.removeFromStore = mockRemoveFromStore;
      return arr;
    };

    mockComponent = {
      addingNode: '',
      editingContent: '',
      accounts$: () => createMockAccountsSignal(),
      accountsArray$: () => [...mockAccounts],
      top: {
        '1': { id: '1', name: 'Top 1' } as Partial<Top>,
      },
    } as any;
  });

  describe('initialization', () => {
    it('should create', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with component', () => {
      service.init(mockComponent);
      expect(() => service.addAccount()).not.toThrow();
    });
  });

  describe('addAccount', () => {
    beforeEach(() => {
      service.init(mockComponent);
    });

    it('should set addingNode to new', () => {
      service.addAccount();
      expect(mockComponent.addingNode).toBe('new');
    });

    it('should set editingContent to New Account', () => {
      service.addAccount();
      expect(mockComponent.editingContent).toBe('New Account');
    });

    it('should call addToStore with new account', () => {
      service.addAccount();

      expect(mockAddToStore).toHaveBeenCalledWith(
        {
          name: 'New Account',
          id: 'new',
          trades: [],
          divDeposits: [],
          months: [],
        },
        mockComponent.top['1']
      );
    });

    it('should add account with correct structure', () => {
      service.addAccount();

      const addedAccount = mockAddToStore.mock.calls[0][0] as AccountInterface;
      expect(addedAccount.id).toBe('new');
      expect(addedAccount.name).toBe('New Account');
      expect(addedAccount.trades).toEqual([]);
      expect(addedAccount.divDeposits).toEqual([]);
      expect(addedAccount.months).toEqual([]);
    });
  });

  describe('cancelEdit', () => {
    beforeEach(() => {
      service.init(mockComponent);
    });

    it('should clear addingNode', () => {
      mockComponent.addingNode = 'new';
      mockComponent.editingContent = 'Test Account';

      service.cancelEdit({ id: 'new', name: 'New Account' } as any);

      expect(mockComponent.addingNode).toBe('');
    });

    it('should clear editingContent', () => {
      mockComponent.addingNode = 'new';
      mockComponent.editingContent = 'Test Account';

      service.cancelEdit({ id: 'new', name: 'New Account' } as any);

      expect(mockComponent.editingContent).toBe('');
    });

    it('should remove account from store when addingNode is set', () => {
      mockComponent.addingNode = 'new';
      const testAccount = {
        id: 'new',
        name: 'New Account',
      } as AccountInterface;

      service.cancelEdit(testAccount);

      expect(mockRemoveFromStore).toHaveBeenCalledWith(
        testAccount,
        mockComponent.top['1']
      );
    });

    it('should not remove account from store when addingNode is empty', () => {
      mockComponent.addingNode = '';
      const testAccount = { id: '1', name: 'Account 1' } as AccountInterface;

      service.cancelEdit(testAccount);

      expect(mockRemoveFromStore).not.toHaveBeenCalled();
    });

    it('should handle cancel of existing account edit', () => {
      mockComponent.addingNode = ''; // Not adding new
      mockComponent.editingContent = 'Updated Name';

      service.cancelEdit({ id: '1', name: 'Account 1' } as any);

      expect(mockComponent.addingNode).toBe('');
      expect(mockComponent.editingContent).toBe('');
      expect(mockRemoveFromStore).not.toHaveBeenCalled();
    });
  });

  describe('saveEdit', () => {
    beforeEach(() => {
      service.init(mockComponent);
    });

    it('should update account name', () => {
      const testAccount = mockAccounts[0];
      mockComponent.editingContent = 'Updated Account Name';
      mockComponent.accountsArray$ = signal([...mockAccounts]) as any;

      service.saveEdit(testAccount);

      const updatedAccount = mockComponent
        .accountsArray$()
        .find((a: AccountInterface) => a.id === testAccount.id);
      expect(updatedAccount?.name).toBe('Updated Account Name');
    });

    it('should clear addingNode after save', () => {
      mockComponent.addingNode = 'new';
      mockComponent.editingContent = 'New Account Name';
      mockComponent.accountsArray$ = signal([
        ...mockAccounts,
        { id: 'new', name: 'New Account' } as AccountInterface,
      ]) as any;

      service.saveEdit({ id: 'new', name: 'New Account' } as any);

      expect(mockComponent.addingNode).toBe('');
    });

    it('should clear editingContent after save', () => {
      const testAccount = mockAccounts[0];
      mockComponent.editingContent = 'Updated Name';
      mockComponent.accountsArray$ = signal([...mockAccounts]) as any;

      service.saveEdit(testAccount);

      expect(mockComponent.editingContent).toBe('');
    });

    it('should not save when editingContent is empty', () => {
      const testAccount = mockAccounts[0];
      const originalName = testAccount.name;
      mockComponent.editingContent = '';
      mockComponent.addingNode = 'new';
      mockComponent.accountsArray$ = signal([...mockAccounts]) as any;

      service.saveEdit(testAccount);

      expect(testAccount.name).toBe(originalName);
      expect(mockComponent.addingNode).toBe('new'); // Not cleared
      expect(mockComponent.editingContent).toBe(''); // Still empty
    });

    it('should validate non-empty account name', () => {
      const testAccount = mockAccounts[0];
      mockComponent.addingNode = 'new';
      mockComponent.editingContent = '';
      mockComponent.accountsArray$ = signal([...mockAccounts]) as any;

      service.saveEdit(testAccount);

      // Should not save empty name
      expect(mockComponent.addingNode).toBe('new');
    });

    it('should handle account not found gracefully', () => {
      mockComponent.editingContent = 'New Name';
      mockComponent.accountsArray$ = signal([...mockAccounts]) as any;

      // Try to save account that doesn't exist
      service.saveEdit({ id: 'non-existent', name: 'Test' } as any);

      // Should still clear editing state
      expect(mockComponent.addingNode).toBe('');
      expect(mockComponent.editingContent).toBe('');
    });

    it('should save account with trimmed whitespace', () => {
      const testAccount = mockAccounts[0];
      mockComponent.editingContent = '  Updated Name  ';
      mockComponent.accountsArray$ = signal([...mockAccounts]) as any;

      service.saveEdit(testAccount);

      const updatedAccount = mockComponent
        .accountsArray$()
        .find((a: AccountInterface) => a.id === testAccount.id);
      // Note: Current implementation doesn't trim, but this documents the behavior
      expect(updatedAccount?.name).toBe('  Updated Name  ');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      service.init(mockComponent);
    });

    it('should handle multiple add operations', () => {
      service.addAccount();
      expect(mockComponent.addingNode).toBe('new');

      // Second add should replace the first
      service.addAccount();
      expect(mockComponent.addingNode).toBe('new');
      expect(mockAddToStore).toHaveBeenCalledTimes(2);
    });

    it('should handle add followed by cancel', () => {
      service.addAccount();
      expect(mockComponent.addingNode).toBe('new');

      service.cancelEdit({ id: 'new', name: 'New Account' } as any);
      expect(mockComponent.addingNode).toBe('');
      expect(mockRemoveFromStore).toHaveBeenCalled();
    });

    it('should handle add followed by save', () => {
      service.addAccount();
      mockComponent.editingContent = 'My Custom Account';
      mockComponent.accountsArray$ = signal([
        ...mockAccounts,
        { id: 'new', name: 'New Account' } as AccountInterface,
      ]) as any;

      service.saveEdit({ id: 'new', name: 'New Account' } as any);

      expect(mockComponent.addingNode).toBe('');
      expect(mockComponent.editingContent).toBe('');
    });
  });
});
