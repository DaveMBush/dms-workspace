# Story H.2: Add new column to universe table display

## Status

Complete

## Story

**As a** portfolio manager,
**I want** to see the average purchase yield percentage displayed as a new column in the universe table,
**so that** I can compare market yield with my actual investment performance side-by-side.

## Acceptance Criteria

1. Add new column header "Avg Purchase Yield%" in universe table
2. Display `avg_purchase_yield_percent` with same formatting as existing yield column (2 decimal places, % symbol)
3. Implement sorting capability using existing sort infrastructure
4. Add column to existing yield filter logic (if applicable)
5. Ensure responsive design maintains table usability
6. Column should be visible when account selection is not "all" (since it requires position data)

## Tasks / Subtasks

- [ ] **Task 1: Add column to HTML table template** (AC: 1, 5)

  - [ ] Add new `<th>` header "Avg Purchase Yield%" in `global-universe.component.html`
  - [ ] Add new `<td>` cell displaying `avg_purchase_yield_percent` with proper formatting
  - [ ] Ensure column positioning is logical (next to existing Yield% column)
  - [ ] Add responsive design considerations for smaller screens

- [ ] **Task 2: Implement column sorting functionality** (AC: 3)

  - [ ] Add `avgPurchaseYieldSortIcon$` computed signal in `sort-computed-signals.function.ts`
  - [ ] Add `avgPurchaseYieldSortOrder$` computed signal for sort order tracking
  - [ ] Add click handler for column header sorting
  - [ ] Update sort criteria handling to include 'avg_purchase_yield_percent' field

- [ ] **Task 3: Add field handling in data service** (AC: 2, 6)

  - [ ] Update `getFieldValueFromDisplayData()` in `UniverseDataService` to handle new field
  - [ ] Add proper default value handling (0 when no positions)
  - [ ] Ensure field works with account-specific filtering
  - [ ] Add formatting helper for percentage display

- [ ] **Task 4: Update table styling and responsive design** (AC: 5)

  - [ ] Ensure new column fits well with existing table layout
  - [ ] Add appropriate column width styling
  - [ ] Test responsive behavior on mobile devices
  - [ ] Maintain PrimeNG table theme consistency

- [ ] **Task 5: Conditional column visibility** (AC: 6)

  - [ ] Add logic to show/hide column based on account selection
  - [ ] Display column only when account is not "all"
  - [ ] Add appropriate messaging or styling when column is hidden
  - [ ] Ensure smooth UI transitions when switching accounts

- [ ] **Task 6: Add filter integration** (AC: 4)
  - [ ] Investigate if existing yield filter should apply to new column
  - [ ] Implement filter logic if applicable
  - [ ] Update filter UI to clarify which yields are being filtered
  - [ ] Test filter behavior with both yield columns

## Dev Notes

### Previous Story Context

**Dependencies:** Story H.1 must be completed first, as this story displays the `avg_purchase_yield_percent` field calculated in H.1.

### Data Models and Architecture

**Source: [Story H.1 Dev Notes]**

- `avg_purchase_yield_percent` field available in `UniverseDisplayData` interface
- Field calculated in `universe.selector.ts` with proper edge case handling
- Account-specific filtering compatibility already implemented

**Source: [apps/dms/src/app/global/global-universe/global-universe.component.html]**

- Existing table structure using PrimeNG p-table component
- Current yield column: `{{ item.yield_percent | number:'1.2-2' }}%`
- Sorting implemented via click handlers on column headers

**Source: [apps/dms/src/app/global/global-universe/sort-computed-signals.function.ts]**

- Pattern for adding sort signals: `getSortIcon('field_name', sortCriteria)`
- Existing yield column sort: `yieldPercentSortIcon$` and `yieldPercentSortOrder$`
- Sort order tracking and icon display logic already established

### File Locations

**Primary Files to Modify:**

1. `/apps/dms/src/app/global/global-universe/global-universe.component.html` - Add new table column
2. `/apps/dms/src/app/global/global-universe/global-universe.component.scss` - Column styling
3. `/apps/dms/src/app/global/global-universe/sort-computed-signals.function.ts` - Add sorting support
4. `/apps/dms/src/app/global/global-universe/universe-data.service.ts` - Field handling (if not already added in H.1)

**Test Files to Create/Modify:**

1. `/apps/dms/src/app/global/global-universe/global-universe.component.spec.ts` - Test column display and interactions
2. `/apps/dms/src/app/global/global-universe/sort-computed-signals.function.spec.ts` - Test sorting functionality

### Technical Implementation Details

**Column HTML Template:**

```html
<th class="text-right cursor-pointer" (click)="toggleSort('avg_purchase_yield_percent')">
  Avg Purchase Yield%
  <i [class]="avgPurchaseYieldSortIcon$()"></i>
</th>
```

**Column Data Cell:**

```html
<td class="text-right" [ngClass]="{'hidden-column': selectedAccount() === 'all'}">{{ item.avg_purchase_yield_percent | number:'1.2-2' }}%</td>
```

**Sort Signal Implementation:**

```typescript
avgPurchaseYieldSortIcon$: computed(function avgPurchaseYieldSortIconComputed() {
  return getSortIcon('avg_purchase_yield_percent', sortCriteria);
}),

avgPurchaseYieldSortOrder$: computed(function avgPurchaseYieldSortOrderComputed() {
  return getSortOrder('avg_purchase_yield_percent');
}),
```

**Responsive Design Considerations:**

- Column should stack properly on mobile devices
- Consider hiding less critical columns on small screens
- Maintain horizontal scroll capability for full table view
- Ensure touch targets are appropriately sized for mobile sorting

**Account Filtering Logic:**

- Column visible only when `selectedAccount() !== 'all'`
- Graceful hiding/showing when account selection changes
- Appropriate messaging when column data is not available

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with TestBed for Angular components
**Test Location:** Component test files collocated with source files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Component Tests:** Test column rendering, click handlers, conditional visibility
- **Integration Tests:** Test sorting functionality and account filtering
- **Responsive Tests:** Test table behavior on different screen sizes
- **User Interaction Tests:** Test sort functionality and filter interactions

**Key Test Scenarios:**

- Column displays correct data with proper formatting
- Sorting works correctly for average purchase yield values
- Column visibility changes appropriately with account selection
- Responsive design maintains table usability
- Filter integration works as expected (if implemented)

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
