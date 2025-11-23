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

- [ ] `show(message, severity)` - Generic notification
- [ ] `success(message)` - Success notification
- [ ] `info(message)` - Info notification
- [ ] `warn(message)` - Warning notification
- [ ] `error(message)` - Error notification
- [ ] `showPersistent(message, severity)` - Persistent notification (no auto-dismiss)
- [ ] Configurable position and duration
- [ ] Severity-based styling

## Definition of Done

- [x] Service created and exported
- [x] All severity methods available
- [x] Snackbar styling applied
- [x] All validation commands pass
