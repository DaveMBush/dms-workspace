# Story AX.8: Implement - Virtual data access for Open Positions

## Story

**As a** user with many open positions
**I want** the table to load only visible rows
**So that** the page loads quickly

## Acceptance Criteria

### Functional Requirements

- [ ] OpenPositionsComponent has visibleRange signal
- [ ] onRangeChange handler implemented
- [ ] selectOpenPositions uses visible-window loop
- [ ] Template binds (renderedRangeChange)
- [ ] Tests from AX.7 re-enabled and passing

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] All validation commands pass

## Related Stories

- **Previous**: Story AX.7
- **Next**: Story AX.9
- **Epic**: Epic AX
- **Dependencies**: AX.2, AX.6

---

## Dev Agent Record

### Status

Complete

### Agent Model Used

Claude Opus 4.6

### Change Log

- Added `visibleRange` writable signal to `OpenPositionsComponentService` with default `{ start: 0, end: 50 }`
- Modified `selectOpenPositions` computed to use visible-window loop: creates sparse array, only transforms items within `visibleRange`
- Extracted `transformTradeToPosition` private method from inline loop logic
- Added `visibleRange` signal to `OpenPositionsComponent`
- Added `onRangeChange` handler that updates both component and service `visibleRange`
- Bound `(renderedRangeChange)` event on `dms-base-table` in template
- Re-enabled AX.7 TDD tests in both component and service spec files
- Fixed CodeRabbit finding: pre-filter closed trades by collecting open-trade indices before visible-window loop to prevent undefined slots in sparse array

### File List

- apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts (modified)
- apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts (modified)
- apps/dms-material/src/app/account-panel/open-positions/open-positions.component.html (modified)
- apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.spec.ts (modified)
- apps/dms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts (modified)

### Debug Log References

### Completion Notes

- PR #651 merged via squash to main (commit a729af5)
- Issue #650 auto-closed
- CodeRabbit review: 1 finding addressed (sparse array undefined slots from closed trades)
- CI passed on both commits
- All 83 unit tests passing, E2E pre-existing failures only
