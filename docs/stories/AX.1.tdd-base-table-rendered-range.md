# Story AX.1: TDD - Expose rendered range from BaseTableComponent

## Story

**As a** developer
**I want** to write unit tests for the `renderedRangeChange` output from `BaseTableComponent`
**So that** I have failing tests that define the expected behavior for viewport range tracking (TDD RED phase)

## Context

**Current System:**
- `BaseTableComponent` uses CDK virtual scrolling
- No mechanism to notify consumers about which rows are currently visible
- Components need visible range info to implement virtual data access patterns

**Implementation Approach:**
- Write tests for `renderedRangeChange` signal output
- Test subscription to `viewport().renderedRangeStream`
- Test debouncing and cleanup
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AX.2

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for `BaseTableComponent` viewport range tracking
  - [ ] Test that component subscribes to `viewport().renderedRangeStream` in `ngAfterViewInit`
  - [ ] Test that `renderedRangeChange` output emits when range changes
  - [ ] Test that emissions are debounced (100ms)
  - [ ] Test cleanup with `takeUntilDestroyed`
  - [ ] Mock viewport and its `renderedRangeStream`
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip()` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing Angular testing patterns
- [ ] Viewport properly mocked
- [ ] Test coverage includes lifecycle hooks
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write BaseTableComponent Range Tracking Tests

Location: `apps/dms-material/src/app/shared/components/base-table/base-table.component.spec.ts`

Add test suite:

```typescript
describe.skip('Rendered Range Tracking', () => {
  it('should subscribe to viewport renderedRangeStream in ngAfterViewInit');
  it('should emit renderedRangeChange when viewport range changes');
  it('should debounce range emissions by 100ms');
  it('should cleanup subscription on destroy');
  it('should handle undefined viewport gracefully');
});
```

### Step 2: Run Tests and Verify RED Phase

```bash
pnpm test apps/dms-material
```

Verify all new tests are skipped.

### Step 3: Confirm Tests Would Fail

Temporarily remove `.skip()` from one test to verify it fails, then re-add `.skip()`.

## Definition of Done

- [ ] All unit tests written and disabled (RED phase)
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Tests disabled to allow CI to pass
- [ ] Test code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Notes

- This is the TDD RED phase
- Tests should fail because implementation doesn't exist yet
- Tests must be disabled before merge to allow CI to pass
- Story AX.2 will implement the functionality and re-enable tests

## Related Stories

- **Next**: Story AX.2 (Implementation)
- **Epic**: Epic AX
- **Dependencies**: None

---

## Dev Agent Record

### Status

Draft
