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

Draft
