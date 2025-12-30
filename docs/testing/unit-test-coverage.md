# Unit Test Coverage Standards

## Overview

This document defines unit test coverage requirements for the DMS Workspace project, specifically for the Universe sync from Screener feature implementation.

## Coverage Thresholds

### Overall Coverage Requirements

- **Minimum Coverage**: 85% line coverage
- **Target Coverage**: 90% line coverage
- **Function Coverage**: 95% function coverage
- **Branch Coverage**: 80% branch coverage

### Component-Specific Requirements

#### Core Sync Logic (`apps/server/src/app/routes/universe/sync-from-screener/`)

- **Target Coverage**: 95% line coverage
- **Critical Functions**: 100% coverage required
  - `selectEligibleScreener`
  - `upsertUniverse`
  - `markExpired`
  - `processSyncTransaction`
  - `handleSyncRequest`

#### Utility Functions (`apps/server/src/app/routes/settings/common/`)

- **Target Coverage**: 90% line coverage
- **Critical Functions**: 95% coverage required
  - `getLastPrice`
  - `getDistributions`

#### Logger Utilities (`apps/server/src/utils/`)

- **Target Coverage**: 85% line coverage
- **SyncLogger Class**: 90% coverage required

## Test Categories

### 1. Selection Logic Tests

- Eligible screener record selection criteria
- Database query validation
- Transaction boundary testing

### 2. Upsert Mapping Tests

- New record creation logic
- Existing record update logic
- Data mapping and transformation
- External API integration (mocked)

### 3. Expire Logic Tests

- Symbol expiration marking
- Batch update operations
- Transaction safety

### 4. Idempotency Tests

- Repeated operation consistency
- State management validation
- Error recovery scenarios

### 5. Error Handling Tests

- Database connection failures
- External API failures
- Partial operation failures
- Transaction rollback scenarios

## Running Tests

### Local Development

```bash
# Run all unit tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test sync-from-screener

# Watch mode for development
pnpm test -- --watch
```

### CI Pipeline Requirements

```bash
# CI should run these commands in sequence:
pnpm install
pnpm test -- --coverage --reporter=json
pnpm lint
pnpm build
```

## Coverage Reporting

### Required Coverage Reports

- Line coverage percentage
- Function coverage percentage
- Branch coverage percentage
- Uncovered lines report

### Coverage Enforcement

- CI pipeline should fail if coverage drops below minimum thresholds
- Pull requests require coverage report in comments
- Coverage trending should be monitored over time

## Test Structure Standards

### File Naming Convention

- Unit tests: `*.spec.ts`
- Integration tests: `*.integration.spec.ts`
- Test utilities: `*.test-utils.ts`

### Test Organization

```typescript
describe('ComponentName', () => {
  describe('method1', () => {
    test('should handle normal case', () => {});
    test('should handle edge case', () => {});
    test('should handle error case', () => {});
  });

  describe('method2', () => {
    // Similar structure
  });
});
```

### Mock Strategy

- Mock external dependencies (APIs, database)
- Use dependency injection for testability
- Mock file system operations
- Preserve business logic in pure functions where possible

## Excluded from Coverage

### Files Excluded

- Configuration files (\*.config.ts)
- Type definitions (\*.types.ts)
- Test files themselves (\*.spec.ts)
- Build output directories

### Code Exclusions

```typescript
// Coverage exclusion patterns
/* istanbul ignore next */
// or
/* c8 ignore start */
/* c8 ignore stop */
```

## Quality Gates

### Definition of Done for Tests

- All new functions have corresponding unit tests
- Edge cases are covered
- Error scenarios are tested
- Mocks are properly configured
- Tests are deterministic and fast

### Review Criteria

- Test readability and maintainability
- Appropriate use of test doubles
- Comprehensive scenario coverage
- Performance of test suite (< 30 seconds total)

## Integration with CI

### Pre-commit Hooks

- Run affected tests before commit
- Ensure coverage thresholds are met
- Lint test files

### Pull Request Requirements

- Coverage report must be generated
- No decrease in overall coverage percentage
- New code must meet coverage thresholds
- All tests must pass

## Monitoring and Metrics

### Coverage Tracking

- Daily coverage reports
- Coverage trend analysis
- Identification of coverage gaps
- Regular review of coverage quality

### Test Performance

- Test execution time monitoring
- Flaky test identification
- Test suite optimization recommendations

---

**Related Documentation:**

- [Logging and Metrics Extraction](../logging-metrics-extraction.md)
- [Monitoring and Alerts](../monitoring-and-alerts.md)
- [Rollback Runbook](../rollback-runbook.md)
