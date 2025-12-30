# Story W.1: Implement Lazy Loading for Sold Positions Table

## Status

Draft

## Story

**As a** user reviewing closed trading positions,
**I want** the sold positions table to load only visible rows with a buffer,
**so that** the screen loads faster and I can view capital gains, edit positions, and sort by sell date smoothly even with many closed trades.

## Acceptance Criteria

1. Add lazy loading and virtual scroll attributes to p-table template
2. Implement onLazyLoad event handler with filtering support
3. Configure 10-row buffer with existing scroll height
4. Update computed signal to support lazy loading with symbol filter and capital gains calculations
5. Ensure capital gains calculations work correctly on lazy-loaded rows
6. Verify inline editing works on lazy-loaded rows (buy, buyDate, quantity, sell, sellDate)
7. Verify date validation logic with lazy-loaded data (buy date < sell date)
8. Preserve sellDate sorting functionality
9. Ensure capital gains recalculate immediately when buy/sell/quantity changes
10. Add dataKey attribute for proper row identification during editing
11. Update unit tests to cover lazy loading with calculations
12. Test with various filter and sort combinations
13. Ensure the following commands run without errors:
    - `pnpm format`
    - `pnpm dupcheck`
    - `pnpm nx run dms:test --code-coverage`
    - `pnpm nx run server:build:production`
    - `pnpm nx run server:test --code-coverage`
    - `pnpm nx run server:lint`
    - `pnpm nx run dms:lint`
    - `pnpm nx run dms:build:production`
    - `pnpm nx run dms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 1: Add PrimeNG lazy loading attributes to p-table** (AC: 1, 3, 10)

  - [ ] Add `[lazy]="true"` attribute to p-table in sold-positions.component.html
  - [ ] Add `[virtualScroll]="true"` attribute for virtual scrolling
  - [ ] Configure `[rows]="10"` for 10-row buffer size
  - [ ] Add `[dataKey]="'id'"` for proper row identification (critical for inline editing)
  - [ ] Add `[totalRecords]="totalRecords$()"` signal for total count
  - [ ] Add `(onLazyLoad)="onLazyLoad($event)"` event handler
  - [ ] Preserve existing `[scrollHeight]="'calc(100vh - 184px)'"`
  - [ ] Preserve existing `[rowTrackBy]="trackById"`

- [ ] **Task 2: Implement onLazyLoad event handler with filtering** (AC: 2, 4)

  - [ ] Create `onLazyLoad(event: LazyLoadEvent): void` method in component
  - [ ] Extract `first`, `rows`, `sortField`, `sortOrder` from event
  - [ ] Create `lazyLoadParams` signal to store load parameters
  - [ ] Create `totalRecords$` computed signal for total record count (after filtering)
  - [ ] Update `positions$` computed to:
    - Apply symbol filter first
    - Transform ClosedPosition to SoldPosition with capital gains
    - Apply sorting
    - Slice for lazy loading
  - [ ] Maintain existing `calculateCapitalGains` function integration

- [ ] **Task 3: Preserve sellDate sorting with lazy loading** (AC: 8)

  - [ ] Verify `onSort()` method updates sort state correctly
  - [ ] Test sellDate sorting with lazy-loaded data
  - [ ] Ensure sort icon updates correctly
  - [ ] Verify sorting works across all lazy-loaded pages

- [ ] **Task 4: Ensure capital gains calculations work on lazy-loaded rows** (AC: 5, 9)

  - [ ] Verify `calculateCapitalGains` function called for each lazy-loaded row
  - [ ] Test capitalGain displays correctly on all pages
  - [ ] Test capitalGainPercentage displays correctly on all pages
  - [ ] Test calculations update when buy price edited
  - [ ] Test calculations update when sell price edited
  - [ ] Test calculations update when quantity edited
  - [ ] Verify calculations work correctly across lazy-loaded pages

- [ ] **Task 5: Ensure inline editing works on lazy-loaded rows** (AC: 6, 7)

  - [ ] Test buy price editing on various lazy-loaded pages
  - [ ] Test buyDate editing with p-datepicker on lazy-loaded rows
  - [ ] Test quantity editing with p-inputNumber on lazy-loaded rows
  - [ ] Test sell price editing on lazy-loaded rows
  - [ ] Test sellDate editing with p-datepicker on lazy-loaded rows
  - [ ] Verify `onEditCommit()` method works with lazy-loaded data
  - [ ] Test date validation (buy date < sell date) on lazy-loaded rows
  - [ ] Verify validation error messages display correctly
  - [ ] Test edit revert on validation failure

- [ ] **Task 6: Test delete functionality with lazy loading** (AC: 6)

  - [ ] Test `trash()` method with lazy-loaded rows on first page
  - [ ] Test delete on middle pages
  - [ ] Test delete on last page
  - [ ] Verify table updates properly after deletion
  - [ ] Ensure totalRecords$ updates after delete

- [ ] **Task 7: Update unit tests for lazy loading** (AC: 11, 12)

  - [ ] Update existing tests in sold-positions.component.spec.ts
  - [ ] Add test for onLazyLoad event handler
  - [ ] Add test for totalRecords$ signal calculation with filtering
  - [ ] Test lazy load with symbol filter active
  - [ ] Test lazy load with sellDate sort
  - [ ] Test capital gains calculations on lazy-loaded rows
  - [ ] Test capital gains recalculate on value changes
  - [ ] Test inline editing on lazy-loaded rows
  - [ ] Test date validation with lazy-loaded data
  - [ ] Test delete operation updates lazy load state
  - [ ] Test with small dataset (< 10 rows)
  - [ ] Test with large dataset (> 100 rows)

- [ ] **Task 8: Run all quality gates** (AC: 13)
  - [ ] Execute `pnpm format` and fix any formatting issues
  - [ ] Execute `pnpm dupcheck` and resolve duplicates
  - [ ] Execute all test suites and ensure 100% pass rate
  - [ ] Execute all lint commands and resolve issues
  - [ ] Execute all build commands and ensure successful compilation

## Dev Notes

### Epic Context

This story implements lazy loading for the Sold Positions table (Epic W). This component has capital gains calculations performed on each row using the `calculateCapitalGains` function. The challenge is ensuring calculations remain correct with lazy-loaded data while preserving inline editing and date validation.

### Current Implementation Analysis

**Source: [apps/dms/src/app/account-panel/sold-positions/sold-positions.component.ts]**

**Component Structure:**

```typescript
export class SoldPositionsComponent extends BasePositionsComponent<SoldPosition, SoldPositionsStorageService> {
  positions$ = computed(() => {
    const rawPositions = this.soldPositionsService.selectClosedPositions();
    const sortField = this.getSortField();
    const sortOrder = this.getSortOrder();
    const symbolFilter = this.symbolFilter();

    // Convert ClosedPosition to SoldPosition with capital gains
    const soldPositions = rawPositions.map(function convertToSoldPosition(pos) {
      const capitalGains = calculateCapitalGains({
        buy: pos.buy,
        sell: pos.sell,
        quantity: pos.quantity,
      });

      return {
        id: pos.id,
        symbol: pos.symbol,
        buy: pos.buy,
        buyDate: pos.buyDate.toISOString(),
        quantity: pos.quantity,
        sell: pos.sell,
        sellDate: pos.sellDate?.toISOString() ?? '',
        daysHeld: pos.daysHeld,
        capitalGain: capitalGains.capitalGain,
        capitalGainPercentage: capitalGains.capitalGainPercentage,
      } as SoldPosition;
    });

    // Apply filtering and sorting
    // Return all results
  });
}
```

### Capital Gains Calculator Function

**Source: [apps/dms/src/app/account-panel/sold-positions/capital-gains-calculator.function.ts]**

**Calculator Function:**

```typescript
export function calculateCapitalGains(params: { buy: number; sell: number; quantity: number }): { capitalGain: number; capitalGainPercentage: number } {
  const { buy, sell, quantity } = params;

  const capitalGain = (sell - buy) * quantity;
  const capitalGainPercentage = buy === 0 ? 0 : ((sell - buy) / buy) * 100;

  return {
    capitalGain,
    capitalGainPercentage,
  };
}
```

**Lazy Loading Impact:**

- Calculator function is pure - works with any dataset size
- Must be called for each row in lazy-loaded slice
- Calculations happen in computed signal transformation
- Updates automatically when buy/sell/quantity values change

### Lazy Loading Implementation Strategy

**Updated Computed Signal:**

```typescript
// Add lazy load params signal
private lazyLoadParams = signal<{first: number; rows: number; sortField?: string; sortOrder?: number}>({
  first: 0,
  rows: 10
});

