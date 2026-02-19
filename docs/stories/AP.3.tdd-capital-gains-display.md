# Story AP.3: TDD - Unit Tests for Capital Gains Display

## Story

**As a** frontend developer
**I want** comprehensive unit tests for capital gains display logic
**So that** I can ensure accurate financial calculations before implementation

## Context

**Current System:**

- Story AP.2 implemented basic sold positions table
- Capital gains calculated inline in component
- Need enhanced display with formatting and color coding

**Problem:**

- Capital gains display needs proper formatting
- Need visual indicators for gains vs losses
- Need percentage calculations alongside dollar amounts
- Logic should be testable independently

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify capital gain calculation (sell_price - purchase_price) * quantity
- [ ] Tests verify percent gain calculation
- [ ] Tests verify positive gains show as green
- [ ] Tests verify negative losses show as red
- [ ] Tests verify zero gains show neutral
- [ ] Tests verify currency formatting

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Tests are disabled after verification they run RED
- [ ] Edge cases tested (zero, negative, very large numbers)

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests

Add to `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.spec.ts`:

```typescript
describe.skip('Capital Gains Display Logic', () => {
  it('should calculate capital gain correctly for profit', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      purchase_price: 150,
      sell_price: 180,
      purchase_date: '2024-01-01',
      sell_date: '2024-06-01',
      accountId: '1'
    };

    mockTradesEffects.entities.set([trade]);
    component.ngOnInit();

    const position = component.displayedPositions()[0];
    expect(position.capitalGain).toBe(3000); // (180 - 150) * 100
  });

  it('should calculate capital gain correctly for loss', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      purchase_price: 180,
      sell_price: 150,
      purchase_date: '2024-01-01',
      sell_date: '2024-06-01',
      accountId: '1'
    };

    mockTradesEffects.entities.set([trade]);
    component.ngOnInit();

    const position = component.displayedPositions()[0];
    expect(position.capitalGain).toBe(-3000); // (150 - 180) * 100
  });

  it('should calculate percent gain correctly', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      purchase_price: 100,
      sell_price: 150,
      purchase_date: '2024-01-01',
      sell_date: '2024-06-01',
      accountId: '1'
    };

    mockTradesEffects.entities.set([trade]);
    component.ngOnInit();

    const position = component.displayedPositions()[0];
    expect(position.percentGain).toBeCloseTo(50, 1); // ((150 - 100) / 100) * 100
  });

  it('should handle zero gain/loss', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      purchase_price: 150,
      sell_price: 150,
      purchase_date: '2024-01-01',
      sell_date: '2024-06-01',
      accountId: '1'
    };

    mockTradesEffects.entities.set([trade]);
    component.ngOnInit();

    const position = component.displayedPositions()[0];
    expect(position.capitalGain).toBe(0);
    expect(position.percentGain).toBe(0);
  });

  it('should classify gain/loss type correctly', () => {
    mockTradesEffects.entities.set([
      { id: '1', symbol: 'AAPL', quantity: 100, purchase_price: 100, sell_price: 150, sell_date: '2024-06-01', accountId: '1' }, // gain
      { id: '2', symbol: 'MSFT', quantity: 50, purchase_price: 200, sell_price: 180, sell_date: '2024-06-01', accountId: '1' }, // loss
      { id: '3', symbol: 'GOOGL', quantity: 75, purchase_price: 100, sell_price: 100, sell_date: '2024-06-01', accountId: '1' }, // neutral
    ]);

    component.ngOnInit();

    expect(component.displayedPositions()[0].gainLossType).toBe('gain');
    expect(component.displayedPositions()[1].gainLossType).toBe('loss');
    expect(component.displayedPositions()[2].gainLossType).toBe('neutral');
  });

  it('should format currency values correctly', () => {
    const trade = {
      id: '1',
      symbol: 'AAPL',
      quantity: 100,
      purchase_price: 150.456,
      sell_price: 180.789,
      purchase_date: '2024-01-01',
      sell_date: '2024-06-01',
      accountId: '1'
    };

    mockTradesEffects.entities.set([trade]);
    component.ngOnInit();

    const position = component.displayedPositions()[0];
    expect(position.formattedCapitalGain).toMatch(/^\$[0-9,]+\.[0-9]{2}$/);
  });
});
```

### Step 2: Run Unit Tests (Should Fail)

```bash
pnpm nx test dms-material --testFile=sold-positions.component.spec.ts
```

**Expected Result:** Tests fail (RED) because enhanced display logic doesn't exist yet.

### Step 3: Disable Tests for CI

Once tests are verified to run RED, ensure `.skip` is on test suite:

```typescript
describe.skip('Capital Gains Display Logic', () => {
  // Tests disabled until AP.4 implementation
});
```

### Step 4: Verify CI Passes

```bash
pnpm all
```

## Definition of Done

- [ ] Comprehensive unit tests created for capital gains logic
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI to pass
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Tests follow AAA pattern
- [ ] Edge cases covered
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Tests must be disabled after verification to allow merge
- Implementation happens in Story AP.4
- Capital gains calculations are critical for tax reporting
- Need to handle edge cases carefully

## Dependencies

- Story AP.2 completed
- Sold positions table wired to SmartNgRX
- Basic capital gains calculation in place

