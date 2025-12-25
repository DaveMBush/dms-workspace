# Story AH.5: Add Comprehensive Unit Tests for Account CRUD Operations

## Story

**As a** developer
**I want** comprehensive unit tests for all account CRUD operations
**So that** I can ensure account functionality works reliably and prevent regressions

## Context

**Current System:**

- RMS app has comprehensive test coverage for account operations
- Tests cover list, add, edit, delete functionality
- Tests cover edge cases, validation, error handling
- Achieves >80% code coverage

**Migration Target:**

- Match or exceed RMS test coverage in RMS-MATERIAL
- Test all account CRUD operations thoroughly
- Cover happy paths, edge cases, and error scenarios
- Ensure >80% code coverage for account component

## Acceptance Criteria

### Functional Requirements

- [ ] **CRITICAL** Test coverage matches or exceeds RMS app
- [ ] All account CRUD operations have unit tests
- [ ] Edge cases and error scenarios covered
- [ ] Mock all external dependencies
- [ ] Tests are fast and reliable
- [ ] > 80% code coverage for account component

### Technical Requirements

- [ ] Use Vitest for testing
- [ ] Mock SmartNgRX store operations
- [ ] Mock router and dialog services
- [ ] Test component methods in isolation
- [ ] Test reactive updates
- [ ] Follow AAA pattern (Arrange-Act-Assert)

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests

