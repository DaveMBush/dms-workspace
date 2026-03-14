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

Draft
