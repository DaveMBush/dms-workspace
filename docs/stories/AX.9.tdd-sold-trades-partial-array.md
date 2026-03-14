# Story AX.9: TDD - Convert soldTrades to PartialArrayDefinition

## Story

**As a** developer
**I want** to write unit tests for converting soldTrades to PartialArrayDefinition
**So that** I have failing tests for the server changes (TDD RED phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Tests for Account interface soldTrades field
- [ ] Tests for default row PartialArrayDefinition
- [ ] Tests for server soldTrades response shape
- [ ] Tests for /indexes endpoint with childField === 'soldTrades'
- [ ] Tests verify sell_date IS NOT NULL filter
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip()`

## Definition of Done

- [ ] All tests written and disabled
- [ ] All validation commands pass

## Related Stories

- **Previous**: Story AX.8
- **Next**: Story AX.10
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

Complete

### Agent Model Used

Claude Opus 4.6 (copilot)

### Tasks

- [x] Create frontend Account interface soldTrades TDD tests
- [x] Create server build-account-response soldTrades TDD tests
- [x] Create server /indexes endpoint soldTrades TDD tests
- [x] Verify sell_date IS NOT NULL filter in tests
- [x] All tests disabled with `.skip()`

### File List

- apps/dms-material/src/app/store/accounts/account-sold-trades.spec.ts (new)
- apps/server/src/app/routes/accounts/build-account-response-sold-trades.spec.ts (new)
- apps/server/src/app/routes/accounts/indexes/indexes-sold-trades.spec.ts (new)
- docs/qa/gates/AX.9-tdd-sold-trades-partial-array.yml (new)

### Change Log

- Created `account-sold-trades.spec.ts` - Frontend TDD tests for Account interface and default row soldTrades as PartialArrayDefinition
- Created `build-account-response-sold-trades.spec.ts` - Server TDD tests for buildAccountResponse returning soldTrades as PartialArrayDefinition shape
- Created `indexes-sold-trades.spec.ts` - Server TDD tests for /indexes endpoint handling childField === 'soldTrades' with sell_date IS NOT NULL filter
- All tests use `describe.skip()` for RED phase (TDD)
- Created QA gate file (PASS)

### Debug Log References

(none)

### Completion Notes

All TDD RED phase tests written and disabled, covering all acceptance criteria. Tests mirror the existing AX.5 openTrades patterns for consistency.
