# Story AS.1: TDD - Unit Tests for Summary Service Wiring

**Status:** Approved

## Story

**As a** frontend developer
**I want** comprehensive unit tests for global summary service integration
**So that** I can ensure the component correctly connects to backend data before implementation

## Context

**Current System:**

- Global summary component exists at `apps/dms-material/src/app/global/global-summary.ts`
- Component currently displays hardcoded/mock data
- Backend `/api/summary` endpoint exists (from old DMS app)
- Need to wire component to backend summary service
- A similar component is implemented in #file:./apps/dms/src/app/global/*.* using primeng instead of angular material

**Problem:**

- Component uses hardcoded data instead of backend service
- Need to verify proper integration with backend before implementation
- Must handle loading states and error conditions

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify component creates/injects summary service
2. [ ] Tests verify service calls `/api/summary` endpoint on init
3. [ ] Tests verify data transformation from API to component signals
4. [ ] Tests verify loading state handling
5. [ ] Tests verify error state handling

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA pattern (Arrange-Act-Assert)
3. [ ] Tests are disabled after verification they run RED (use `.skip`)
4. [ ] Mock HTTP calls properly
5. [ ] Tests cover all data transformation logic

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Create/update `apps/dms-material/src/app/global/global-summary.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { GlobalSummary } from './global-summary';

describe('GlobalSummary - Service Integration', () => {
  let component: GlobalSummary;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    const fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe.skip('Summary Service Integration', () => {
    it('should inject summary service on initialization', () => {
      expect(component['summaryService']).toBeDefined();
    });

    it('should call /api/summary endpoint on init', () => {
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary');
      expect(req.request.method).toBe('GET');

      req.flush({
        riskGroups: [
          { name: 'Equities', amount: 50000, percentage: 50 },
          { name: 'Income', amount: 30000, percentage: 30 },
          { name: 'Tax Free', amount: 20000, percentage: 20 },
        ],
        basis: 100000,
        capitalGains: 5000,
        dividends: 2500,
      });
    });

    it('should transform API response to allocation chart data', () => {
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary');
      req.flush({
        riskGroups: [
          { name: 'Equities', amount: 50000, percentage: 50 },
          { name: 'Income', amount: 30000, percentage: 30 },
          { name: 'Tax Free', amount: 20000, percentage: 20 },
        ],
        basis: 100000,
        capitalGains: 5000,
        dividends: 2500,
      });

      const chartData = component.allocationData;
      expect(chartData.labels).toEqual(['Equities', 'Income', 'Tax Free']);
      expect(chartData.datasets[0].data).toEqual([50, 30, 20]);
    });

    it('should update basis signal from API response', () => {
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary');
      req.flush({
        riskGroups: [],
        basis: 150000,
        capitalGains: 10000,
        dividends: 5000,
      });

      expect(component.basis$()).toBe(150000);
    });

    it('should update capital gains signal from API response', () => {
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary');
      req.flush({
        riskGroups: [],
        basis: 150000,
        capitalGains: 10000,
        dividends: 5000,
      });

      expect(component.capitalGain$()).toBe(10000);
    });

    it('should update dividends signal from API response', () => {
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary');
      req.flush({
        riskGroups: [],
        basis: 150000,
        capitalGains: 10000,
        dividends: 5000,
      });

      expect(component.dividends$()).toBe(5000);
    });

    it('should calculate percent increase correctly', () => {
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary');
      req.flush({
        riskGroups: [],
        basis: 100000,
        capitalGains: 5000,
        dividends: 2500,
      });

      // (12 * (5000 + 2500)) / 100000 = 0.9 = 90%
      expect(component.percentIncrease$()).toBeCloseTo(0.9, 2);
    });

    it('should handle loading state during API call', () => {
      expect(component.isLoading()).toBe(false);

      component.ngOnInit();
      expect(component.isLoading()).toBe(true);

      const req = httpMock.expectOne('/api/summary');
      req.flush({ riskGroups: [], basis: 0, capitalGains: 0, dividends: 0 });

      expect(component.isLoading()).toBe(false);
    });

    it('should handle error state from API call', () => {
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary');
      req.error(new ProgressEvent('error'));

      expect(component.hasError()).toBe(true);
      expect(component.errorMessage()).toBeDefined();
    });

    it('should set loading to false on error', () => {
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary');
      req.error(new ProgressEvent('error'));

      expect(component.isLoading()).toBe(false);
    });

    it('should include accountId parameter when set', () => {
      component.accountId.set('account-123');
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=account-123');
      expect(req.request.params.get('accountId')).toBe('account-123');

      req.flush({ riskGroups: [], basis: 0, capitalGains: 0, dividends: 0 });
    });

    it('should call summary endpoint without accountId for global view', () => {
      component.accountId.set(undefined);
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary');
      expect(req.request.params.has('accountId')).toBe(false);

      req.flush({ riskGroups: [], basis: 0, capitalGains: 0, dividends: 0 });
    });
  });

  describe.skip('Service Error Handling', () => {
    it('should retry failed requests up to 3 times', () => {
      component.ngOnInit();

      // Fail 2 times, succeed on 3rd
      const req1 = httpMock.expectOne('/api/summary');
      req1.error(new ProgressEvent('error'));

      const req2 = httpMock.expectOne('/api/summary');
      req2.error(new ProgressEvent('error'));

      const req3 = httpMock.expectOne('/api/summary');
      req3.flush({ riskGroups: [], basis: 0, capitalGains: 0, dividends: 0 });

      expect(component.hasError()).toBe(false);
    });

    it('should display error after 3 failed retries', () => {
      component.ngOnInit();

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/summary');
        req.error(new ProgressEvent('error'));
      }

      expect(component.hasError()).toBe(true);
    });
  });
});
```

