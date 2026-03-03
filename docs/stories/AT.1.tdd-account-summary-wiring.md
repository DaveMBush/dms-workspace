# Story AT.1: TDD - Unit Tests for Account Summary Service Wiring

**Status:** Approved

## Story

**As a** frontend developer
**I want** comprehensive unit tests for account summary service integration
**So that** I can ensure the component correctly connects to backend data with accountId filter before implementation

## Context

**Current System:**

- Account summary component exists at `apps/dms-material/src/app/accounts/account-summary/account-summary.ts`
- Component is currently empty/not wired to backend
- Backend `/api/summary` endpoint exists and accepts optional `?accountId=xxx` parameter
- Global summary component at `apps/dms-material/src/app/global/global-summary.ts` provides pattern to follow
- SummaryService exists from Epic AS but needs to accept accountId parameter

**Problem:**

- Component needs to display account-specific summary data
- Must pass accountId to backend for filtering
- Need to verify proper integration with backend before implementation
- Must handle loading states and error conditions

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify component creates/injects summary service
2. [ ] Tests verify service calls `/api/summary?accountId=xxx` endpoint on init
3. [ ] Tests verify accountId is passed from route parameter
4. [ ] Tests verify data transformation from API to component signals
5. [ ] Tests verify loading state handling
6. [ ] Tests verify error state handling

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA pattern (Arrange-Act-Assert)
3. [ ] Tests are disabled after verification they run RED (use `.skip`)
4. [ ] Mock HTTP calls properly
5. [ ] Tests cover all data transformation logic

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Create/update `apps/dms-material/src/app/accounts/account-summary/account-summary.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AccountSummary } from './account-summary';

describe('AccountSummary - Service Integration', () => {
  let component: AccountSummary;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccountSummary],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'accounts/:id',
            component: AccountSummary,
          },
        ]),
      ],
    });

    const fixture = TestBed.createComponent(AccountSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe.skip('Account Summary Service Integration', () => {
    it('should inject summary service on initialization', () => {
      expect(component['summaryService']).toBeDefined();
    });

    it('should call /api/summary with accountId parameter on init', () => {
      // Set mock accountId
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      expect(req.request.method).toBe('GET');

      req.flush({
        deposits: 100000,
        dividends: 2500,
        capitalGains: 5000,
        equities: 50000,
        income: 30000,
        tax_free_income: 20000,
      });
    });

    it('should get accountId from route parameter', () => {
      // Mock ActivatedRoute with accountId param
      expect(component['accountId']).toBeDefined();
    });

    it('should transform API response to allocation chart data', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush({
        deposits: 100000,
        dividends: 2500,
        capitalGains: 5000,
        equities: 50000,
        income: 30000,
        tax_free_income: 20000,
      });

      const chartData = component.allocationChartData();
      expect(chartData.labels).toEqual(['Equities', 'Income', 'Tax Free']);
      expect(chartData.datasets[0].data).toEqual([50000, 30000, 20000]);
    });

    it('should display loading state while fetching data', () => {
      component['accountId'] = '123';
      expect(component.loading()).toBe(false);

      component.ngOnInit();
      expect(component.loading()).toBe(true);

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush({
        deposits: 100000,
        dividends: 2500,
        capitalGains: 5000,
        equities: 50000,
        income: 30000,
        tax_free_income: 20000,
      });

      expect(component.loading()).toBe(false);
    });

    it('should handle API errors gracefully', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.error(new ProgressEvent('error'), { status: 500 });

      expect(component.error()).toBeTruthy();
      expect(component.loading()).toBe(false);
    });
  });

  describe.skip('Graph Integration', () => {
    it('should call /api/summary/graph with accountId', () => {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');

      const req = httpMock.expectOne('/api/summary/graph?month=2025-03&accountId=123');
      expect(req.request.method).toBe('GET');
      req.flush([
        { month: '2025-01', deposits: 10000, dividends: 100, capitalGains: 200 },
        { month: '2025-02', deposits: 20000, dividends: 150, capitalGains: 300 },
        { month: '2025-03', deposits: 30000, dividends: 200, capitalGains: 400 },
      ]);
    });

    it('should transform graph data for performance chart', () => {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');

      const req = httpMock.expectOne('/api/summary/graph?month=2025-03&accountId=123');
      req.flush([
        { month: '2025-01', deposits: 10000, dividends: 100, capitalGains: 200 },
        { month: '2025-02', deposits: 20000, dividends: 150, capitalGains: 300 },
        { month: '2025-03', deposits: 30000, dividends: 200, capitalGains: 400 },
      ]);

      const chartData = component.performanceChartData();
      expect(chartData.labels).toHaveLength(3);
      expect(chartData.datasets).toHaveLength(3);
    });
  });

  describe.skip('Available Months', () => {
    it('should fetch available months with accountId', () => {
      component['accountId'] = '123';

      const req = httpMock.expectOne('/api/summary/months?accountId=123');
      expect(req.request.method).toBe('GET');
      req.flush([
        { month: '2025-01', label: 'January 2025' },
        { month: '2025-02', label: 'February 2025' },
        { month: '2025-03', label: 'March 2025' },
      ]);
    });

    it('should populate month selector options', () => {
      component['accountId'] = '123';

      const req = httpMock.expectOne('/api/summary/months?accountId=123');
      req.flush([
        { month: '2025-01', label: 'January 2025' },
        { month: '2025-02', label: 'February 2025' },
      ]);

      expect(component.monthOptions()).toHaveLength(2);
    });
  });

  describe.skip('Error Handling', () => {
    it('should handle summary fetch errors', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.error(new ProgressEvent('error'));

      expect(component.error()).toBeTruthy();
    });

    it('should handle graph fetch errors', () => {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');

      const req = httpMock.expectOne('/api/summary/graph?month=2025-03&accountId=123');
      req.error(new ProgressEvent('error'));

      expect(component.error()).toBeTruthy();
    });

    it('should handle months fetch errors', () => {
      component['accountId'] = '123';

      const req = httpMock.expectOne('/api/summary/months?accountId=123');
      req.error(new ProgressEvent('error'));

      expect(component.error()).toBeTruthy();
    });

    it('should display default data on error', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.error(new ProgressEvent('error'));

      const chartData = component.allocationChartData();
      expect(chartData.datasets[0].data).toEqual([0, 0, 0]);
    });
  });
});
```

