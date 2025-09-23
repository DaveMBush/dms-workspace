# Epic T: Unified Ex-Date Data Source Migration

## Epic Goal

Migrate all ex-date and distribution data retrieval from CEFConnect API to Yahoo Finance API to create a unified data source strategy that supports both CEF and ETF symbols without requiring symbol-type-specific logic.

## Epic Description

**Existing System Context:**

- Current data sources: Mixed approach with Yahoo Finance for prices (`getLastPrice`) and CEFConnect for ex-date/distribution data (`getDistributions`)
- Technology stack: Fastify backend with axios-based API calls, rate limiting, and error handling
- Integration points: Universe management, screener sync, manual symbol updates, trading calculations

**Enhancement Details:**

- What's being changed: Replace CEFConnect API calls in `distribution-api.function.ts` with Yahoo Finance API calls for ex-date and distribution data
- How it integrates: Maintains existing function signatures and response formats while changing the underlying data source
- Success criteria: All symbol types (CEFs, ETFs, stocks) retrieve ex-date data from unified Yahoo Finance source with improved reliability and simplified maintenance

## Stories

1. **Story 1:** Migrate distribution data retrieval from CEFConnect to Yahoo Finance API with backward compatibility and comprehensive testing

## Compatibility Requirements

- [x] Existing `getDistributions()` function signature remains unchanged
- [x] Response format (`DistributionResult`) maintains compatibility with all consumers
- [x] Error handling preserves graceful fallback behavior
- [x] Rate limiting adapted for Yahoo Finance API requirements
- [x] All existing universe and trading functionality unaffected

## Technical Constraints

- Yahoo Finance API integration using existing `yahoo-finance2` library
- Maintain existing error handling and retry logic patterns
- Preserve rate limiting to avoid API throttling
- All changes must pass existing lint, format, and test requirements
- Function signatures and interfaces remain unchanged for backward compatibility

## Success Metrics

- All symbol types (CEF, ETF, stock) successfully retrieve ex-date data from Yahoo Finance
- Elimination of CEFConnect API dependency and associated rate limiting complexity
- No regression in existing distribution data accuracy or availability
- Simplified codebase with single external API for all financial data

## Dependencies

- Builds on existing Yahoo Finance integration (`yahoo-finance2` library)
- Requires thorough testing with diverse symbol types
- May require Yahoo Finance API rate limiting adjustments

## Definition of Done

- [ ] CEFConnect API calls completely removed from codebase
- [ ] Yahoo Finance API handles all ex-date and distribution data retrieval
- [ ] All existing consumers of `getDistributions()` function unchanged
- [ ] Comprehensive test coverage for various symbol types (CEF, ETF, stock)
- [ ] All existing tests pass plus new test coverage for Yahoo Finance integration
- [ ] Documentation updated to reflect unified data source strategy
- [ ] Performance testing confirms acceptable response times and reliability

## Risk Mitigation

- **Data Quality Risk**: Validate Yahoo Finance ex-date accuracy against known CEF data
- **API Rate Limiting**: Implement appropriate rate limiting for Yahoo Finance quoteSummary calls
- **Backward Compatibility**: Ensure zero breaking changes for existing consumers
- **Performance Impact**: Monitor API response times and implement caching if needed
