# Story AK.2: Wire Update Universe Button to UniverseSyncService

## Story

**As a** user
**I want** the Update Universe button to sync universe data from screener selections
**So that** I can update my universe based on screener analysis

## Context

**Current System:**

- TDD tests written in Story AK.1 (currently disabled)
- UniverseSyncService exists with syncFromScreener() method
- Button exists in UI but not wired to service

**Implementation Approach:**

- Re-enable tests from AK.1
- Implement functionality to make tests pass (GREEN phase)
- Wire button click to service method
- Manage loading state properly

## Acceptance Criteria

### Functional Requirements

- [ ] Update Universe button triggers UniverseSyncService.syncFromScreener()
- [ ] Button shows loading state during sync operation
- [ ] Button is disabled during sync to prevent duplicate requests
- [ ] Re-enable unit tests from AK.1 and ensure they pass

### Technical Requirements

- [ ] Use Angular signals for state management
- [ ] Inject UniverseSyncService into component
- [ ] Add proper data-testid="update-universe-button" attribute
- [ ] Handle observable subscription properly (use async pipe or takeUntilDestroyed)

## Implementation Details

### Step 1: Re-enable Tests from AK.1

Remove `.skip` from the test suite created in Story AK.1:

```typescript
// Change from describe.skip to describe
describe('Universe Update Button Integration', () => {
  // ... tests
});
```

### Step 2: Verify Tests Fail (RED State)

Run tests to confirm they fail:

```bash
pnpm test
```

### Step 3: Wire Button to Service

In the component containing the Update Universe button:

```typescript
import { Component, inject } from '@angular/core';
import { UniverseSyncService } from './universe-sync.service';

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

  handleUpdateUniverse(): void {
    if (this.syncService.loading()) {
      return; // Prevent duplicate requests
    }

    this.syncService.syncFromScreener().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}
```

### Step 4: Verify Tests Pass (GREEN State)

Run tests again:

```bash
pnpm test
```

All tests from AK.1 should now pass.

### Step 5: Manual Testing

1. Navigate to Global/Universe screen
2. Click "Update Universe" button
3. Verify:
   - Button shows "Syncing..." during operation
   - Button is disabled during sync
   - Button re-enables after completion

## Definition of Done

- [ ] Button click triggers UniverseSyncService.syncFromScreener()
- [ ] Loading state properly displayed on button
- [ ] Button disabled during operation
- [ ] All unit tests from AK.1 re-enabled and passing
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

- This story makes the RED tests from AK.1 turn GREEN
- Success/error notifications will be added in Story AK.4
- E2E tests will be added in Stories AK.5-AK.6
- Follow Angular best practices for signal-based state management

## Related Stories

- **Prerequisite**: Story AK.1 (TDD tests)
- **Next**: Story AK.3 (TDD for notifications)
- **Related**: Epic AJ (Screener functionality)
