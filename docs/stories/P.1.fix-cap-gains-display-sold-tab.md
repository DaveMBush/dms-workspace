# Story P.1: Fix Capital Gains Display in Sold Tab

## Status

Ready for Review

## Story

**As a** trader using the DMS system,
**I want** the Cap Gains$ and Cap Gains% columns in the Sold tab to display accurate calculations,
**so that** I can clearly see the profit/loss for my completed trades.

## Acceptance Criteria

1. Cap Gains$ column displays accurate dollar amount calculations (sell*price * quantity - buy*price * quantity)
2. Cap Gains% column displays accurate percentage calculations ((sell_price - buy_price) / buy_price \* 100)
3. Both columns handle edge cases appropriately (zero cost basis, very small values)
4. Calculations update correctly when buy/sell prices are edited inline
5. No NaN, Infinity, or undefined values are displayed in either column
6. Values display with appropriate currency and percentage formatting

## Tasks / Subtasks

- [x] **Task 1: Investigate current capital gains calculation issues** (AC: 1, 2, 5)

  - [x] Debug why capital gains might not be displaying correctly
  - [x] Check for data issues causing NaN or undefined calculations
  - [x] Verify the calculation logic in createClosedPosition method
  - [x] Test with various buy/sell price combinations

- [x] **Task 2: Fix calculation edge cases** (AC: 3, 5)

  - [x] Handle division by zero in percentage calculations (buy price = 0)
  - [x] Handle negative buy prices or sell prices appropriately
  - [x] Add guards against NaN and Infinity values
  - [x] Implement fallback values for invalid calculations

- [x] **Task 3: Ensure real-time updates** (AC: 4)

  - [x] Verify calculations update when buy price is edited
  - [x] Verify calculations update when sell price is edited
  - [x] Test inline editing doesn't break calculations
  - [x] Confirm quantity changes recalculate properly

- [x] **Task 4: Improve display formatting** (AC: 6)

  - [x] Ensure proper currency formatting for Cap Gains$
  - [x] Ensure proper percentage formatting for Cap Gains%
  - [x] Handle very large and very small numbers appropriately
  - [x] Add appropriate decimal places for readability

- [x] **Task 5: Add comprehensive testing** (AC: 1-6)
  - [x] Test calculations with various trade scenarios
  - [x] Test edge cases (zero, negative, very large values)
  - [x] Test inline editing updates
  - [x] Regression test to ensure other columns still work

## Dev Notes

### Current Implementation Analysis

The capital gains calculations are already implemented in the codebase:

**Service Implementation (sold-positions-component.service.ts:130-131):**

```typescript
capitalGain: (trade.sell - trade.buy) * trade.quantity,
capitalGainPercentage: ((trade.sell - trade.buy) / trade.buy) * 100,
```

**Template Display (sold-positions.component.html:145-146):**

```html
<td>{{ row.capitalGain | currency : 'USD' : 'symbol' : '1.2-4' }}</td>
<td>{{ row.capitalGainPercentage | number : '1.2-2' }}%</td>
```

**Interface Definition (closed-position.interface.ts:10-11):**

```typescript
capitalGain: number;
capitalGainPercentage: number;
```

### Potential Issues to Investigate

1. **Division by Zero**: When `trade.buy` is 0, the percentage calculation will result in Infinity
2. **Data Type Issues**: If buy/sell values are stored as strings instead of numbers
3. **Null/Undefined Values**: Missing buy or sell prices causing NaN calculations
4. **Precision Issues**: Very small numbers might display as 0 due to rounding
5. **Cache Issues**: The `closedPositionCache` might not be updating when values change

### Source Tree Information

**Affected Files:**

- `apps/dms/src/app/account-panel/sold-positions/sold-positions-component.service.ts` - Calculation logic
- `apps/dms/src/app/account-panel/sold-positions/sold-positions.component.html` - Display template
- `apps/dms/src/app/store/trades/closed-position.interface.ts` - Type definitions
- `apps/dms/src/app/account-panel/sold-positions/sold-positions.component.ts` - Component logic

