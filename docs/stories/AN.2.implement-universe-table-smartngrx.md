# Story AN.2: Wire Universe Table to SmartNgRX Universe Entities - TDD GREEN Phase

## Story

**As a** user
**I want** to see my universe data displayed in the table
**So that** I can view and manage my tracked symbols

## Context

**Current System:**

- Global/Universe screen has base table structure
- Universe SmartNgRX entities exist
- Unit tests written in Story AN.1 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AN.1
- Wire GlobalUniverseComponent to universe store
- Connect table to SmartNgRX data
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Universe data loads on component init
- [ ] Table displays all universe entries
- [ ] Loading indicator shows during data load
- [ ] Empty state displays when no entries
- [ ] Error message displays on load failure
- [ ] All unit tests from AN.1 re-enabled and passing

### Technical Requirements

- [ ] Component uses SmartNgRX store
- [ ] Proper selector usage for data access
- [ ] Loading/error states properly handled
- [ ] Table receives data via input binding

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `x` prefix or `.skip` from tests written in AN.1.

### Step 2: Wire Component to Store

```typescript
export class GlobalUniverseComponent implements OnInit {
  universeEntries = this.store.selectSignal(selectAllUniverseEntries);
  loading = this.store.selectSignal(selectUniverseLoading);
  error = this.store.selectSignal(selectUniverseError);

  constructor(private store: Store) {}

  ngOnInit() {
    this.store.dispatch(loadUniverseEntries());
  }
}
```

### Step 3: Update Template

```html
@if (loading()) {
<mat-spinner></mat-spinner>
} @else if (error()) {
<div class="error">{{ error() }}</div>
} @else if (universeEntries().length === 0) {
<div class="empty-state">No symbols in universe</div>
} @else {
<app-universe-table [data]="universeEntries()" />
}
```

### Step 4: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AN.1 re-enabled and passing
- [ ] Component properly integrated with SmartNgRX
- [ ] Table displays universe data correctly
- [ ] All state scenarios handled
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AN.1 should now pass
- Follow SmartNgRX patterns from other components

## Related Stories

- **Previous**: Story AN.1 (TDD Tests)
- **Next**: Story AN.3 (TDD for distribution editing)
- **Epic**: Epic AN
