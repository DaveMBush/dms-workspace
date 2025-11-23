# Story AB.5: Migrate Account List Component

## Story

**As a** logged-in user
**I want** to see and select from my accounts in the left panel
**So that** I can navigate between different investment accounts

## Context

**Current System:**

- Location: `apps/rms/src/app/accounts/account.ts`
- PrimeNG components: `p-listbox`, `p-toolbar`, `p-button`
- Displays list of accounts
- Selection navigates to account detail

**Migration Target:**

- `mat-selection-list` or `mat-nav-list` for account list
- `mat-toolbar` for header
- `mat-button` for actions

## Acceptance Criteria

### Functional Requirements

- [ ] Account list displays all user accounts
- [ ] Accounts show name and relevant info
- [ ] Clicking account navigates to account detail
- [ ] Current account highlighted
- [ ] Global navigation links accessible (Universe, Screener, etc.)

### Technical Requirements

- [ ] Uses SmartNgRX signal for accounts data
- [ ] Router navigation on selection
- [ ] Named outlet 'accounts' used
- [ ] Lazy loaded component

### Visual Requirements

- [ ] List items clearly selectable
- [ ] Selected account visually distinct
- [ ] Compact display to fit panel
- [ ] Scrollable if many accounts

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/accounts/account.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Account } from './account';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

describe('Account', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const mockAccounts = {
    '1': { id: '1', name: 'Account 1', description: 'Test account' },
    '2': { id: '2', name: 'Account 2' },
  };

  beforeEach(async () => {
    mockRouter = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Account, NoopAnimationsModule, RouterTestingModule],
      providers: [{ provide: Router, useValue: mockRouter }],
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
  });

  describe('account list', () => {
    it('should render accounts from signal', () => {
      fixture.detectChanges();
      const items = fixture.nativeElement.querySelectorAll('a[mat-list-item]');
      expect(items.length).toBeGreaterThan(0);
    });

    it('should display account name', () => {
      fixture.detectChanges();
      const listContent = fixture.nativeElement.textContent;
      expect(listContent).toContain('Account 1');
    });

    it('should show empty message when no accounts', () => {
      // Set empty accounts
      fixture.detectChanges();
      const emptyMsg = fixture.nativeElement.querySelector('.empty-message');
      // Will be truthy when accounts are empty
    });
  });

  describe('navigation', () => {
    it('should have routerLinks on account items', () => {
      fixture.detectChanges();
      const links = fixture.nativeElement.querySelectorAll('[routerLink]');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should navigate to account on selection', () => {
      const account = { id: '1', name: 'Test' };
      component.onAccountSelect(account as any);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/account', '1']);
    });

    it('should navigate to global path', () => {
      component.navigateToGlobal('universe');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/global', 'universe']);
    });
  });

  describe('global navigation', () => {
    it('should render global nav links', () => {
      fixture.detectChanges();
      const globalLinks = fixture.nativeElement.querySelectorAll('.global-list a');
      expect(globalLinks.length).toBe(4);
    });

    it('should have Summary link', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Summary');
    });

    it('should have Universe link', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Universe');
    });

    it('should have Screener link', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Screener');
    });

    it('should have Error Logs link', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Error Logs');
    });
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

### Step 1: Create Account List Component

Create `apps/rms-material/src/app/accounts/account.ts`:

```typescript
import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { selectAccounts } from '../store/accounts/select-accounts.function';
import { Account } from '../store/accounts/account.interface';

@Component({
  selector: 'rms-account',
  imports: [RouterLink, RouterLinkActive, MatListModule, MatToolbarModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  private router = inject(Router);
  private accountsSignal = inject(selectAccounts);

  accounts = computed(() => {
    const accountsData = this.accountsSignal();
    return Object.values(accountsData).filter((acc): acc is Account => acc !== undefined);
  });

  onAccountSelect(account: Account): void {
    this.router.navigate(['/account', account.id]);
  }

  navigateToGlobal(path: string): void {
    this.router.navigate(['/global', path]);
  }
}
```

### Step 2: Create Account List Template

Create `apps/rms-material/src/app/accounts/account.html`:

