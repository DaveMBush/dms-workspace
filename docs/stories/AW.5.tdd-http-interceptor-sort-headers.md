# Story AW.5: Write Unit Tests for HTTP Interceptor Sending Sort Headers and localStorage Management - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for the httpInterceptor that sends sort headers and manages localStorage
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Sort state not persisted across page refreshes
- No mechanism to send sort parameters to backend

**Implementation Approach:**

- Write unit tests for localStorage sort state management
- Write unit tests for httpInterceptor adding sort headers to requests
- Test reading/writing sort configuration
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AW.6

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for SortStateService
  - [ ] Test saveSortState() stores sort config in localStorage
  - [ ] Test loadSortState() retrieves sort config
  - [ ] Test clearSortState() removes sort config
  - [ ] Test handling multiple table sort states
- [ ] Unit tests written for SortInterceptor
  - [ ] Test interceptor adds X-Sort-Field header
  - [ ] Test interceptor adds X-Sort-Order header
  - [ ] Test interceptor reads from SortStateService
  - [ ] Test interceptor only adds headers for relevant endpoints
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] localStorage properly mocked
- [ ] HttpInterceptor interface correctly used
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write SortStateService Tests

```typescript
describe('SortStateService', () => {
  describe.skip('Sort state management', () => {
    it('should save sort state to localStorage');
    it('should load sort state from localStorage');
    it('should clear sort state from localStorage');
    it('should handle multiple table configurations');
    it('should return default state when no saved state exists');
    it('should handle corrupted localStorage data');
  });
});
```

### Step 2: Write SortInterceptor Tests

```typescript
describe('SortInterceptor', () => {
  describe.skip('HTTP request interception', () => {
    it('should add X-Sort-Field header to universe requests');
    it('should add X-Sort-Order header to universe requests');
    it('should add sort headers to trades/open requests');
    it('should add sort headers to trades/closed requests');
    it('should not add headers to non-sortable endpoints');
    it('should read sort state from SortStateService');
    it('should use default sort when no state exists');
  });
});
```

### Step 3: Run Tests and Verify RED Phase

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
- Story AW.6 will implement the functionality and re-enable tests

## Related Stories

- **Previous**: Story AW.4 (Trades endpoints implementation)
- **Next**: Story AW.6 (Implementation)
- **Epic**: Epic AW

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Status

Ready for Review

### Tasks / Subtasks

- [x] Study existing Angular test patterns (auth.interceptor.spec.ts, performance.interceptor.spec.ts, state-persistence.service.spec.ts)
- [x] Create SortStateService stub with minimal interface for import resolution
- [x] Create SortInterceptor stub with no-op pass-through for import resolution
- [x] Write SortStateService tests with describe.skip (saveSortState, loadSortState, clearSortState, multiple tables)
- [x] Write SortInterceptor tests with describe.skip (sort headers, endpoint filtering, default behavior)
- [x] Fix lint issues (dot-notation, one-exported-item-per-file, naming-convention)
- [x] Run pnpm all — lint, build, test pass
- [x] Run pnpm dupcheck — pass
- [x] Run pnpm format — pass
- [x] Run E2E chromium — pass
- [x] Run E2E firefox — pass

### File List

- apps/dms-material/src/app/shared/services/sort-state.service.ts (new — TDD RED stub)
- apps/dms-material/src/app/shared/services/sort-state.service.spec.ts (new — 16 skipped tests)
- apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts (new — TDD RED stub)
- apps/dms-material/src/app/auth/interceptors/sort.interceptor.spec.ts (new — 18 skipped tests)
- docs/stories/AW.5.tdd-http-interceptor-sort-headers.md (updated — Dev Agent Record)

### Change Log

- Created SortStateService stub (`sort-state.service.ts`) with save/load/clear interface and no-op implementations
- Created SortInterceptor stub (`sort.interceptor.ts`) with pass-through no-op implementation
- Created SortStateService spec (`sort-state.service.spec.ts`) with 16 skipped tests covering: saveSortState (4 tests), loadSortState (4 tests), clearSortState (2 tests), multiple table configurations (4 tests)
- Created SortInterceptor spec (`sort.interceptor.spec.ts`) with 18 skipped tests covering: universe endpoint headers (3 tests), trades endpoint headers (4 tests), non-sortable endpoints (3 tests), default sort behavior (2 tests)
- All tests use describe.skip for TDD RED phase — CI passes with tests properly skipped

### Debug Log References
