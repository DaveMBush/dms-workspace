# Story V.1: Implement Lazy Loading for Open Positions Table

## Status

Draft

## Story

**As a** user viewing open trading positions,
**I want** the positions table to load only visible rows with a buffer,
**so that** the screen loads faster and I can edit, filter, and sort positions smoothly even with many open trades.

## Acceptance Criteria

1. Add lazy loading and virtual scroll attributes to p-table template
2. Implement onLazyLoad event handler with filtering support
3. Configure 10-row buffer with existing scroll height
4. Update computed signal to support lazy loading with symbol filter
5. Ensure inline editing works on lazy-loaded rows (buy, buyDate, quantity, sell, sellDate)
6. Verify date validation logic with lazy-loaded data (buy date < sell date)
7. Preserve multi-column sorting functionality (buyDate, unrealizedGainPercent, unrealizedGain)
8. Add dataKey attribute for proper row identification during editing
9. Update unit tests to cover lazy loading with inline editing
10. Test with various filter and sort combinations
11. Ensure the following commands run without errors:
    - `pnpm format`
    - `pnpm dupcheck`
    - `pnpm nx run rms:test --code-coverage`
    - `pnpm nx run server:build:production`
    - `pnpm nx run server:test --code-coverage`
    - `pnpm nx run server:lint`
    - `pnpm nx run rms:lint`
    - `pnpm nx run rms:build:production`
    - `pnpm nx run rms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 1: Add PrimeNG lazy loading attributes to p-table** (AC: 1, 3, 8)

  - [ ] Add `[lazy]="true"` attribute to p-table in open-positions.component.html
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
  - [ ] Update `positions$` computed to apply symbol filter first, then slice for lazy load
  - [ ] Maintain existing BasePositionsComponent filtering logic
  - [ ] Preserve existing sort signals integration

- [ ] **Task 3: Preserve multi-column sorting with lazy loading** (AC: 7)

  - [ ] Verify `onSort()` method updates sort state correctly
  - [ ] Test buyDate sorting with lazy-loaded data
  - [ ] Test unrealizedGainPercent sorting with lazy-loaded data
  - [ ] Test unrealizedGain sorting with lazy-loaded data
  - [ ] Ensure sort icons update correctly in sortable headers
  - [ ] Verify sorting works across all lazy-loaded pages

- [ ] **Task 4: Ensure inline editing works on lazy-loaded rows** (AC: 5, 6)

  - [ ] Test buy price editing on various lazy-loaded pages
  - [ ] Test buyDate editing with p-datepicker on lazy-loaded rows
  - [ ] Test quantity editing with p-inputNumber on lazy-loaded rows
  - [ ] Test sell price editing on lazy-loaded rows
  - [ ] Test sellDate editing with p-datepicker on lazy-loaded rows
  - [ ] Verify `onEditCommit()` method works with lazy-loaded data
  - [ ] Test date validation (buy date < sell date) on lazy-loaded rows
  - [ ] Verify validation error messages display correctly
  - [ ] Test `stopArrowKeyPropagation()` works in inline editors

- [ ] **Task 5: Test delete functionality with lazy loading** (AC: 5)

  - [ ] Test `trash()` method with lazy-loaded rows on first page
  - [ ] Test delete on middle pages
  - [ ] Test delete on last page
  - [ ] Verify table updates properly after deletion
  - [ ] Ensure totalRecords$ updates after delete

- [ ] **Task 6: Update unit tests for lazy loading** (AC: 9, 10)

  - [ ] Update existing tests in open-positions.component.spec.ts
  - [ ] Add test for onLazyLoad event handler
  - [ ] Add test for totalRecords$ signal calculation with filtering
  - [ ] Test lazy load with symbol filter active
  - [ ] Test lazy load with different sort configurations
  - [ ] Test inline editing on lazy-loaded rows
  - [ ] Test date validation with lazy-loaded data
  - [ ] Test delete operation updates lazy load state
  - [ ] Test with small dataset (< 10 rows)
  - [ ] Test with large dataset (> 100 rows)

- [ ] **Task 7: Run all quality gates** (AC: 11)
  - [ ] Execute `pnpm format` and fix any formatting issues
  - [ ] Execute `pnpm dupcheck` and resolve duplicates
  - [ ] Execute all test suites and ensure 100% pass rate
  - [ ] Execute all lint commands and resolve issues
  - [ ] Execute all build commands and ensure successful compilation

## Dev Notes

### Epic Context

This story implements lazy loading for the Open Positions table (Epic V). This is more complex than Dividend Deposits (Epic U) because it includes symbol filtering, multi-column sorting, and inline editing with date validation. The component extends BasePositionsComponent for shared logic.

### Current Implementation Analysis

**Source: [apps/rms/src/app/account-panel/open-positions/open-positions.component.ts]**

**Component Inheritance:**

```typescript
export class OpenPositionsComponent extends BasePositionsComponent<OpenPosition, OpenPositionsStorageService> {
  // Inherits filtering and sorting from BasePositionsComponent
  // Has symbol filter integration
  // Multi-column sorting support
  // Inline editing with validation
}
```

**Current Computed Signal with Filtering:**

```typescript
positions$ = computed(() => {
  const rawPositions = this.openPositionsService.selectOpenPositions();
  const symbolFilter = this.symbolFilter();
  const sortField = this.getSortField();
  const sortOrder = this.getSortOrder();

  // Apply symbol filter
  let filteredPositions = rawPositions;
  if (symbolFilter && symbolFilter.trim() !== '') {
    filteredPositions = rawPositions.filter(function filterSymbol(position) {
      return position.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
    });
  }

  // Apply sorting
  if (sortField && sortOrder !== 0) {
    filteredPositions = [...filteredPositions].sort((a, b) => this.comparePositions(a, b, sortField, sortOrder));
  }

  return filteredPositions;
});
```

**Inline Editing Methods:**

```typescript
onEditCommit(row: OpenPosition, field: string): void {
  // Calls BasePositionsComponent.onEditCommit
  // Triggers validateTradeField
  // Handles date validation
}

