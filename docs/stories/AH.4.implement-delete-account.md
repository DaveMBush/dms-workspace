# Story AH.4: Implement Delete Account Functionality

## Story

**As a** user
**I want** to delete accounts I no longer need
**So that** I can keep my account list clean and organized

## Context

**Current System:**
- RMS app has delete button/icon for accounts
- Confirmation dialog prevents accidental deletion
- Deletion removes account and all associated data
- Uses SmartNgRX removeFromStore

**Migration Target:**
- Replicate RMS delete in RMS-MATERIAL
- Use Material Design dialog for confirmation
- Integrate with SmartNgRX deletion

## Acceptance Criteria

### Functional Requirements

- [ ] **CRITICAL** UI matches RMS app delete behavior exactly
- [ ] Delete icon/button visible for each account
- [ ] Confirmation dialog appears before deletion
- [ ] User can confirm or cancel deletion
- [ ] Confirmed deletion removes account from backend
- [ ] Account list updates reactively after deletion
- [ ] Navigate away if viewing deleted account

### Technical Requirements

- [ ] Use Material Dialog for confirmation
- [ ] Use SmartNgRX `removeFromStore!()` method
- [ ] Call `AccountEffectsService.delete()` via SmartNgRX
- [ ] Handle navigation if current account deleted
- [ ] Prevent deletion while editing

## Test-Driven Development Approach

### Step 1: Create Unit Tests First

Update `apps/rms-material/src/app/accounts/account.spec.ts`:

```typescript
describe('Account - Delete Functionality', () => {
  let dialogSpy: any;

  beforeEach(() => {
    dialogSpy = vi.spyOn(component['dialog'], 'open').mockReturnValue({
      afterClosed: () => of(true),
    } as any);
  });

  it('should have delete button for each account', () => {
    fixture.detectChanges();
    
    const deleteButtons = fixture.nativeElement.querySelectorAll('.delete-account-button');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('should open confirmation dialog on delete click', () => {
    const account = { id: '123', name: 'Test Account' } as AccountInterface;
    
    component.deleteAccount(account);
    
    expect(dialogSpy).toHaveBeenCalled();
  });

  it('should remove account from store on confirm', async () => {
    const account = { id: '123', name: 'Test Account' } as AccountInterface;
    const mockRemoveFromStore = vi.fn();
    (component.accounts$ as any).removeFromStore = mockRemoveFromStore;
    
    component.deleteAccount(account);
    
    // Wait for dialog to close
    await fixture.whenStable();
    
    expect(mockRemoveFromStore).toHaveBeenCalledWith(account, component.top['1']);
  });

  it('should not delete on cancel', async () => {
    dialogSpy.mockReturnValue({
      afterClosed: () => of(false),
    } as any);
    
    const account = { id: '123', name: 'Test Account' } as AccountInterface;
    const mockRemoveFromStore = vi.fn();
    (component.accounts$ as any).removeFromStore = mockRemoveFromStore;
    
    component.deleteAccount(account);
    
    await fixture.whenStable();
    
    expect(mockRemoveFromStore).not.toHaveBeenCalled();
  });

  it('should navigate away if deleted account is active', async () => {
    const navigateSpy = vi.spyOn(component['router'], 'navigate');
    component['route'].snapshot.params = { accountId: '123' };
    
    const account = { id: '123', name: 'Test Account' } as AccountInterface;
    component.deleteAccount(account);
    
    await fixture.whenStable();
    
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });

  it('should not allow delete while editing', () => {
    const account = { id: '123', name: 'Test Account' } as AccountInterface;
    component.editingNode.set('123');
    
    component.deleteAccount(account);
    
    expect(dialogSpy).not.toHaveBeenCalled();
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
import { Router, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SmartArray } from '@smarttools/smart-signals';

import { selectAccounts } from '../store/accounts/selectors/select-accounts.function';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { selectTopEntities } from '../store/top/selectors/select-top-entities.function';
import { Top } from '../store/top/top.interface';
import { NodeEditorComponent } from '../shared/components/node-editor/node-editor.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';

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
    MatDialogModule,
    NodeEditorComponent,
  ],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  
  accountsList = selectAccounts();
  top = selectTopEntities().entities;
  
  addingNode = signal('');
  editingNode = signal('');
  editingContent = signal('');

  deleteAccount(account: AccountInterface): void {
    if (this.editingNode() !== '') {
      return; // Don't allow delete while editing
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Account',
        message: `Are you sure you want to delete "${account.name}"? This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        const accounts = this.accountsList() as SmartArray<Top, AccountInterface>;
        accounts.removeFromStore!(account, this.top['1']!);

        // Navigate away if we're viewing the deleted account
        const currentAccountId = this.route.snapshot.params['accountId'];
        if (currentAccountId === account.id) {
          void this.router.navigate(['/']);
        }
      }
    });
  }

  // ... existing methods ...
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
        [placeholder]="addingNode() ? 'New Account' : 'Edit Account'"
        [(ngModel)]="editingContent"
        (cancel)="cancelEdit(account)"
        (save)="saveEdit(account)"
      />
    } @else {
      <mat-list-item
        [routerLink]="['/account', account.id]"
        routerLinkActive="active-link"
        class="account-item"
      >
        <span 
          matListItemTitle 
          (click)="editAccount(account); $event.stopPropagation()"
          class="editable-name"
        >
          {{ account.name }}
        </span>
        <button
          mat-icon-button
          (click)="deleteAccount(account); $event.stopPropagation()"
          class="delete-account-button"
          matListItemMeta
        >
          <mat-icon>delete</mat-icon>
        </button>
      </mat-list-item>
    }
  }
