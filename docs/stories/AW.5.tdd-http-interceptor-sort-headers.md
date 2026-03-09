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

### Status

Approved

### Tasks / Subtasks

### File List

### Change Log

### Debug Log References
