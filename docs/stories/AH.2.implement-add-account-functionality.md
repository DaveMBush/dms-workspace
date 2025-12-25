# Story AH.2: Implement Add Account Functionality with Inline Editing

## Story

**As a** user
**I want** to add new accounts with inline editing
**So that** I can organize my investments across multiple accounts

## Context

**Current System:**
- RMS app has inline account creation with add button
- Clicking add creates temporary "new" account entry
- User edits name inline, save commits to backend
- Uses SmartNgRX addToStore and effect service

**Migration Target:**
- Replicate RMS inline add functionality in RMS-MATERIAL
- Use Material Design patterns (inline editing, button styling)
- Integrate with AccountEffectsService.add()

## Acceptance Criteria

### Functional Requirements

- [ ] **CRITICAL** UI matches RMS app inline add behavior exactly
- [ ] Add button creates temporary account entry in list
- [ ] Inline editor appears for new account
- [ ] User can type account name
- [ ] Save commits account to backend via SmartNgRX
- [ ] Cancel removes temporary entry
- [ ] Account list updates reactively after save

### Technical Requirements

- [ ] Use NodeEditorComponent pattern from RMS (or Material equivalent)
- [ ] Use SmartNgRX `addToStore!()` method
- [ ] Call `AccountEffectsService.add()` via SmartNgRX
- [ ] Handle validation (non-empty name)
- [ ] Handle errors gracefully

## Test-Driven Development Approach

### Step 1: Create Unit Tests First

Update `apps/rms-material/src/app/accounts/account.spec.ts`:

```typescript
describe('Account - Add Functionality', () => {
  it('should have add account button', () => {
    const addButton = fixture.nativeElement.querySelector('.add-account-button');
    expect(addButton).toBeTruthy();
  });

  it('should create temporary account on add click', () => {
    component.addAccount();
    expect(component.addingNode).toBe('new');
    expect(component.editingContent).toBe('New Account');
  });

  it('should show inline editor for new account', () => {
    component.addingNode = 'new';
    fixture.detectChanges();
    
    const editor = fixture.nativeElement.querySelector('rms-node-editor');
    expect(editor).toBeTruthy();
  });

  it('should add account to store on save', () => {
    const mockAddToStore = vi.fn();
    component.accounts$.addToStore = mockAddToStore;
    
    component.addAccount();
    component.editingContent = 'My New Account';
    component.saveEdit({ id: 'new', name: 'New Account' } as any);
    
    expect(mockAddToStore).toHaveBeenCalled();
  });

  it('should remove temporary account on cancel', () => {
    const mockRemoveFromStore = vi.fn();
    (component.accounts$ as any).removeFromStore = mockRemoveFromStore;
    
    component.addAccount();
    component.cancelEdit({ id: 'new', name: 'New Account' } as any);
    
    expect(mockRemoveFromStore).toHaveBeenCalled();
    expect(component.addingNode).toBe('');
  });

  it('should validate non-empty account name', () => {
    component.addAccount();
    component.editingContent = '';
    component.saveEdit({ id: 'new', name: '' } as any);
    
    // Should not save empty name
    expect(component.addingNode).toBe('new');
  });

  it('should navigate to account after successful add', () => {
    const navigateSpy = vi.spyOn(component['router'], 'navigate');
    
    component.addAccount();
    component.editingContent = 'New Account';
    
    // Simulate successful save
    // Should navigate to new account
  });
});
```

### Step 2: Run Tests (Should Fail)

```bash
pnpm nx test rms-material
```

### Step 3: Implement

Update `apps/rms-material/src/app/accounts/account.ts`:

