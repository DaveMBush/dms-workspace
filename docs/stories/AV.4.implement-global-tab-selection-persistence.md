# Story AV.4: Persist Global Tab Selection - TDD GREEN Phase

## Story

**As a** user
**I want** my global tab selection to be persisted
**So that** I return to the same tab after page refresh

## Context

**Current System:**

- Global tab resets to default on page refresh
- Unit tests written in Story AV.3 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AV.3
- Wire global tab component to state persistence service
- Save tab selection on change
- Restore tab selection on init
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Tab selection saved when user changes tabs
- [ ] Tab selection restored on component initialization
- [ ] Default tab used when no saved selection exists
- [ ] UI updates correctly with restored selection
- [ ] All unit tests from AV.3 re-enabled and passing

### Technical Requirements

- [ ] Component uses StatePersistenceService
- [ ] Tab change event properly handled
- [ ] Component initialization loads saved state
- [ ] Error handling for invalid saved state

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `x` prefix or `.skip` from tests written in AV.3.

### Step 2: Update Component

```typescript
export class TabsComponent implements OnInit {
  private readonly STATE_KEY = 'global-tab-selection';

  constructor(private statePersistence: StatePersistenceService) {}

  ngOnInit() {
    const savedTab = this.statePersistence.loadState(this.STATE_KEY, 0);
    this.selectedIndex.set(savedTab);
  }

  onTabChange(index: number) {
    this.selectedIndex.set(index);
    this.statePersistence.saveState(this.STATE_KEY, index);
  }
}
```

### Step 3: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AV.3 re-enabled and passing
- [ ] Tab selection persists across refreshes
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Related Stories

- **Previous**: Story AV.3 (TDD Tests)
- **Next**: Story AV.5 (TDD for account selection)
- **Epic**: Epic AV

---

## Dev Agent Record

### Status

Approved
