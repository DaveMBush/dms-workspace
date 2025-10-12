# Story X.1: Implement Lazy Loading for Global Universe Table

## Status

Draft

## Story

**As a** user managing the universe of tradeable stocks,
**I want** the universe table to load only visible rows with a buffer,
**so that** the screen loads faster and I can filter by multiple criteria, sort by various columns, and edit stock data smoothly even with hundreds of stocks in the universe.

## Acceptance Criteria

1. Add lazy loading and virtual scroll attributes to p-table template
2. Implement onLazyLoad event handler with complex filtering support
3. Configure 10-row buffer with existing scroll height
4. Update computed signal to support lazy loading with all five filters (symbol, riskGroup, minYield, expired, account)
5. Ensure inline editing works on lazy-loaded rows (distribution, distributions_per_year, ex_date)
6. Test all filter types with lazy loading
7. Preserve multi-column sorting across all sortable columns (yield_percent, avg_purchase_yield_percent, ex_date, most_recent_sell_date, most_recent_sell_price)
8. Ensure row dimming logic works on lazy-loaded data (expired rows dimmed)
9. Verify delete button conditional display logic (only non-CEF with position=0)
10. Test sync universe and update fields operations with lazy loading
11. Add dataKey attribute for proper row identification during editing
12. Update unit tests to cover lazy loading with complex features
13. Test with various filter, sort, and edit combinations
14. Ensure the following commands run without errors:
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

- [ ] **Task 1: Add PrimeNG lazy loading attributes to p-table** (AC: 1, 3, 11)
  - [ ] Add `[lazy]="true"` attribute to p-table in global-universe.component.html
  - [ ] Add `[virtualScroll]="true"` attribute for virtual scrolling
  - [ ] Configure `[rows]="10"` for 10-row buffer size
  - [ ] Add `[dataKey]="'id'"` for proper row identification (critical for inline editing)
  - [ ] Add `[totalRecords]="totalRecords$()"` signal for total count
  - [ ] Add `(onLazyLoad)="onLazyLoad($event)"` event handler
  - [ ] Preserve existing `[scrollHeight]="'calc(100vh - 145px)'"`
  - [ ] Preserve existing `[rowTrackBy]="trackById"`

- [ ] **Task 2: Implement onLazyLoad event handler with complex filtering** (AC: 2, 4)
  - [ ] Create `onLazyLoad(event: LazyLoadEvent): void` method in component
  - [ ] Extract `first`, `rows`, `sortField`, `sortOrder` from event
  - [ ] Create `lazyLoadParams` signal to store load parameters
  - [ ] Create `totalRecords$` computed signal for total record count (after all filters applied)
  - [ ] Update `universe$` computed to integrate with UniverseDataService.filterAndSortUniverses
  - [ ] Ensure all five filters apply before lazy load slice:
    - Symbol filter (text)
    - Risk group filter (dropdown)
    - Min yield filter (number)
    - Expired filter (boolean)
    - Account filter (dropdown)
  - [ ] Add lazy load slice after filtering and sorting

- [ ] **Task 3: Integrate UniverseDataService with lazy loading** (AC: 4)
  - [ ] Review UniverseDataService.filterAndSortUniverses method
  - [ ] Ensure service method remains unchanged (no breaking changes)
  - [ ] Call service method with all filter criteria
  - [ ] Apply lazy load slice to service results
  - [ ] Maintain row dimming logic from universeWithDimmedState$ computed

- [ ] **Task 4: Preserve all five filter types with lazy loading** (AC: 6)
  - [ ] Test symbol text filter with lazy loading
  - [ ] Test risk group dropdown filter with lazy loading
  - [ ] Test minimum yield number filter with lazy loading
  - [ ] Test expired boolean filter with lazy loading
  - [ ] Test account selection filter with lazy loading
  - [ ] Test combinations of multiple filters simultaneously
  - [ ] Verify totalRecords$ updates correctly with each filter

