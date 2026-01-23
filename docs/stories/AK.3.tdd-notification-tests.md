# Story AK.3: TDD - Write Unit Tests for Success/Error Notifications

## Story

**As a** developer
**I want** to write unit tests for universe sync notifications before implementation
**So that** I can ensure proper user feedback for sync operations

## Context

**Current System:**

- Universe button functional from AK.2
- NotificationService exists in the system
- Need to add success/error notifications for sync operations

**TDD Approach:**

- Write failing tests first (RED)
- Disable tests to keep CI green
- Implementation story (AK.4) will re-enable and make tests pass (GREEN)

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for success notification on sync completion
- [ ] Unit tests written for error notification on sync failure
- [ ] Tests verify NotificationService.success() called with correct message
- [ ] Tests verify NotificationService.error() called with correct message
- [ ] **CRITICAL** Tests are disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Use Vitest for unit testing
- [ ] Mock NotificationService
- [ ] Test notification messages contain sync results
- [ ] Follow existing notification test patterns

## Test-Driven Development Approach

### Step 1: Create Failing Unit Tests

Add to the component test file:

```typescript
import { NotificationService } from './notification.service';

describe.skip('Universe Sync Notifications', () => {
  let component: /* YourComponent */;
  let fixture: ComponentFixture</* YourComponent */>;
  let mockSyncService: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockSyncService = {
      syncFromScreener: vi.fn().mockReturnValue(of({ success: true, count: 10 })),
      loading: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
    };

    mockNotificationService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [/* YourComponent */],
      providers: [
        { provide: UniverseSyncService, useValue: mockSyncService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    });

    fixture = TestBed.createComponent(/* YourComponent */);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show success notification when sync completes', () => {
    mockSyncService.syncFromScreener.mockReturnValue(
      of({ success: true, count: 15, message: 'Universe updated' })
    );

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    button.click();
    fixture.detectChanges();

    expect(mockNotificationService.success).toHaveBeenCalledWith(
      expect.stringContaining('15')
    );
  });

  it('should show error notification when sync fails', () => {
    const errorMessage = 'Sync failed: Server error';
    mockSyncService.syncFromScreener.mockReturnValue(
      throwError(() => new Error(errorMessage))
    );

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    button.click();
    fixture.detectChanges();

    expect(mockNotificationService.error).toHaveBeenCalledWith(
      expect.stringContaining('failed')
    );
  });

  it('should display count of updated symbols in success message', () => {
    mockSyncService.syncFromScreener.mockReturnValue(
      of({ success: true, count: 25 })
    );

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    button.click();
    fixture.detectChanges();

    expect(mockNotificationService.success).toHaveBeenCalledWith(
      expect.stringMatching(/25.*symbol/i)
    );
  });

  it('should not show notification if sync is cancelled', () => {
    // Simulate already loading state
    mockSyncService.loading.mockReturnValue(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    button.click();
    fixture.detectChanges();

    expect(mockNotificationService.success).not.toHaveBeenCalled();
    expect(mockNotificationService.error).not.toHaveBeenCalled();
  });

  it('should include error details in error notification', () => {
    const errorDetails = 'Network timeout occurred';
    mockSyncService.syncFromScreener.mockReturnValue(
      throwError(() => ({ message: errorDetails }))
    );

    const button = fixture.nativeElement.querySelector('[data-testid="update-universe-button"]');
    button.click();
    fixture.detectChanges();

    expect(mockNotificationService.error).toHaveBeenCalledWith(
      expect.stringContaining(errorDetails)
    );
  });
});
```

### Step 2: Verify Tests Are RED

Run the tests to confirm they fail:

```bash
pnpm test
```

Expected: Tests should fail because:

- NotificationService not yet injected
- Success handler not implemented
- Error handler not implemented

### Step 3: Disable Tests for CI

Ensure all tests use `.skip` so CI pipeline passes.

## Definition of Done

- [ ] Unit tests created for sync notifications
- [ ] Tests cover success scenarios with count
- [ ] Tests cover error scenarios with messages
- [ ] Tests cover edge cases (cancelled operations)
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
- Story AK.4 will implement notification functionality
- Follow existing NotificationService usage patterns
- Success message should include count of synced symbols

## Related Stories

- **Prerequisite**: Story AK.2 (Button implementation)
- **Next**: Story AK.4 (Notification implementation)
- **Related**: Story AK.5 (E2E TDD tests)