Create `apps/rms-material/src/app/accounts/account.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Account } from './account';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { SmartArray } from '@smarttools/smart-signals';

describe('Account Component', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;
  let mockRouter: any;
  let mockRoute: any;
  let mockDialog: any;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
    };

    mockRoute = {
      snapshot: {
        params: {},
      },
    };

    mockDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(true),
      }),
    };

    TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: MatDialog, useValue: mockDialog },
      ],
    });

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty signals', () => {
      expect(component.addingNode()).toBe('');
      expect(component.editingNode()).toBe('');
      expect(component.editingContent()).toBe('');
    });

    it('should load accounts list', () => {
      expect(component.accountsList).toBeDefined();
    });
  });

  describe('Add Account Functionality', () => {
    it('should have add account button', () => {
      const addButton = fixture.nativeElement.querySelector('.add-account-button');
      expect(addButton).toBeTruthy();
    });

    it('should create temporary account on add click', () => {
      const mockAddToStore = vi.fn();
      (component.accountsList as any).addToStore = mockAddToStore;
      component.top = { '1': {} as any };

      component.addAccount();

      expect(component.addingNode()).toBe('new');
      expect(component.editingContent()).toBe('New Account');
      expect(mockAddToStore).toHaveBeenCalled();
    });

    it('should show inline editor for new account', () => {
      component.addingNode.set('new');
      fixture.detectChanges();

      const editor = fixture.nativeElement.querySelector('rms-node-editor');
      expect(editor).toBeTruthy();
    });

    it('should validate non-empty account name on add', () => {
      const account = { id: 'new', name: 'New Account' } as AccountInterface;
      const mockAccounts = [account];
      vi.spyOn(component, 'accountsList').mockReturnValue(mockAccounts as any);

      component.addAccount();
      component.editingContent.set('');
      component.saveEdit(account);

      expect(component.addingNode()).toBe('');
    });

    it('should save account with valid name', () => {
      const account = { id: 'new', name: 'New Account' } as AccountInterface;
      const mockAccounts = [account];
      vi.spyOn(component, 'accountsList').mockReturnValue(mockAccounts as any);

      component.addAccount();
      component.editingContent.set('My Valid Account');
      component.saveEdit(account);

      expect(account.name).toBe('My Valid Account');
      expect(component.addingNode()).toBe('');
    });

    it('should clear state after successful add', () => {
      const account = { id: 'new', name: 'New Account' } as AccountInterface;
      const mockAccounts = [account];
      vi.spyOn(component, 'accountsList').mockReturnValue(mockAccounts as any);

      component.addAccount();
      component.editingContent.set('Valid Name');
      component.saveEdit(account);

      expect(component.addingNode()).toBe('');
      expect(component.editingNode()).toBe('');
      expect(component.editingContent()).toBe('');
    });

    it('should remove temporary account on cancel', () => {
      const account = { id: 'new', name: 'New Account' } as AccountInterface;
      const mockRemoveFromStore = vi.fn();
      (component.accountsList as any).removeFromStore = mockRemoveFromStore;
      component.top = { '1': {} as any };

      component.addAccount();
      component.addingNode.set('new');
      component.cancelEdit(account);

      expect(mockRemoveFromStore).toHaveBeenCalledWith(account, component.top['1']);
      expect(component.addingNode()).toBe('');
    });
  });

  describe('Edit Account Functionality', () => {
    it('should enter edit mode on editAccount call', () => {
      const account = { id: '123', name: 'Test Account' } as AccountInterface;

      component.editAccount(account);

      expect(component.editingNode()).toBe('123');
      expect(component.editingContent()).toBe('Test Account');
    });

    it('should not allow edit while adding', () => {
      const account = { id: '123', name: 'Test Account' } as AccountInterface;
      component.addingNode.set('new');

      component.editAccount(account);

      expect(component.editingNode()).toBe('');
    });

    it('should update account name on save', () => {
      const account = { id: '123', name: 'Old Name' } as AccountInterface;
      const mockAccounts = [account];
      vi.spyOn(component, 'accountsList').mockReturnValue(mockAccounts as any);

      component.editAccount(account);
      component.editingContent.set('New Name');
      component.saveEdit(account);

      expect(account.name).toBe('New Name');
      expect(component.editingNode()).toBe('');
    });

    it('should not update on empty name', () => {
      const account = { id: '123', name: 'Original Name' } as AccountInterface;
      const mockAccounts = [account];
      vi.spyOn(component, 'accountsList').mockReturnValue(mockAccounts as any);

      component.editAccount(account);
      component.editingContent.set('');
      component.saveEdit(account);

      expect(account.name).toBe('Original Name');
    });

    it('should clear state after successful edit', () => {
      const account = { id: '123', name: 'Test' } as AccountInterface;
      const mockAccounts = [account];
      vi.spyOn(component, 'accountsList').mockReturnValue(mockAccounts as any);

      component.editAccount(account);
      component.editingContent.set('Updated');
      component.saveEdit(account);

      expect(component.editingNode()).toBe('');
      expect(component.editingContent()).toBe('');
    });

    it('should revert on cancel', () => {
      const account = { id: '123', name: 'Original' } as AccountInterface;

      component.editAccount(account);
      component.editingContent.set('Modified');
      component.cancelEdit(account);

      expect(component.editingNode()).toBe('');
      expect(component.editingContent()).toBe('');
    });
  });

  describe('Delete Account Functionality', () => {
    it('should open confirmation dialog on delete', () => {
      const account = { id: '123', name: 'Test Account' } as AccountInterface;

      component.deleteAccount(account);

      expect(mockDialog.open).toHaveBeenCalled();
    });

    it('should not delete while editing', () => {
      const account = { id: '123', name: 'Test Account' } as AccountInterface;
      component.editingNode.set('123');

      component.deleteAccount(account);

      expect(mockDialog.open).not.toHaveBeenCalled();
    });

    it('should remove account on confirm', async () => {
      const account = { id: '123', name: 'Test Account' } as AccountInterface;
      const mockRemoveFromStore = vi.fn();
      (component.accountsList as any).removeFromStore = mockRemoveFromStore;
      component.top = { '1': {} as any };

      component.deleteAccount(account);

      await fixture.whenStable();

      expect(mockRemoveFromStore).toHaveBeenCalledWith(account, component.top['1']);
    });

    it('should not delete on cancel', async () => {
      mockDialog.open.mockReturnValue({
        afterClosed: () => of(false),
      });

      const account = { id: '123', name: 'Test Account' } as AccountInterface;
      const mockRemoveFromStore = vi.fn();
      (component.accountsList as any).removeFromStore = mockRemoveFromStore;

      component.deleteAccount(account);

      await fixture.whenStable();

      expect(mockRemoveFromStore).not.toHaveBeenCalled();
    });

    it('should navigate away if deleting active account', async () => {
      mockRoute.snapshot.params = { accountId: '123' };

      const account = { id: '123', name: 'Test Account' } as AccountInterface;
      (component.accountsList as any).removeFromStore = vi.fn();
      component.top = { '1': {} as any };

      component.deleteAccount(account);

      await fixture.whenStable();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should not navigate if deleting non-active account', async () => {
      mockRoute.snapshot.params = { accountId: '456' };

      const account = { id: '123', name: 'Test Account' } as AccountInterface;
      (component.accountsList as any).removeFromStore = vi.fn();
      component.top = { '1': {} as any };

      component.deleteAccount(account);

      await fixture.whenStable();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Account Selection and Navigation', () => {
    it('should navigate to account on select', () => {
      const account = { id: '123', name: 'Test Account' } as AccountInterface;

      component.onAccountSelect(account);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/account', '123']);
    });

    it('should navigate to global route', () => {
      component.navigateToGlobal('screener');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/global', 'screener']);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty accounts list', () => {
      vi.spyOn(component, 'accountsList').mockReturnValue([] as any);
      fixture.detectChanges();

      const listItems = fixture.nativeElement.querySelectorAll('mat-list-item');
      expect(listItems.length).toBe(0);
    });

    it('should handle missing account in saveEdit', () => {
      const account = { id: 'nonexistent', name: 'Test' } as AccountInterface;
      vi.spyOn(component, 'accountsList').mockReturnValue([] as any);

      component.saveEdit(account);

      // Should not throw error
      expect(component.editingNode()).toBe('');
    });

    it('should handle concurrent operations gracefully', () => {
      const account = { id: '123', name: 'Test' } as AccountInterface;

      component.addAccount();
      component.editAccount(account);

      expect(component.editingNode()).toBe('');
      expect(component.addingNode()).toBe('new');
    });
  });
});
```

