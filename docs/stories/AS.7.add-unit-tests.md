# Story AS.7: Add Comprehensive Unit Tests

**Status:** Draft

## Story

**As a** quality assurance engineer
**I want** comprehensive unit test coverage for all Global Summary functionality
**So that** we ensure code quality and prevent regressions

## Context

**Current System:**

- Stories AS.1-AS.6 have implemented TDD tests for specific features
- Need comprehensive unit tests for all component methods and edge cases
- Need integration tests for component and service interaction
- Need tests for error handling and boundary conditions

**Problem:**

- TDD tests focused on specific features during development
- Need broader coverage for all code paths
- Need tests for accessibility features
- Need tests for performance edge cases

## Acceptance Criteria

### Functional Requirements

1. [ ] Unit test coverage >80% for GlobalSummary component
2. [ ] Unit test coverage >80% for SummaryService
3. [ ] Tests cover all public methods
4. [ ] Tests cover all error conditions
5. [ ] Tests cover all edge cases
6. [ ] Tests verify accessibility features

### Technical Requirements

1. [ ] Tests follow AAA pattern
2. [ ] Tests are independent and deterministic
3. [ ] Tests have descriptive names
4. [ ] Mock dependencies properly
5. [ ] No `.skip` or `.only` in committed tests
6. [ ] All tests passing

## Tasks / Subtasks

- [ ] Review existing test coverage (AC: 1, 2)
  - [ ] Run coverage report for GlobalSummary
  - [ ] Run coverage report for SummaryService
  - [ ] Identify gaps in coverage
- [ ] Add component lifecycle tests (AC: 3)
  - [ ] Test `ngOnInit()` initialization sequence
  - [ ] Test `ngOnDestroy()` cleanup (if implemented)
  - [ ] Test component creation
- [ ] Add data transformation tests (AC: 3, 5)
  - [ ] Test `computePercentIncrease()` with various inputs
  - [ ] Test chart data transformation with edge cases
  - [ ] Test handling of null/undefined values
  - [ ] Test handling of negative values
  - [ ] Test handling of very large numbers
- [ ] Add error handling tests (AC: 4)
  - [ ] Test network errors
  - [ ] Test 404 responses
  - [ ] Test 500 responses
  - [ ] Test timeout scenarios
  - [ ] Test malformed API responses
- [ ] Add caching tests (AC: 3)
  - [ ] Test cache expiration
  - [ ] Test cache invalidation
  - [ ] Test concurrent requests
- [ ] Add accessibility tests (AC: 6)
  - [ ] Test ARIA labels
  - [ ] Test keyboard navigation
  - [ ] Test screen reader announcements
  - [ ] Test color contrast (if applicable)
- [ ] Add integration tests (AC: 3)
  - [ ] Test component + service integration
  - [ ] Test full data flow (init → load months → load summary → display)
  - [ ] Test refresh functionality
- [ ] Add edge case tests (AC: 5)
  - [ ] Test with zero values
  - [ ] Test with very large datasets
  - [ ] Test with missing optional fields
  - [ ] Test rapid month changes
- [ ] Verify all tests pass (AC: 6)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest with Angular Testing Library
- **Coverage Target:** >80% line coverage, >75% branch coverage
- **Test Pattern:** AAA (Arrange-Act-Assert)

### Technical Context

- Component: `apps/dms-material/src/app/global/global-summary.ts`
- Service: `apps/dms-material/src/app/global/services/summary.service.ts`
- Focus on comprehensive coverage beyond TDD tests
- Include accessibility testing

### Test Categories to Cover

**Component Tests:**

1. Lifecycle (`ngOnInit`, creation, destruction)
2. Data transformation (calculations, formatting)
3. User interactions (month selection, refresh)
4. Loading states (isLoading, isLoadingMonths)
5. Error states (hasError, hasMonthsError, errorMessage)
6. Signals and computed properties
7. Template rendering (conditional displays)

**Service Tests:**

1. HTTP request construction
2. HTTP response handling
3. Error handling and retries
4. Caching behavior
5. Parameter handling (accountId, month)

**Integration Tests:**

1. Component + Service full flow
2. Multiple sequential operations
3. State consistency across operations

### Example Additional Tests

