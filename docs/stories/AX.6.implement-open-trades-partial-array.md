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

Approved