</mat-nav-list>
```

Create `apps/rms-material/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
}

@Component({
  selector: 'rms-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">Delete</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
```

### Step 4: Run Tests (Should Pass)

```bash
pnpm nx test rms-material
```

### Step 5: Manual Testing with Playwright

1. Start app: `pnpm nx serve rms-material`
2. Navigate to accounts panel
3. Click delete icon on an account
4. Verify confirmation dialog appears
5. Cancel and verify account remains
6. Delete again and confirm
7. Verify account removed from list
8. Verify navigation if viewing deleted account

## Technical Approach

### Files to Modify

- `apps/rms-material/src/app/accounts/account.ts` - Delete account functionality
- `apps/rms-material/src/app/accounts/account.html` - Delete button UI
- `apps/rms-material/src/app/accounts/account.spec.ts` - Unit tests
- `apps/rms-material/src/app/shared/components/confirm-dialog/` - Create dialog component

### Implementation Steps

1. Create ConfirmDialogComponent
2. Add delete button to account list items
3. Implement deleteAccount() method
4. Add dialog open/close logic
5. Handle confirmed deletion
6. Handle navigation for active account
7. Test end-to-end

## Files Modified

| File                                        | Changes                           |
| ------------------------------------------- | --------------------------------- |
| `apps/rms-material/src/app/accounts/account.ts`   | Added deleteAccount() method      |
| `apps/rms-material/src/app/accounts/account.html` | Added delete button               |
| `apps/rms-material/src/app/accounts/account.spec.ts` | Added unit tests                  |
| `apps/rms-material/src/app/shared/components/confirm-dialog/` | Created dialog component         |

## Definition of Done

- [ ] Delete button visible for each account
- [ ] Confirmation dialog appears on delete
- [ ] Cancel keeps account
- [ ] Confirm removes account
- [ ] Account list updates reactively
- [ ] Navigation works for deleted active account
- [ ] Cannot delete while editing
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

- Use stopPropagation() to prevent navigation when clicking delete
- ConfirmDialogComponent can be reused for other deletions
- Consider adding undo functionality in future
- Ensure proper cleanup of deleted account's data
- Add accessibility labels for screen readers
