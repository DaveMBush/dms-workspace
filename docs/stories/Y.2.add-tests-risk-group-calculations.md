# Story Y2: Add Tests for Account-Specific Risk Group Calculations

Description: Create comprehensive unit and integration tests for the account-specific risk group filtering functionality to prevent regression and ensure data accuracy across different account scenarios.

## Acceptance Criteria

### Unit Tests for `getRiskGroupData()`

Create test file with the following test cases:

- Test with `accountId` provided:

  - Verify function returns only trades for the specified account
  - Verify risk group totals are calculated correctly for single account
  - Verify no trades from other accounts are included in results

- Test with `accountId` undefined:

  - Verify function returns trades from all accounts
  - Verify risk group totals aggregate across all accounts
  - Verify global summary calculations are correct

- Test with multiple accounts having different risk groups:

  - Account A has only Equities trades
  - Account B has only Income trades
  - Verify Account A results show Equities only (Income = 0)
  - Verify Account B results show Income only (Equities = 0)
  - Verify global results show both Equities and Income

- Test with account having no trades:

  - Verify function returns empty array or zero values
  - Verify no errors are thrown

- Test edge cases:
  - Test with invalid/non-existent accountId (should return empty results)
  - Test with accountId that has trades but outside the date range (should return empty)
  - Test date boundary conditions (trades exactly on start/end dates)

### Integration Tests for `/api/summary` Endpoint

Add integration test cases:

- Account-specific request returns account-specific pie chart data:

  - Make request to `/api/summary?month=2025-01&account_id=acc123`
  - Verify response `equities`, `income`, `tax_free_income` values match account data only

- Global request (no account_id) returns aggregated data:

  - Make request to `/api/summary?month=2025-01`
  - Verify response aggregates all accounts

- Two different accounts return different pie chart values:
  - Request summary for Account A
  - Request summary for Account B
  - Verify `equities`, `income`, `tax_free_income` values differ when holdings differ

### Test Data Setup

Create test fixtures with representative scenarios:

- **Account A (Equities-only):**

  - 10 trades, all linked to universe items with risk group "Equities"
  - Total cost basis: $10,000
  - Expected pie chart: 100% Equities, 0% Income, 0% Tax Free

- **Account B (Income-only):**

  - 5 trades, all linked to universe items with risk group "Income"
  - Total cost basis: $5,000
  - Expected pie chart: 0% Equities, 100% Income, 0% Tax Free

- **Account C (Mixed):**

  - 5 trades Equities ($5,000), 3 trades Income ($3,000), 2 trades Tax Free ($2,000)
  - Expected pie chart: 50% Equities, 30% Income, 20% Tax Free

- **Global View:**
  - Aggregates Accounts A + B + C
  - Expected totals: $15,000 Equities, $8,000 Income, $2,000 Tax Free
  - Expected percentages: 60% Equities, 32% Income, 8% Tax Free

## Technical Implementation Details

### Test File Location

Create new test file:

- `/apps/server/src/app/routes/summary/get-risk-group-data.function.spec.ts`

Optional: Add integration tests to:

- `/apps/server/src/app/routes/summary/index.spec.ts` (if exists)
- Or create new integration test file

### Test Framework

- Use Vitest for all tests (per project standards)
- Use database test fixtures or mocks as appropriate
- Ensure tests use isolated test database (not production database)

### Sample Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getRiskGroupData } from './index';

describe('getRiskGroupData', () => {
  describe('with accountId parameter', () => {
    it('should return only trades for specified account', async () => {
      // Test implementation
    });

    it('should calculate risk group totals for single account', async () => {
      // Test implementation
    });
  });

  describe('without accountId parameter', () => {
    it('should return trades from all accounts', async () => {
      // Test implementation
    });

    it('should aggregate risk group totals across all accounts', async () => {
      // Test implementation
    });
  });

  describe('with multiple accounts having different risk groups', () => {
    it('should segregate risk groups by account correctly', async () => {
      // Test implementation
    });
  });

  describe('edge cases', () => {
    it('should handle account with no trades', async () => {
      // Test implementation
    });

    it('should handle invalid accountId gracefully', async () => {
      // Test implementation
    });
  });
});
```

## Dependencies

- Story Y1 must be completed (function signature and filtering logic implemented)
- Vitest testing framework
- Test database setup and fixtures
- Understanding of existing test patterns in the codebase

## Estimated Effort

2-3 hours
