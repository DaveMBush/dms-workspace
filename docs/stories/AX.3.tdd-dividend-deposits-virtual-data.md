# Story AX.3: TDD - Virtual data access for Dividend Deposits

## Story

**As a** developer
**I want** to write unit tests for Dividend Deposits virtual data access
**So that** I have failing tests that define the expected visible-window loop behavior (TDD RED phase)

## Context

**Current System:**
- Dividend Deposits table loops through all items (0..length)
- `divDeposits` already uses `PartialArrayDefinition`
- Server `/indexes` endpoint already exists

**Implementation Approach:**
- Write tests for `visibleRange` signal
- Test `onRangeChange` method
- Test computed signal uses visible-window loop pattern
- Disable tests to allow CI to pass
- Tests will be re-enabled in Story AX.4

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for Dividend Deposits virtual data access
  - [ ] Test `visibleRange` signal has default `{ start: 0, end: 50 }`
  - [ ] Test `onRangeChange` updates signal correctly
  - [ ] Test `dividends` computed signal returns sparse array with correct length
  - [ ] Test only items within visible range are transformed
  - [ ] Test items outside range use placeholder length increments
  - [ ] Test visible-window loop pattern is applied
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip()` to allow CI to pass

### Technical Requirements

- [ ] Tests follow Angular testing patterns
- [ ] Mock SmartArray behavior
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are specific

## Definition of Done

- [ ] All unit tests written and disabled (RED phase)
- [ ] Tests cover all acceptance criteria
- [ ] Tests disabled to allow CI to pass
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`

## Related Stories

- **Previous**: Story AX.2 (Implementation)
- **Next**: Story AX.4 (Implementation)
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

Approved
