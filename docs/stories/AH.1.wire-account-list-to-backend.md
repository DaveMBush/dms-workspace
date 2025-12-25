# Story AH.1: Wire Account List to Backend via SmartNgRX

## Story

**As a** user
**I want** to see my accounts load from the backend
**So that** I can view and select accounts in the RMS-MATERIAL app

## Context

**Current System:**

- RMS app loads accounts via SmartNgRX from AccountEffectsService
- RMS-MATERIAL has account list UI but static/mock data
- Account definition and effect service already exist

**Migration Target:**

- Connect account component to existing SmartNgRX account entities
- Load accounts from backend on app initialization
- Display accounts reactively

## Acceptance Criteria

### Functional Requirements

- [ ] **CRITICAL** Account list matches RMS app behavior exactly
- [ ] Accounts load from backend when app starts
- [ ] Account list updates reactively when data changes
- [ ] Selected account persists across navigation

### Technical Requirements

- [ ] Use existing `accountsDefinition` from SmartNgRX
- [ ] Use existing `AccountEffectsService`
- [ ] Use `selectAccounts()` selector
- [ ] Implement proper loading states

## Test-Driven Development Approach

### Step 1: Create Unit Tests First

Create/update `apps/rms-material/src/app/accounts/account.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Account } from './account';
import { provideSmartFeatureSignalEntities } from '@smarttools/smart-signals';
import { accountsDefinition } from '../store/accounts/accounts-definition.const';

describe('Account Component', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [provideSmartFeatureSignalEntities('app', [accountsDefinition])],
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
  });

  it('should load accounts signal', () => {
    expect(component.accountsList).toBeDefined();
  });

  it('should render account list', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.accounts-list')).toBeTruthy();
  });

  it('should handle account selection', () => {
    const mockAccount = { id: '1', name: 'Test Account', trades: [], divDeposits: [], months: [] };
    component.onAccountSelect(mockAccount);
    // Verify navigation occurs
  });
});
```

### Step 2: Run Tests (Should Fail)

```bash
pnpm nx test rms-material
```

### Step 3: Implement

Modify `apps/rms-material/src/app/accounts/account.ts`:

```typescript
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { selectAccounts } from '../store/accounts/selectors/select-accounts.function';
import { Account as AccountInterface } from '../store/accounts/account.interface';

@Component({
  selector: 'rms-account',
  imports: [RouterLink, RouterLinkActive, MatListModule, MatToolbarModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {
  private router = inject(Router);
  accountsList = selectAccounts();

  onAccountSelect(account: AccountInterface): void {
    const context = this;
    void context.router.navigate(['/account', account.id]).catch(function handleNavigationError() {
      // Navigation errors are handled by router
    });
  }

  navigateToGlobal(path: string): void {
    const context = this;
    void context.router.navigate(['/global', path]).catch(function handleNavigationError() {
      // Navigation errors are handled by router
    });
  }
}
```

### Step 4: Run Tests Again (Should Pass)

```bash
pnpm nx test rms-material
```

### Step 5: Manual Testing with Playwright

Use Playwright MCP to verify UI:

1. Start app: `pnpm nx serve rms-material`
2. Navigate to accounts view
3. Verify accounts load from backend
4. Verify clicking account navigates properly

## Files Modified

| File                                                 | Changes                             |
| ---------------------------------------------------- | ----------------------------------- |
| `apps/rms-material/src/app/accounts/account.ts`      | Wired to SmartNgRX selectAccounts   |
| `apps/rms-material/src/app/accounts/account.spec.ts` | Added unit tests                    |
| `apps/rms-material/src/app/app.routes.ts`            | Ensured accountsDefinition provided |

## Definition of Done

- [ ] Unit tests pass
- [ ] Accounts load from backend
- [ ] UI matches RMS app
- [ ] All existing tests pass
- [ ] Lint passes
- [ ] Manual Playwright verification complete
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:rms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- This is foundation for all account operations
- Later stories will add CRUD operations
- Ensure SmartNgRX providers are correct in routes
