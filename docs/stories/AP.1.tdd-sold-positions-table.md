# Story AP.1: TDD - Unit Tests for Wiring Sold Positions Table

## Story

**As a** frontend developer
**I want** comprehensive unit tests for sold positions table integration
**So that** I can ensure the component correctly connects to SmartNgRX before implementation

## Context

**Current System:**

- Sold positions component migrated from Epic AE
- Trades SmartNgRX entity already exists (used by open positions)
- Component shows empty data with FUTURE comment for SmartNgRX wiring

**Problem:**

- Component currently displays no data (empty signal)
- Need to verify proper integration with SmartNgRX before implementation
- Must filter for closed positions (sell_date is not null)

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify component subscribes to trades entity
- [ ] Tests verify filtering for sold positions (sell_date is not null)
- [ ] Tests verify filtering by selected account
- [ ] Tests verify data transformation for display
- [ ] Tests verify capital gains calculations in data structure

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Tests are disabled after verification they run RED
- [ ] Mock SmartNgRX effects and selectors properly

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Create `apps/dms-material/src/app/features/account/components/sold-positions/sold-positions.component.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SoldPositionsComponent } from './sold-positions.component';
import { TradesEffects } from '../../../../state/trades/trades.effects';
import { signal } from '@angular/core';

describe('SoldPositionsComponent - SmartNgRX Integration', () => {
  let component: SoldPositionsComponent;
  let mockTradesEffects: any;

  beforeEach(() => {
    mockTradesEffects = {
      loadByIds: vi.fn(),
      entities: signal([]),
      selectedAccountId: signal('1'),
    };

    TestBed.configureTestingModule({
      imports: [SoldPositionsComponent],
      providers: [{ provide: TradesEffects, useValue: mockTradesEffects }],
    });

    const fixture = TestBed.createComponent(SoldPositionsComponent);
    component = fixture.componentInstance;
  });

  describe.skip('SmartNgRX Integration', () => {
    it('should subscribe to trades entities on init', () => {
      component.ngOnInit();
      expect(mockTradesEffects.loadByIds).toHaveBeenCalled();
    });

    it('should filter trades for sold positions only', () => {
      mockTradesEffects.entities.set([
        { id: '1', symbol: 'AAPL', quantity: 100, purchase_date: '2024-01-01', purchase_price: 150, sell_date: '2024-06-01', sell_price: 180, accountId: '1' },
        { id: '2', symbol: 'MSFT', quantity: 50, purchase_date: '2024-02-01', purchase_price: 300, sell_date: null, sell_price: null, accountId: '1' },
        { id: '3', symbol: 'GOOGL', quantity: 75, purchase_date: '2024-03-01', purchase_price: 100, sell_date: '2024-07-01', sell_price: 120, accountId: '1' },
      ]);

      component.ngOnInit();

      expect(component.displayedPositions().length).toBe(2);
      expect(component.displayedPositions().every((t) => t.sell_date !== null)).toBe(true);
    });

    it('should filter trades by selected account', () => {
      mockTradesEffects.entities.set([
        { id: '1', symbol: 'AAPL', quantity: 100, purchase_date: '2024-01-01', purchase_price: 150, sell_date: '2024-06-01', sell_price: 180, accountId: '1' },
        { id: '2', symbol: 'MSFT', quantity: 50, purchase_date: '2024-02-01', purchase_price: 300, sell_date: '2024-05-01', sell_price: 320, accountId: '2' },
      ]);
      mockTradesEffects.selectedAccountId.set('1');

      component.ngOnInit();

      expect(component.displayedPositions().length).toBe(1);
      expect(component.displayedPositions()[0].accountId).toBe('1');
    });

    it('should transform data with capital gains calculations', () => {
      mockTradesEffects.entities.set([
        { 
          id: '1', 
          symbol: 'AAPL', 
          quantity: 100, 
          purchase_date: '2024-01-01', 
          purchase_price: 150, 
          sell_date: '2024-06-01', 
          sell_price: 180, 
          accountId: '1' 
        },
      ]);

      component.ngOnInit();

      const position = component.displayedPositions()[0];
      expect(position.capitalGain).toBe(3000); // (180 - 150) * 100
      expect(position.percentGain).toBeCloseTo(20, 1); // ((180 - 150) / 150) * 100
    });
  });
});
```

### Step 2: Run Unit Tests (Should Fail)

```bash
pnpm nx test dms-material --testFile=sold-positions.component.spec.ts
```

**Expected Result:** Tests fail (RED) because component doesn't implement SmartNgRX integration yet.

### Step 3: Disable Tests for CI

Once tests are verified to run RED, add `.skip` to test suite:

```typescript
describe.skip('SmartNgRX Integration', () => {
  // Tests disabled until AO.2 implementation
});
```

### Step 4: Verify CI Passes

```bash
pnpm all
```

## Definition of Done

- [ ] Comprehensive unit tests created (>80% coverage)
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI to pass
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Tests follow AAA pattern
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Tests must be disabled after verification to allow merge
- Implementation happens in Story AP.2
- Follow SmartNgRX patterns from open positions component (AO.2)
- Capital gains calculations are critical business logic

## Dependencies

- Epic AO completed (Open positions working)
- TradesEffects entity exists
- AccountsEffects entity exists

