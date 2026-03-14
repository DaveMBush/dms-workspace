# Story AX.5: TDD - Convert openTrades to PartialArrayDefinition

## Story

**As a** developer
**I want** to write unit tests for converting openTrades to PartialArrayDefinition
**So that** I have failing tests that define the expected server response shape (TDD RED phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for openTrades conversion
  - [ ] Test Account interface accepts PartialArrayDefinition for openTrades
  - [ ] Test default row has correct PartialArrayDefinition shape
  - [ ] Test server buildAccountResponse returns PartialArrayDefinition (startIndex=0, first 10 IDs, total length)
  - [ ] Test /indexes endpoint handles childField === 'openTrades'
  - [ ] Test filters for open trades (sell_date: null)
  - [ ] Test applies buildTradeOrderBy ordering
  - [ ] Test returns correct slice and count
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip()` to allow CI to pass

## Definition of Done

- [ ] All unit tests written and disabled
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`

## Related Stories

- **Previous**: Story AX.4
- **Next**: Story AX.6
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

In Progress

### Agent Model Used

Claude Opus 4.6 (copilot)

### Tasks

- [x] Write unit tests for buildAccountResponse returning PartialArrayDefinition for openTrades
- [x] Write unit tests for /indexes endpoint handling childField === 'openTrades'
- [x] Write unit tests for Account interface accepting PartialArrayDefinition
- [x] Write unit tests for default row PartialArrayDefinition shape
- [x] Write tests for open trades filtering (sell_date: null)
- [x] Write tests for buildTradeOrderBy ordering applied to open trades
- [x] Write tests for correct slice and count in indexes response
- [x] Disable all tests with `.skip()` for CI
- [x] Verify all tests are properly skipped

### File List

- apps/server/src/app/routes/accounts/build-account-response.spec.ts (new)
- apps/server/src/app/routes/accounts/indexes/indexes-open-trades.spec.ts (new)
- apps/dms-material/src/app/store/accounts/account-open-trades.spec.ts (new)
- docs/stories/AX.5.tdd-open-trades-partial-array.md (modified)

### Change Log

- Created server-side TDD tests in `build-account-response.spec.ts` with 7 skipped tests covering: PartialArrayDefinition shape with startIndex=0, first 10 IDs in indexes, total length matching all open trades count, sell_date null filtering, buildTradeOrderBy ordering, fewer than 10 trades edge case, and empty trades edge case
- Created indexes endpoint TDD tests in `indexes-open-trades.spec.ts` with 6 skipped tests covering: childField === 'openTrades' handling, sell_date null filter verification, ordering applied, correct skip/take slicing, total count from prisma, and empty results
- Created client-side TDD tests in `account-open-trades.spec.ts` with 3 skipped tests covering: Account interface accepts PartialArrayDefinition for openTrades, default row has PartialArrayDefinition shape, and default row id correctness
- All 16 tests disabled with `describe.skip()` to allow CI to pass (RED phase)

### Debug Log References

None

### Completion Notes
