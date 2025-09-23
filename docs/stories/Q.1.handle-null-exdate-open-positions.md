# Story Q.1: Handle Null Ex-Date in Open Positions

## Status

Draft

## Story

**As a** trader using the RMS system,
**I want** the Open Positions tab to function correctly when universe entries have null ex-dates,
**so that** I can view my open positions without errors and all calculated columns display appropriate values.

## Acceptance Criteria

1. Open Positions tab displays without JavaScript errors when universe entries have null ex-dates
2. Ex-Date column shows appropriate placeholder text (e.g., "TBD" or "N/A") when ex_date is null
3. All calculated columns that depend on ex-date (expectedYield, targetGain, targetSell) handle null ex-dates gracefully
4. Existing functionality with valid ex-dates remains unchanged
5. No console errors occur when rendering positions with null ex-dates
6. Days held calculation continues to work regardless of ex-date value

## Tasks / Subtasks

- [ ] **Task 1: Fix ex-date display in template** (AC: 1, 2)

  - [ ] Update open-positions.component.html line 69 to handle null exDate values
  - [ ] Add conditional display logic to show placeholder when exDate is null
  - [ ] Test template rendering with both null and valid ex-dates

- [ ] **Task 2: Fix null ex-date handling in service calculations** (AC: 3, 5)

  - [ ] Update getFormulaExDate method to handle null ex_date parameter
  - [ ] Add null checks before creating Date objects from ex_date
  - [ ] Provide fallback logic for target gain calculations when ex-date is null
  - [ ] Update selectOpenPositions computed signal to handle null ex-dates

- [ ] **Task 3: Add comprehensive unit tests** (AC: 1-6)

  - [ ] Test template rendering with null ex-dates
  - [ ] Test service calculations with null ex-dates
  - [ ] Test that existing functionality with valid ex-dates still works
  - [ ] Test edge cases for target gain calculations

- [ ] **Task 4: Integration testing** (AC: 4, 6)
  - [ ] Manually test Open Positions tab with mixed null/valid ex-dates
  - [ ] Verify no JavaScript console errors occur
  - [ ] Confirm all calculations display appropriate values

## Dev Notes

### Problem Analysis

The issue occurs in three specific locations where null ex_date values cause errors:

1. **Template Display (Line 69)**: `{{ row.exDate | date : 'MM/dd/yyyy' }}` in `open-positions.component.html` fails when exDate is null because the Angular date pipe cannot format null values.

2. **Service Assignment (Line 67)**: `exDate: universe!.ex_date,` in `open-positions-component.service.ts` directly assigns the nullable DateTime? field from the database without null handling.

3. **Formula Calculation (Line 95)**: `const formulaExDate = new Date(universe?.ex_date);` in `getFormulaExDate` method attempts to create a Date object from a potentially null value.

### Source Tree Information

**Affected Files:**

- `apps/rms/src/app/account-panel/open-positions/open-positions.component.html` - Template rendering ex-date
- `apps/rms/src/app/account-panel/open-positions/open-positions-component.service.ts` - Service calculations
- `apps/rms/src/app/store/trades/open-position.interface.ts` - OpenPosition interface (may need exDate field type update)

**Database Schema Context:**

```prisma
model universe {
  ex_date DateTime? // Nullable field causing the issue
  // ... other fields
}
```

**Component Architecture:**

- OpenPositionsComponent extends BasePositionsComponent
- Uses OpenPositionsComponentService for business logic
- Data flows: Database → Service → Component → Template

### Technical Implementation Notes

**Template Fix Pattern:**

```html
<!-- Before: -->
{{ row.exDate | date : 'MM/dd/yyyy' }}

<!-- After: -->
{{ row.exDate ? (row.exDate | date : 'MM/dd/yyyy') : 'TBD' }}
```

**Service Fix Pattern:**

```typescript
// Before:
exDate: universe!.ex_date,

// After:
exDate: universe!.ex_date || null, // Explicit null handling

// And in getFormulaExDate:
if (!universe?.ex_date) {
  // Return default behavior or null handling
  return new Date(); // or appropriate fallback
}
const formulaExDate = new Date(universe.ex_date);
```

**Expected Yield/Target Gain Implications:**
When ex_date is null, the calculations should either:

- Use a reasonable default (current date + distribution frequency)
- Return 0 or null for calculated fields
- Display "N/A" in the UI for calculated columns

### Testing

**Test File Locations:**

- Component tests: `apps/rms/src/app/account-panel/open-positions/open-positions.component.spec.ts`
- Service tests: `apps/rms/src/app/account-panel/open-positions/open-positions-component.service.spec.ts`

**Testing Framework:** Vitest with Angular Testing Library

**Required Test Cases:**

1. Template rendering with null exDate values
2. Service calculations with null universe.ex_date
3. getFormulaExDate method with null input
4. Integration test with mixed null/valid ex-dates in position list
5. Regression test ensuring valid ex-dates still work correctly

**Testing Strategy:**

- Mock universe data with null ex_date values
- Test both null and valid scenarios in same test suite
- Verify no console errors during rendering
- Confirm calculated fields show appropriate fallback values

### Previous Story Context

This is a new epic focusing on UI robustness. No previous story dependencies, but builds on existing open positions functionality established in earlier epics.

## Change Log

| Date       | Version | Description            | Author             |
| ---------- | ------- | ---------------------- | ------------------ |
| 2025-09-23 | 1.0     | Initial story creation | Bob (Scrum Master) |

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

_Results from QA Agent review will be populated here_