// Total records after filtering
totalRecords$ = computed(() => {
  const rawPositions = this.soldPositionsService.selectClosedPositions();
  const symbolFilter = this.symbolFilter();

  let filteredPositions = rawPositions;
  if (symbolFilter && symbolFilter.trim() !== '') {
    filteredPositions = rawPositions.filter(function filterSymbol(position) {
      return position.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
    });
  }

  return filteredPositions.length;
});

// Updated positions$ with lazy loading
positions$ = computed(() => {
  const params = this.lazyLoadParams();
  const rawPositions = this.soldPositionsService.selectClosedPositions();
  const symbolFilter = this.symbolFilter();

  // Apply symbol filter FIRST
  let filteredPositions = rawPositions;
  if (symbolFilter && symbolFilter.trim() !== '') {
    filteredPositions = rawPositions.filter(function filterSymbol(position) {
      return position.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
    });
  }

  // Transform to SoldPosition with capital gains
  const soldPositions = filteredPositions.map(function convertToSoldPosition(pos) {
    const capitalGains = calculateCapitalGains({
      buy: pos.buy,
      sell: pos.sell,
      quantity: pos.quantity,
    });

    return {
      id: pos.id,
      symbol: pos.symbol,
      buy: pos.buy,
      buyDate: pos.buyDate.toISOString(),
      quantity: pos.quantity,
      sell: pos.sell,
      sellDate: pos.sellDate?.toISOString() ?? '',
      daysHeld: pos.daysHeld,
      capitalGain: capitalGains.capitalGain,
      capitalGainPercentage: capitalGains.capitalGainPercentage,
    } as SoldPosition;
  });

  // Apply sorting
  const sortField = params.sortField || this.getSortField();
  const sortOrder = params.sortOrder !== undefined ? params.sortOrder : this.getSortOrder();

  if (sortField && sortOrder !== 0) {
    soldPositions.sort((a, b) => this.comparePositions(a, b, sortField, sortOrder));
  }

  // Slice for lazy loading
  return soldPositions.slice(params.first, params.first + params.rows);
});

