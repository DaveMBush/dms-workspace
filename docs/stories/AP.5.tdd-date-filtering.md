# Story AP.5: TDD - Unit Tests for Date Range Filtering

## Story

**As a** frontend developer
**I want** comprehensive unit tests for date range filtering
**So that** I can ensure accurate filtering logic before implementation

## Context

**Current System:**

- Story AP.4 implemented capital gains display
- All sold positions display for selected account
- Need to filter by date range for tax year reporting

**Problem:**

- Users need to see positions sold within specific date ranges
- Tax reporting requires filtering by calendar or fiscal year
- Need to ensure date comparison logic is correct

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify filtering by start date
- [ ] Tests verify filtering by end date
- [ ] Tests verify filtering by both start and end date
- [ ] Tests verify edge cases (same day, year boundaries)
- [ ] Tests verify no filter shows all positions
- [ ] Tests verify empty results when no matches

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Tests are disabled after verification they run RED
- [ ] Date comparison logic tested thoroughly

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests

Add to `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.spec.ts`:

```typescript
describe.skip('Date Range Filtering', () => {
  beforeEach(() => {
    mockTradesEffects.entities.set([
      { id: '1', symbol: 'AAPL', quantity: 100, purchase_price: 150, sell_price: 180, sell_date: '2024-01-15', accountId: '1' },
      { id: '2', symbol: 'MSFT', quantity: 50, purchase_price: 300, sell_price: 320, sell_date: '2024-06-20', accountId: '1' },
      { id: '3', symbol: 'GOOGL', quantity: 75, purchase_price: 100, sell_price: 120, sell_date: '2024-12-31', accountId: '1' },
      { id: '4', symbol: 'TSLA', quantity: 25, purchase_price: 200, sell_price: 180, sell_date: '2023-12-15', accountId: '1' },
    ]);
  });

  it('should show all positions when no date filter applied', () => {
    component.startDate.set(null);
    component.endDate.set(null);
    component.ngOnInit();

    expect(component.displayedPositions().length).toBe(4);
  });

  it('should filter by start date only', () => {
    component.startDate.set('2024-06-01');
    component.endDate.set(null);
    component.ngOnInit();

    const positions = component.displayedPositions();
    expect(positions.length).toBe(2);
    expect(positions.every((p) => new Date(p.sell_date) >= new Date('2024-06-01'))).toBe(true);
  });

  it('should filter by end date only', () => {
    component.startDate.set(null);
    component.endDate.set('2024-06-30');
    component.ngOnInit();

    const positions = component.displayedPositions();
    expect(positions.length).toBe(2);
    expect(positions.every((p) => new Date(p.sell_date) <= new Date('2024-06-30'))).toBe(true);
  });

  it('should filter by both start and end date', () => {
    component.startDate.set('2024-01-01');
    component.endDate.set('2024-06-30');
    component.ngOnInit();

    const positions = component.displayedPositions();
    expect(positions.length).toBe(2);
    expect(positions.every((p) => {
      const sellDate = new Date(p.sell_date);
      return sellDate >= new Date('2024-01-01') && sellDate <= new Date('2024-06-30');
    })).toBe(true);
  });

  it('should handle same day start and end date', () => {
    component.startDate.set('2024-01-15');
    component.endDate.set('2024-01-15');
    component.ngOnInit();

    const positions = component.displayedPositions();
    expect(positions.length).toBe(1);
    expect(positions[0].symbol).toBe('AAPL');
  });

  it('should return empty array when no positions match date range', () => {
    component.startDate.set('2025-01-01');
    component.endDate.set('2025-12-31');
    component.ngOnInit();

    expect(component.displayedPositions().length).toBe(0);
  });

  it('should handle year boundary correctly', () => {
    component.startDate.set('2023-12-01');
    component.endDate.set('2024-01-31');
    component.ngOnInit();

    const positions = component.displayedPositions();
    expect(positions.length).toBe(2);
    const symbols = positions.map((p) => p.symbol);
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('TSLA');
  });

  it('should update displayed positions when date filter changes', () => {
    component.startDate.set('2024-01-01');
    component.endDate.set('2024-06-30');
    component.ngOnInit();

    expect(component.displayedPositions().length).toBe(2);

    component.startDate.set('2024-12-01');
    component.endDate.set('2024-12-31');

    expect(component.displayedPositions().length).toBe(1);
    expect(component.displayedPositions()[0].symbol).toBe('GOOGL');
  });
});
```

### Step 2: Run Unit Tests (Should Fail)

```bash
pnpm nx test dms-material --testFile=sold-positions.component.spec.ts
```

**Expected Result:** Tests fail (RED) because date filtering doesn't exist yet.

### Step 3: Disable Tests for CI

Once tests are verified to run RED, ensure `.skip` is on test suite:

```typescript
describe.skip('Date Range Filtering', () => {
  // Tests disabled until AP.6 implementation
});
```

### Step 4: Verify CI Passes

```bash
pnpm all
```

## Definition of Done

- [ ] Comprehensive unit tests created for date filtering
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI to pass
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Tests follow AAA pattern
- [ ] Edge cases covered (boundaries, empty results)
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Tests must be disabled after verification to allow merge
- Implementation happens in Story AP.6
- Date filtering critical for tax year reporting
- Need to handle timezone considerations

## Dependencies

- Story AP.4 completed
- Capital gains display working
- Date handling utilities available