### Step 2: Run Tests to Verify RED Phase

```bash
pnpm test:dms-material account-summary
```

Tests should FAIL since implementation doesn't exist yet.

### Step 3: Disable Tests

After verifying tests run and fail appropriately, all new test blocks should use `.skip` to prevent CI failures.

## Tasks / Subtasks

- [ ] Create comprehensive test suite for AccountSummary component (AC: F1-F6)
  - [ ] Service injection tests
  - [ ] HTTP call tests with accountId parameter
  - [ ] Route parameter handling tests
  - [ ] Data transformation tests
  - [ ] Loading state tests
  - [ ] Error handling tests
- [ ] Create tests for graph data fetching with accountId
- [ ] Create tests for available months fetching
- [ ] Run tests to verify they FAIL (RED phase)
- [ ] Disable all new tests with `.skip`
- [ ] Verify existing tests still pass

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Mock HTTP:** Use HttpTestingController from Angular
- **RED Phase:** Tests must fail before implementation

### Technical Context

- Account summary component: `apps/dms-material/src/app/accounts/account-summary/account-summary.ts`
- SummaryService: `apps/dms-material/src/app/global/services/summary.service.ts` (may need modification)
- Backend endpoint: `/api/summary?accountId=xxx`
- Graph endpoint: `/api/summary/graph?month=xxx&accountId=xxx`
- Months endpoint: `/api/summary/months?accountId=xxx`
- Reference: Global summary component at `apps/dms-material/src/app/global/global-summary.ts`

### API Response Format

```typescript
interface SummaryResponse {
  deposits: number;
  dividends: number;
  capitalGains: number;
  equities: number;
  income: number;
  tax_free_income: number;
}

interface GraphPoint {
  month: string;
  deposits: number;
  dividends: number;
  capitalGains: number;
}

interface MonthOption {
  month: string;
  label: string;
}
```

## Definition of Done

- [ ] Comprehensive test suite created for AccountSummary component
- [ ] All test scenarios covered (service injection, HTTP calls, data transformation, loading, errors)
- [ ] Tests verified to run and FAIL (RED phase)
- [ ] All new tests disabled with `.skip`
- [ ] Existing tests still pass
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Notes

- This is the TDD RED phase
- Tests should be comprehensive but should FAIL
- Implementation will happen in Story AT.2
- All tests must be disabled with `.skip` at end of this story
- Re-enable tests will be first task in AT.2
- AccountId must be extracted from route parameters
- SummaryService may need modification to accept accountId parameter

## Related Stories

- **Next:** Story AT.2 (Implementation)
- **Epic:** Epic AT - Wire Up Account/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-03-02 | 1.0     | Initial creation | PM     |
