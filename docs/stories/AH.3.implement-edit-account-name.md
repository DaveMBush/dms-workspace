# Story AH.3: Implement Edit Account Name Functionality

## Story

**As a** user
**I want** to edit account names with inline editing
**So that** I can rename accounts as my needs change

## Context

**Current System:**

- RMS app has inline edit for account names
- Click on account name to enter edit mode
- Inline editor appears with current name
- Save commits changes, cancel reverts

**Migration Target:**

- Replicate RMS inline edit in RMS-MATERIAL
- Use Material Design patterns
- Integrate with SmartNgRX entity updates

## Acceptance Criteria

### Functional Requirements

- [ ] **CRITICAL** UI matches RMS app inline edit behavior exactly
- [ ] Click account name to enter edit mode
- [ ] Inline editor shows current name
- [ ] User can modify name
- [ ] Save commits changes to backend
- [ ] Cancel reverts to original name
- [ ] Account list updates reactively

### Technical Requirements

- [ ] Use NodeEditorComponent for editing
- [ ] Update entity in SmartNgRX store
- [ ] Backend persistence via effect service
- [ ] Handle validation (non-empty name)
- [ ] Handle concurrent edit protection

## Test-Driven Development Approach

### Step 1: Create Unit Tests First

Update `apps/rms-material/src/app/accounts/account.spec.ts`:

```typescript
describe('Account - Edit Functionality', () => {
  it('should enter edit mode on account click', () => {
    const account = { id: '123', name: 'Test Account' } as AccountInterface;

    component.editAccount(account);

    expect(component.editingNode()).toBe('123');
    expect(component.editingContent()).toBe('Test Account');
  });

  it('should show inline editor for editing account', () => {
    component.editingNode.set('123');
    fixture.detectChanges();

    const editor = fixture.nativeElement.querySelector('rms-node-editor');
    expect(editor).toBeTruthy();
  });

  it('should update account name on save', () => {
    const account = { id: '123', name: 'Old Name' } as AccountInterface;
    component.accountsList = vi.fn().mockReturnValue([account]);

    component.editAccount(account);
    component.editingContent.set('New Name');
    component.saveEdit(account);

    expect(account.name).toBe('New Name');
    expect(component.editingNode()).toBe('');
  });

  it('should revert changes on cancel', () => {
    const account = { id: '123', name: 'Original Name' } as AccountInterface;

    component.editAccount(account);
    component.editingContent.set('Modified Name');
    component.cancelEdit(account);

    expect(account.name).toBe('Original Name');
    expect(component.editingNode()).toBe('');
  });

  it('should validate non-empty account name on edit', () => {
    const account = { id: '123', name: 'Valid Name' } as AccountInterface;
    component.accountsList = vi.fn().mockReturnValue([account]);

    component.editAccount(account);
    component.editingContent.set('');
    component.saveEdit(account);

    expect(account.name).toBe('Valid Name'); // Should not save empty
    expect(component.editingNode()).toBe('123'); // Should stay in edit mode
  });

  it('should not allow editing while adding account', () => {
    const account = { id: '123', name: 'Test Account' } as AccountInterface;
    component.addingNode.set('new');

    component.editAccount(account);

    expect(component.editingNode()).toBe('');
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
export class Account {
  // ... existing code ...

  editAccount(account: AccountInterface): void {
    if (this.addingNode() !== '') {
      return; // Don't allow edit while adding
    }

    this.editingNode.set(account.id);
    this.editingContent.set(account.name);
  }

  saveEdit(item: AccountInterface): void {
    if (this.editingContent() === '') {
      return; // Don't save empty names
    }

    const account = this.accountsList().find((a: AccountInterface) => a.id === item.id);

    if (account && account.id !== 'new') {
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
  @for (account of accountsList(); track account.id) { @if (addingNode() === account.id || editingNode() === account.id) {
  <rms-node-editor [placeholder]="addingNode() ? 'New Account' : 'Edit Account'" [(ngModel)]="editingContent" (cancel)="cancelEdit(account)" (save)="saveEdit(account)" />
  } @else {
  <mat-list-item [routerLink]="['/account', account.id]" routerLinkActive="active-link">
    <span matListItemTitle (click)="editAccount(account); $event.stopPropagation()" class="editable-name"> {{ account.name }} </span>
  </mat-list-item>
  } }
</mat-nav-list>
```

Update `apps/rms-material/src/app/accounts/account.scss`:

```scss
.editable-name {
  cursor: pointer;

  &:hover {
    text-decoration: underline;
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
3. Click on an account name
4. Verify inline editor appears with current name
5. Modify name and save
6. Verify name updates in list
7. Try cancel and verify changes revert

## Technical Approach

### Files to Modify

- `apps/rms-material/src/app/accounts/account.ts` - Edit account functionality
- `apps/rms-material/src/app/accounts/account.html` - Click handler for edit
- `apps/rms-material/src/app/accounts/account.scss` - Editable name styling
- `apps/rms-material/src/app/accounts/account.spec.ts` - Unit tests

### Implementation Steps

1. Add click handler to account name
2. Implement editAccount() method
3. Update saveEdit() to handle both add and edit
4. Add CSS for hover feedback
5. Prevent edit during add operation
6. Test end-to-end

## Files Modified

| File                                                 | Changes                         |
| ---------------------------------------------------- | ------------------------------- |
| `apps/rms-material/src/app/accounts/account.ts`      | Added editAccount() method      |
| `apps/rms-material/src/app/accounts/account.html`    | Added click handler and styling |
| `apps/rms-material/src/app/accounts/account.scss`    | Added editable-name class       |
| `apps/rms-material/src/app/accounts/account.spec.ts` | Added unit tests                |

## Definition of Done

- [ ] Click account name enters edit mode
- [ ] Inline editor shows current name
- [ ] Save updates account name
- [ ] Cancel reverts changes
- [ ] Validation prevents empty names
- [ ] Cannot edit while adding
- [ ] Hover feedback present
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

- Use stopPropagation() to prevent navigation when clicking name
- Ensure edit mode is mutually exclusive with add mode
- Consider debouncing if performance issues arise
- Keyboard shortcuts: Enter to save, Escape to cancel
