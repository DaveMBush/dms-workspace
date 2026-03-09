# Story AW.9: Write Unit Tests Verifying Client-Side Sorting Logic is Removed - TDD RED Phase

## Story

**As a** developer
**I want** to write tests that verify all client-side sorting logic has been removed
**So that** I can ensure we're truly using server-side sorting (TDD RED phase)

## Context

**Current System:**

- Components still contain client-side sorting logic
- Need to verify removal before cleanup
- Ensure no sorting happens in the frontend

**Implementation Approach:**

- Write unit tests to verify no client-side sorting methods exist
- Write unit tests to verify data is used as-received from server
- Test that sort UI triggers server calls, not local sorting
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AW.10

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written to verify client-side sorting removal
  - [ ] Test that no sortData() or similar methods exist in components
  - [ ] Test that data arrays are not manipulated for sorting
  - [ ] Test that sort changes trigger HTTP calls
  - [ ] Test that received data order is preserved
  - [ ] Test that no Array.sort() calls exist in table components
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] Tests verify absence of client-side sorting
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write Tests for No Client-Side Sorting

```typescript
describe('UniverseTableComponent - Client-Side Sorting Removal', () => {
  describe.skip('Verify no client-side sorting', () => {
    it('should not have sortData method');
    it('should not manipulate data array order');
    it('should preserve server response order');
    it('should trigger HTTP call on sort change');
    it('should not use Array.sort() on table data');
  });
});

describe('OpenTradesComponent - Client-Side Sorting Removal', () => {
  describe.skip('Verify no client-side sorting', () => {
    it('should not have sortData method');
    it('should preserve server response order');
    it('should trigger HTTP call on sort change');
  });
});

describe('ClosedTradesComponent - Client-Side Sorting Removal', () => {
  describe.skip('Verify no client-side sorting', () => {
    it('should not have sortData method');
    it('should preserve server response order');
    it('should trigger HTTP call on sort change');
  });
});
```

### Step 2: Write Tests for Preserved Order

```typescript
describe('Data Order Preservation', () => {
  describe.skip('Server order maintained', () => {
    it('should display data in exact server response order');
    it('should not reorder data after receiving response');
    it('should maintain order through component lifecycle');
  });
});
```

### Step 3: Run Tests and Verify RED Phase

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests written and disabled (RED phase)
- [ ] Tests cover verification of sorting removal
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
- Tests should fail because client-side sorting still exists
- Story AW.10 will remove sorting and enable tests

## Related Stories

- **Previous**: Story AW.8 (Frontend components implementation)
- **Next**: Story AW.10 (Implementation)
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
