# Story AX.7: TDD - Virtual data access for Open Positions

## Story

**As a** developer
**I want** to write unit tests for Open Positions virtual data access
**So that** I have failing tests that define visible-window loop behavior (TDD RED phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Tests for OpenPositionsComponent visibleRange signal
- [ ] Tests for onRangeChange handler
- [ ] Tests for selectOpenPositions sparse array behavior
- [ ] Tests verify visible-window loop pattern
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip()`

## Definition of Done

- [ ] All tests written and disabled
- [ ] All validation commands pass

## Related Stories

- **Previous**: Story AX.6
- **Next**: Story AX.8
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

Ready for Review

### Tasks

- [x] Create OpenPositionsComponentService spec with virtual data access tests (visibleRange, sparse array, visible-window loop)
- [x] Add component-level virtual data access tests to OpenPositionsComponent spec (visibleRange signal, onRangeChange handler)
- [x] Verify all tests are disabled with `.skip()`
- [x] Run validations to ensure CI passes

### Agent Model Used

Claude Opus 4.6

### File List

- apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.spec.ts (new)
- apps/dms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts (modified)
- docs/stories/AX.7.tdd-open-positions-virtual-data.md (modified)

### Change Log

- Created `open-positions-component.service.spec.ts` with 12 TDD tests for virtual data access: sparse array length, visible range transformation, placeholder slots outside range, visible-window loop pattern, universe symbol resolution, edge cases (beyond data length, empty array), visibleRange signal, recomputation on range change, and OpenPosition field computation
- Added `describe.skip` block to `open-positions.component.spec.ts` with 4 TDD tests for: visibleRange signal default, onRangeChange updates, subsequent range changes, and service visibleRange propagation
- All tests disabled with `.skip()` per TDD RED phase requirements

### Completion Notes

### Debug Log References

## QA Results

### Review Date: 2026-03-14

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

TDD RED phase tests follow the established pattern from AX.3 (Dividend Deposits Virtual Data Access). Service spec mirrors the dividend-deposits-component.service.spec.ts structure with appropriate adaptations for OpenPositions domain. Component spec follows the same visibleRange/onRangeChange test pattern from AX.3.

### Compliance Check

- Coding Standards: ✓ Named functions used, no anonymous functions
- Project Structure: ✓ Files in correct locations following conventions
- Testing Strategy: ✓ TDD RED phase — all tests disabled with .skip()
- All ACs Met: ✓ All 6 acceptance criteria addressed

### Gate Status

Gate: PASS → docs/qa/gates/AX.7-tdd-open-positions-virtual-data.yml

### Recommended Status

✓ Ready for Done
