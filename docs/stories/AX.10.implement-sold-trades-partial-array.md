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

Draft
