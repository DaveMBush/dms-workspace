# Story H.4: Integration testing and validation

## Status

Draft

## Story

**As a** development team,  
**I want** end-to-end integration testing and validation of the average purchase yield feature,  
**so that** I can ensure the complete feature works correctly across all user scenarios and maintains system integrity.

## Acceptance Criteria

1. Verify calculations match manual computation for sample data
2. Test with different account selections
3. Validate sorting behavior across both yield columns
4. Test filter interactions (if yield filtering applies to new column)
5. Ensure no regression in existing yield functionality
6. Test performance with large datasets

## Tasks / Subtasks

- [ ] **Task 1: Create comprehensive integration test scenarios** (AC: 1, 2)

  - [ ] Set up realistic test data with multiple accounts and trade histories
  - [ ] Create manual calculation verification for test scenarios
  - [ ] Test complete data flow from database to UI display
  - [ ] Validate calculations against known correct values
  - [ ] Test account switching with immediate recalculation

- [ ] **Task 2: Test yield column sorting integration** (AC: 3)

  - [ ] Test single-column sorting for both market yield and average purchase yield
  - [ ] Test multi-column sorting scenarios (e.g., yield + symbol)
  - [ ] Test sort stability and consistency across page refreshes
  - [ ] Validate sort performance with large datasets
  - [ ] Test sort behavior when switching between accounts

- [ ] **Task 3: Test filter functionality integration** (AC: 4)

  - [ ] Determine if existing yield filter should apply to average purchase yield
  - [ ] Test filter behavior with both yield columns if applicable
  - [ ] Test filter combinations (yield + symbol + risk group)
  - [ ] Validate filter performance and accuracy
  - [ ] Test filter persistence across account changes

- [ ] **Task 4: Regression testing for existing functionality** (AC: 5)

  - [ ] Verify original yield calculations remain unchanged
  - [ ] Test existing universe table functionality (sorting, filtering, display)
  - [ ] Test trading views and position calculations are unaffected
  - [ ] Test settings and manual update flows continue to work
  - [ ] Validate no performance degradation in existing features

- [ ] **Task 5: Performance testing and optimization** (AC: 6)

  - [ ] Test with large datasets (1000+ universe entries, extensive trade history)
  - [ ] Measure calculation performance impact
  - [ ] Test memory usage with large account portfolios
  - [ ] Validate responsive UI performance during calculations
  - [ ] Test concurrent user scenarios if applicable

- [ ] **Task 6: End-to-end user workflow testing** (AC: 1, 2, 3, 4)

  - [ ] Test complete user journey from login to yield comparison
  - [ ] Test mobile responsiveness and touch interactions
  - [ ] Test keyboard navigation and accessibility
  - [ ] Validate error handling and edge cases in real scenarios
  - [ ] Test data refresh and real-time updates

- [ ] **Task 7: Production readiness validation** (AC: 5, 6)
  - [ ] Run full build process: `pnpm nx run rms:build:production`
  - [ ] Run linting: `pnpm nx run rms:lint`
  - [ ] Run all tests: `pnpm nx run rms:test`
  - [ ] Run server tests: `pnpm nx run server:test`
  - [ ] Run server lint: `pnpm nx run server:lint`
  - [ ] Run server build: `pnpm nx run server:build:production`
  - [ ] Run e2e lint: `pnpm nx run rms-e2e:lint`

## Dev Notes

### Previous Story Context

**Dependencies:** Stories H.1, H.2, and H.3 must be completed first. This story validates the complete implementation of the average purchase yield feature.

### Integration Testing Architecture

**Source: [architecture/ci-and-testing.md]**

- **Strategy:** Integration tests using Fastify + Prisma on temp SQLite file
- **E2E Testing:** Optional UI smoke tests for dialog and table rendering
- **Test Data:** Use per-test SQLite file via `DATABASE_URL=file:./test.db`
- **Coverage:** Maintain overall thresholds (85% lines, 75% branches, 85% functions)

**Source: [package.json build commands]**

- Production build commands defined in package.json scripts
- All commands must succeed for story completion
- Build validation is part of acceptance criteria

### File Locations for Integration Tests

**Test Files to Create/Modify:**

1. `/apps/rms/src/app/global/global-universe/universe-integration.spec.ts` - End-to-end feature testing
2. `/apps/rms/src/app/global/global-universe/yield-calculation-performance.spec.ts` - Performance tests
3. `/apps/rms-e2e/src/universe-yield.e2e-spec.ts` - E2E user workflow tests
4. `/apps/server/src/app/routes/universe/universe-integration.spec.ts` - Server-side integration

### Technical Implementation Details

**Integration Test Data Setup:**

```typescript
// Realistic test scenario
const testAccounts = [
  { id: 'acc1', name: 'Growth Account' },
  { id: 'acc2', name: 'Income Account' },
];

const testUniverses = [
  {
    symbol: 'VTI',
    distribution: 0.58,
    distributions_per_year: 4,
    last_price: 245.5,
    risk_group_id: 'equity-etf',
  },
  // ... more test data
];

const testTrades = [
  // Account 1 - VTI trades at different prices
  { universeId: 'vti-id', accountId: 'acc1', buy: 220.0, quantity: 50, sell_date: null },
  { universeId: 'vti-id', accountId: 'acc1', buy: 235.75, quantity: 30, sell_date: null },
  // Account 2 - VTI trades
  { universeId: 'vti-id', accountId: 'acc2', buy: 240.0, quantity: 100, sell_date: null },
  // ... more trades
];
```

**Manual Calculation Verification:**

```typescript
// VTI Account 1 calculations:
// Weighted avg: (220*50 + 235.75*30) / 80 = 226.09
// Market yield: 100 * 4 * (0.58 / 245.50) = 0.945%
// Avg purchase yield: 100 * 4 * (0.58 / 226.09) = 1.026%
```

**Performance Test Scenarios:**

- Test with 1,000+ universe entries
- Test with 10,000+ trade records across multiple accounts
- Test sorting performance with large datasets
- Test memory usage during extensive calculations
- Test UI responsiveness during heavy computation

**Regression Test Coverage:**

- All existing universe table functionality
- Position calculations in other components
- Trading views and account management
- Settings and configuration features
- Data refresh and sync operations

### Production Build Validation Process

**Required Command Sequence (All Must Pass):**

```bash
# Frontend validation
pnpm nx run rms:build:production    # Angular production build
pnpm nx run rms:lint               # ESLint validation
pnpm nx run rms:test               # Unit tests with coverage

# Backend validation
pnpm nx run server:test            # Server unit tests
pnpm nx run server:lint            # Server linting
pnpm nx run server:build:production # Server production build

# E2E validation
pnpm nx run rms-e2e:lint          # E2E test linting
```

**Build Validation Criteria:**

- Zero build errors or warnings
- All lint rules pass without exceptions
- All tests pass with required coverage thresholds
- No performance regression in build times
- Bundle size remains within acceptable limits

### Testing Standards and Quality Gates

**Source: [architecture/ci-and-testing.md]**

**Integration Test Focus:**

- Complete user workflows from data input to display
- Cross-component data flow validation
- Performance under realistic load conditions
- Error handling and recovery scenarios

**E2E Test Coverage:**

- User can see both yield columns in universe table
- Sorting works correctly for both yield types
- Account switching updates calculations immediately
- Mobile and desktop responsive behavior
- Accessibility compliance (keyboard navigation, screen readers)

**Quality Gates:**

- All automated tests pass
- Manual testing checklist completed
- Performance benchmarks met
- No critical or high-severity issues
- Documentation updated and accurate

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
