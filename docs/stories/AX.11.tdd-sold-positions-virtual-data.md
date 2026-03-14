# Story AX.11: TDD - Virtual data access for Sold Positions

## Story

**As a** developer
**I want** to write unit tests for Sold Positions virtual data access
**So that** I have failing tests for visible-window loop (TDD RED phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Tests for SoldPositionsComponent visibleRange
- [ ] Tests for onRangeChange
- [ ] Tests for selectSoldPositions sparse array
- [ ] Tests verify visible-window loop
- [ ] All tests fail (RED phase)
- [ ] Tests disabled with `.skip()`

## Definition of Done

- [ ] All tests written and disabled
- [ ] All validation commands pass

## Related Stories

- **Previous**: Story AX.10
- **Next**: Story AX.12
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

In Progress

### Agent Model Used

Claude Opus 4.6 (copilot)

### File List

- apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.spec.ts (modified)
- apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.spec.ts (new)

### Change Log

- Added `describe.skip` block for Virtual Data Access component tests (visibleRange, onRangeChange) to sold-positions.component.spec.ts
- Created sold-positions-component.service.spec.ts with `describe.skip` block for sparse array and visible-window loop tests

### Debug Log References

(none)

### Completion Notes

(pending)
