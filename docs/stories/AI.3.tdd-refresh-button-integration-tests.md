# Story AI.3: TDD - Write Tests for Refresh Button Integration

## Story

**As a** developer
**I want** to write unit tests for refresh button integration before implementation
**So that** I can ensure proper wiring between UI and service

## Context

**TDD Approach:**

- Write failing tests for button click handler
- Disable tests to keep CI green
- Implementation story will enable and make tests pass

## Acceptance Criteria

### Functional Requirements

- [x] Tests written for refresh button click
- [x] Tests verify service.refresh() called
- [x] Tests verify loading indicator shown
- [x] Tests verify table refresh triggered
- [x] **CRITICAL** Tests disabled with `.skip`

### Technical Requirements

- [x] Mock ScreenerService
- [x] Mock UniverseService
- [x] Test component interaction
- [x] Use Vitest

## Test-Driven Development Approach

### Step 1: Create Failing Tests

Update `apps/dms-material/src/app/global/universe/universe.component.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DISABLE TESTS FOR CI - Will be enabled in implementation story
describe.skip('Universe Component - Refresh Button', () => {
  let component: UniverseComponent;
  let fixture: ComponentFixture<UniverseComponent>;
  let screenerService: ScreenerService;
  let universeService: UniverseService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniverseComponent],
      providers: [
        {
          provide: ScreenerService,
          useValue: {
            refresh: vi.fn().mockReturnValue(of({})),
            loading: signal(false),
            error: signal(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UniverseComponent);
    component = fixture.componentInstance;
    screenerService = TestBed.inject(ScreenerService);
    fixture.detectChanges();
  });

  it('should have refresh button', () => {
    const button = fixture.nativeElement.querySelector('[data-testid="refresh-button"]');
    expect(button).toBeTruthy();
  });

  it('should call screenerService.refresh() on button click', () => {
    component.onRefresh();
    expect(screenerService.refresh).toHaveBeenCalled();
  });

  it('should show loading indicator during refresh', () => {
    (screenerService.loading as any).set(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="refresh-button"]');
    expect(button.disabled).toBe(true);
  });

  it('should trigger universe data reload after successful refresh', (done) => {
    const refreshSpy = vi.spyOn(screenerService, 'refresh').mockReturnValue(of({ success: true }));

    component.onRefresh();

    setTimeout(() => {
      // Verify universe data is refreshed
      expect(component.universeData).toBeDefined();
      done();
    }, 100);
  });

  it('should handle refresh errors gracefully', () => {
    (screenerService.error as any).set('Failed to refresh');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('[data-testid="error-message"]');
    expect(errorEl).toBeTruthy();
  });
});
```

### Step 2: Disable for CI

Ensure `describe.skip` is present.

### Step 3: Commit

```bash
git commit -m "test: Add failing tests for refresh button integration (TDD red)"
```

## Definition of Done

- [ ] Tests written for refresh button
- [ ] Tests disabled with `.skip`
- [x] Tests fail when enabled
- [x] CI remains green
- [x] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### File List

- apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts

### Change Log

- Added TDD tests for refresh button integration in GlobalUniverseComponent
- Imported ScreenerService and signal from @angular/core
- Created new describe.skip block "GlobalUniverseComponent - Refresh Button" with 7 test cases
- All tests properly disabled with .skip to keep CI green
- Tests verify button presence, service calls, loading states, table refresh, and error handling

### Completion Notes

- Tests are written following TDD red phase approach
- All tests are properly disabled with describe.skip
- Tests cover all acceptance criteria including button click, loading indicator, error handling
- All validation commands passed successfully (pnpm all, e2e, dupcheck, format)
- Ready for implementation story to enable and make tests pass

### Status

Ready for Review

## QA Results

### Review Date: 2026-01-13

### Reviewed By: Quinn (Test Architect)

### Gate Status

Gate: PASS → docs/qa/gates/AI.3-tdd-refresh-button-integration-tests.yml
