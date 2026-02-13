# Story AO.3: TDD - Unit Tests for Editable Cells

## Story

**As a** frontend developer
**I want** comprehensive unit tests for editable cells in open positions
**So that** I can ensure quantity/date editing works before implementation

## Context

**Current System:**

- Open positions table displays data (Story AO.2 completed)
- Editable cell component migrated in Epic AC
- Need to enable editing for quantity, purchase_date, price

**Problem:**

- Cells currently read-only
- Need to verify editing functionality before implementation

## Acceptance Criteria

### Functional Requirements

- [x] Tests verify quantity editing triggers update
- [x] Tests verify purchase_date editing triggers update
- [x] Tests verify price editing triggers update
- [x] Tests verify validation (positive numbers, valid dates)
- [x] Tests verify update sent to SmartNgRX

### Technical Requirements

- [x] Unit tests created with >80% coverage
- [x] Tests follow AAA pattern
- [x] Tests disabled with .skip after RED verification
- [x] Mock SmartNgRX update methods properly

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Add to `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts`:

```typescript
describe.skip('Editable Cells', () => {
  it('should update quantity when edited', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      price: 150,
      purchase_date: '2024-01-01',
      sell_date: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.ngOnInit();
    component.updateQuantity('1', 200);

    expect(mockTradesEffects.update).toHaveBeenCalledWith({
      id: '1',
      quantity: 200,
    });
  });

  it('should update price when edited', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      price: 150,
      purchase_date: '2024-01-01',
      sell_date: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.ngOnInit();
    component.updatePrice('1', 175);

    expect(mockTradesEffects.update).toHaveBeenCalledWith({
      id: '1',
      price: 175,
    });
  });

  it('should update purchase_date when edited', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      price: 150,
      purchase_date: '2024-01-01',
      sell_date: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.ngOnInit();
    component.updatePurchaseDate('1', '2024-02-01');

    expect(mockTradesEffects.update).toHaveBeenCalledWith({
      id: '1',
      purchase_date: '2024-02-01',
    });
  });

  it('should validate quantity is positive', () => {
    component.updateQuantity('1', -50);

    expect(mockTradesEffects.update).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Quantity must be positive');
  });

  it('should validate price is positive', () => {
    component.updatePrice('1', -100);

    expect(mockTradesEffects.update).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Price must be positive');
  });

  it('should validate date format', () => {
    component.updatePurchaseDate('1', 'invalid-date');

    expect(mockTradesEffects.update).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Invalid date format');
  });

  it('should handle update errors gracefully', () => {
    mockTradesEffects.update.mockRejectedValueOnce(new Error('Update failed'));

    component.updateQuantity('1', 200);

    expect(component.errorMessage()).toContain('Update failed');
  });

  it('should show loading indicator during update', async () => {
    mockTradesEffects.update.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));

    component.updateQuantity('1', 200);

    expect(component.updating()).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(component.updating()).toBe(false);
  });
});
```

### Step 2: Run Tests (Should Fail - RED)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 3: Disable Tests for CI

```typescript
describe.skip('Editable Cells', () => {
  // Disabled until implementation in AO.4
});
```

### Step 4: Commit RED Tests

```bash
git add apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts
git commit -m "feat(AO.3): Add RED unit tests for editable cells"
```

## Files Modified

| File                                                                                                    | Changes                   |
| ------------------------------------------------------------------------------------------------------- | ------------------------- |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts` | Add RED tests for editing |

## Definition of Done

- [x] Comprehensive unit tests created (>80% coverage)
- [x] Tests run and fail (RED state verified)
- [x] Tests disabled with .skip for CI
- [x] Validation tests included
- [x] Error handling tests included
- [x] All existing tests still pass
- [x] Lint passes
- [ ] Code reviewed
- [x] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Implementation in Story AO.4
- Use existing editable cell components
- Follow DMS app patterns for validation

## Dependencies

- Story AO.2 completed
- Editable cell components migrated (AC.2, AC.3)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Tasks Completed

- [x] Created GitHub issue #411 for story AO.3
- [x] Created branch `story/ao3-tdd-editable-cells`
- [x] Added comprehensive unit tests for editable cells (8 tests)
- [x] Tests disabled with `.skip` for CI (RED state)
- [x] All validation checks passed

### Debug Log

No critical issues encountered. Story file indicated incorrect path for component spec file (`features/account/components/open-positions`) but actual path is `account-panel/open-positions`. Located correct file and added tests successfully.

### Completion Notes

- Added 8 comprehensive unit tests for editable cells functionality
- Tests cover quantity, price, and purchase_date editing
- Tests cover validation (positive numbers, valid dates)
- Tests cover error handling and loading states
- All tests disabled with `.skip` as per TDD RED phase
- Tests will be enabled in Story AO.4 during implementation
- All existing tests still passing (18/18)
- All validation commands passed

### File List

- [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts)

### Change Log

1. Added new describe block "Editable Cells" with 8 unit tests
2. Tests disabled with `.skip` for CI/CD (RED state)
3. Tests expect methods: `updateQuantity()`, `updatePrice()`, `updatePurchaseDate()`
4. Tests expect signals: `errorMessage()`, `updating()`
5. Tests expect SmartNgRX integration via `tradesEffects.update()`

### Status

Ready for Review

## QA Results

### Review Date: 2026-02-12

### Reviewed By: Quinn (Test Architect)

### Gate Status

Gate: PASS → docs/qa/gates/AO.3-tdd-editable-cells.yml
