# Story AW.7: Write Unit Tests for Frontend Components Calling New Endpoints with Sort Parameters - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for frontend components calling the new endpoints
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Components call old mixed trades endpoint
- Components don't integrate with SortStateService
- Need to update to use new separate endpoints

**Implementation Approach:**

- Write unit tests for universe table component with sort integration
- Write unit tests for open trades component with sort integration
- Write unit tests for closed trades component with sort integration
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AW.8

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for UniverseTableComponent
  - [ ] Test calling /api/universe with sort state
  - [ ] Test updating SortStateService on sort change
  - [ ] Test loading sort state on component init
- [ ] Unit tests written for OpenTradesComponent
  - [ ] Test calling /api/trades/open with sort state
  - [ ] Test updating SortStateService on sort change
  - [ ] Test loading sort state on component init
- [ ] Unit tests written for ClosedTradesComponent
  - [ ] Test calling /api/trades/closed with sort state
  - [ ] Test updating SortStateService on sort change
  - [ ] Test loading sort state on component init
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] HttpClient properly mocked
- [ ] SortStateService properly mocked
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write Universe Table Component Tests

```typescript
describe('UniverseTableComponent', () => {
  describe.skip('Sort integration', () => {
    it('should load sort state on init');
    it('should call universe endpoint with sort parameters');
    it('should save sort state when user changes sort');
    it('should update table when sort changes');
    it('should handle sort errors gracefully');
  });
});
```

### Step 2: Write Open Trades Component Tests

```typescript
describe('OpenTradesComponent', () => {
  describe.skip('Sort integration', () => {
    it('should load sort state on init');
    it('should call open trades endpoint');
    it('should save sort state when user changes sort');
    it('should update table when sort changes');
    it('should handle sort errors gracefully');
  });
});
```

### Step 3: Write Closed Trades Component Tests

```typescript
describe('ClosedTradesComponent', () => {
  describe.skip('Sort integration', () => {
    it('should load sort state on init');
    it('should call closed trades endpoint');
    it('should save sort state when user changes sort');
    it('should update table when sort changes');
    it('should handle sort errors gracefully');
  });
});
```

### Step 4: Run Tests and Verify RED Phase

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests written and disabled (RED phase)
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Tests disabled to allow CI to pass
- [ ] Test code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase
- Tests should fail because implementation doesn't exist yet
- Story AW.8 will implement the functionality and re-enable tests

## Related Stories

- **Previous**: Story AW.6 (HTTP interceptor implementation)
- **Next**: Story AW.8 (Implementation)
- **Epic**: Epic AW

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Status

Complete

### Tasks / Subtasks

- [x] Write Unit Tests for GlobalUniverseComponent sort integration (describe.skip)
- [x] Write Unit Tests for OpenPositionsComponent sort integration (describe.skip)
- [x] Write Unit Tests for SoldPositionsComponent (ClosedTrades) sort integration (describe.skip)
- [x] Verify all tests skipped and CI green (pnpm all, lint, build, test)
- [x] Run pnpm format and pnpm dupcheck

### File List

- apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts (modified)
- apps/dms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts (modified)
- apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.spec.ts (modified)

### Change Log

- Added `describe.skip('Sort integration with SortStateService')` block to GlobalUniverseComponent spec with 5 tests for "universes" table sort integration
- Added `describe.skip('Sort integration with SortStateService')` block to OpenPositionsComponent spec with 5 tests for "trades-open" table sort integration
- Added `describe.skip('Sort integration with SortStateService')` block to SoldPositionsComponent spec with 5 tests for "trades-closed" table sort integration
- Each test block covers: load sort state on init, call endpoint with sort params, save sort state on change, update table on sort change, handle sort errors gracefully

### Debug Log References
