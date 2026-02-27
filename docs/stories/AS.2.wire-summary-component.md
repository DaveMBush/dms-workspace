# Story AS.2: Wire Summary Component to Summary Service

**Status:** Approved

## Story

**As a** user
**I want** the global summary screen to display real data from the backend
**So that** I can see accurate risk group allocations and performance metrics

## Context

**Current System:**

- Global summary component exists at `apps/dms-material/src/app/global/global-summary.ts`
- A similar component is implemented in #file:./apps/dms/src/app/global/*.* using primeng instead of angular material
- Component currently displays hardcoded/mock data
- Tests written in Story AS.1-TDD define expected behavior
- Backend `/api/summary` endpoint exists

**Implementation Approach:**

- Create summary service following TDD tests
- Wire component to service following TDD tests
- Re-enable tests from AS.1-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Component displays real data from `/api/summary` endpoint
2. [ ] Risk group allocation pie chart shows actual backend data
3. [ ] Basis, capital gains, and dividends display real values
4. [ ] Loading spinner shown while fetching data
5. [ ] Error message displayed on API failure
6. [ ] Data refreshes on component init

### Technical Requirements

1. [ ] All tests from AS.1-TDD re-enabled and passing
2. [ ] SummaryService created and properly injected
3. [ ] HTTP calls properly configured with retry logic
4. [ ] Signals updated reactively from API response
5. [ ] Code follows project coding standards
6. [ ] Unit test coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AS.1-TDD (AC: 1)
- [ ] Create SummaryService (AC: 2)
  - [ ] Create `apps/dms-material/src/app/global/services/summary.service.ts`
  - [ ] Implement `getSummary()` method
  - [ ] Add HTTP client injection
  - [ ] Implement retry logic (3 attempts)
  - [ ] Add basic caching (30 seconds)
- [ ] Update GlobalSummary component (AC: 1-6)
  - [ ] Inject SummaryService
  - [ ] Add `ngOnInit()` lifecycle method
  - [ ] Add loading state signal
  - [ ] Add error state signals
  - [ ] Call summary service on init
  - [ ] Transform API response to chart data
  - [ ] Update basis, capitalGains, dividends signals
- [ ] Update component template (AC: 4, 5)
  - [ ] Add loading spinner
  - [ ] Add error message display
  - [ ] Show/hide content based on loading state
- [ ] Verify all tests pass (AC: 1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AS.1-TDD

### Technical Context

- Global summary component: `apps/dms-material/src/app/global/global-summary.ts`
- Create new service: `apps/dms-material/src/app/global/services/summary.service.ts`
- Backend endpoint: `/api/summary`
- Optional query parameter: `?accountId=xxx` (for future use)

### API Response Format

```typescript
interface SummaryResponse {
  riskGroups: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  basis: number;
  capitalGains: number;
  dividends: number;
}
```

### Implementation Notes

**SummaryService:**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SummaryService {
  private http = inject(HttpClient);
  private cache$?: Observable<SummaryResponse>;
  private cacheTime = 0;
  private CACHE_DURATION = 30000; // 30 seconds

  getSummary(accountId?: string): Observable<SummaryResponse> {
    const now = Date.now();

    if (this.cache$ && now - this.cacheTime < this.CACHE_DURATION) {
      return this.cache$;
    }

    const params = accountId ? { accountId } : {};

    this.cache$ = this.http.get<SummaryResponse>('/api/summary', { params })
      .pipe(
        retry(3),
        shareReplay(1)
      );

    this.cacheTime = now;
    return this.cache$;
  }
}
```

**Component Updates:**

- Add `OnInit` interface
- Inject `SummaryService`
- Add signals for loading (`isLoading`) and error (`hasError`, `errorMessage`)
- Call service in `ngOnInit()`
- Subscribe to service response and update signals
- Transform `riskGroups` array to chart data format

### Reference Implementation

See old DMS app implementation:
- `apps/dms/src/app/global/global-summary/global-summary-component.service.ts`
- `apps/dms/src/app/global/global-summary/global-summary.component.ts`

### Data Transformation

Transform risk groups to pie chart data:

```typescript
private transformToChartData(riskGroups: RiskGroup[]): ChartData<'pie'> {
  return {
    labels: riskGroups.map(rg => rg.name),
    datasets: [{
      data: riskGroups.map(rg => rg.percentage),
      backgroundColor: this.getColors(riskGroups.length),
    }],
  };
}

private getColors(count: number): string[] {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  return colors.slice(0, count);
}
```

## Definition of Done

- [ ] All tests from AS.1-TDD re-enabled and passing (GREEN phase)
- [ ] SummaryService created and working
- [ ] Component wired to service
- [ ] Data displays correctly from backend
- [ ] Loading and error states implemented
- [ ] Code follows project conventions
- [ ] Unit test coverage >80%
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AS.1-TDD should pass after implementation
- Build incrementally, running tests frequently
- Keep hardcoded data as fallback during development if needed
- Focus on getting tests green first, then refactor

## Related Stories

- **Previous:** Story AS.1-TDD (Tests)
- **Next:** Story AS.3-TDD (Pie Chart Tests)
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
