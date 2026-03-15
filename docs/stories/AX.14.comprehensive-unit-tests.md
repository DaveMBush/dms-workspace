# Story AX.14: Comprehensive Unit Tests

## Story

**As a** developer
**I want** comprehensive test coverage for virtual scrolling
**So that** the implementation is reliable and maintainable

## Acceptance Criteria

### Test Coverage

- [ ] BaseTableComponent renderedRangeChange output
- [ ] All three component services' computed signals
  - [ ] Correct slice returned for given range
  - [ ] Total array length matches smartArray.length
- [ ] Server /indexes endpoint for all three child fields
- [ ] Integration tests for viewport → range → render flow
- [ ] Edge cases: empty arrays, single item, scroll to end/beginning

## Definition of Done

- [ ] All tests implemented and passing
- [ ] Code coverage meets standards
- [ ] All validation commands pass

## Related Stories

- **Previous**: Story AX.13
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

Done
