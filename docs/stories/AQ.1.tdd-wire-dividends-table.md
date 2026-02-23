# Story AQ.1: TDD - Wire Dividends Table to DivDeposit SmartNgRX

## Status

Draft

## Story

**As a** frontend developer
**I want** comprehensive unit tests for dividends table wiring
**So that** I can ensure the table correctly displays and interacts with DivDeposit SmartNgRX before implementation

## Context

**Current System:**

- Dividend deposits component exists with basic structure
- DivDepositsEffectsService available with SmartNgRX
- Table uses BaseTableComponent for display

**Problem:**

- Need to wire table to SmartNgRX divDeposits store
- Need tests before implementation (TDD RED phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify table displays dividends from SmartNgRX store
2. [ ] Tests verify table filters by selected account
3. [ ] Tests verify table columns display correctly (symbol, date, amount, type)
4. [ ] Tests verify table sorting functionality
5. [ ] Tests verify empty state when no dividends

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA (Arrange-Act-Assert) pattern
3. [ ] Tests disabled with .skip after RED verification
4. [ ] Mock DivDepositsEffectsService properly
5. [ ] Mock AccountsEffectsService for account filtering

## Tasks / Subtasks

- [ ] Create comprehensive unit tests (AC: 1-5)
  - [ ] Test dividends computed signal reads from store
  - [ ] Test filtering by selected account
  - [ ] Test column definitions match requirements
  - [ ] Test sorting integration with BaseTableComponent
  - [ ] Test empty state display
- [ ] Run tests to verify RED state (AC: 6)
  - [ ] Execute: `pnpm nx test dms-material --testFile=dividend-deposits.component.spec.ts`
  - [ ] Verify all new tests fail
- [ ] Disable tests with .skip for CI (AC: 7)
  - [ ] Wrap test suite in describe.skip
  - [ ] Add comment: "Disabled until implementation in AQ.2"
- [ ] Commit RED tests (AC: 8)
  - [ ] Stage test file
  - [ ] Commit with message: "feat(AQ.1): Add RED unit tests for dividends table wiring"

## Dev Notes

### Testing Standards

**Test File Location:**
`apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts`

**Testing Frameworks:**
- Vitest for unit testing
- Angular Testing Library patterns
- SmartNgRX mock patterns

**Test Requirements:**
- Follow AAA pattern (Arrange-Act-Assert)
- Use computed signals from SmartNgRX
- Mock EffectsService properly
- Test each acceptance criteria explicitly
- Achieve >80% code coverage for component

**DivDeposit Interface:**
```typescript
interface DivDeposit {
  id: string;
  symbol: string;
  date: string;
  amount: number;
  type: string;
  accountId: string;
}
```

**SmartNgRX Services to Mock:**
- `DivDepositsEffectsService` - provides entities() signal
- `AccountsEffectsService` - provides selectedAccountId() signal

**Column Definitions Required:**
```typescript
columns: ColumnDef[] = [
  { field: 'symbol', header: 'Symbol', sortable: true, width: '120px' },
  { field: 'date', header: 'Date', type: 'date', sortable: true, width: '110px' },
  { field: 'amount', header: 'Amount', type: 'currency', sortable: true, width: '100px' },
  { field: 'type', header: 'Type', width: '120px' }
];
```

### Relevant Source Tree

**Component Under Test:**
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts`
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.html`

**Dependencies:**
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
- `apps/dms-material/src/app/store/div-deposits/div-deposits-effect.service.ts`
- `apps/dms-material/src/app/store/div-deposits/div-deposit.interface.ts`
- `apps/dms-material/src/app/store/accounts/accounts-effect.service.ts`

**Reference Implementation:**
Look at `open-positions.component.spec.ts` for similar patterns using:
- Mocking EffectsService
- Testing computed signals with account filtering
- Testing table display with BaseTableComponent

## Definition of Done

- [ ] Comprehensive unit tests created (>80% coverage)
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI
- [ ] All acceptance criteria have explicit tests
- [ ] Tests follow AAA pattern
- [ ] SmartNgRX mocks properly configured
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material` (skipped - no implementation changes)
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Implementation in Story AQ.2
- Follow TDD RED-GREEN-REFACTOR cycle
- Tests will be re-enabled in AQ.2

## Dependencies

- Epic AP (Sold Positions) completed
- DivDepositsEffectsService available

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-22 | 1.0 | Initial story creation | PM Agent |

## Dev Agent Record

### Agent Model Used

_To be populated during implementation_

### Debug Log References

_To be populated during implementation_

### Completion Notes List

_To be populated during implementation_

### File List

_To be populated during implementation_

## QA Results

_To be populated by QA Agent after implementation_
