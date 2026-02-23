# Story AQ.2: Implementation - Wire Dividends Table to DivDeposit SmartNgRX

## Status

Approved

## Story

**As a** user
**I want** to see my dividend and deposit transactions in a table
**So that** I can view my account's dividend and deposit history

## Context

**Current System:**

- Story AQ.1 created RED unit tests
- Dividend deposits component exists with basic structure
- DivDepositsEffectsService available

**Problem:**

- Table not wired to SmartNgRX store
- Dividends not displayed dynamically

## Acceptance Criteria

### Functional Requirements

1. [ ] Table displays dividends from SmartNgRX store
2. [ ] Table filters dividends by selected account
3. [ ] Table shows columns: symbol, date, amount, type
4. [ ] Table supports sorting by all sortable columns
5. [ ] Empty state displayed when no dividends exist
6. [ ] Date formatted as short date (MM/DD/YYYY)
7. [ ] Amount formatted as currency ($X.XX)

### Technical Requirements

1. [ ] Re-enable tests from AQ.1
2. [ ] All unit tests pass (GREEN)
3. [ ] Inject DivDepositsEffectsService
4. [ ] Inject AccountsEffectsService for filtering
5. [ ] Use computed signal for filtered dividends
6. [ ] Integrate with BaseTableComponent
7. [ ] Code coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AQ.1 (AC: 1)
  - [ ] Remove .skip from describe block
  - [ ] Run tests to verify failures
- [ ] Wire SmartNgRX services (AC: 3, 4)
  - [ ] Inject DivDepositsEffectsService
  - [ ] Inject AccountsEffectsService
  - [ ] Add service tokens to component
- [ ] Implement filtered dividends computed signal (AC: 1, 2, 5)
  - [ ] Read entities from DivDepositsEffectsService
  - [ ] Filter by selectedAccountId
  - [ ] Return filtered array
- [ ] Configure table columns (AC: 3, 6, 7)
  - [ ] Define ColumnDef array
  - [ ] Set date type for date column
  - [ ] Set currency type for amount column
  - [ ] Enable sorting on appropriate columns
- [ ] Update template for BaseTableComponent (AC: 4)
  - [ ] Pass dividends signal to table
  - [ ] Pass column definitions
  - [ ] Configure empty state message
- [ ] Run tests until GREEN (AC: 2)
  - [ ] Execute: `pnpm nx test dms-material --testFile=dividend-deposits.component.spec.ts`
  - [ ] Fix any failing tests
  - [ ] Verify coverage >80%
- [ ] Run all validation commands (AC: DOD)
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Testing Standards

**Test File Location:**
`apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts`

**Testing Frameworks:**
- Vitest for unit testing
- All tests from AQ.1 must pass
- Add additional tests if needed for edge cases

### Implementation Details

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

**Service Injection Pattern:**
```typescript
private divDepositsEffects = inject(divDepositsEffectsServiceToken);
private accountsEffects = inject(accountsEffectsServiceToken);
```

**Computed Signal Pattern:**
```typescript
readonly dividends = computed(() => {
  const allDividends = this.divDepositsEffects.entities();
  const selectedAccountId = this.accountsEffects.selectedAccountId();

  return allDividends.filter(div => div.accountId === selectedAccountId);
});
```

**Column Configuration:**
```typescript
columns: ColumnDef[] = [
  { field: 'symbol', header: 'Symbol', sortable: true, width: '120px' },
  { field: 'date', header: 'Date', type: 'date', sortable: true, width: '110px' },
  { field: 'amount', header: 'Amount', type: 'currency', sortable: true, width: '100px' },
  { field: 'type', header: 'Type', width: '120px' }
];
```

### Relevant Source Tree

**Files to Modify:**
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` - Wire SmartNgRX
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts` - Re-enable tests

**Dependencies:**
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
- `apps/dms-material/src/app/store/div-deposits/div-deposits-effect.service.ts`
- `apps/dms-material/src/app/store/div-deposits/div-deposits-effect-service-token.ts`
- `apps/dms-material/src/app/store/accounts/accounts-effect.service.ts`
- `apps/dms-material/src/app/store/accounts/accounts-effect-service-token.ts`

**Reference Implementation:**
Look at `open-positions.component.ts` for similar patterns:
- Service injection with tokens
- Computed signals for filtered data
- BaseTableComponent integration

### Important Notes from Previous Stories

- Use signal-based approach throughout
- Follow SmartNgRX patterns consistently
- BaseTableComponent handles sorting internally
- DatePipe and CurrencyPipe imported at component level
- Column type property triggers appropriate formatting in BaseTableComponent

## Definition of Done

- [ ] Tests from AQ.1 re-enabled and passing
- [ ] All acceptance criteria implemented
- [ ] Unit tests pass (GREEN)
- [ ] Code coverage >80%
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Build succeeds
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Previous story AQ.1 created RED tests
- This story completes TDD GREEN phase
- Edit and delete functionality in later stories

## Dependencies

- Story AQ.1 completed (RED tests created)
- DivDepositsEffectsService configured in app.config
- BaseTableComponent available

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
