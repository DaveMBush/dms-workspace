# Story AX.6: Implement - Convert openTrades to PartialArrayDefinition

## Story

**As a** system architect
**I want** openTrades to use PartialArrayDefinition
**So that** SmartNgRX can lazily load trade IDs as needed

## Acceptance Criteria

### Functional Requirements

- [ ] `account.interface.ts`: openTrades type changed to PartialArrayDefinition | SmartArray
- [ ] `accounts-definition.const.ts`: default openTrades is PartialArrayDefinition
- [ ] Server buildAccountResponse returns PartialArrayDefinition for openTrades
- [ ] Server /indexes endpoint handles 'openTrades' childField
- [ ] Query filters: sell_date IS NULL
- [ ] Ordering via buildTradeOrderBy applied
- [ ] Tests from AX.5 re-enabled and passing

## Definition of Done

- [ ] Implementation complete
- [ ] Tests from AX.5 passing
- [ ] All validation commands pass

## Related Stories

- **Previous**: Story AX.5
- **Next**: Story AX.7
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

In Progress

### Agent Model Used

Claude Opus 4.6

### File List

- apps/dms-material/src/app/store/accounts/account.interface.ts (modified)
- apps/dms-material/src/app/store/accounts/accounts-definition.const.ts (modified)
- apps/server/src/app/routes/accounts/account.interface.ts (modified)
- apps/server/src/app/routes/accounts/index.ts (modified)
- apps/server/src/app/routes/accounts/build-account-response.function.ts (new)
- apps/server/src/app/routes/accounts/build-account-response.spec.ts (modified)
- apps/server/src/app/routes/accounts/indexes/index.ts (modified)
- apps/server/src/app/routes/accounts/indexes/indexes-open-trades.spec.ts (modified)

### Change Log

- Changed openTrades type from `string[] | Trade[]` to `PartialArrayDefinition | SmartArray<Account, Trade>` in dms-material account interface
- Changed default openTrades from `[]` to `{ startIndex: 0, indexes: [], length: 0 }` in accounts-definition
- Changed server Account interface openTrades from `string[]` to PartialArrayDefinition shape
- Modified buildAccountResponse to return openTrades as PartialArrayDefinition (startIndex: 0, first 10 indexes, total length)
- Extracted buildAccountResponse and helpers into build-account-response.function.ts to satisfy max-lines lint rule
- Updated indexes endpoint to handle 'openTrades' childField with sell_date IS NULL filter and buildTradeOrderBy ordering
- Fixed add/update account handlers to return openTrades as PartialArrayDefinition
- Re-enabled 13 AX.5 TDD tests (removed describe.skip)

### Completion Notes

### Debug Log References
