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

### Status

Approved

### Tasks / Subtasks

### File List

### Change Log

### Debug Log References
