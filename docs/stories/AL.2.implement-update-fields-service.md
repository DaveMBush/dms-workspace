# Story AL.2: Implement UpdateUniverseFieldsService (Implementation)

## Story

**As a** developer
**I want** to implement UpdateUniverseFieldsService
**So that** universe fields can be updated from external sources

## Context

**Current System:**

- Story AL.1 wrote unit tests defining service behavior (RED phase)
- Tests are currently disabled with `.skip`
- Need to implement the service to make tests pass (GREEN phase)

**Implementation Approach:**

- Implement UpdateUniverseFieldsService following the test contract
- Re-enable tests from AL.1
- Ensure all tests pass

## Acceptance Criteria

### Functional Requirements

- [ ] UpdateUniverseFieldsService implemented
- [ ] Service follows contract defined in AL.1 tests
- [ ] Service calls `/api/universe/update-fields` endpoint
- [ ] Service manages `isUpdating` signal correctly
- [ ] Service handles success and error cases
- [ ] Tests from AL.1 re-enabled and passing

### Technical Requirements

- [ ] Service uses HttpClient for API calls
- [ ] Service uses signals for state management
- [ ] Service uses finalize operator for cleanup
- [ ] Service validates response data
- [ ] Service follows existing service patterns
- [ ] Proper error handling and propagation

## Implementation Details

### Step 1: Create Service Implementation

Create `apps/dms-material/src/app/shared/services/update-universe-fields.service.ts`:

```typescript
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { finalize, map, Observable } from 'rxjs';

import type { UpdateFieldsSummary } from './update-universe-fields.types';

/**
 * Update Universe Fields Service
 *
 * Handles updating price and distribution information for universe entries.
 */
@Injectable({
  providedIn: 'root',
})
export class UpdateUniverseFieldsService {
  private http = inject(HttpClient);

  readonly isUpdating = signal<boolean>(false);

  updateFields(): Observable<UpdateFieldsSummary> {
    this.isUpdating.set(true);

    return this.http.post<UpdateFieldsSummary>('/api/universe/update-fields', {}).pipe(
      map(function validateUpdateResult(result) {
        if (result === null || result === undefined) {
          throw new Error('No response from update operation');
        }
        return result;
      }),
      finalize(() => {
        this.isUpdating.set(false);
      })
    );
  }
}
```

### Step 2: Re-enable Tests

In `update-universe-fields.service.spec.ts`, change:

```typescript
describe.skip('UpdateUniverseFieldsService', () => {
```

to:

```typescript
describe('UpdateUniverseFieldsService', () => {
```

### Step 3: Run Tests

```bash
pnpm nx test dms-material --run
```

Ensure all UpdateUniverseFieldsService tests pass.

## Definition of Done

- [ ] UpdateUniverseFieldsService implemented
- [ ] All tests from AL.1 re-enabled
- [ ] All tests passing
- [ ] Service follows established patterns
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase - implement to make tests pass
- Follow UniverseSyncService as a reference pattern
- Service is ready but not yet wired to UI (Story AL.4)

## Related Stories

- **Prerequisite**: Story AL.1 (TDD)
- **Next**: Story AL.3 (TDD for button integration)
- **Epic**: Epic AL