validateTradeField(field: string, row: OpenPosition, trade: Trade, universe: Universe): string {
  switch (field) {
    case 'sell':
      return this.validateSellField(row, universe);
    case 'sellDate':
      return this.validateSellDateField(row, trade, universe);
    case 'buyDate':
      return this.validateBuyDateField(row, trade);
    default:
      return field;
  }
}
```

### Lazy Loading Implementation Strategy

**Updated Computed Signal with Lazy Loading:**

```typescript
// Add lazy load params signal
private lazyLoadParams = signal<{first: number; rows: number; sortField?: string; sortOrder?: number}>({
  first: 0,
  rows: 10
});

// Total records after filtering
totalRecords$ = computed(() => {
  const rawPositions = this.openPositionsService.selectOpenPositions();
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
  const rawPositions = this.openPositionsService.selectOpenPositions();
  const symbolFilter = this.symbolFilter();

  // Apply symbol filter FIRST
  let filteredPositions = rawPositions;
  if (symbolFilter && symbolFilter.trim() !== '') {
    filteredPositions = rawPositions.filter(function filterSymbol(position) {
      return position.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
    });
  }

  // Apply sorting (use params.sortField if available)
  const sortField = params.sortField || this.getSortField();
  const sortOrder = params.sortOrder !== undefined ? params.sortOrder : this.getSortOrder();

  if (sortField && sortOrder !== 0) {
    filteredPositions = [...filteredPositions].sort((a, b) =>
      this.comparePositions(a, b, sortField, sortOrder)
    );
  }

  // Slice for lazy loading
  return filteredPositions.slice(params.first, params.first + params.rows);
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

### PrimeNG Inline Editing with Lazy Loading

**Source: [PrimeNG 20 Table Documentation - Cell Editing]**

**Critical Configuration for Inline Editing:**

- `[dataKey]="'id'"` - Required for proper row identification during editing
- `[rowTrackBy]="trackById"` - Performance optimization for row updates
- `pEditableColumn` directive - Works with lazy-loaded rows
- p-cellEditor - Maintains state across lazy load updates

**Inline Editing Consideration:**

- PrimeNG CellEditor works with lazy-loaded data when dataKey is set
- Row identification via dataKey ensures edits target correct entity
- Validation logic must work with partial dataset visible
- SmartNgRX updates affect full dataset, not just visible rows

### BasePositionsComponent Integration

**Source: [apps/rms/src/app/shared/base-positions.component.ts]**

**Inherited Methods to Preserve:**

- `onSort(field: string)` - Updates sort state
- `onSymbolFilterChange()` - Triggers filter update
- `onEditCommit(row, field)` - Handles cell edits
- `comparePositions(a, b, field, order)` - Sorting logic
- `getSortField()` - Current sort field
- `getSortOrder()` - Current sort order

**Storage Service Integration:**

- `OpenPositionsStorageService` - Stores filter/sort state in localStorage
- `isDateRangeValid()` - Date validation helper
- Component uses `storageService.loadSortCriteria()` for initial state

### Sort Signals Integration

**Current Sort Signals:**

```typescript
readonly sortSignals = {
  buyDateSortIcon$: computed(() => this.getSortIcon('buyDate')),
  buyDateSortOrder$: computed(() => this.getSortOrderDisplay('buyDate')),
  unrealizedGainPercentSortIcon$: computed(() =>
    this.getSortIcon('unrealizedGainPercent')
  ),
  unrealizedGainPercentSortOrder$: computed(() =>
    this.getSortOrderDisplay('unrealizedGainPercent')
  ),
  unrealizedGainSortIcon$: computed(() => this.getSortIcon('unrealizedGain')),
  unrealizedGainSortOrder$: computed(() =>
    this.getSortOrderDisplay('unrealizedGain')
  ),
};
```

**Lazy Loading Impact:**

- Sort signals remain unchanged
- `onSort()` method updates both component state and lazy load params
- PrimeNG handles sort via `onLazyLoad` event when `[lazy]="true"`
- Must sync component sort state with lazy load event

### File Locations

**Source: [Epic V - Integration Points]**

**Files to Modify:**

- `/apps/rms/src/app/account-panel/open-positions/open-positions.component.html` - Add lazy loading attributes
- `/apps/rms/src/app/account-panel/open-positions/open-positions.component.ts` - Implement lazy load logic
- `/apps/rms/src/app/account-panel/open-positions/open-positions.component.spec.ts` - Update tests

**Files to Reference (Read-Only):**

- `/apps/rms/src/app/shared/base-positions.component.ts` - Base class with shared logic
- `/apps/rms/src/app/account-panel/open-positions/open-positions-component.service.ts` - Business logic
- `/apps/rms/src/app/account-panel/open-positions/open-positions-storage.service.ts` - State persistence

### Inline Editing Validation Flows

**Buy Date Validation:**

```typescript
private validateBuyDateField(row: OpenPosition, trade: Trade): string {
  if (!this.storageService.isDateRangeValid(row.buyDate, row.sellDate, 'buyDate')) {
    this.messageService.add({
      severity: 'error',
      summary: 'Invalid Date',
      detail: 'Buy date cannot be after sell date.',
    });
    this.revertBuyDate(row, trade);
    return '';
  }
  return 'buy_date';
}
```

**Sell Date Validation:**

```typescript
private validateSellDateField(row: OpenPosition, trade: Trade, universe: Universe): string {
  if (!this.storageService.isDateRangeValid(row.buyDate, row.sellDate, 'sellDate')) {
    this.messageService.add({
      severity: 'error',
      summary: 'Invalid Date',
      detail: 'Sell date cannot be before buy date.',
    });
    this.revertSellDate(row, trade);
    return '';
  }

  this.updateUniverseSellDate(row, universe);
  return 'sell_date';
}
```

**Lazy Loading Impact:**

- Validation methods work on individual rows, not full dataset
- Error messages display correctly regardless of scroll position
- Revert logic accesses Trade entity from SmartNgRX store
- Universe updates affect global state, not just visible rows

### SmartNgRX Signals Integration

**Source: [CLAUDE.md - SmartNgRX Signals State Management]**

**Current State Access:**

- `this.openPositionsService.selectOpenPositions()` - Returns all open positions
- `this.openPositionsService.trades()` - Full trades array for validation
- SmartArray proxy methods for delete operations

**Lazy Loading Considerations:**

- SmartNgRX signals provide full dataset
- Lazy loading only affects rendered rows
- Edit/delete operations work on full dataset via signals
- Computed signal slicing doesn't affect state management

### Symbol Filter Header Component

**Integration:**

- `<rms-symbol-filter-header>` component in template
- Two-way binding: `[(symbolFilter)]="symbolFilter"`
- Event: `(filterChange)="onSymbolFilterChange()"`
- Filter updates trigger `positions$` recomputation
- Lazy loading must account for filtered results

### Testing

**Source: [CLAUDE.md - Testing Requirements]**

**Testing Framework:**

- Use Vitest for all testing
- Follow existing test patterns in open-positions.component.spec.ts

**Test Scenarios:**

1. **Lazy Load Event Handling:**

   - Test onLazyLoad receives correct event parameters
   - Test lazyLoadParams signal updates correctly
   - Test positions$ recomputes with new slice
   - Test with symbol filter active

2. **Total Records Calculation:**

   - Test totalRecords$ without filter
   - Test totalRecords$ with symbol filter applied
   - Test totalRecords$ updates after delete

3. **Multi-Column Sorting:**

   - Test buyDate sorting with lazy load
   - Test unrealizedGainPercent sorting with lazy load
   - Test unrealizedGain sorting with lazy load
   - Test sort icons update correctly
   - Test sorting across lazy-loaded pages

4. **Inline Editing:**

   - Test buy price edit on lazy-loaded row
   - Test buyDate edit with validation
   - Test quantity edit
   - Test sell price edit
   - Test sellDate edit with validation
   - Test date range validation (buy < sell)
   - Test validation error messages
   - Test edit revert on validation failure

5. **Symbol Filtering:**

   - Test filter reduces totalRecords$
   - Test filter with lazy loading
   - Test filter clear resets lazy load

6. **Delete Functionality:**
   - Test delete on first page
   - Test delete on middle page
   - Test delete on last page
   - Test totalRecords$ updates

**Test File Location:**

- `/apps/rms/src/app/account-panel/open-positions/open-positions.component.spec.ts`

## Change Log

| Date       | Version | Description                                      | Author            |
| ---------- | ------- | ------------------------------------------------ | ----------------- |
| 2025-10-11 | 1.0     | Initial story creation for Epic V.1 lazy loading | BMad Scrum Master |

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
