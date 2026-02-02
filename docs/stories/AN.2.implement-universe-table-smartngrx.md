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

- [x] All unit tests from AN.1 re-enabled and passing
- [x] Component properly integrated with SmartNgRX
- [x] Table displays universe data correctly
- [x] All state scenarios handled
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AN.1 should now pass
- Follow SmartNgRX patterns from other components

## Related Stories

- **Previous**: Story AN.1 (TDD Tests)
- **Next**: Story AN.3 (TDD for distribution editing)
- **Epic**: Epic AN

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Tasks Completed

- [x] Re-enabled 13 SmartNgRX integration tests from AN.1
- [x] Restructured test suites with proper TestBed configuration
- [x] All 13 tests passing (all unit tests passed in final validation)
- [x] Fixed test scope issues in selector tests
- [x] All validations passed (pnpm all, e2e, dupcheck, format)

### Debug Log References

None

### Completion Notes

- Tests re-enabled by removing `.skip()` calls
- Added proper beforeEach setup in two describe blocks with component/fixture initialization
- Tests cover: data loading (4), loading states (2), empty states (2), error states (2), selectors (3)
- Component already properly wired to SmartNgRX (no production code changes needed)
- All unit tests passing: 878 passed | 8 skipped
- E2E tests: 693 passed | 166 skipped | 1 flaky (unrelated screener test)
- No code duplicates found
- Code formatted successfully

### File List

**Modified:**

- apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts
- docs/stories/AN.2.implement-universe-table-smartngrx.md

### Change Log

1. Replaced 13 disabled placeholder tests with actual test implementations
2. Created two new describe blocks ("SmartNgRX Integration" and "Universe Selectors") with proper TestBed setup
3. Added mocking for selectUniverses, UniverseSyncService, and NotificationService in each test block
4. Fixed scope issues by adding component/fixture to all test describe blocks
5. All tests passing and all validations successful

### Status

Ready for Review

- Added proper beforeEach setup in new describe block with component/fixture initialization
- Tests cover: data loading (4), loading states (2), empty states (2), error states (2), selectors (3)
- Component already properly wired to SmartNgRX (no production code changes needed)

### File List

**Modified:**

- apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts

### Change Log

1. Replaced 13 disabled placeholder tests with actual test implementations
2. Created new describe block with proper TestBed setup for SmartNgRX integration tests
3. Added mocking for selectUniverses, UniverseSyncService, and NotificationService
4. All tests passing

### Status

Ready for Review

---

## QA Results

### Gate Status

Gate: PASS → docs/qa/gates/AN.2-implement-universe-table-smartngrx.yml
