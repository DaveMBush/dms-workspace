# Story AO.7: TDD - Unit Tests for Auto-Close Logic

## Story

**As a** frontend developer
**I want** comprehensive unit tests for auto-close functionality
**So that** I can ensure positions close correctly when sold before implementation

## Context

**Current System:**

- Open positions table functional with editing
- When user fills in sell_date and sell price, position should close
- Closed positions move to sold positions tab

**Problem:**

- Need to automatically close positions when sold
- Need to verify logic before implementation

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify position closes when sell_date filled
- [ ] Tests verify position closes when both sell and sell_date filled
- [ ] Tests verify position stays open if only sell price filled
- [ ] Tests verify sell_date is validated
- [ ] Tests verify update triggers removal from open positions

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern
- [ ] Tests disabled with .skip after RED verification
- [ ] Mock SmartNgRX update properly

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Add to `open-positions.component.spec.ts`:

```typescript
describe.skip('Auto-Close Logic', () => {
  it('should add sell and sell_date columns to table', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      price: 150,
      purchase_date: '2024-01-01',
      sell_date: null,
      sell: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.ngOnInit();

    expect(component.displayColumns).toContain('sell');
    expect(component.displayColumns).toContain('sell_date');
  });

  it('should close position when sell_date is filled', async () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      price: 150,
      purchase_date: '2024-01-01',
      sell_date: null,
      sell: 175,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.ngOnInit();
    component.updateSellDate('1', '2024-06-01');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockTradesEffects.update).toHaveBeenCalledWith({
      id: '1',
      sell_date: '2024-06-01',
    });

    // Position should be removed from open positions after update
    expect(component.displayedPositions().find((p) => p.id === '1')).toBeUndefined();
  });

  it('should update sell price without closing position', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      price: 150,
      sell_date: null,
      sell: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.ngOnInit();
    component.updateSellPrice('1', 175);

    expect(mockTradesEffects.update).toHaveBeenCalledWith({
      id: '1',
      sell: 175,
    });

    // Position should still be in open positions
    expect(component.displayedPositions().find((p) => p.id === '1')).toBeDefined();
  });

  it('should validate sell_date is after purchase_date', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      purchase_date: '2024-06-01',
      sell_date: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.updateSellDate('1', '2024-01-01'); // Before purchase

    expect(mockTradesEffects.update).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Sell date must be after purchase date');
  });

  it('should require sell price when closing position', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      sell: null,
      sell_date: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.updateSellDate('1', '2024-06-01');

    expect(mockTradesEffects.update).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Sell price is required to close position');
  });

  it('should show confirmation before closing position', () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const trade = {
      id: '1',
      symbol: 'AAPL',
      sell: 175,
      sell_date: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.updateSellDate('1', '2024-06-01');

    expect(mockConfirm).toHaveBeenCalledWith('Close this position?');
    mockConfirm.mockRestore();
  });

  it('should not close if user cancels confirmation', () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const trade = {
      id: '1',
      symbol: 'AAPL',
      sell: 175,
      sell_date: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.updateSellDate('1', '2024-06-01');

    expect(mockTradesEffects.update).not.toHaveBeenCalled();
    mockConfirm.mockRestore();
  });

  it('should calculate capital gain when position closed', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      price: 150,
      sell: 175,
      sell_date: null,
      accountId: '1',
    };
    mockTradesEffects.entities.set([trade]);

    component.updateSellDate('1', '2024-06-01');

    // Capital gain = (175 - 150) * 100 = 2500
    expect(component.displayedPositions()[0].capitalGain).toBe(2500);
  });
});
```

### Step 2: Run Tests (Should Fail - RED)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 3: Disable Tests for CI

```typescript
describe.skip('Auto-Close Logic', () => {
  // Disabled until implementation in AO.8
});
```

### Step 4: Commit RED Tests

```bash
git add apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts
git commit -m "feat(AO.7): Add RED unit tests for auto-close logic"
```

## Files Modified

| File                                                                                                    | Changes                      |
| ------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts` | Add RED tests for auto-close |

## Definition of Done

- [ ] Comprehensive unit tests created (>80% coverage)
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI
- [ ] Validation tests included
- [ ] Confirmation logic tested
- [ ] Capital gain calculation tested
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

- Implementation in Story AO.8
- Reference DMS app for auto-close behavior
- Consider confirmation dialog UX

## Dependencies

- Story AO.6 completed
- Understanding of DMS app auto-close UX
