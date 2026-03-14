# Story AX.10: Implement - Convert soldTrades to PartialArrayDefinition

## Story

**As a** system architect
**I want** soldTrades to use PartialArrayDefinition
**So that** SmartNgRX can lazily load sold trade IDs

## Acceptance Criteria

### Functional Requirements

- [ ] account.interface.ts: soldTrades type updated
- [ ] accounts-definition.const.ts: default updated
- [ ] Server returns PartialArrayDefinition for soldTrades
- [ ] Server /indexes handles 'soldTrades'
- [ ] Filter: sell_date IS NOT NULL
- [ ] Tests from AX.9 re-enabled and passing

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] All validation commands pass

## Related Stories

- **Previous**: Story AX.9
- **Next**: Story AX.11
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

Ready for Review

### Agent Model Used

Claude Opus 4.6 (copilot)

### Change Log

- Updated client account.interface.ts: soldTrades type changed to `PartialArrayDefinition | SmartArray<Account, Trade>`
- Updated accounts-definition.const.ts: soldTrades default changed to `{ startIndex: 0, indexes: [], length: 0 }`
- Updated server account.interface.ts: soldTrades changed to PartialArrayDefinition shape
- Updated build-account-response.function.ts: soldTrades response returns PartialArrayDefinition with first 10 IDs
- Updated indexes/index.ts: Refactored to shared handleTradeIndexes for open/sold trades
- Updated server accounts/index.ts: soldTrades default uses PartialArrayDefinition shape
- Re-enabled all AX.9 skipped test suites (3 files)

### File List

- apps/dms-material/src/app/store/accounts/account.interface.ts (modified)
- apps/dms-material/src/app/store/accounts/accounts-definition.const.ts (modified)
- apps/dms-material/src/app/store/accounts/account-sold-trades.spec.ts (modified)
- apps/server/src/app/routes/accounts/account.interface.ts (modified)
- apps/server/src/app/routes/accounts/build-account-response.function.ts (modified)
- apps/server/src/app/routes/accounts/build-account-response-sold-trades.spec.ts (modified)
- apps/server/src/app/routes/accounts/index.ts (modified)
- apps/server/src/app/routes/accounts/indexes/index.ts (modified)
- apps/server/src/app/routes/accounts/indexes/indexes-sold-trades.spec.ts (modified)
- docs/qa/gates/AX.10-implement-sold-trades-partial-array.yml (new)
- docs/stories/AX.10.implement-sold-trades-partial-array.md (modified)

### Completion Notes

- All acceptance criteria met
- QA gate: PASS
