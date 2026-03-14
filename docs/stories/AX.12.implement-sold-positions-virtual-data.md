# Story AX.12: Implement - Virtual data access for Sold Positions

## Story

**As a** user with many sold positions
**I want** the table to load only visible rows
**So that** scrolling through history is efficient

## Acceptance Criteria

### Functional Requirements

- [ ] SoldPositionsComponent has visibleRange signal
- [ ] onRangeChange handler bonds to event
- [ ] selectSoldPositions uses visible-window loop
- [ ] Template binds (renderedRangeChange)
- [ ] Tests from AX.11 passing

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] All validation commands pass

## Related Stories

- **Previous**: Story AX.11
- **Next**: Story AX.13
- **Epic**: Epic AX
- **Dependencies**: AX.2, AX.10

---

## Dev Agent Record

### Status

Ready for Review

### Tasks

- [x] Add `visibleRange` signal to SoldPositionsComponent
- [x] Add `onRangeChange` handler to SoldPositionsComponent
- [x] Add `visibleRange` signal to SoldPositionsComponentService
- [x] Modify `selectSoldPositions` to use visible-window loop
- [x] Bind `(renderedRangeChange)` in template
- [x] Enable AX.11 TDD tests (remove `.skip`)

### Agent Model Used

Claude Opus 4.6

### File List

- apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts
- apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.html
- apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts
- apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.spec.ts
- apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.spec.ts
- docs/stories/AX.12.implement-sold-positions-virtual-data.md

### Change Log

- Added `visibleRange` signal with default `{ start: 0, end: 50 }` to SoldPositionsComponent
- Added `onRangeChange` method to SoldPositionsComponent that propagates to service
- Added `(renderedRangeChange)="onRangeChange($event)"` binding to template
- Added `visibleRange` signal to SoldPositionsComponentService
- Refactored `selectSoldPositions` to use visible-window loop pattern (sparse array: only transform items in visible range)
- Enabled AX.11 TDD tests in both component and service spec files

### Completion Notes

### Debug Log References
