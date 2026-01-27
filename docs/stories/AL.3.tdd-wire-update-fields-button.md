# Story AL.3: Write Unit Tests for Update Fields Button Integration (TDD)

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

- [ ] Unit tests written for Update Fields button in GlobalUniverseComponent
- [ ] Tests cover button click handling
- [ ] Tests cover loading state display
- [ ] Tests cover success notification
- [ ] Tests cover error notification
- [ ] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing component test patterns
- [ ] Tests mock UpdateUniverseFieldsService
- [ ] Tests mock GlobalLoadingService
- [ ] Tests mock NotificationService
- [ ] Tests verify service method calls

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

- [ ] Unit tests written for button integration
- [ ] Tests cover all acceptance criteria
- [ ] Tests disabled with `describe.skip`
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase
- Tests disabled with `.skip` to allow CI to pass
- Story AL.4 will implement button wiring (GREEN phase)

## Related Stories

- **Prerequisite**: Story AL.2
- **Next**: Story AL.4
- **Epic**: Epic AL
