# Story AW.10: Remove All Client-Side Sorting Logic from Components - TDD GREEN Phase

## Story

**As a** developer
**I want** to remove all client-side sorting logic from table components
**So that** sorting is exclusively handled by the server for better performance

## Context

**Current System:**

- Components still contain legacy client-side sorting code
- Unit tests written in Story AW.9 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AW.9
- Remove all client-side sorting methods
- Remove any data array manipulation for sorting
- Ensure data is displayed as received from server
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] All client-side sorting methods removed from components
- [ ] No data array manipulation for sorting purposes
- [ ] Data displayed in server-provided order
- [ ] Sort UI still functional (triggers server calls)
- [ ] All unit tests from AW.9 re-enabled and passing

### Technical Requirements

- [ ] No Array.sort() calls in table components
- [ ] No custom sorting comparator functions
- [ ] Data arrays used as-is from HTTP responses
- [ ] Code is cleaner and simpler

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `.skip` from tests written in AW.9.

### Step 2: Remove Client-Side Sorting from UniverseTableComponent

```typescript
// BEFORE
export class UniverseTableComponent {
  sortData() {
    this.universeData.sort((a, b) => {
      // Complex sorting logic
    });
  }
}

// AFTER
export class UniverseTableComponent {
  // No sortData method - sorting handled by server
  // Data used as-is from HTTP response
}
```

### Step 3: Remove Sorting from Trades Components

Remove similar sorting logic from OpenTradesComponent and ClosedTradesComponent:

```typescript
// Remove all instances of:
// - sortData() methods
// - Array.sort() calls
// - Comparator functions
// - Data manipulation for ordering
```

### Step 4: Verify Sort UI Still Works

Ensure that clicking sort headers still triggers the server calls via SortStateService (implemented in AW.6/AW.8).

### Step 5: Clean Up Unused Imports

Remove any imports that were only used for client-side sorting:

```typescript
// Remove if no longer needed:
// - lodash orderBy/sortBy
// - Custom comparator utilities
// - Sort helper functions
```

### Step 6: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AW.9 re-enabled and passing
- [ ] All client-side sorting logic removed
- [ ] Components simpler and cleaner
- [ ] Sort UI still functional (via server)
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AW.9 should now pass
- Significant code simplification expected
- Performance improvement should be measurable

## Related Stories

- **Previous**: Story AW.9 (TDD Tests)
- **Next**: Story AW.11 (Bug Fix and Verification)
- **Epic**: Epic AW

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Status

Ready for Review

### Tasks / Subtasks

- [x] Task 1: Re-enable unit tests from AW.9
  - [x] Remove `.skip` from `global-universe.component.spec.ts` "Verify no client-side sorting" describe block
  - [x] Remove `.skip` from `open-positions.component.spec.ts` "Verify no client-side sorting" describe block
  - [x] Remove `.skip` from `sold-positions.component.spec.ts` "Verify no client-side sorting" describe block
- [x] Task 2: Verify no client-side sorting logic exists in components
  - [x] Confirmed `global-universe.component.ts` has no sortData(), Array.sort(), or comparator functions
  - [x] Confirmed `open-positions.component.ts` has no sortData(), Array.sort(), or comparator functions
  - [x] Confirmed `sold-positions.component.ts` has no sortData(), Array.sort(), or comparator functions
  - [x] Confirmed all three components delegate sorting to SortStateService via onSortChange()
- [x] Task 3: Verify all tests pass
  - [x] `pnpm all` — lint, build, test all pass (80 test files, 1611 tests passed)
  - [x] `pnpm dupcheck` — pass
  - [x] `pnpm format` — pass
  - [x] e2e-chromium — pass
  - [x] e2e-firefox — pass

### File List

- `apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts` — removed `.skip` from "Verify no client-side sorting" describe block
- `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts` — removed `.skip` from "Verify no client-side sorting" describe block
- `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.spec.ts` — removed `.skip` from "Verify no client-side sorting" describe block
- `docs/stories/AW.10.implement-remove-client-side-sorting.md` — updated Dev Agent Record

### Change Log

- Removed `describe.skip` → `describe` for AW.9 "Verify no client-side sorting" test blocks in 3 spec files
- No component .ts changes needed — client-side sorting was already absent (prior stories handled removal)

### Debug Log References

None — no issues encountered.
