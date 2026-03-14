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

In Progress

### Agent Model Used

Claude Opus 4.6 (copilot)

### Tasks

- [x] Write unit tests for visibleRange signal default value
- [x] Write unit tests for onRangeChange method
- [x] Write unit tests for dividends computed sparse array behavior
- [x] Write unit tests for visible-window loop pattern
- [x] Write edge case tests (range beyond data, empty data, reactivity)
- [x] Disable all tests with `.skip()` for CI
- [x] Verify lint passes
- [x] Verify build passes
- [x] Verify existing tests still pass

### File List

- apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts (modified)
- apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.spec.ts (new)

### Change Log

- Added `describe.skip` block "DividendDepositsComponent - Virtual Data Access (AX.3)" to component spec with 4 tests for `visibleRange` signal and `onRangeChange` method
- Created new service spec file with `describe.skip` block "DividendDepositsComponentService - Virtual Data Access (AX.3)" containing 11 tests for sparse array behavior, visible-window loop, symbol/type resolution, and edge cases
- All tests are in RED phase (test features that will be implemented in AX.4)
- All tests disabled with `describe.skip()` to allow CI to pass

### Debug Log References

None

### Completion Notes

- 15 TDD tests total (4 component + 11 service) covering all acceptance criteria
- Tests verify: visibleRange default, onRangeChange updates, sparse array length, visible-range-only transformation, undefined items outside range, visible-window loop pattern, symbol/type resolution, edge cases
- Pre-existing test failures in Account Selection Integration block (60 tests on main) are unrelated
