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

## Definition of Done

- [x] Dialog component created
- [x] Service with confirm method
- [x] Observable return type
- [x] Customizable options
- [x] All validation commands pass