- [ ] **Task 5: Preserve multi-column sorting with lazy loading** (AC: 7)
  - [ ] Verify sortingHandlers.onSort method integration
  - [ ] Test yield_percent sorting with lazy loading
  - [ ] Test avg_purchase_yield_percent sorting with lazy loading
  - [ ] Test ex_date sorting with lazy loading
  - [ ] Test most_recent_sell_date sorting with lazy loading
  - [ ] Test most_recent_sell_price sorting with lazy loading
  - [ ] Ensure sort icons from sortSignals update correctly
  - [ ] Test sorting with filters active

- [ ] **Task 6: Ensure inline editing works on lazy-loaded rows** (AC: 5)
  - [ ] Test distribution editing with p-inputNumber on lazy-loaded rows
  - [ ] Test distributions_per_year editing with p-inputNumber on lazy-loaded rows
  - [ ] Test ex_date editing with rms-editable-date-cell on lazy-loaded rows
  - [ ] Verify editHandlers.onEditCommit method works with lazy-loaded data
  - [ ] Test editHandlers.onEditDistributionComplete integration
  - [ ] Test editHandlers.onEditDistributionsPerYearComplete integration
  - [ ] Test editHandlers.onEditDateComplete integration
  - [ ] Test stopArrowKeyPropagation works in inline editors

- [ ] **Task 7: Ensure row dimming logic works with lazy loading** (AC: 8)
  - [ ] Verify universeWithDimmedState$ computed includes lazy-loaded rows
  - [ ] Test isRowDimmed function evaluation on lazy-loaded data
  - [ ] Verify expired rows display with dimmed styling
  - [ ] Test dimming works across all lazy-loaded pages
  - [ ] Test dimming updates when ex_date edited

- [ ] **Task 8: Verify conditional delete button display** (AC: 9)
  - [ ] Test shouldShowDeleteButton method with lazy-loaded rows
  - [ ] Verify delete button hidden for closed-end funds (is_closed_end_fund=true)
  - [ ] Verify delete button hidden when position > 0
  - [ ] Verify delete button shown when !is_closed_end_fund AND position=0
  - [ ] Test deleteUniverse method with lazy-loaded rows

- [ ] **Task 9: Test sync and update operations** (AC: 10)
  - [ ] Test syncUniverse() method with lazy loading active
  - [ ] Test updateFields() method with lazy loading active
  - [ ] Verify table updates correctly after sync operation
  - [ ] Verify table updates correctly after fields update
  - [ ] Test loading states (isSyncingUniverse$, isUpdatingFields$) display correctly

- [ ] **Task 10: Update unit tests for lazy loading** (AC: 12, 13)
  - [ ] Update existing tests in global-universe.component.spec.ts
  - [ ] Add test for onLazyLoad event handler
  - [ ] Add test for totalRecords$ with all filter combinations
  - [ ] Test each filter type with lazy loading
  - [ ] Test multi-column sorting with lazy loading
  - [ ] Test inline editing on lazy-loaded rows
  - [ ] Test row dimming logic
  - [ ] Test conditional delete button display
  - [ ] Test sync and update operations
  - [ ] Test with small dataset (< 10 rows)
  - [ ] Test with large dataset (> 100 rows)

- [ ] **Task 11: Run all quality gates** (AC: 14)
  - [ ] Execute `pnpm format` and fix any formatting issues
  - [ ] Execute `pnpm dupcheck` and resolve duplicates
  - [ ] Execute all test suites and ensure 100% pass rate
  - [ ] Execute all lint commands and resolve issues
  - [ ] Execute all build commands and ensure successful compilation

## Dev Notes

### Epic Context

This story implements lazy loading for the Global Universe table (Epic X). This is the most complex of the four lazy loading implementations due to five different filter types, five sortable columns, three inline-editable fields, row dimming logic, conditional delete display, and sync/update operations.

### Current Implementation Analysis

**Source: [apps/rms/src/app/global/global-universe/global-universe.component.ts]**

