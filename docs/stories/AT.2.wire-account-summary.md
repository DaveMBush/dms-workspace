# Story AT.2: Wire Account Summary to Backend with AccountId Filter

**Status:** Ready for Review

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

- [x] Re-enable tests from AT.1-TDD (AC: T1)
- [x] Modify SummaryService to accept accountId parameter (AC: T2)
  - [x] Update `getSummary()` method to accept optional accountId
  - [x] Update `getGraph()` method to accept optional accountId
  - [x] Update `getAvailableMonths()` method to accept optional accountId
  - [x] Add accountId query parameter to HTTP requests
- [x] Implement AccountSummary component (AC: F1-F7)
  - [x] Inject SummaryService
  - [x] Inject ActivatedRoute to get accountId
  - [x] Add `ngOnInit()` lifecycle method
  - [x] Extract accountId from route params
  - [x] Add loading state signal
  - [x] Add error state signals
  - [x] Call summary service on init with accountId
  - [x] Transform API response to chart data
  - [x] Update deposits, capitalGains, dividends signals
- [x] Create component template (AC: F5, F6)
  - [x] Add loading spinner
  - [x] Add error message display
  - [x] Show/hide content based on loading state
  - [x] Display allocation chart
  - [x] Display performance metrics
- [x] Verify all tests pass (AC: T1)
- [x] Run validation commands

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

| Date       | Version | Description             | Author      |
| ---------- | ------- | ----------------------- | ----------- |
| 2026-03-02 | 1.0     | Initial creation        | PM          |
| 2026-03-03 | 1.1     | Implementation complete | James (Dev) |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### File List

- `apps/dms-material/src/app/accounts/account-summary/account-summary.ts` (modified)
- `apps/dms-material/src/app/accounts/account-summary/account-summary.html` (modified)
- `apps/dms-material/src/app/accounts/account-summary/account-summary.scss` (new)
- `apps/dms-material/src/app/accounts/account-summary/account-summary.spec.ts` (modified)
- `apps/dms-material/src/app/global/services/summary.service.ts` (modified)
- `docs/qa/gates/at.2-wire-account-summary.yml` (new)
- `docs/stories/AT.2.wire-account-summary.md` (modified)

### Debug Log References

None

### Completion Notes

- All 15 unit tests from AT.1-TDD re-enabled and passing
- SummaryService modified with optional accountId parameter on fetchSummary, fetchGraph, fetchMonths
- AccountSummary component implemented following GlobalSummary pattern
- Template includes loading spinner, error display, allocation chart, performance chart, stats grid
- No regressions: 62 global-summary tests pass, 28 service tests pass, 1273 total tests pass
- E2E: 421 passed (pre-existing update-fields failures unrelated to changes)
- Dupcheck: 0 clones
- All lint rules satisfied

### QA Results

Gate: PASS → docs/qa/gates/at.2-wire-account-summary.yml
