# Story AL.1: Write Unit Tests for UpdateUniverseFieldsService (TDD)

## Story

**As a** developer
**I want** to write unit tests for UpdateUniverseFieldsService
**So that** the service behavior is clearly defined before implementation

## Context

**Current System:**

- Universe table exists with Update Fields button (currently placeholder)
- Need to define the behavior of the UpdateUniverseFieldsService before implementing it

**TDD Approach:**

- Write tests first (RED phase)
- Define service contract and expected behavior
- Disable failing tests to allow CI to pass
- Story AL.2 will implement the service (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for UpdateUniverseFieldsService
- [ ] Tests define service contract (method signatures, return types)
- [ ] Tests cover success scenarios
- [ ] Tests cover error scenarios
- [ ] Tests cover loading state management
- [ ] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing service test patterns
- [ ] Tests use proper Angular testing utilities
- [ ] Tests mock HttpClient
- [ ] Tests verify signal state changes
- [ ] Tests check for proper error handling

## Implementation Details

### Step 1: Create Service Test File

Create `apps/dms-material/src/app/shared/services/update-universe-fields.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UpdateUniverseFieldsService } from './update-universe-fields.service';

describe.skip('UpdateUniverseFieldsService', () => {
  let service: UpdateUniverseFieldsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UpdateUniverseFieldsService],
    });

    service = TestBed.inject(UpdateUniverseFieldsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with isUpdating signal as false', () => {
      expect(service.isUpdating()).toBe(false);
    });
  });

  describe('updateFields()', () => {
    it('should set isUpdating to true when operation starts', () => {
      service.updateFields();
      expect(service.isUpdating()).toBe(true);
    });

    it('should call API endpoint /api/universe/update-fields', () => {
      service.updateFields().subscribe();

      const req = httpMock.expectOne('/api/universe/update-fields');
      expect(req.request.method).toBe('POST');
      req.flush({ updated: 10 });
    });

    it('should return observable with update summary', (done) => {
      service.updateFields().subscribe((result) => {
        expect(result).toEqual({ updated: 10 });
        done();
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.flush({ updated: 10 });
    });

    it('should set isUpdating to false after successful update', (done) => {
      service.updateFields().subscribe(() => {
        expect(service.isUpdating()).toBe(false);
        done();
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.flush({ updated: 10 });
    });

    it('should set isUpdating to false after error', (done) => {
      service.updateFields().subscribe({
        error: () => {
          expect(service.isUpdating()).toBe(false);
          done();
        },
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.error(new ProgressEvent('error'));
    });

    it('should handle HTTP errors gracefully', (done) => {
      service.updateFields().subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.flush('Update failed', { status: 500, statusText: 'Server Error' });
    });

    it('should validate response data', (done) => {
      service.updateFields().subscribe({
        error: (error) => {
          expect(error.message).toContain('No response');
          done();
        },
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.flush(null);
    });
  });
});
```

### Step 2: Define Service Type

Create type definition in `apps/dms-material/src/app/shared/services/update-universe-fields.types.ts`:

```typescript
export interface UpdateFieldsSummary {
  updated: number;
  correlationId?: string;
  logFilePath?: string;
}
```

## Definition of Done

- [ ] Unit tests written for UpdateUniverseFieldsService
- [ ] Tests cover all acceptance criteria
- [ ] Tests disabled with `describe.skip` to allow CI to pass
- [ ] Type definitions created for service response
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase - tests define behavior but will fail
- Tests are disabled with `.skip` to allow CI to pass
- Story AL.2 will implement the service (GREEN phase)

## Related Stories

- **Next**: Story AL.2 (Implementation)
- **Epic**: Epic AL