// OnLazyLoad handler
onLazyLoad(event: LazyLoadEvent): void {
  this.lazyLoadParams.set({
    first: event.first || 0,
    rows: event.rows || 10,
    sortField: event.sortField,
    sortOrder: event.sortOrder
  });
}
```

### Inline Editing and Capital Gains Recalculation

**Source: [BasePositionsComponent]**

**Edit Flow:**

1. User edits buy, sell, or quantity in table cell
2. `onEditCommit(row, field)` called
3. `validateTradeField()` validates the change
4. If valid, SmartNgRX updates Trade entity
5. `positions$` recomputes automatically
6. `calculateCapitalGains` recalculates for affected row
7. Table displays updated capital gains

**Validation Methods:**

```typescript
protected validateTradeField(
  field: string,
  row: SoldPosition,
  trade: Trade,
  universe: Universe
): string {
  switch (field) {
    case 'sell':
      universe.most_recent_sell_price = row.sell;
      return 'sell';
    case 'sellDate':
      if (!this.storageService.isDateRangeValid(row.buyDate, row.sellDate, 'sellDate')) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid Date',
          detail: 'Sell date cannot be before buy date.',
        });
        row.sellDate = trade.sell_date ?? '';
        return '';
      }
      return 'sell_date';
    case 'buyDate':
      if (!this.storageService.isDateRangeValid(row.buyDate, row.sellDate, 'buyDate')) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid Date',
          detail: 'Buy date cannot be after sell date.',
        });
        row.buyDate = trade.buy_date ?? '';
        return '';
      }
      return 'buy_date';
    default:
      return field;
  }
}
```

### SmartNgRX Signals Integration

**Source: [CLAUDE.md - SmartNgRX Signals State Management]**

**Current State Access:**

- `this.soldPositionsService.selectClosedPositions()` - Returns all closed positions
- `this.soldPositionsService.trades()` - Full trades array for delete
- SmartArray proxy methods for delete operations

**Lazy Loading Considerations:**

- SmartNgRX signals provide full dataset (ClosedPosition entities)
- Transformation to SoldPosition with capital gains happens in computed signal
- Lazy loading only affects rendered rows
- Capital gains calculations always current because they're in reactive computed signal

### File Locations

**Source: [Epic W - Integration Points]**

**Files to Modify:**

- `/apps/dms/src/app/account-panel/sold-positions/sold-positions.component.html` - Add lazy loading attributes
- `/apps/dms/src/app/account-panel/sold-positions/sold-positions.component.ts` - Implement lazy load logic
- `/apps/dms/src/app/account-panel/sold-positions/sold-positions.component.spec.ts` - Update tests

**Files to Reference (Read-Only):**

- `/apps/dms/src/app/shared/base-positions.component.ts` - Base class with shared logic
- `/apps/dms/src/app/account-panel/sold-positions/sold-positions-component.service.ts` - Business logic
- `/apps/dms/src/app/account-panel/sold-positions/sold-positions-storage.service.ts` - State persistence
- `/apps/dms/src/app/account-panel/sold-positions/capital-gains-calculator.function.ts` - Calculation logic

### Testing

**Source: [CLAUDE.md - Testing Requirements]**

**Testing Framework:**

- Use Vitest for all testing
- Follow existing test patterns in sold-positions.component.spec.ts

**Test Scenarios:**

1. **Capital Gains Calculations:**

   - Test capitalGain calculated correctly on lazy-loaded rows
   - Test capitalGainPercentage calculated correctly
   - Test calculations with zero buy price (edge case)
   - Test calculations update when buy price edited
   - Test calculations update when sell price edited
   - Test calculations update when quantity edited

2. **Lazy Load Event Handling:**

   - Test onLazyLoad receives correct event parameters
   - Test lazyLoadParams signal updates correctly
   - Test positions$ recomputes with capital gains for new slice

3. **Total Records Calculation:**

   - Test totalRecords$ without filter
   - Test totalRecords$ with symbol filter applied
   - Test totalRecords$ updates after delete

4. **SellDate Sorting:**

   - Test sellDate sorting with lazy load
   - Test sort icon updates correctly
   - Test sorting across lazy-loaded pages

5. **Inline Editing:**

   - Test buy price edit triggers capital gains recalculation
   - Test sell price edit triggers capital gains recalculation
   - Test quantity edit triggers capital gains recalculation
   - Test buyDate edit with validation
   - Test sellDate edit with validation
   - Test date range validation (buy < sell)

6. **Symbol Filtering:**

   - Test filter with lazy loading
   - Test filter affects totalRecords$
   - Test filtered data includes correct capital gains

7. **Delete Functionality:**
   - Test delete on different pages
   - Test totalRecords$ updates

**Test File Location:**

- `/apps/dms/src/app/account-panel/sold-positions/sold-positions.component.spec.ts`

## Change Log

| Date       | Version | Description                                      | Author            |
| ---------- | ------- | ------------------------------------------------ | ----------------- |
| 2025-10-11 | 1.0     | Initial story creation for Epic W.1 lazy loading | BMad Scrum Master |

## Dev Agent Record

### Agent Model Used

_To be populated by development agent_

### Debug Log References

_To be populated by development agent_

### Completion Notes List

_To be populated by development agent_

### File List

_To be populated by development agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
