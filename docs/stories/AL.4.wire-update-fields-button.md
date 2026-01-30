# Story AL.4: Wire Update Fields Button to Service (Implementation)

## Story

**As a** developer
**I want** to wire the Update Fields button to UpdateUniverseFieldsService
**So that** users can update universe field data

## Context

**Current System:**

- UpdateUniverseFieldsService implemented (Story AL.2)
- Unit tests for button integration written (Story AL.3)
- Tests are currently disabled with `.skip`

**Implementation Approach:**

- Wire updateFields() method to service
- Add loading overlay and notifications
- Re-enable tests from AL.3
- Ensure all tests pass

## Acceptance Criteria

### Functional Requirements

- [ ] updateFields() method wired to UpdateUniverseFieldsService
- [ ] Global loading overlay shown during operation
- [ ] Success notification displays update count
- [ ] Error notification displays on failure
- [ ] Button respects service isUpdating state
- [ ] Tests from AL.3 re-enabled and passing

### Technical Requirements

- [ ] Service injection in component
- [ ] Proper error handling
- [ ] Loading state management
- [ ] Notification integration
- [ ] Follows established patterns from syncUniverse()

## Implementation Details

### Step 1: Update Component

In `global-universe.component.ts`, replace placeholder with:

```typescript
updateFields(): void {
  // Don't update if already in progress
  if (this.updateFieldsService.isUpdating()) {
    return;
  }

  this.globalLoading.show('Updating universe fields...');

  const context = this;
  this.updateFieldsService.updateFields().subscribe({
    next: function onUpdateSuccess(summary) {
      context.globalLoading.hide();
      context.notification.showPersistent(
        `Universe fields updated: ${summary.updated} entries updated.`,
        'success'
      );
    },
    error: function onUpdateError(error: unknown) {
      context.globalLoading.hide();

      const errorMessage = context.extractErrorMessage(error);

      context.notification.showPersistent(
        `Failed to update fields: ${errorMessage}`,
        'error'
      );
    },
  });
}
```

### Step 2: Add Service Injection

```typescript
private readonly updateFieldsService = inject(UpdateUniverseFieldsService);
```

### Step 3: Update Button Disabled State

In template, update button:

```html
<button mat-icon-button data-testid="update-fields-button" matTooltip="Update Fields" (click)="updateFields()" [disabled]="updateFieldsService.isUpdating()"></button>
```

### Step 4: Re-enable Tests

In component spec, change `describe.skip` to `describe`

## Definition of Done

- [ ] Button wired to service
- [ ] Loading overlay integrated
- [ ] Notifications integrated
- [ ] All tests from AL.3 re-enabled and passing
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## QA Results

### Review Date: 2026-01-29

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

Implementation follows established patterns from syncUniverse(), proper service injection, error handling, and loading state management.

### Refactoring Performed

None required - code quality is good.

### Compliance Check

- Coding Standards: ✓ Follows established patterns
- Project Structure: ✓ Proper service injection and component structure
- Testing Strategy: ✓ Unit tests enabled and passing
- All ACs Met: ✓ All acceptance criteria implemented

### Improvements Checklist

- [x] Service properly wired to button
- [x] Loading overlay integrated
- [x] Success/error notifications implemented
- [x] Button disabled state respects service state
- [x] Tests from AL.3 re-enabled and passing

### Security Review

No security concerns identified.

### Performance Considerations

No performance issues identified.

### Files Modified During Review

None.

### Gate Status

Gate: PASS → docs/qa/gates/AL.4-wire-update-fields-button.yml

### Recommended Status

✓ Ready for Done