```typescript
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { SmartArray } from '@smarttools/smart-signals';

import { selectAccounts } from '../store/accounts/selectors/select-accounts.function';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { selectTopEntities } from '../store/top/selectors/select-top-entities.function';
import { Top } from '../store/top/top.interface';
import { NodeEditorComponent } from '../shared/components/node-editor/node-editor.component';

@Component({
  selector: 'rms-account',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    NodeEditorComponent,
  ],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {
  private router = inject(Router);
  
  accountsList = selectAccounts();
  top = selectTopEntities().entities;
  
  addingNode = signal('');
  editingNode = signal('');
  editingContent = signal('');

  addAccount(): void {
    this.addingNode.set('new');
    this.editingContent.set('New Account');
    
    const accounts = this.accountsList() as SmartArray<Top, AccountInterface>;
    accounts.addToStore!(
      {
        name: 'New Account',
        id: 'new',
        trades: [],
        divDeposits: [],
        months: [],
      },
      this.top['1']!
    );
  }

  saveEdit(item: AccountInterface): void {
    if (this.editingContent() === '') {
      return;
    }
    
    const account = this.accountsList().find(
      (a: AccountInterface) => a.id === item.id
    );
    
    if (account) {
      account.name = this.editingContent();
    }
    
    this.editingNode.set('');
    this.addingNode.set('');
    this.editingContent.set('');
  }

  cancelEdit(item: AccountInterface): void {
    if (this.addingNode() !== '') {
      const accounts = this.accountsList() as SmartArray<Top, AccountInterface>;
      accounts.removeFromStore!(item, this.top['1']!);
    }
    
    this.addingNode.set('');
    this.editingNode.set('');
    this.editingContent.set('');
  }

  onAccountSelect(account: AccountInterface): void {
    void this.router.navigate(['/account', account.id]);
  }

  navigateToGlobal(path: string): void {
    void this.router.navigate(['/global', path]);
  }
}
```

Update `apps/rms-material/src/app/accounts/account.html`:

```html
<mat-toolbar>
  <span>Accounts</span>
  <span class="spacer"></span>
  <button mat-icon-button (click)="addAccount()" class="add-account-button">
    <mat-icon>add</mat-icon>
  </button>
</mat-toolbar>

<mat-nav-list>
  @for (account of accountsList(); track account.id) {
    @if (addingNode() === account.id || editingNode() === account.id) {
      <rms-node-editor
        placeholder="Edit Account"
        [(ngModel)]="editingContent"
        (cancel)="cancelEdit(account)"
        (save)="saveEdit(account)"
      />
    } @else {
      <mat-list-item
        [routerLink]="['/account', account.id]"
        routerLinkActive="active-link"
      >
        <span matListItemTitle>{{ account.name }}</span>
      </mat-list-item>
    }
  }
</mat-nav-list>
```

### Step 4: Run Tests (Should Pass)

```bash
pnpm nx test rms-material
```

### Step 5: Manual Testing with Playwright

1. Start app: `pnpm nx serve rms-material`
2. Navigate to accounts panel
3. Click add button
4. Verify inline editor appears
5. Type account name
6. Save and verify account persists
7. Try cancel and verify temporary entry removed

## Technical Approach

### Files to Modify

- `apps/rms-material/src/app/accounts/account.ts` - Add account functionality
- `apps/rms-material/src/app/accounts/account.html` - Add button and editor UI
- `apps/rms-material/src/app/accounts/account.spec.ts` - Unit tests
- `apps/rms-material/src/app/shared/components/node-editor/` - Create if needed

### Implementation Steps

1. Add add button to toolbar
2. Implement addAccount() method
3. Add inline editor component
4. Implement saveEdit() method
5. Implement cancelEdit() method
6. Add validation logic
7. Test end-to-end

## Files Modified

| File                                        | Changes                           |
| ------------------------------------------- | --------------------------------- |
| `apps/rms-material/src/app/accounts/account.ts`   | Added add/save/cancel methods     |
| `apps/rms-material/src/app/accounts/account.html` | Added add button and inline editor |
| `apps/rms-material/src/app/accounts/account.spec.ts` | Added unit tests                  |

## Definition of Done

- [ ] Add button present in UI
- [ ] Clicking add creates temporary entry
- [ ] Inline editor appears
- [ ] Save commits to backend
- [ ] Cancel removes temporary entry
- [ ] Validation prevents empty names
- [ ] Unit tests pass
- [ ] Manual Playwright verification complete
- [ ] UI matches RMS app behavior
- [ ] All existing tests pass
- [ ] Lint passes
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:rms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Follow RMS app inline editing pattern exactly
- NodeEditorComponent may need to be created or adapted from RMS
- Use Material Design button styling
- Ensure keyboard navigation works (Enter to save, Escape to cancel)
- Consider adding focus management for better UX
