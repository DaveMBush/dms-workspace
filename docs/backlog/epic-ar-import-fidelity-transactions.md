# Epic AR: Implement Fidelity Transaction Import

## Epic Goal

Allow users to import transaction data from Fidelity CSV files.

## Epic Description

Creates import routine to parse Fidelity transaction exports and populate trades/dividends.

## Notes:

- The name of the Account in the Account column matches the name field in the Accounts table.
- Purchase of shares should be treated the same as how we treat them manually. Refer to the 'Open Positions' tab for an account. Add 'Open Position' button.
- Sales of shares should be treated the same as how we treat them manually. Refer to the 'Open Positions' tab where we fill in the 'Sell' and 'Sell Date'. Attempt to match the number of shares sold to the number of shares in an existing open position.
- If there is no existing matching record for number of shares, break an existing record or multiple records, into multiple records so you can match up the sell to the records.
- Dividends should be treated the same as how we treat them manually. Refer to the 'Dividends Deposits' tab for an account. Add 'Add Dividend Deposit' button.
- Cash deposits should be treated the same as how we treat them manually. Refer to the 'Dividend Deposits' tab for an account.
- Dividends and Cash Deposits are added by the same screen.
- Ask, using .github/prompts/prompt.sh, if it is unclear how to handle a row in the CSV. If there is a row that doesn't fit into one of the above categories, ask for clarification on how to handle it.

## Stories

1. **Story AR.1-TDD:** Write RED tests for Fidelity CSV parser and data mapper
2. **Story AR.1:** Implement Fidelity CSV parser and data mapper
3. **Story AR.2-TDD:** Write RED tests for import service and backend endpoint
4. **Story AR.2:** Create import service and backend endpoint
5. **Story AR.3-TDD:** Write RED tests for import UI dialog
6. **Story AR.3:** Build import UI dialog on Global/Universe screen
7. **Story AR.4-TDD:** Write RED tests for file upload and processing
8. **Story AR.4:** Implement file upload and processing
9. **Story AR.5-TDD:** Write RED tests for validation and error reporting
10. **Story AR.5:** Add validation and error reporting
11. **Story AR.6:** Add e2e tests for import flow
12. **Story AR.7:** Bug fixes for completed epic stories
13. **Story AR.8:** Unit tests for CUSIP lookup caching
14. **Story AR.9:** Implement CUSIP lookup caching with database persistence
15. **Story AR.10:** CUSIP cache backend API (statistics, management, cleanup, audit logging)
16. **Story AR.11:** CUSIP cache admin UI and E2E tests

## Dependencies

- Epic AN (Universe table working)

## Priority

**Medium**

## Estimated Effort

4-5 days (AR.1-AR.7)
+2-3 days (AR.8-AR.11 - CUSIP caching)

## Notes on AR.8-AR.11 (CUSIP Caching)

These stories add database-backed caching for CUSIP→Symbol lookups to improve import performance:

- **AR.8** writes comprehensive unit tests for the caching layer (TDD RED phase)
- **AR.9** implements the cache using Prisma, including:
  - New `cusip_cache` database table
  - `CusipCacheService` for cache operations
  - Integration with `resolve-cusip.function` to check cache before API calls
  - Cache updates after successful OpenFIGI/Yahoo Finance resolutions
- **AR.10** adds backend management API:
  - Admin API endpoints for cache statistics and search
  - Cache cleanup/archival for old entries
  - Audit logging for troubleshooting
  - Manual cache management (add/edit/delete)
- **AR.11** completes the feature with admin UI:
  - Dashboard showing cache statistics
  - Search interface by CUSIP or symbol
  - Forms for manual cache management
  - Recent activity display
  - Complete E2E test coverage

**Benefits:**
- 50%+ faster imports for files with previously seen securities
- 70%+ reduction in external API calls (OpenFIGI, Yahoo Finance)
- Reduced risk of API rate limiting
- Better system reliability (less dependency on external APIs)
- Admin visibility and control over cache

**Closed-End Fund Focus:**
- Cache warming not included since system focuses on closed-end funds, not broad equity universe
