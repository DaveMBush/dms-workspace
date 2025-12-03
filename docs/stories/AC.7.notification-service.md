# Story AC.7: Notification Service

## Story

**As a** user performing actions in the application
**I want** feedback via toast notifications
**So that** I know when actions succeed or fail

## Status

**COMPLETED** - This service was created as part of Story AB.1 (Shell Component Migration).

## Reference

See `apps/rms-material/src/app/shared/services/notification.service.ts` created in AB.1.

## Features Implemented

- [ ] All GUI look as close to the existing RMS app as possible
- [ ] `show(message, severity)` - Generic notification
- [ ] `success(message)` - Success notification
- [ ] `info(message)` - Info notification
- [ ] `warn(message)` - Warning notification
- [ ] `error(message)` - Error notification
- [ ] `showPersistent(message, severity)` - Persistent notification (no auto-dismiss)
- [ ] Configurable position and duration
- [ ] Severity-based styling

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

Create `apps/rms-material/src/app/shared/services/notification.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockSnackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSnackBar = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: mockSnackBar }],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should show success with green styling', () => {
    service.success('Success!');
    expect(mockSnackBar.open).toHaveBeenCalledWith('Success!', 'Close', expect.objectContaining({ panelClass: ['snackbar-success'] }));
  });

  it('should show error with red styling', () => {
    service.error('Error!');
    expect(mockSnackBar.open).toHaveBeenCalledWith('Error!', 'Close', expect.objectContaining({ panelClass: ['snackbar-error'] }));
  });

  it('should show persistent without auto-dismiss', () => {
    service.showPersistent('Persistent', 'info');
    expect(mockSnackBar.open).toHaveBeenCalledWith('Persistent', 'Dismiss', expect.objectContaining({ duration: 0 }));
  });
});
```

## Definition of Done

- [x] Service created and exported
- [x] All severity methods available
- [x] Snackbar styling applied
- [x] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Success notification displays green styling
- [ ] Error notification displays red styling
- [ ] Warning notification displays orange styling
- [ ] Info notification displays blue styling
- [ ] Notifications auto-dismiss after timeout
- [ ] Persistent notifications require manual dismiss
- [ ] Dismiss button closes notification

### Edge Cases

- [ ] Multiple notifications stack correctly (most recent on top)
- [ ] Maximum notifications limit enforced (older dismissed)
- [ ] Very long message text wraps correctly
- [ ] Notification with HTML content is escaped (XSS prevention)
- [ ] Notification accessible via screen reader
- [ ] Notification position consistent across different pages
- [ ] Notification visible over all z-index layers
- [ ] Rapid fire notifications don't cause performance issues
- [ ] Dismiss all clears all active notifications
- [ ] Action button in notification works correctly
- [ ] Notification survives page navigation (if configured)
- [ ] Dark theme applies correct notification colors

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