### Step 2: Create Summary Service Interface

Create `apps/dms-material/src/app/global/services/summary.service.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SummaryService } from './summary.service';

describe.skip('SummaryService', () => {
  let service: SummaryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SummaryService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(SummaryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  it('should fetch summary data from /api/summary', () => {
    const mockResponse = {
      riskGroups: [
        { name: 'Equities', amount: 50000, percentage: 50 },
      ],
      basis: 100000,
      capitalGains: 5000,
      dividends: 2500,
    };

    service.getSummary().subscribe((data) => {
      expect(data).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/summary');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should include accountId parameter when provided', () => {
    service.getSummary('account-123').subscribe();

    const req = httpMock.expectOne('/api/summary?accountId=account-123');
    expect(req.request.params.get('accountId')).toBe('account-123');
    req.flush({ riskGroups: [], basis: 0, capitalGains: 0, dividends: 0 });
  });

  it('should handle HTTP errors gracefully', () => {
    service.getSummary().subscribe({
      error: (error) => {
        expect(error).toBeDefined();
      },
    });

    const req = httpMock.expectOne('/api/summary');
    req.error(new ProgressEvent('error'));
  });

  it('should cache summary data for 30 seconds', () => {
    const mockResponse = {
      riskGroups: [],
      basis: 100000,
      capitalGains: 5000,
      dividends: 2500,
    };

    // First call
    service.getSummary().subscribe();
    const req1 = httpMock.expectOne('/api/summary');
    req1.flush(mockResponse);

    // Second call within 30 seconds - should use cache
    service.getSummary().subscribe();
    httpMock.expectNone('/api/summary');
  });
});
```

### Step 3: Run Tests (RED Phase)

```bash
pnpm nx run dms-material:test
```

**Expected Result:** All `.skip` tests should be skipped. When you remove `.skip`, they should FAIL (RED) because the implementation doesn't exist yet.

### Step 4: Verify Tests Are Comprehensive

Before moving to Story AS.2, ensure these tests cover:

- [ ] Service creation and injection
- [ ] HTTP endpoint calls
- [ ] Data transformation
- [ ] Loading states
- [ ] Error handling
- [ ] Query parameters
- [ ] Caching behavior

## Tasks / Subtasks

- [ ] Create/update global-summary.spec.ts with service integration tests (AC: 1-5)
  - [ ] Tests for service injection
  - [ ] Tests for /api/summary endpoint calls
  - [ ] Tests for data transformation
  - [ ] Tests for loading states
  - [ ] Tests for error handling
  - [ ] Tests for accountId parameter
- [ ] Create summary.service.spec.ts (AC: 1-5)
  - [ ] Tests for service creation
  - [ ] Tests for HTTP calls
  - [ ] Tests for error handling
  - [ ] Tests for caching
- [ ] Run tests to verify they FAIL (RED phase) (AC: 2, 3)
- [ ] Disable all tests with `.skip` (AC: 3)
- [ ] Document expected behavior in test descriptions (AC: 1)
- [ ] Run validation commands
  - [ ] Run `pnpm all` (should pass - tests are skipped)
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest with Angular Testing Library
- **Coverage:** Must achieve >80% coverage for test files
- **Test Pattern:** AAA (Arrange-Act-Assert)
- **HTTP Testing:** Use Angular's `HttpTestingController` for mocking

### Technical Context

- Global summary component exists at `apps/dms-material/src/app/global/global-summary.ts`
- Backend endpoint: `/api/summary` (may include `?accountId=xxx` parameter)
- Expected API response format:
  ```typescript
  {
    riskGroups: Array<{ name: string; amount: number; percentage: number }>;
    basis: number;
    capitalGains: number;
    dividends: number;
  }
  ```
- Component uses Angular signals for reactive state
- Service should implement caching to avoid excessive API calls
- Loading and error states must be handled gracefully

### Implementation Notes from Old DMS App

Reference implementation in:
- `apps/dms/src/app/global/global-summary/global-summary-component.service.ts`
- Uses `/api/summary` endpoint
- Has separate endpoints for `/api/summary/graph` and `/api/summary/months`
- May need to implement similar pattern in new service

### TDD Workflow

1. Write comprehensive tests first (this story)
2. Verify tests run and FAIL (RED)
3. Disable tests with `.skip`
4. Implementation in Story AS.2 will re-enable and make tests pass (GREEN)
5. Refactor as needed while keeping tests passing

## Definition of Done

- [ ] All test files created and comprehensive
- [ ] Tests cover all functional requirements
- [ ] Tests follow AAA pattern
- [ ] Tests verified to FAIL (RED phase)
- [ ] All tests disabled with `.skip`
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Changes reviewed and approved

## Notes

- This is the TDD RED phase
- Tests should be comprehensive but should FAIL
- Implementation will happen in Story AS.2
- All tests must be disabled with `.skip` at end of this story
- Re-enable tests will be first task in AS.2

## Related Stories

- **Next:** Story AS.2 (Implementation)
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
