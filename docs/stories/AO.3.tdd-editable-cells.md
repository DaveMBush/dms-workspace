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

- [ ] Tests verify quantity editing triggers update
- [ ] Tests verify purchase_date editing triggers update
- [ ] Tests verify price editing triggers update
- [ ] Tests verify validation (positive numbers, valid dates)
- [ ] Tests verify update sent to SmartNgRX

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern
- [ ] Tests disabled with .skip after RED verification
- [ ] Mock SmartNgRX update methods properly

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

- [ ] Comprehensive unit tests created (>80% coverage)
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI
- [ ] Validation tests included
- [ ] Error handling tests included
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Code reviewed
- [ ] All validation commands pass
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