**Component Structure:**
```typescript
export class GlobalUniverseComponent {
  // Multiple filter signals
  minYieldFilter = signal<number | null>(this.storageService.loadMinYieldFilter());
  selectedAccountId = signal<string>(this.storageService.loadSelectedAccountId());
  riskGroupFilter = signal<string | null>(this.storageService.loadRiskGroupFilter());
  expiredFilter = signal<boolean | null>(this.storageService.loadExpiredFilter());
  symbolFilter = signal<string>(this.storageService.loadSymbolFilter());

  // Sorting
  sortCriteria = signal<Array<{ field: string; order: number }>>(
    this.storageService.loadSortCriteria()
  );

  // Main data computed signal
  readonly universe$ = computed(() => {
    const rawData = selectUniverse();
    return this.dataService.filterAndSortUniverses({
      rawData,
      sortCriteria: this.sortCriteria(),
      minYield: this.minYieldFilter(),
      selectedAccount: this.selectedAccountId(),
      symbolFilter: this.symbolFilter(),
      riskGroupFilter: this.riskGroupFilter(),
      expiredFilter: this.expiredFilter(),
    });
  });

  // Row dimming
  readonly universeWithDimmedState$ = computed(() => {
    const universes = this.universe$() as unknown as Universe[];
    return universes.map(function mapUniverse(universe) {
      return {
        ...universe,
        isDimmed: isRowDimmed(universe),
      };
    });
  });
}
```

### UniverseDataService Integration

**Source: [apps/rms/src/app/global/global-universe/universe-data.service.ts]**

**filterAndSortUniverses Method:**
```typescript
@Injectable()
export class UniverseDataService {
  filterAndSortUniverses(params: {
    rawData: Universe[];
    sortCriteria: Array<{ field: string; order: number }>;
    minYield: number | null;
    selectedAccount: string;
    symbolFilter: string;
    riskGroupFilter: string | null;
    expiredFilter: boolean | null;
  }): Universe[] {
    let filtered = params.rawData;

    // Apply all filters
    if (params.symbolFilter) { /* filter by symbol */ }
    if (params.riskGroupFilter) { /* filter by risk group */ }
    if (params.minYield !== null) { /* filter by min yield */ }
    if (params.expiredFilter !== null) { /* filter by expired */ }
    if (params.selectedAccount !== 'all') { /* filter by account */ }

    // Apply sorting
    if (params.sortCriteria.length > 0) { /* multi-column sort */ }

    return filtered;
  }
}
```

### Lazy Loading Implementation Strategy

**Updated Component with Lazy Loading:**
```typescript
// Add lazy load params signal
private lazyLoadParams = signal<{first: number; rows: number}>({
  first: 0,
  rows: 10
});

// Total records after all filters
totalRecords$ = computed(() => {
  const rawData = selectUniverse();
  const filtered = this.dataService.filterAndSortUniverses({
    rawData,
    sortCriteria: this.sortCriteria(),
    minYield: this.minYieldFilter(),
    selectedAccount: this.selectedAccountId(),
    symbolFilter: this.symbolFilter(),
    riskGroupFilter: this.riskGroupFilter(),
    expiredFilter: this.expiredFilter(),
  });
  return filtered.length;
});

// Updated universe$ with lazy loading
readonly universe$ = computed(() => {
  const params = this.lazyLoadParams();
  const rawData = selectUniverse();

  // Apply all filters and sorting via service
  const filteredAndSorted = this.dataService.filterAndSortUniverses({
    rawData,
    sortCriteria: this.sortCriteria(),
    minYield: this.minYieldFilter(),
    selectedAccount: this.selectedAccountId(),
    symbolFilter: this.symbolFilter(),
    riskGroupFilter: this.riskGroupFilter(),
    expiredFilter: this.expiredFilter(),
  });

  // Slice for lazy loading
  return filteredAndSorted.slice(params.first, params.first + params.rows);
});

// Updated universeWithDimmedState$ (no changes, works with sliced data)
readonly universeWithDimmedState$ = computed(() => {
  const universes = this.universe$() as unknown as Universe[];
  return universes.map(function mapUniverse(universe) {
    return {
      ...universe,
      isDimmed: isRowDimmed(universe),
    };
  });
});

// OnLazyLoad handler
onLazyLoad(event: LazyLoadEvent): void {
  this.lazyLoadParams.set({
    first: event.first || 0,
    rows: event.rows || 10
  });
  // Note: Sorting handled by sortCriteria signal, not event.sortField
}
```

