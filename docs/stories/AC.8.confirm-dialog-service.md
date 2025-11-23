# Story AC.8: Confirm Dialog Service

## Story

**As a** user performing destructive actions
**I want** a confirmation dialog before the action executes
**So that** I can prevent accidental data loss

## Status

**COMPLETED** - This service was created as part of Story AB.1 (Shell Component Migration).

## Reference

See the following files created in AB.1:

- `apps/rms-material/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`
- `apps/rms-material/src/app/shared/services/confirm-dialog.service.ts`

## Features Implemented

- [ ] `confirm(data)` - Opens confirmation dialog
- [ ] Customizable title and message
- [ ] Customizable button labels
- [ ] Returns Observable<boolean> with user choice
- [ ] Modal with backdrop
- [ ] Focus management for accessibility

## Usage

```typescript
this.confirmDialog
  .confirm({
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
  })
  .subscribe((confirmed) => {
    if (confirmed) {
      // Perform delete
    }
  });
```

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

Create `apps/rms-material/src/app/shared/services/confirm-dialog.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;
  let mockDialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDialog = { open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }) };
    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: mockDialog }],
    });
    service = TestBed.inject(ConfirmDialogService);
  });

  it('should open dialog with data', () => {
    service.confirm({ title: 'Test', message: 'Confirm?' });
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should return true when confirmed', (done) => {
    service.confirm({ title: 'Test', message: 'Confirm?' }).subscribe((result) => {
      expect(result).toBe(true);
      done();
    });
  });

  it('should return false when cancelled', (done) => {
    mockDialog.open.mockReturnValue({ afterClosed: () => of(false) });
    service.confirm({ title: 'Test', message: 'Confirm?' }).subscribe((result) => {
      expect(result).toBe(false);
      done();
    });
  });
});
```

## Definition of Done

- [x] Dialog component created
- [x] Service with confirm method
- [x] Observable return type
- [x] Customizable options
- [x] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Confirm dialog displays with title and message
- [ ] Custom button labels display correctly
- [ ] Confirm button returns true
- [ ] Cancel button returns false
- [ ] Dialog closes on button click
- [ ] Focus trapped within dialog
- [ ] Escape key closes dialog (returns false)

### Edge Cases

- [ ] Dialog blocks interaction with background content
- [ ] Multiple dialogs stack correctly (rare but possible)
- [ ] Very long title/message text wraps correctly
- [ ] Dialog centered on screen at all viewport sizes
- [ ] Dialog accessible via screen reader (role="dialog")
- [ ] Enter key triggers confirm (when confirm button focused)
- [ ] Tab cycles through dialog buttons correctly
- [ ] Dialog animation completes before result returned
- [ ] Clicking backdrop does not close dialog (modal behavior)
- [ ] Dialog handles rapid confirm/cancel clicks gracefully
- [ ] Custom icon support works correctly
- [ ] Danger/destructive action styling option works
- [ ] Dialog content with HTML is escaped (XSS prevention)

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
