# Story AO.1: TDD - Unit Tests for Wiring Open Positions Table

## Story

**As a** frontend developer
**I want** comprehensive unit tests for open positions table integration
**So that** I can ensure the component correctly connects to SmartNgRX before implementation

## Context

**Current System:**

- Open positions component migrated in Epic AE.4
- Trades SmartNgRX entity already exists
- Component needs to be wired to backend data

**Problem:**

- Component currently displays mock/hardcoded data
- Need to verify proper integration with SmartNgRX before implementation

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify component subscribes to trades entity
- [ ] Tests verify filtering for open positions (sell_date is null)
- [ ] Tests verify filtering by selected account
- [ ] Tests verify data transformation for display

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Tests are disabled after verification they run RED
- [ ] Mock SmartNgRX effects and selectors properly

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Create `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OpenPositionsComponent } from './open-positions.component';
import { TradesEffects } from '../../../../state/trades/trades.effects';
import { signal } from '@angular/core';

describe('OpenPositionsComponent - SmartNgRX Integration', () => {
  let component: OpenPositionsComponent;
  let mockTradesEffects: any;

  beforeEach(() => {
    mockTradesEffects = {
      loadByIds: vi.fn(),
      entities: signal([]),
      selectedAccountId: signal('1'),
    };

    TestBed.configureTestingModule({
      imports: [OpenPositionsComponent],
      providers: [{ provide: TradesEffects, useValue: mockTradesEffects }],
    });

    const fixture = TestBed.createComponent(OpenPositionsComponent);
    component = fixture.componentInstance;
  });

  describe.skip('SmartNgRX Integration', () => {
    it('should subscribe to trades entities on init', () => {
      component.ngOnInit();
      expect(mockTradesEffects.loadByIds).toHaveBeenCalled();
    });

    it('should filter trades for open positions only', () => {
      mockTradesEffects.entities.set([
        { id: '1', symbol: 'AAPL', quantity: 100, sell_date: null, accountId: '1' },
        { id: '2', symbol: 'MSFT', quantity: 50, sell_date: '2024-01-01', accountId: '1' },
        { id: '3', symbol: 'GOOGL', quantity: 75, sell_date: null, accountId: '1' },
      ]);

      component.ngOnInit();

      expect(component.displayedPositions().length).toBe(2);
      expect(component.displayedPositions().every((t) => t.sell_date === null)).toBe(true);
    });

    it('should filter trades by selected account', () => {
      mockTradesEffects.entities.set([
        { id: '1', symbol: 'AAPL', quantity: 100, sell_date: null, accountId: '1' },
        { id: '2', symbol: 'MSFT', quantity: 50, sell_date: null, accountId: '2' },
      ]);
      mockTradesEffects.selectedAccountId.set('1');

      component.ngOnInit();

      expect(component.displayedPositions().length).toBe(1);
      expect(component.displayedPositions()[0].accountId).toBe('1');
    });

    it('should handle empty trades list', () => {
      mockTradesEffects.entities.set([]);

      component.ngOnInit();

      expect(component.displayedPositions().length).toBe(0);
    });

    it('should update when trades entity changes', () => {
      mockTradesEffects.entities.set([]);
      component.ngOnInit();
      expect(component.displayedPositions().length).toBe(0);

      mockTradesEffects.entities.set([{ id: '1', symbol: 'AAPL', quantity: 100, sell_date: null, accountId: '1' }]);

      expect(component.displayedPositions().length).toBe(1);
    });
  });

  describe.skip('Data Transformation', () => {
    it('should calculate position value', () => {
      mockTradesEffects.entities.set([{ id: '1', symbol: 'AAPL', quantity: 100, price: 150, sell_date: null, accountId: '1' }]);

      component.ngOnInit();

      expect(component.displayedPositions()[0].value).toBe(15000);
    });

    it('should format dates correctly', () => {
      mockTradesEffects.entities.set([{ id: '1', symbol: 'AAPL', purchase_date: '2024-01-15', sell_date: null, accountId: '1' }]);

      component.ngOnInit();

      expect(component.displayedPositions()[0].formattedDate).toBeDefined();
    });
  });
});
```

### Step 2: Run Tests (They Should Fail - RED)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 3: Disable Tests for CI

**CRITICAL**: After verifying tests run RED, disable them with `.skip` to allow CI to pass:

```typescript
describe.skip('OpenPositionsComponent - SmartNgRX Integration', () => {
  // Tests are disabled until implementation story AO.2
});
```

### Step 4: Commit RED Tests

```bash
git add apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts
git commit -m "feat(AO.1): Add RED unit tests for open positions SmartNgRX integration"
```

## Technical Approach

### Test Structure

1. **Setup Phase**: Mock SmartNgRX effects and signals
2. **Integration Tests**: Verify subscription and filtering
3. **Transform Tests**: Verify data transformation for display
4. **Edge Cases**: Empty lists, account switching

### Testing Patterns

- Use signals for reactive testing
- Mock TradesEffects properly
- Follow existing patterns from AG.1, AH.1, AI.1

## Files Modified

| File                                                                                                    | Changes                |
| ------------------------------------------------------------------------------------------------------- | ---------------------- |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts` | Created RED unit tests |

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
- Implementation happens in Story AO.2
- Follow SmartNgRX patterns from existing components
- Reference existing DMS app for expected behavior

## Dependencies

- Epic AN completed (Universe table working)
- TradesEffects entity exists
