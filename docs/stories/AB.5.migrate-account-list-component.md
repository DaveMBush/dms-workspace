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
  imports: [
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  private router = inject(Router);
  private accountsSignal = inject(selectAccounts);

  accounts = computed(() => {
    const accountsData = this.accountsSignal();
    return Object.values(accountsData).filter(
      (acc): acc is Account => acc !== undefined
    );
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
      <a
        mat-list-item
        [routerLink]="['/account', account.id]"
        routerLinkActive="active-account"
        class="account-item"
      >
        <mat-icon matListItemIcon>account_balance</mat-icon>
        <span matListItemTitle>{{ account.name }}</span>
        @if (account.description) {
          <span matListItemLine class="account-description">
            {{ account.description }}
          </span>
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
    <a
      mat-list-item
      routerLink="/global/summary"
      routerLinkActive="active-link"
    >
      <mat-icon matListItemIcon>dashboard</mat-icon>
      <span matListItemTitle>Summary</span>
    </a>
    <a
      mat-list-item
      routerLink="/global/universe"
      routerLinkActive="active-link"
    >
      <mat-icon matListItemIcon>public</mat-icon>
      <span matListItemTitle>Universe</span>
    </a>
    <a
      mat-list-item
      routerLink="/global/screener"
      routerLinkActive="active-link"
    >
      <mat-icon matListItemIcon>filter_list</mat-icon>
      <span matListItemTitle>Screener</span>
    </a>
    <a
      mat-list-item
      routerLink="/global/error-logs"
      routerLinkActive="active-link"
    >
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

| File | Purpose |
|------|---------|
| `accounts/account.ts` | Account list component |
| `accounts/account.html` | Account list template |
| `accounts/account.scss` | Account list styles |

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
