# Story AL.3: Write Unit Tests for Update Fields Button Integration (TDD)

## Dev Agent Record

### Tasks

- [x] Add UpdateUniverseFieldsService and GlobalLoadingService imports
- [x] Create test suite for Update Fields button integration
- [x] Write tests for guard condition (already updating)
- [x] Write tests for loading overlay display
- [x] Write tests for service method calls
- [x] Write tests for success notifications
- [x] Write tests for error handling and notifications
- [x] Disable tests with describe.skip for TDD RED phase

### Status

Ready for Review (TDD RED phase - tests written and disabled)

### File List

- apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts (modified)
- docs/stories/AL.3.tdd-wire-update-fields-button.md

### Completion Notes

- Added 8 unit tests for Update Fields button integration
- Tests cover guard conditions, loading states, service calls, success/error handling
- Tests follow existing component test patterns
- All tests disabled with describe.skip to allow CI to pass
- Mocked UpdateUniverseFieldsService, GlobalLoadingService, NotificationService
- Ready for GREEN phase implementation in Story AL.4

### Agent Model Used

Claude Sonnet 4.5

## Story

**As a** developer
**I want** to write unit tests for Update Fields button integration
**So that** the button behavior is clearly defined before wiring

## Context

**Current System:**

- UpdateUniverseFieldsService implemented (Story AL.2)
- Update Fields button exists with placeholder implementation
- Need to define button integration behavior before implementation

**TDD Approach:**

- Write tests first (RED phase)
- Define button click behavior, loading states, notifications
- Disable failing tests to allow CI to pass
- Story AL.4 will wire the button (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [x] Unit tests written for Update Fields button in GlobalUniverseComponent
- [x] Tests cover button click handling
- [x] Tests cover loading state display
- [x] Tests cover success notification
- [x] Tests cover error notification
- [x] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [x] Tests follow existing component test patterns
- [x] Tests mock UpdateUniverseFieldsService
- [x] Tests mock GlobalLoadingService
- [x] Tests mock NotificationService
- [x] Tests verify service method calls

## Implementation Details

### Step 1: Add Tests to Component Test File

Update `apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts`:

```typescript
describe.skip('updateFields()', () => {
  it('should not call service if already updating', () => {
    const updateFieldsService = TestBed.inject(UpdateUniverseFieldsService);
    updateFieldsService.isUpdating.set(true);

    component.updateFields();

    expect(updateFieldsService.updateFields).not.toHaveBeenCalled();
  });

  it('should show global loading overlay when update starts', () => {
    const globalLoading = TestBed.inject(GlobalLoadingService);
    const updateFieldsService = TestBed.inject(UpdateUniverseFieldsService);

    component.updateFields();

    expect(globalLoading.show).toHaveBeenCalledWith('Updating universe fields...');
  });

  it('should call updateFields service method', () => {
    const updateFieldsService = TestBed.inject(UpdateUniverseFieldsService);

    component.updateFields();

    expect(updateFieldsService.updateFields).toHaveBeenCalled();
  });

  it('should hide loading overlay on success', fakeAsync(() => {
    const globalLoading = TestBed.inject(GlobalLoadingService);

    component.updateFields();
    tick();

    expect(globalLoading.hide).toHaveBeenCalled();
  }));

  it('should show success notification with count', fakeAsync(() => {
    const notification = TestBed.inject(NotificationService);

    component.updateFields();
    tick();

    expect(notification.showPersistent).toHaveBeenCalledWith(jasmine.stringContaining('10 entries updated'), 'success');
  }));

  it('should hide loading overlay on error', fakeAsync(() => {
    const updateFieldsService = TestBed.inject(UpdateUniverseFieldsService);
    const globalLoading = TestBed.inject(GlobalLoadingService);

    jest.spyOn(updateFieldsService, 'updateFields').mockReturnValue(throwError(() => new Error('Update failed')));

    component.updateFields();
    tick();

    expect(globalLoading.hide).toHaveBeenCalled();
  }));

  it('should show error notification on failure', fakeAsync(() => {
    const updateFieldsService = TestBed.inject(UpdateUniverseFieldsService);
    const notification = TestBed.inject(NotificationService);

    jest.spyOn(updateFieldsService, 'updateFields').mockReturnValue(throwError(() => new Error('Update failed')));

    component.updateFields();
    tick();

    expect(notification.showPersistent).toHaveBeenCalledWith(jasmine.stringContaining('Failed to update'), 'error');
  }));
});
```

## Definition of Done

- [x] Unit tests written for button integration
- [x] Tests cover all acceptance criteria
- [x] Tests disabled with `describe.skip`
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## QA Results

### Gate Status

Gate: PASS → docs/qa/gates/AL.3-write-unit-tests-for-update-fields-button-integration.yml

## Notes

- This is the TDD RED phase
- Tests disabled with `.skip` to allow CI to pass
- Story AL.4 will implement button wiring (GREEN phase)

## Related Stories

- **Prerequisite**: Story AL.2
- **Next**: Story AL.4
- **Epic**: Epic AL
