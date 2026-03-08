# Story AV.6: Persist Account Selection - TDD GREEN Phase

## Story

**As a** user
**I want** my account selection to be persisted
**So that** I return to the same account after page refresh

## Context

**Current System:**

- Account selection resets on page refresh
- Unit tests written in Story AV.5 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AV.5
- Wire account component to state persistence service
- Save account ID on selection change
- Restore account selection on init
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Account selection saved when user selects account
- [ ] Account selection restored on component initialization
- [ ] Invalid account IDs handled gracefully
- [ ] UI updates correctly with restored selection
- [ ] All unit tests from AV.5 re-enabled and passing

### Technical Requirements

- [ ] Component uses StatePersistenceService
- [ ] Account selection event properly handled
- [ ] Component initialization loads saved state
- [ ] Validation of saved account ID

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `x` prefix or `.skip` from tests written in AV.5.

### Step 2: Update Component

```typescript
export class AccountComponent implements OnInit {
  private readonly STATE_KEY = 'selected-account-id';

  constructor(private statePersistence: StatePersistenceService, private accountService: AccountService) {}

  ngOnInit() {
    const savedAccountId = this.statePersistence.loadState<string | null>(this.STATE_KEY, null);
    if (savedAccountId && this.isValidAccount(savedAccountId)) {
      this.selectAccount(savedAccountId);
    }
  }

  onAccountSelected(accountId: string) {
    this.selectAccount(accountId);
    this.statePersistence.saveState(this.STATE_KEY, accountId);
  }

  private isValidAccount(accountId: string): boolean {
    return this.accounts().some((acc) => acc.id === accountId);
  }
}
```

### Step 3: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AV.5 re-enabled and passing
- [ ] Account selection persists across refreshes
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Related Stories

- **Previous**: Story AV.5 (TDD Tests)
- **Next**: Story AV.7 (TDD for account tab selection)
- **Epic**: Epic AV

---

## Dev Agent Record

### Status

Approved
