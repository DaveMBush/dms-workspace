# Story AX.4: Implement - Virtual data access for Dividend Deposits

## Story

**As a** user with many dividend deposits
**I want** the table to load only visible rows
**So that** the page loads quickly and scrolling is smooth

## Context

**Pre-condition:** AX.3 TDD tests complete and disabled. Infrastructure already in place (PartialArrayDefinition, server endpoints).

## Acceptance Criteria

### Functional Requirements

- [ ] `DividendDepositsComponent` has `visibleRange` signal
- [ ] `onRangeChange` method updates `visibleRange`
- [ ] `dividends` computed signal uses visible-window loop
- [ ] Sparse array returned with correct total length
- [ ] Template binds `(renderedRangeChange)` on `dms-base-table`
- [ ] Only visible rows trigger data loading from server

### Technical Requirements

- [ ] Tests from AX.3 re-enabled and passing
- [ ] Follows SmartNgRX visible-window loop pattern
- [ ] OnPush change detection maintained

## Implementation Details

See Epic AX story AX.2 (now AX.4) for detailed implementation steps.

## Definition of Done

- [ ] Implementation complete
- [ ] Tests from AX.3 re-enabled and passing
- [ ] Manual verification: virtual data loading works correctly
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`

## Related Stories

- **Previous**: Story AX.3 (TDD)
- **Next**: Story AX.5 (TDD)
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

In Progress

### Agent Model Used

Claude Opus 4.6 (copilot)

### Tasks

- [x] Add `visibleRange` writable signal to `DividendDepositsComponentService`
- [x] Convert `dividends` computed to visible-window loop with sparse array
- [x] Add `visibleRange` signal and `onRangeChange` method to `DividendDepositsComponent`
- [x] Bind `(renderedRangeChange)` on `dms-base-table` in template
- [x] Re-enable AX.3 TDD tests (remove `describe.skip`)
- [x] Add `visibleRange` to all mock service definitions in component spec
- [x] Add `currentAccountSignalStore` provider to service spec TestBed
- [x] Verify all unit tests pass

### File List

- apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.ts (modified)
- apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts (modified)
- apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.html (modified)
- apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.spec.ts (modified)
- apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts (modified)
- docs/stories/AX.4.implement-dividend-deposits-virtual-data.md (modified)

### Change Log

- Added `visibleRange` writable signal with default `{ start: 0, end: 50 }` to `DividendDepositsComponentService`
- Converted `dividends` computed signal from full-array loop to visible-window loop returning sparse array
- Added `visibleRange` signal and `onRangeChange` method to `DividendDepositsComponent`
- Added `(renderedRangeChange)="onRangeChange($event)"` binding to template
- Re-enabled AX.3 TDD tests (11 service + 4 component) by removing `describe.skip`
- Added `visibleRange` signal to all mock service definitions in component spec
- Added `currentAccountSignalStore` provider to service spec TestBed configuration

### Debug Log References

None

### Completion Notes
