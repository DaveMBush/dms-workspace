# Story AK.4: Implement Success/Error Notifications for Universe Sync

## Story

**As a** user
**I want** to receive feedback when universe sync completes or fails
**So that** I know whether the operation was successful

## Context

**Current System:**

- TDD tests written in Story AK.3 (currently disabled)
- Universe button functional from AK.2
- NotificationService available in the system

**Implementation Approach:**

- Re-enable tests from AK.3
- Implement notification handlers to make tests pass (GREEN phase)
- Add success notifications with count
- Add error notifications with details

## Acceptance Criteria

### Functional Requirements

- [ ] Success notification shows when sync completes
- [ ] Success message includes count of synced symbols
- [ ] Error notification shows when sync fails
- [ ] Error message includes failure details
- [ ] Re-enable unit tests from AK.3 and ensure they pass

### Technical Requirements

- [ ] Inject NotificationService into component
- [ ] Use RxJS operators for error handling
- [ ] Success notification uses NotificationService.success()
- [ ] Error notification uses NotificationService.error()

## Implementation Details

### Step 1: Re-enable Tests from AK.3

Remove `.skip` from the test suite created in Story AK.3:

```typescript
// Change from describe.skip to describe
describe('Universe Sync Notifications', () => {
  // ... tests
});
```

### Step 2: Verify Tests Fail (RED State)

Run tests to confirm they fail:

```bash
pnpm test
```

### Step 3: Implement Notification Handlers

Update the component to add notifications:

```typescript
import { Component, inject } from '@angular/core';
import { UniverseSyncService } from './universe-sync.service';
import { NotificationService } from './notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, tap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

@Component({
  selector: 'app-your-component',
  template: `
    <button data-testid="update-universe-button" [disabled]="syncService.loading()" (click)="handleUpdateUniverse()">
      {{ syncService.loading() ? 'Syncing...' : 'Update Universe' }}
    </button>
  `,
})
export class YourComponent {
  protected syncService = inject(UniverseSyncService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  handleUpdateUniverse(): void {
    if (this.syncService.loading()) {
      return;
    }

    this.syncService
      .syncFromScreener()
      .pipe(
        tap((result) => {
          const count = result.count || 0;
          this.notificationService.success(`Universe updated successfully with ${count} symbol${count !== 1 ? 's' : ''}`);
        }),
        catchError((error) => {
          const message = error?.message || 'Unknown error';
          this.notificationService.error(`Universe sync failed: ${message}`);
          return EMPTY; // Complete the observable
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }
}
```

### Step 4: Verify Tests Pass (GREEN State)

Run tests again:

```bash
pnpm test
```

All tests from AK.3 should now pass.

### Step 5: Manual Testing

1. Navigate to Global/Universe screen
2. Click "Update Universe" button
3. Verify success notification appears with correct count
4. Test error scenario (disconnect network or use dev tools)
5. Verify error notification appears with error details

## Definition of Done

- [ ] Success notifications implemented and working
- [ ] Error notifications implemented and working
- [ ] Notification messages include appropriate details
- [ ] All unit tests from AK.3 re-enabled and passing
- [ ] Manual testing completed successfully
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved
- [ ] Documentation updated if needed

## Notes

- This story makes the RED tests from AK.3 turn GREEN
- Notification messages should be user-friendly
- Success message includes count for user feedback
- Error messages should be informative without exposing technical details
- E2E tests will be added in Stories AK.5-AK.6

## Related Stories

- **Prerequisite**: Story AK.3 (TDD tests)
- **Next**: Story AK.5 (E2E TDD tests)
- **Related**: Story AK.2 (Button implementation)
