# Epic O: Persistent Toast Notifications for Long-Running Operations

## Epic Goal

Replace auto-dismissing toast notifications with persistent toast messages for long-running operations (Update Fields, Update Universe) so users can see success/error messages even when they walk away from the screen during processing.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Universe screen with "Update Fields" and "Update Universe" buttons that show temporary toast notifications
- Technology stack: Angular 20 frontend with PrimeNG, Fastify backend with Prisma ORM, SQLite database
- Integration points: PrimeNG Toast component, Universe sync operations, long-running background processes

**Enhancement Details:**

- What's being added/changed: Convert auto-dismissing toast messages to persistent (sticky) notifications that require manual dismissal
- How it integrates: Updates existing toast notification configuration for specific long-running operations
- Success criteria: Users can see operation results even when returning to screen after extended processing time

## Stories

1. **Story 1:** Implement persistent toast notifications for Update Fields and Update Universe operations

## Compatibility Requirements

- [x] Existing toast notification functionality for other operations remains unchanged
- [x] Persistent toasts only apply to specifically identified long-running operations
- [x] Toast messages maintain current styling and content
- [x] Manual dismissal mechanism works consistently across all browsers

## Technical Constraints

- Angular 20 with signals-based state management
- PrimeNG component library with TailwindCSS styling
- Existing MessageService integration must be maintained
- All changes must pass existing lint, format, and test requirements
- Persistent toasts must not accumulate indefinitely

## Success Metrics

- Toast messages for Update Fields remain visible until manually dismissed
- Toast messages for Update Universe remain visible until manually dismissed
- Other operation toasts continue with normal auto-dismiss behavior
- Users can clearly distinguish between persistent and temporary toasts
- No memory leaks or performance issues from accumulated toast messages
- Clear visual indicators allow users to easily dismiss persistent toasts

## Dependencies

- Builds on existing Universe screen toast notification infrastructure
- Requires understanding of current MessageService configuration
- Integrates with existing Update Fields and Update Universe operations

## Definition of Done

- [ ] Update Fields operation shows persistent success/error toasts
- [ ] Update Universe operation shows persistent success/error toasts
- [ ] Persistent toasts require manual dismissal (sticky: true)
- [ ] Other operations maintain normal auto-dismiss behavior
- [ ] Visual indicators clearly show dismissal options
- [ ] All existing tests pass plus new test coverage for persistent toast behavior
- [ ] Manual testing confirms toasts persist through long operations
