# Story AI.5: TDD - Write Tests for Loading and Error Handling

## Story

**As a** developer
**I want** to write tests for loading and error states before implementation
**So that** I ensure robust error handling

## Context

**TDD Approach:**

- Write tests for loading spinner
- Write tests for error display
- Write tests for success messages
- Disable tests for CI

## Acceptance Criteria

### Functional Requirements

- [ ] Tests for loading spinner display
- [ ] Tests for error message display
- [ ] Tests for success notifications
- [ ] Tests for retry functionality
- [ ] **CRITICAL** Tests disabled with `.skip`

### Technical Requirements

- [ ] Test loading signal reactivity
- [ ] Test error signal reactivity
- [ ] Mock NotificationService
- [ ] Use Vitest

## Test-Driven Development Approach

### Step 1: Create Failing Tests

Add to `universe.component.spec.ts`:

```typescript
// DISABLE TESTS FOR CI
describe.skip('Universe Component - Loading and Error Handling', () => {
  it('should show spinner when loading', () => {
    (screenerService.loading as any).set(true);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('mat-progress-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should hide spinner when not loading', () => {
    (screenerService.loading as any).set(false);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('mat-progress-spinner');
    expect(spinner).toBeFalsy();
  });

  it('should display error message when error occurs', () => {
    (screenerService.error as any).set('Network error');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('[data-testid="error-message"]');
    expect(errorEl.textContent).toContain('Network error');
  });

  it('should show success notification on successful refresh', () => {
    const notificationSpy = vi.spyOn(notificationService, 'success');

    component.onRefresh();

    expect(notificationSpy).toHaveBeenCalledWith('Universe data refreshed successfully');
  });

  it('should enable retry on error', () => {
    (screenerService.error as any).set('Failed');
    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector('[data-testid="retry-button"]');
    expect(retryButton).toBeTruthy();
  });

  it('should clear error when retrying', () => {
    (screenerService.error as any).set('Error');
    component.onRefresh();

    expect(screenerService.error()).toBe(null);
  });
});
```

### Step 2: Disable for CI

Ensure `describe.skip` present.

## Definition of Done

- [ ] Tests written for loading/error states
- [ ] Tests disabled
- [ ] CI green
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass
