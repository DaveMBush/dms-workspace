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

- [ ] Tests written for refresh button click
- [ ] Tests verify service.refresh() called
- [ ] Tests verify loading indicator shown
- [ ] Tests verify table refresh triggered
- [ ] **CRITICAL** Tests disabled with `.skip`

### Technical Requirements

- [ ] Mock ScreenerService
- [ ] Mock UniverseService
- [ ] Test component interaction
- [ ] Use Vitest

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
- [ ] Tests fail when enabled
- [ ] CI remains green
