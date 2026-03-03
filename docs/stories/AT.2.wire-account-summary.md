# Story AT.2: Wire Account Summary to Backend with AccountId Filter

**Status:** Ready

## Story

**As a** user
**I want** the account summary screen to display real data from the backend filtered by account
**So that** I can see accurate risk group allocations and performance metrics for a specific account

## Context

**Current System:**

- Account summary component exists at `apps/dms-material/src/app/accounts/account-summary/account-summary.ts`
- Component is currently empty
- Tests written in Story AT.1-TDD define expected behavior
- Backend `/api/summary?accountId=xxx` endpoint exists
- Global summary component provides pattern to follow
- SummaryService exists from Epic AS

**Implementation Approach:**

- Modify SummaryService to accept optional accountId parameter
- Wire AccountSummary component to service with accountId from route
- Re-enable tests from AT.1-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Component displays real data from `/api/summary?accountId=xxx` endpoint
2. [ ] AccountId extracted from route parameters
3. [ ] Risk group allocation pie chart shows actual backend data for account
4. [ ] Deposits, capital gains, and dividends display real values for account
5. [ ] Loading spinner shown while fetching data
6. [ ] Error message displayed on API failure
7. [ ] Data refreshes on component init

### Technical Requirements

1. [ ] All tests from AT.1-TDD re-enabled and passing
2. [ ] SummaryService modified to accept accountId parameter
3. [ ] AccountSummary component properly wired to service
4. [ ] HTTP calls properly configured with retry logic
5. [ ] Signals updated reactively from API response
6. [ ] Code follows project coding standards
7. [ ] Unit test coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AT.1-TDD (AC: T1)
- [ ] Modify SummaryService to accept accountId parameter (AC: T2)
  - [ ] Update `getSummary()` method to accept optional accountId
  - [ ] Update `getGraph()` method to accept optional accountId
  - [ ] Update `getAvailableMonths()` method to accept optional accountId
  - [ ] Add accountId query parameter to HTTP requests
- [ ] Implement AccountSummary component (AC: F1-F7)
  - [ ] Inject SummaryService
  - [ ] Inject ActivatedRoute to get accountId
  - [ ] Add `ngOnInit()` lifecycle method
  - [ ] Extract accountId from route params
  - [ ] Add loading state signal
  - [ ] Add error state signals
  - [ ] Call summary service on init with accountId
  - [ ] Transform API response to chart data
  - [ ] Update deposits, capitalGains, dividends signals
- [ ] Create component template (AC: F5, F6)
  - [ ] Add loading spinner
  - [ ] Add error message display
  - [ ] Show/hide content based on loading state
  - [ ] Display allocation chart
  - [ ] Display performance metrics
- [ ] Verify all tests pass (AC: T1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AT.1-TDD

### Technical Context

- Account summary component: `apps/dms-material/src/app/accounts/account-summary/account-summary.ts`
- Modify service: `apps/dms-material/src/app/global/services/summary.service.ts`
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

### Route Parameter Extraction

```typescript
import { ActivatedRoute } from '@angular/router';

// In component:
private readonly route = inject(ActivatedRoute);
private readonly accountId = this.route.snapshot.paramMap.get('id') || '';
```

### Service Method Updates

```typescript
// Update service methods to accept optional accountId
getSummary(accountId?: string): void {
  const params = accountId ? { accountId } : {};
  this.http.get<Summary>('/api/summary', { params }).subscribe(/*...*/);
}
```

## Definition of Done

- [ ] All tests from AT.1-TDD re-enabled and passing (GREEN phase)
- [ ] SummaryService modified to accept accountId parameter
- [ ] AccountSummary component wired to service
- [ ] AccountId extracted from route parameters
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
- All tests from AT.1-TDD should pass after implementation
- Build incrementally, running tests frequently
- Follow pattern from GlobalSummary component
- Focus on getting tests green first, then refactor

## Related Stories

- **Previous:** Story AT.1-TDD (Tests)
- **Next:** Story AT.3-TDD (Pie Chart Tests)
- **Epic:** Epic AT - Wire Up Account/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-03-02 | 1.0     | Initial creation | PM     |