### Step 2: Run Tests (Should Pass with existing implementation)

```bash
pnpm nx test rms-material
```

### Step 3: Check Coverage

```bash
pnpm nx test rms-material --coverage
```

### Step 4: Add Missing Tests Based on Coverage Report

Review coverage report and add tests for any uncovered lines or branches.

### Step 5: Achieve >80% Coverage

Continue adding tests until >80% code coverage achieved for account component.

## Technical Approach

### Files to Modify

- `apps/rms-material/src/app/accounts/account.spec.ts` - Comprehensive unit tests

### Testing Strategy

1. **Component Initialization**: Test initial state
2. **Add Functionality**: Happy path, validation, cancel
3. **Edit Functionality**: Happy path, validation, cancel, concurrent operations
4. **Delete Functionality**: Confirmation, cancel, navigation
5. **Selection/Navigation**: Route changes
6. **Edge Cases**: Empty lists, missing data, errors

### Test Organization

- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern consistently
- Mock all external dependencies
- Keep tests fast and focused

## Files Modified

| File                                                 | Changes                        |
| ---------------------------------------------------- | ------------------------------ |
| `apps/rms-material/src/app/accounts/account.spec.ts` | Added comprehensive unit tests |

## Definition of Done

- [ ] All account CRUD operations tested
- [ ] Add functionality fully covered
- [ ] Edit functionality fully covered
- [ ] Delete functionality fully covered
- [ ] Navigation tested
- [ ] Edge cases covered
- [ ] Error scenarios handled
- [ ] Mocks for all external dependencies
- [ ] > 80% code coverage achieved
- [ ] All tests pass
- [ ] Tests run fast (<1s)
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:rms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Use Vitest's vi.fn() for mocking
- Keep tests isolated and independent
- Test one thing per test case
- Use meaningful test descriptions
- Consider testing accessibility attributes
- May need to adjust based on actual implementation details
