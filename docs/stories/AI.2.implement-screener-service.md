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

- [ ] ScreenerService created with refresh() method
- [ ] Service calls GET `/api/screener`
- [ ] Loading state managed via signal
- [ ] Error state managed via signal
- [ ] **CRITICAL** All unit tests from AI.1 enabled and passing

### Technical Requirements

- [ ] Use Angular HttpClient
- [ ] Use signals for state (loading, error)
- [ ] Return Observable from refresh()
- [ ] Handle HTTP errors gracefully
- [ ] Injectable service with providedIn: 'root'

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

- [ ] ScreenerService implemented
- [ ] All unit tests from AI.1 enabled
- [ ] All unit tests passing
- [ ] Service uses signals for state
- [ ] HTTP error handling works
- [ ] Code follows project patterns
- [ ] All validation commands pass
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
