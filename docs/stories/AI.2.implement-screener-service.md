# Story AI.2: Implement Screener Service in DMS-MATERIAL

## Story

**As a** developer
**I want** to implement the screener service
**So that** the app can refresh universe data from CEF sources

## Context

**Current System:**

- DMS app has working screener service
- Unit tests exist from AI.1 (currently disabled)

**Implementation Goal:**

- Create ScreenerService with refresh() method
- Refer to existing DMS implementation for logic and copy/paste the existing DMS service as much as is possible
- Manage loading and error states via signals
- Enable and pass all unit tests from AI.1
- Follow TDD green phase

## Acceptance Criteria

### Functional Requirements

- [x] ScreenerService created with refresh() method
- [x] Service calls GET `/api/screener`
- [x] Loading state managed via signal
- [x] Error state managed via signal
- [x] **CRITICAL** All unit tests from AI.1 enabled and passing

### Technical Requirements

- [x] Use Angular HttpClient
- [x] Use signals for state (loading, error)
- [x] Return Observable from refresh()
- [x] Handle HTTP errors gracefully
- [x] Injectable service with providedIn: 'root'

## Test-Driven Development Approach

### Step 1: Enable Tests from AI.1

In `apps/dms-material/src/app/services/screener/screener.service.spec.ts`:

```typescript
// Remove .skip to enable tests
describe('ScreenerService', () => {
  // Was: describe.skip
  // ... existing tests
});
```

### Step 2: Run Tests (Should Fail - RED)

```bash
pnpm nx test dms-material --testFile=screener.service.spec.ts
```

Expected: Tests fail because service doesn't exist.

### Step 3: Implement Service

Create `apps/dms-material/src/app/services/screener/screener.service.ts`:

```typescript
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScreenerService {
  private readonly http = inject(HttpClient);

  // Signals for state management
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  // Public readonly signals
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Refresh screener data from backend
   * Calls GET /api/screener to scrape CEF data
   */
  refresh(): Observable<unknown> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get('/api/screener').pipe(
      tap(() => {
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(error.error?.message || 'Failed to refresh screener data');
        return of(null);
      })
    );
  }
}
```

### Step 4: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material --testFile=screener.service.spec.ts
```

Expected: All tests pass.

### Step 5: Refactor If Needed

- Improve error messages
- Add JSDoc comments
- Ensure signal patterns match project conventions

## Technical Approach

### Files to Create

- `apps/dms-material/src/app/services/screener/screener.service.ts` - Service implementation

### Files to Modify

- `apps/dms-material/src/app/services/screener/screener.service.spec.ts` - Enable tests (remove `.skip`)

### Implementation Details

1. **Service Structure**:

   - Injectable with providedIn: 'root'
   - Private signals for mutable state
   - Public readonly signals for consumers
   - Inject HttpClient

2. **Refresh Method**:

   - Set loading to true at start
   - Clear any previous errors
   - Make HTTP GET to /api/screener
   - On success: set loading to false
   - On error: set loading to false, set error message

3. **State Management**:
   - Use Angular signals (not RxJS BehaviorSubject)
   - Follow write/read separation pattern
   - Error signal holds string or null

## Definition of Done

- [x] ScreenerService implemented
- [x] All unit tests from AI.1 enabled
- [x] All unit tests passing
- [x] Service uses signals for state
- [x] HTTP error handling works
- [x] Code follows project patterns
- [x] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- This completes the TDD cycle (RED → GREEN)
- Refactoring can be done after GREEN
- Service ready for UI integration in AI.4
- Follow existing service patterns from DMS app

---

## Dev Agent Record

### Tasks

- [x] Create ScreenerService implementation
- [x] Enable unit tests from AI.1
- [x] Fix lint errors
- [x] Run all validation commands

### Debug Log

No issues encountered.

### Completion Notes

- Created [apps/dms-material/src/app/global/global-screener/services/screener.service.ts](apps/dms-material/src/app/global/global-screener/services/screener.service.ts)
- Updated [apps/dms-material/src/app/global/global-screener/services/screener.service.spec.ts](apps/dms-material/src/app/global/global-screener/services/screener.service.spec.ts) to enable tests
- Service uses signals for loading and error state management
- HTTP error handling properly typed with HttpErrorResponse
- All 11 unit tests passing
- All validation commands passing
- **Note:** Store-dependent methods (screens computed, updateScreener) from DMS app will be added when SmartNgRX store integration is complete. Current implementation focuses on the refresh/loading/error functionality that the tests validate.

### File List

- apps/dms-material/src/app/global/global-screener/services/screener.service.ts (created)
- apps/dms-material/src/app/global/global-screener/services/screener.service.spec.ts (modified)

### Change Log

- Created ScreenerService with refresh() method
- Enabled all unit tests from AI.1
- Added signal-based state management (loading, error)
- Implemented proper HTTP error handling
- Fixed lint errors for function naming and error typing
- Applied code formatting

### Status

Ready for Review

### Agent Model Used

Claude Sonnet 4.5

## QA Results

### Requirements Traceability

All acceptance criteria are fully implemented and validated by unit tests:

- **ScreenerService created with refresh() method**: ✓ Implemented with proper Observable return type
- **Service calls GET /api/screener**: ✓ HTTP GET request to correct endpoint
- **Loading state managed via signal**: ✓ Private signal with public readonly accessor
- **Error state managed via signal**: ✓ Private signal with public readonly accessor, handles HttpErrorResponse
- **All unit tests from AI.1 enabled and passing**: ✓ 11/11 tests passing, covering success, error, and edge cases

Technical requirements all met:

- Angular HttpClient injection ✓
- Signals for state management ✓
- Observable return from refresh() ✓
- Graceful HTTP error handling ✓
- Injectable with providedIn: 'root' ✓

### Code Quality Assessment

**Strengths:**

- Clean signal-based state management following Angular patterns
- Proper error typing with HttpErrorResponse
- Comprehensive JSDoc documentation
- Good separation of concerns

**Minor Observations:**

- Tap/catchError handlers use function declarations with bind() - could be simplified to arrow functions for consistency, but functional
- Deferred store-dependent methods appropriately documented for future implementation

**Recommendations:**

- Consider arrow functions for RxJS operators when refactoring
- No security, performance, or maintainability issues identified

### Test Architecture Review

**Coverage:** Excellent - 11 unit tests covering:

- Service creation and initialization
- Signal state management (loading/error)
- HTTP request execution
- Success and error scenarios
- Network error handling
- Observable return type validation

**Quality:** Tests are well-designed with clear assertions and proper mocking using HttpTestingController.

**Testability:** High - service has good controllability and observability through signals.

### Non-Functional Requirements

- **Security:** Low risk - simple GET request, no sensitive data handling
- **Performance:** Efficient - single HTTP call with proper state management
- **Reliability:** Strong error handling with user-friendly error messages
- **Maintainability:** Well-documented with clear patterns

### Technical Debt

None identified. Deferred store integration is appropriately scoped for future stories.

### Standards Compliance

- Follows project coding standards
- Uses established Angular patterns
- Proper TypeScript typing
- Consistent with existing service implementations

### Acceptance Criteria Validation

All criteria fully satisfied with test validation.

### Risk Assessment

Low risk implementation - no high-severity issues, all tests passing, clean code.

### Gate Recommendation

**PASS** - Ready for production with no concerns.

### Refactoring Performed

None required - code is clean and functional as implemented.

### Next Steps

Story AI.3 (TDD Refresh Button Integration Tests) can proceed immediately.