```typescript
describe('GlobalSummary - Additional Coverage', () => {
  describe('Data Transformations', () => {
    it('should handle zero basis in percent increase calculation', () => {
      component.basis$.set(0);
      component.capitalGain$.set(1000);
      component.dividends$.set(500);

      // Should handle division by zero gracefully
      expect(component.percentIncrease$()).toBe(0);
    });

    it('should handle negative values gracefully', () => {
      component.ngOnInit();
      const req = httpMock.expectOne(/\/api\/summary/);
      req.flush({
        riskGroups: [{ name: 'Loss', amount: -1000, percentage: -10 }],
        basis: 10000,
        capitalGains: -500,
        dividends: 0,
      });

      expect(component.capitalGain$()).toBe(-500);
    });

    it('should format large numbers correctly', () => {
      component.basis$.set(1234567890);
      fixture.detectChanges();

      const basisElement = fixture.nativeElement.querySelector('.basis-value');
      expect(basisElement.textContent).toContain('$1,234,567,890');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on charts', () => {
      component.ngOnInit();
      // ... setup ...
      fixture.detectChanges();

      const chartContainer = fixture.nativeElement.querySelector('.chart-container');
      expect(chartContainer.getAttribute('aria-label')).toBe('Risk group allocation pie chart');
    });

    it('should announce loading state to screen readers', () => {
      component.ngOnInit();
      fixture.detectChanges();

      const loadingAnnouncement = fixture.nativeElement.querySelector('[aria-live="polite"]');
      expect(loadingAnnouncement).toBeDefined();
    });

    it('should be keyboard navigable', () => {
      fixture.detectChanges();
      const monthSelect = fixture.nativeElement.querySelector('mat-select');

      monthSelect.focus();
      expect(document.activeElement).toBe(monthSelect);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid month changes correctly', fakeAsync(() => {
      component.ngOnInit();
      // ... initial setup ...

      // Rapidly change months
      component.selectedMonth.setValue('2025-01');
      tick(100);
      component.selectedMonth.setValue('2025-02');
      tick(100);
      component.selectedMonth.setValue('2025-03');

      // Only the last request should be honored
      flush();
      // Verify final month is displayed
      expect(component.selectedMonth.value).toBe('2025-03');
    }));

    it('should handle very long risk group names', () => {
      const longName = 'A'.repeat(500);
      component.ngOnInit();

      const req = httpMock.expectOne(/\/api\/summary/);
      req.flush({
        riskGroups: [{ name: longName, amount: 1000, percentage: 100 }],
        basis: 1000,
        capitalGains: 0,
        dividends: 0,
      });

      fixture.detectChanges();
      const chartData = component.allocationData;
      expect(chartData.labels[0]).toBe(longName);
    });

    it('should handle empty string month value', () => {
      component.selectedMonth.setValue('');

      // Should not make API call with empty month
      httpMock.expectNone(/\/api\/summary/);
    });
  });

  describe('Performance', () => {
    it('should not make redundant API calls', () => {
      component.ngOnInit();

      const monthsReq = httpMock.expectOne('/api/summary/months');
      monthsReq.flush({ months: [{ label: '01/2025', value: '2025-01' }], currentMonth: '2025-01' });

      const summaryReq = httpMock.expectOne(/\/api\/summary/);
      summaryReq.flush({ riskGroups: [], basis: 0, capitalGains: 0, dividends: 0 });

      // Call refreshData multiple times rapidly
      component.refreshData();
      component.refreshData();
      component.refreshData();

      // Should only make one additional request due to caching
      const refreshReq = httpMock.expectOne(/\/api\/summary/);
      refreshReq.flush({ riskGroups: [], basis: 0, capitalGains: 0, dividends: 0 });

      httpMock.expectNone(/\/api\/summary/);
    });

    it('should handle 100+ risk groups efficiently', () => {
      const manyGroups = Array.from({ length: 100 }, (_, i) => ({
        name: `Group ${i}`,
        amount: 1000,
        percentage: 1,
      }));

      component.ngOnInit();
      const req = httpMock.expectOne(/\/api\/summary/);
      req.flush({
        riskGroups: manyGroups,
        basis: 100000,
        capitalGains: 0,
        dividends: 0,
      });

      fixture.detectChanges();

      const chartData = component.allocationData;
      expect(chartData.labels.length).toBe(100);
    });
  });
});
```

### Coverage Report Commands

```bash
# Run tests with coverage
pnpm nx run dms-material:test --coverage

# View coverage report
open coverage/index.html

# Coverage should show >80% for:
# - apps/dms-material/src/app/global/global-summary.ts
# - apps/dms-material/src/app/global/services/summary.service.ts
```

## Definition of Done

- [ ] Unit test coverage >80% for component
- [ ] Unit test coverage >80% for service
- [ ] All public methods tested
- [ ] All error conditions tested
- [ ] All edge cases tested
- [ ] Accessibility features tested
- [ ] No `.skip` or `.only` in tests
- [ ] All tests passing
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm nx run dms-material:test --coverage`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Coverage report reviewed
- [ ] Changes reviewed and approved

## Notes

- This story adds comprehensive coverage beyond TDD tests
- Focus on gaps, edge cases, and accessibility
- Ensure all tests are maintainable and deterministic
- Document any known limitations in coverage
- Consider adding property-based tests for calculations

## Related Stories

- **Previous:** Story AS.6 (Month/Year Selector Implementation)
- **Next:** Story AS.8 (Bug Fixes)
- **Epic:** Epic AS - Wire Up Global/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-02-27 | 1.0     | Initial creation | QA     |

---

## QA Results

*QA assessment will be recorded here after story review*

---

## Dev Agent Record

*This section will be populated during story implementation*