```html
<div class="accounts-container">
  <mat-toolbar class="accounts-toolbar">
    <span>Accounts</span>
  </mat-toolbar>

  <mat-nav-list class="accounts-list">
    @for (account of accounts(); track account.id) {
    <a mat-list-item [routerLink]="['/account', account.id]" routerLinkActive="active-account" class="account-item">
      <mat-icon matListItemIcon>account_balance</mat-icon>
      <span matListItemTitle>{{ account.name }}</span>
      @if (account.description) {
      <span matListItemLine class="account-description"> {{ account.description }} </span>
      }
    </a>
    } @empty {
    <mat-list-item class="empty-message">
      <mat-icon matListItemIcon>info</mat-icon>
      <span matListItemTitle>No accounts found</span>
    </mat-list-item>
    }
  </mat-nav-list>

  <mat-divider></mat-divider>

  <mat-toolbar class="global-toolbar">
    <span>Global</span>
  </mat-toolbar>

  <mat-nav-list class="global-list">
    <a mat-list-item routerLink="/global/summary" routerLinkActive="active-link">
      <mat-icon matListItemIcon>dashboard</mat-icon>
      <span matListItemTitle>Summary</span>
    </a>
    <a mat-list-item routerLink="/global/universe" routerLinkActive="active-link">
      <mat-icon matListItemIcon>public</mat-icon>
      <span matListItemTitle>Universe</span>
    </a>
    <a mat-list-item routerLink="/global/screener" routerLinkActive="active-link">
      <mat-icon matListItemIcon>filter_list</mat-icon>
      <span matListItemTitle>Screener</span>
    </a>
    <a mat-list-item routerLink="/global/error-logs" routerLinkActive="active-link">
      <mat-icon matListItemIcon>error</mat-icon>
      <span matListItemTitle>Error Logs</span>
    </a>
  </mat-nav-list>
</div>
```

### Step 3: Create Account List Styles

Create `apps/rms-material/src/app/accounts/account.scss`:

```scss
.accounts-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--rms-surface);
}

.accounts-toolbar,
.global-toolbar {
  font-size: 0.875rem;
  font-weight: 500;
  min-height: 40px;
  padding: 0 16px;
  background-color: transparent;
  color: var(--rms-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.accounts-list {
  flex: 1;
  overflow-y: auto;
  padding-top: 0;
}

.global-list {
  padding-top: 0;
}

.account-item {
  border-left: 3px solid transparent;

  &.active-account {
    background-color: rgba(var(--rms-primary-500), 0.1);
    border-left-color: var(--rms-primary-500);
  }
}

.account-description {
  font-size: 0.75rem;
  color: var(--rms-text-secondary);
}

.empty-message {
  color: var(--rms-text-secondary);
  font-style: italic;
}

.active-link {
  background-color: rgba(var(--rms-primary-500), 0.1);

  mat-icon {
    color: var(--rms-primary-500);
  }
}

mat-divider {
  margin: 8px 0;
}
```

### Step 4: Update Routes

Ensure the account list is loaded in the named outlet. Update `apps/rms-material/src/app/app.routes.ts`:

```typescript
{
  path: '',
  canActivate: [authGuard],
  loadComponent: async () =>
    import('./shell/shell.component').then((m) => m.ShellComponent),
  providers: [
    provideSmartFeatureSignalEntities('app', [
      topDefinition,
      riskGroupDefinition,
      universeDefinition,
      divDepositTypesDefinition,
      divDepositDefinition,
    ]),
  ],
  children: [
    {
      path: '',
      outlet: 'accounts',
      loadComponent: async () =>
        import('./accounts/account').then((m) => m.Account),
      providers: [
        provideSmartFeatureSignalEntities('app', [accountsDefinition]),
      ],
    },
    // ... other child routes
  ],
},
```

## Files Created

| File                    | Purpose                |
| ----------------------- | ---------------------- |
| `accounts/account.ts`   | Account list component |
| `accounts/account.html` | Account list template  |
| `accounts/account.scss` | Account list styles    |

## Definition of Done

- [ ] Account list displays from SmartNgRX signal
- [ ] Accounts render with name and icon
- [ ] Clicking account navigates to detail view
- [ ] Active account visually highlighted
- [ ] Global navigation links work
- [ ] Active global link highlighted
- [ ] List scrollable when many accounts
- [ ] Empty state shows message
- [ ] Component lazy loaded in named outlet
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Account list displays all user accounts
- [ ] Clicking account navigates to account detail
- [ ] Active account is visually highlighted
- [ ] Global navigation links (Summary, Universe, Screener, Error Logs) work
- [ ] Active global link is visually highlighted
- [ ] Empty state displays when no accounts exist
- [ ] Account list scrolls when many accounts present

### Edge Cases

- [ ] Account list handles 100+ accounts without performance degradation
- [ ] Long account names are truncated with ellipsis and tooltip
- [ ] Account list updates in real-time when account added/removed
- [ ] Keyboard navigation works through account list (Arrow keys, Enter)
- [ ] Screen reader announces account selection changes
- [ ] Double-click on account does not cause navigation issues
- [ ] Account list scroll position preserved on navigation return
- [ ] Loading skeleton displays while accounts are fetching
- [ ] Error state displays when account fetch fails
- [ ] Retry button available when account fetch fails
- [ ] Account list correctly filters/sorts when applied
- [ ] Touch gestures work on mobile for account selection

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