**Key Methods:**

- `createClosedPosition()` - Lines 107-133: Core calculation logic
- `selectClosedPositions()` - Lines 25-52: Position selection and filtering
- `isValidSoldTrade()` - Lines 60-67: Validation logic

### Technical Investigation Areas

1. **Calculation Validation:**

   ```typescript
   // Current implementation
   capitalGain: (trade.sell - trade.buy) * trade.quantity,
   capitalGainPercentage: ((trade.sell - trade.buy) / trade.buy) * 100,

   // Should be enhanced to:
   capitalGain: this.calculateCapitalGain(trade),
   capitalGainPercentage: this.calculateCapitalGainPercentage(trade),
   ```

2. **Edge Case Handling:**

   - Zero buy price: Should show percentage as "N/A" or handle specially
   - Negative values: Ensure they display correctly
   - Very large numbers: Consider formatting constraints

3. **Data Flow Verification:**

   - Check if trade.buy and trade.sell are numeric
   - Verify quantity is properly included in calculations
   - Confirm cache updates when values change

4. **Template Debugging:**
   - Add debug display to show raw values
   - Verify pipe formatting isn't causing display issues
   - Check if Angular change detection is working properly

### Testing Strategy

**Unit Tests:**

- Test calculation methods with various input combinations
- Test edge cases (zero, negative, very large values)
- Mock trade data with problematic values

**Integration Tests:**

- Test full data flow from service to template
- Test inline editing updates
- Verify cache invalidation works correctly

**Manual Testing Scenarios:**

1. Create sold position with normal buy/sell prices
2. Create sold position with zero buy price
3. Edit buy/sell prices inline and verify updates
4. Test with very large and very small numbers
5. Check console for any JavaScript errors

### Debugging Approach

1. **Add Logging:** Temporarily log calculation inputs and outputs
2. **Template Debugging:** Add debug template to show raw values
3. **Cache Investigation:** Check if cache is preventing updates
4. **Data Validation:** Verify trade data types and values

## Change Log

| Date       | Version | Description            | Author             |
| ---------- | ------- | ---------------------- | ------------------ |
| 2025-09-23 | 1.0     | Initial story creation | Bob (Scrum Master) |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

Claude Sonnet 4 (claude-sonnet-4-20250514)

### Debug Log References

Investigation findings:

- Capital gains calculated once in createClosedPosition() method
- No recalculation when buy/sell prices edited inline
- Division by zero when buy price is 0 causing Infinity values
- No error handling for NaN or invalid calculations

### Completion Notes List

- Task 1: Investigation complete - identified calculation and update issues
- Task 2: Created safe calculation helper functions with proper error handling
- Task 3: Implemented real-time recalculation on edits via computed signals
- Task 4: Added proper error handling and formatting including N/A for zero buy price
- Task 5: Added comprehensive tests for all edge cases and integration scenarios

### File List

Modified:

- apps/dms/src/app/account-panel/sold-positions/sold-positions-component.service.ts
- apps/dms/src/app/account-panel/sold-positions/sold-positions.component.ts
- apps/dms/src/app/account-panel/sold-positions/sold-positions.component.html

Created:

- apps/dms/src/app/account-panel/sold-positions/capital-gains-calculator.function.ts
- apps/dms/src/app/account-panel/sold-positions/capital-gains-result.interface.ts
- apps/dms/src/app/account-panel/sold-positions/trade-data.interface.ts
- apps/dms/src/app/account-panel/sold-positions/is-valid-number.function.ts
- apps/dms/src/app/account-panel/sold-positions/format-capital-gains-percentage.function.ts
- apps/dms/src/app/account-panel/sold-positions/format-capital-gains-dollar.function.ts
- apps/dms/src/app/account-panel/sold-positions/capital-gains-calculator.function.spec.ts
- apps/dms/src/app/account-panel/sold-positions/sold-positions.component.spec.ts

## QA Results

_Results from QA Agent review will be populated here_
