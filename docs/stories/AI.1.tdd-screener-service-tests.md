# Story AI.1: TDD - Write Unit Tests for Screener Service

## Story

**As a** developer
**I want** to write unit tests for the screener service before implementation
**So that** I can follow test-driven development and ensure the service meets requirements

## Context

**Current System:**

- DMS app has working screener service that calls GET `/api/screener`
- Service needs to be created in DMS-MATERIAL with same functionality
- Refer to the existing DMS implementation and copy/paste it as much as is possible

**TDD Approach:**

- Write failing tests first (RED)
- Disable tests to keep CI green
- Implementation story will re-enable and make tests pass (GREEN)

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for ScreenerService
- [ ] Tests cover refresh() method
- [ ] Tests cover loading states
- [ ] Tests cover error handling
- [ ] Tests cover success responses
- [ ] **CRITICAL** Tests are disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Use Vitest for unit testing
- [ ] Mock HttpClient responses
- [ ] Test signal state management
- [ ] Follow existing service test patterns

## Test-Driven Development Approach

### Step 1: Create Failing Unit Tests

Create `apps/dms-material/src/app/services/screener/screener.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ScreenerService } from './screener.service';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// DISABLE TESTS FOR CI - Will be enabled in implementation story
describe.skip('ScreenerService', () => {
  let service: ScreenerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ScreenerService],
    });

    service = TestBed.inject(ScreenerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  it('should have loading signal initialized to false', () => {
    expect(service.loading()).toBe(false);
  });

  it('should have error signal initialized to null', () => {
    expect(service.error()).toBe(null);
  });

  it('should call GET /api/screener on refresh()', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    expect(req.request.method).toBe('GET');

    req.flush({ success: true, count: 100 });
  });

  it('should set loading to true during refresh', () => {
    service.refresh();

    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne('/api/screener');
    req.flush({ success: true });
  });

  it('should set loading to false after successful refresh', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.flush({ success: true });

    expect(service.loading()).toBe(false);
  });

  it('should clear error on successful refresh', () => {
    // Set initial error
    service['errorSignal'].set('Previous error');

    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.flush({ success: true });

    expect(service.error()).toBe(null);
  });

  it('should handle HTTP error responses', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.flush('Error message', { status: 500, statusText: 'Server Error' });

    expect(service.loading()).toBe(false);
    expect(service.error()).toBeTruthy();
  });

  it('should set error message on failure', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.flush({ message: 'Scraper failed' }, { status: 500, statusText: 'Server Error' });

    expect(service.error()).toContain('failed');
  });

  it('should return observable from refresh()', () => {
    const result = service.refresh();
    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');

    const req = httpMock.expectOne('/api/screener');
    req.flush({ success: true });
  });

  it('should handle network errors', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.error(new ProgressEvent('error'));

    expect(service.loading()).toBe(false);
    expect(service.error()).toBeTruthy();
  });
});
```

### Step 2: Verify Tests Fail

```bash
# Remove .skip temporarily to verify tests fail
pnpm nx test dms-material --testFile=screener.service.spec.ts
```

Expected: All tests should fail because ScreenerService doesn't exist yet.

### Step 3: Disable Tests for CI

Ensure `describe.skip` is present to keep CI green.

### Step 4: Commit Red Tests

```bash
git add .
git commit -m "test: Add failing unit tests for ScreenerService (TDD red phase)"
```

## Technical Approach

### Files to Create

- `apps/dms-material/src/app/services/screener/screener.service.spec.ts` - Unit tests (disabled)

### Test Coverage

1. **Service Creation**: Verify service can be instantiated
2. **Initial State**: Check loading and error signals start correctly
3. **HTTP Request**: Verify correct endpoint and method
4. **Loading States**: Test loading signal during operation
5. **Success Handling**: Verify proper state after success
6. **Error Handling**: Test error signal on failures
7. **Observable Return**: Verify refresh returns observable

## Definition of Done

- [ ] All unit tests written for ScreenerService
- [ ] Tests are disabled with `.skip`
- [ ] Tests fail when enabled (RED phase confirmed)
- [ ] Code committed with TDD message
- [ ] CI remains green
- [ ] Tests ready for implementation story to enable

## Notes

- Tests are intentionally disabled with `describe.skip`
- Implementation story AI.2 will enable these tests
- Follow existing service patterns from DMS app
- Use signals for state management (loading, error)
- Mock all HTTP calls with HttpClientTestingModule