### Filter Handlers Integration

**Source: [apps/rms/src/app/global/global-universe/filter-handlers.function.ts]**

**createFilterHandlers Function:**
```typescript
export function createFilterHandlers(
  storageService: GlobalUniverseStorageService,
  signals: {
    minYieldFilter: WritableSignal<number | null>;
    riskGroupFilter: WritableSignal<string | null>;
    expiredFilter: WritableSignal<boolean | null>;
    symbolFilter: WritableSignal<string>;
    selectedAccountId: WritableSignal<string>;
  }
) {
  return {
    onMinYieldFilterChange: () => {
      storageService.saveMinYieldFilter(signals.minYieldFilter());
    },
    onRiskGroupFilterChange: () => {
      storageService.saveRiskGroupFilter(signals.riskGroupFilter());
    },
    // ... other filter change handlers
  };
}
```

**Lazy Loading Impact:**
- Filter handlers remain unchanged
- Each filter update triggers universe$ recomputation
- totalRecords$ updates automatically with filter changes
- Lazy load slice applies after all filters

### Sorting Handlers Integration

**Source: [apps/rms/src/app/global/global-universe/sorting-handlers.function.ts]**

**createSortingHandlers Function:**
```typescript
export function createSortingHandlers(
  sortCriteria: WritableSignal<Array<{ field: string; order: number }>>,
  storageService: GlobalUniverseStorageService
) {
  return {
    onSort: (field: string) => {
      const currentCriteria = sortCriteria();
      // Update sort criteria array
      // Save to storage
      sortCriteria.set(newCriteria);
    },
    getSortOrder: (field: string): number => {
      const criteria = sortCriteria().find(c => c.field === field);
      return criteria?.order ?? 0;
    },
  };
}
```

**Lazy Loading Impact:**
- Sorting handlers remain unchanged
- Sort updates trigger universe$ recomputation via sortCriteria signal
- UniverseDataService applies multi-column sort before lazy load slice

### Edit Handlers Integration

**Source: [apps/rms/src/app/global/global-universe/edit-handlers.function.ts]**

**createEditHandlers Function:**
```typescript
export function createEditHandlers(dataService: UniverseDataService) {
  return {
    onEditDistributionComplete: (row: UniverseDisplayData) => {
      // Update universe entity via SmartNgRX
    },
    onEditDistributionsPerYearComplete: (row: UniverseDisplayData) => {
      // Update universe entity via SmartNgRX
    },
    onEditDateComplete: (row: UniverseDisplayData, field: string) => {
      // Update universe entity via SmartNgRX
    },
    onEditCommit: (row: UniverseDisplayData, field: string) => {
      // Route to appropriate edit handler
    },
  };
}
```

**Lazy Loading Impact:**
- Edit handlers work with individual rows, not affected by lazy loading
- SmartNgRX updates trigger universe$ recomputation
- Edited rows remain visible in current lazy-loaded page

### Row Dimming Logic

**Source: [apps/rms/src/app/global/global-universe/is-row-dimmed.function.ts]**

**isRowDimmed Function:**
```typescript
export function isRowDimmed(universe: Universe): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!universe.ex_date) {
    return true;
  }

  const exDate = new Date(universe.ex_date);
  exDate.setHours(0, 0, 0, 0);

  return exDate < today;
}
```

**Lazy Loading Impact:**
- Dimming function evaluates each row independently
- Works correctly with lazy-loaded rows
- universeWithDimmedState$ applies dimming to sliced data

### Conditional Delete Button Logic

**Source: [GlobalUniverseComponent]**

**shouldShowDeleteButton Method:**
```typescript
shouldShowDeleteButton(row: UniverseDisplayData): boolean {
  return !row.is_closed_end_fund && row.position === 0;
}
```

**Lazy Loading Impact:**
- Conditional logic evaluates per row, unaffected by lazy loading
- Delete button display works correctly on all pages

### Sync and Update Operations

**Source: [GlobalUniverseComponent]**

