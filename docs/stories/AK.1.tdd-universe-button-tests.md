# Story AK.1: TDD - Write Unit Tests for Universe Update Button Integration

## Story

**As a** developer
**I want** to write unit tests for universe update button integration before implementation
**So that** I can follow test-driven development and ensure the button correctly triggers universe sync

## Context

**Current System:**

- Screener table is functional (Epic AJ complete)
- UniverseSyncService exists and needs to be wired to UI button
- Button exists but is not yet functional

**TDD Approach:**

- Write failing tests first (RED)
- Disable tests to keep CI green
- Implementation story (AK.2) will re-enable and make tests pass (GREEN)

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for universe button component
- [ ] Tests cover button click triggering sync service
- [ ] Tests cover loading state during sync
- [ ] Tests cover button disabled state during operation
- [ ] **CRITICAL** Tests are disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Use Vitest for unit testing
- [ ] Mock UniverseSyncService
- [ ] Test signal state management
- [ ] Follow existing component test patterns

## Test-Driven Development Approach

### Step 1: Create Failing Unit Tests

Create or update the component test file that contains the update universe button:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UniverseSyncService } from './universe-sync.service';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DISABLE TESTS FOR CI - Will be enabled in implementation story AK.2
describe.skip('Universe Update Button Integration', () => {
  let component: /* YourComponent */;
  let fixture: ComponentFixture</* YourComponent */>;
  let mockSyncService: any;

  beforeEach(() => {
    mockSyncService = {
      syncFromScreener: vi.fn().mockReturnValue(of({ success: true, count: 10 })),
      loading: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
    };

    TestBed.configureTestingModule({
      imports: [/* YourComponent */],
      providers: [
        { provide: UniverseSyncService, useValue: mockSyncService },
      ],
    });

    fixture = TestBed.createComponent(/* YourComponent */);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should call UniverseSyncService.syncFromScreener when update button is clicked', () => {
    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    button.click();
    fixture.detectChanges();

    expect(mockSyncService.syncFromScreener).toHaveBeenCalled();
  });

  it('should disable button during sync operation', () => {
    mockSyncService.loading.mockReturnValue(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    expect(button.disabled).toBe(true);
  });

  it('should enable button when not loading', () => {
    mockSyncService.loading.mockReturnValue(false);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    expect(button.disabled).toBe(false);
  });

  it('should show loading state during sync', () => {
    mockSyncService.loading.mockReturnValue(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    expect(button.textContent).toContain('Syncing');
  });

  it('should handle sync service errors gracefully', () => {
    mockSyncService.syncFromScreener.mockReturnValue(
      throwError(() => new Error('Sync failed'))
    );

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    button.click();
    fixture.detectChanges();

    // Should not throw, error handling will be added in implementation
    expect(mockSyncService.syncFromScreener).toHaveBeenCalled();
  });

  it('should not trigger sync if already loading', () => {
    mockSyncService.loading.mockReturnValue(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    button.click();
    fixture.detectChanges();

    // Should only be called once (from setup), not from second click
    expect(mockSyncService.syncFromScreener).toHaveBeenCalledTimes(0);
  });
});
```

### Step 2: Verify Tests Are RED

Run the tests to confirm they fail:

```bash
pnpm test
```

Expected: Tests should fail because:

- Button handler not wired to service
- Loading state not managed
- Button disabled state not bound

### Step 3: Disable Tests for CI

Ensure all tests use `.skip` so CI pipeline passes.

## Definition of Done

- [ ] Unit tests created for universe button integration
- [ ] Tests use proper data-testid selectors
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Tests are disabled with `.skip`
- [ ] Tests fail when run without `.skip` (RED phase confirmed)
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved
- [ ] Documentation updated if needed

## Notes

- This story creates the tests in RED state
- Story AK.2 will implement functionality to make tests pass
- Follow existing test patterns in the codebase
- Reference UniverseSyncService implementation for correct method signatures

## Related Stories

- **Prerequisite**: Epic AJ (Screener table functionality)
- **Next**: Story AK.2 (Implementation to make tests pass)
- **Related**: Story AK.3 (TDD for notifications)

## QA Results

### Review Date: 2026-01-22

### Reviewed By: Quinn (Test Architect)

### Gate Status

Gate: PASS → docs/qa/gates/AK.1-tdd-write-unit-tests-for-universe-update-button-integration.yml
