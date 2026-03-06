# Story AV.8: Persist Account Tab Selection - TDD GREEN Phase

## Story

**As a** user
**I want** my account tab selection to be persisted per account
**So that** I return to the same tab when switching between accounts

## Context

**Current System:**

- Account tabs reset when switching accounts or refreshing
- Unit tests written in Story AV.7 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AV.7
- Wire account detail component to state persistence service
- Save tab index per account ID
- Restore tab selection when account displayed
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Tab selection saved per account when user changes tabs
- [ ] Tab selection restored when account selected/displayed
- [ ] Default tab used when no saved selection for account
- [ ] Each account maintains independent tab state
- [ ] UI updates correctly with restored selection
- [ ] All unit tests from AV.7 re-enabled and passing

### Technical Requirements

- [ ] Component uses StatePersistenceService
- [ ] Tab state keyed by account ID
- [ ] Tab change event properly handled
- [ ] Account selection triggers tab restoration

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `x` prefix or `.skip` from tests written in AV.7.

### Step 2: Update Component

```typescript
export class AccountDetailComponent implements OnInit {
  private readonly STATE_KEY_PREFIX = 'account-tab-';
  
  constructor(private statePersistence: StatePersistenceService) {}

  ngOnInit() {
    // When account changes, restore tab for that account
    effect(() => {
      const accountId = this.selectedAccountId();
      if (accountId) {
        const stateKey = this.STATE_KEY_PREFIX + accountId;
        const savedTab = this.statePersistence.loadState(stateKey, 0);
        this.selectedTabIndex.set(savedTab);
      }
    });
  }

  onTabChange(index: number) {
    this.selectedTabIndex.set(index);
    const accountId = this.selectedAccountId();
    if (accountId) {
      const stateKey = this.STATE_KEY_PREFIX + accountId;
      this.statePersistence.saveState(stateKey, index);
    }
  }
}
```

### Step 3: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AV.7 re-enabled and passing
- [ ] Account tab selection persists per account
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Related Stories

- **Previous**: Story AV.7 (TDD Tests)
- **Next**: Story AV.9 (TDD for state restoration)
- **Epic**: Epic AV

---

## Dev Agent Record

### Status

Not Started