**Sync Universe:**
```typescript
syncUniverse(): void {
  const self = this;
  this.globalLoading.show('Updating universe from screener...');

  this.universeSyncService.syncFromScreener().subscribe({
    next: (summary) => {
      self.globalLoading.hide();
      this.messageService.add({
        severity: 'success',
        summary: 'Universe Updated',
        detail: `Successfully updated... ${summary.inserted} inserted, ${summary.updated} updated`,
        sticky: true,
      });
    },
    error: () => {
      self.globalLoading.hide();
      this.messageService.add({
        severity: 'error',
        summary: 'Update Failed',
        // ...
      });
    },
  });
}
```

**Update Fields:**
```typescript
updateFields(): void {
  const self = this;
  this.isUpdatingFields.set(true);
  this.globalLoading.show('Updating field information...');

  this.updateUniverseService.updateFields().subscribe({
    // Similar pattern to syncUniverse
  });
}
```

**Lazy Loading Impact:**
- Sync/update operations modify SmartNgRX state
- universe$ recomputes automatically after state changes
- Lazy-loaded view updates to reflect new data
- User sees updated data on current page

### File Locations

**Source: [Epic X - Integration Points]**

**Files to Modify:**
- `/apps/rms/src/app/global/global-universe/global-universe.component.html` - Add lazy loading attributes
- `/apps/rms/src/app/global/global-universe/global-universe.component.ts` - Implement lazy load logic
- `/apps/rms/src/app/global/global-universe/global-universe.component.spec.ts` - Update tests

**Files to Reference (Read-Only):**
- `/apps/rms/src/app/global/global-universe/filter-handlers.function.ts` - Filter logic
- `/apps/rms/src/app/global/global-universe/edit-handlers.function.ts` - Edit logic
- `/apps/rms/src/app/global/global-universe/sorting-handlers.function.ts` - Sort logic
- `/apps/rms/src/app/global/global-universe/sort-computed-signals.function.ts` - Sort UI signals
- `/apps/rms/src/app/global/global-universe/universe-data.service.ts` - Data transformation
- `/apps/rms/src/app/global/global-universe/is-row-dimmed.function.ts` - Dimming logic
- `/apps/rms/src/app/global/global-universe/global-universe-storage.service.ts` - State persistence

### Testing

**Source: [CLAUDE.md - Testing Requirements]**

**Testing Framework:**
- Use Vitest for all testing
- Follow existing test patterns in global-universe.component.spec.ts

**Test Scenarios:**

1. **Lazy Load Event Handling:**
   - Test onLazyLoad receives correct parameters
   - Test lazyLoadParams signal updates
   - Test universe$ recomputes with new slice

2. **Total Records with Filters:**
   - Test totalRecords$ with no filters
   - Test totalRecords$ with each individual filter
   - Test totalRecords$ with multiple filters combined
   - Test totalRecords$ updates when filters change

3. **Five Filter Types:**
   - Symbol text filter
   - Risk group dropdown filter (Equities, Income, Tax Free)
   - Min yield number filter
   - Expired boolean filter (Yes/No)
   - Account selection filter (All/specific account)
   - Test each filter independently
   - Test filter combinations

4. **Multi-Column Sorting:**
   - yield_percent sorting
   - avg_purchase_yield_percent sorting
   - ex_date sorting
   - most_recent_sell_date sorting
   - most_recent_sell_price sorting
   - Test with filters active

5. **Inline Editing:**
   - distribution editing
   - distributions_per_year editing
   - ex_date editing
   - Test on different lazy-loaded pages

6. **Row Dimming:**
   - Test dimming on expired rows
   - Test dimming updates when ex_date edited
   - Test across lazy-loaded pages

7. **Conditional Delete:**
   - Test button hidden for CEF
   - Test button hidden when position > 0
   - Test button shown when allowed
   - Test delete operation

8. **Sync and Update:**
   - Test syncUniverse with lazy loading
   - Test updateFields with lazy loading
   - Test loading states display
   - Test table updates after operations

**Test File Location:**
- `/apps/rms/src/app/global/global-universe/global-universe.component.spec.ts`

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-11 | 1.0 | Initial story creation for Epic X.1 lazy loading | BMad Scrum Master |

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
