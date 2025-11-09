# Epic Y: Fix Account Summary Pie Chart Filtering

## Epic Goal

Ensure account-specific summary screens display correct risk group allocation data (equities/income/tax-free) filtered by the selected account.

## Success Criteria

- Each account's summary screen shows pie chart data based only on that account's trades
- Global summary screen continues to show aggregate data across all accounts
- No regression in existing summary functionality

## Background

**Bug:** Account summary screen displays identical pie charts (equities/income/tax-free allocation) for all accounts instead of showing account-specific data.

**Root Cause:** The `getRiskGroupData()` function in `/apps/server/src/app/routes/summary/index.ts:127-157` does not filter by `account_id`. The SQL query aggregates risk group data across ALL accounts globally, ignoring the account context.

**Evidence:**

- User observation: Two accounts invested in single, different funds show identical pie charts
- Code analysis: `getRiskGroupData()` SQL query lacks `WHERE t.accountId = ?` clause
- Comparison: Other summary data (deposits, dividends, capitalGains) correctly filters by account via `calculateSummaryData()` pattern

## Affected Components

- **Server-side:** `/apps/server/src/app/routes/summary/index.ts` (lines 127-157, 300-305)
- **Client-side:** No changes needed - components correctly pass `account_id`
- **Database:** No schema changes needed - relationships already exist

## Stories

- [Story Y1: Update getRiskGroupData to Filter by Account](../stories/Y.1.update-get-risk-group-data-filter.md)
- [Story Y2: Add Tests for Account-Specific Risk Group Calculations](../stories/Y.2.add-tests-risk-group-calculations.md)
- [Story Y3: Verify Fix and Run Full Test Suite](../stories/Y.3.verify-fix-and-run-tests.md)
