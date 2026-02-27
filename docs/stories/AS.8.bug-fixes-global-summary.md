# Story AS.8: Bug Fixes for Global Summary

**Status:** Approved

## Story

**As a** user
**I want** the Global Summary feature to work reliably with real data
**So that** I can confidently use it for portfolio analysis

## Context

**Current System:**

- Epic AS (AS.1–AS.7) is functionally complete
- All unit tests passing
- Feature ready for integration testing with real backend
- Need to verify functionality with actual data and fix any issues

**Purpose:**

- Verify feature works with real backend data
- Identify and fix any bugs discovered during verification
- Ensure edge cases are handled correctly
- Prepare for E2E testing in Story AS.9

**Bug Discovery Process:**

1. Test with real backend in local environment
2. Test with various data scenarios (empty, single, many risk groups)
3. Test month selection with different time ranges
4. Test error conditions (backend down, network errors)
5. Document all bugs found
6. Fix bugs with targeted, minimal changes
7. Add regression tests for each bug

## Acceptance Criteria

### Functional Requirements

1. [ ] Feature works correctly with real backend data
2. [ ] Empty state displays correctly when no data available
3. [ ] Loading states display correctly during API calls
4. [ ] Error states display correctly on API failures
5. [ ] Month selection works smoothly without UI glitches
6. [ ] Charts render correctly with various data sizes
7. [ ] All identified bugs fixed and verified

### Technical Requirements

1. [ ] Regression tests added for each bug fixed
2. [ ] All existing tests still passing
3. [ ] Code follows project coding standards
4. [ ] No console errors or warnings
5. [ ] Performance acceptable with large datasets

## Tasks / Subtasks

- [ ] Set up local testing environment (AC: 1)
  - [ ] Start local backend server
  - [ ] Seed database with test data
  - [ ] Configure frontend to use local backend
- [ ] Test basic functionality (AC: 1-6)
  - [ ] Verify component loads on navigation
  - [ ] Verify summary data displays correctly
  - [ ] Verify pie chart renders
  - [ ] Verify month selector populates
  - [ ] Verify month changes update data
  - [ ] Verify loading spinners during API calls
  - [ ] Verify error messages on failures
- [ ] Test edge cases (AC: 2, 6)
  - [ ] Test with empty risk groups
  - [ ] Test with single risk group
  - [ ] Test with many risk groups (10+)
  - [ ] Test with very large amounts
  - [ ] Test with zero/negative values
  - [ ] Test with missing months data
- [ ] Test error conditions (AC: 4)
  - [ ] Test with backend stopped
  - [ ] Test with network disconnected
  - [ ] Test with 404 response
  - [ ] Test with 500 response
  - [ ] Test with malformed response
- [ ] Document bugs found (AC: 7)
  - [ ] Create bug list in this story
  - [ ] Prioritize bugs (critical, major, minor)
  - [ ] Document reproduction steps
- [ ] Fix bugs (AC: 7)
  - [ ] Fix each bug with minimal changes
  - [ ] Add regression test for each bug
  - [ ] Verify fix works
  - [ ] Re-test to ensure no new bugs introduced
- [ ] Final verification (AC: 1-7)
  - [ ] Run all unit tests
  - [ ] Run all validation commands
  - [ ] Manual testing of all scenarios
  - [ ] Verify no console errors

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Testing Approach:** Manual testing + automated regression tests
- **Bug Fix Pattern:** Reproduce → Test → Fix → Verify

### Technical Context

- Component: `apps/dms-material/src/app/global/global-summary.ts`
- Service: `apps/dms-material/src/app/global/services/summary.service.ts`
- Backend endpoints:
  - GET `/api/summary?month=YYYY-MM`
  - GET `/api/summary/months`
- Local development: `pnpm dev` starts frontend and backend

### Local Testing Setup

```bash
# Terminal 1: Start backend
cd apps/server
pnpm dev

# Terminal 2: Start frontend
cd apps/dms-material
pnpm dev

# Navigate to http://localhost:4200/global/summary
```

### Bug Template

For each bug found, document:

```markdown
#### Bug #X: [Short Description]

**Severity:** Critical | Major | Minor

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. ...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Error Messages:**
Any console errors or error messages

**Fix:**
Description of the fix applied

**Regression Test:**
Test added to prevent recurrence
```

### Common Bug Categories

Based on similar stories, watch for:

1. **Data Transformation Issues**
   - Incorrect calculations
   - Null/undefined handling
   - Type mismatches

2. **UI State Issues**
   - Loading state not clearing
   - Error state not displaying
   - Disabled controls not re-enabling

3. **API Integration Issues**
   - Incorrect parameter passing
   - Response parsing errors
   - Caching issues

4. **Chart Rendering Issues**
   - Empty charts not showing message
   - Color assignment problems
   - Tooltip formatting errors

5. **Month Selector Issues**
   - Default month not set
   - Month changes not triggering refresh
   - Selector not populated

### Example Bug Fix Pattern

```typescript
// Before (bug):
this.selectedMonth.valueChanges.subscribe((month) => {
  this.loadSummaryData(); // Called even if month is null
});

// After (fix):
this.selectedMonth.valueChanges.subscribe((month) => {
  if (month && month !== '') { // Guard clause added
    this.loadSummaryData();
  }
});

// Regression test:
it('should not load data when month is empty string', () => {
  component.selectedMonth.setValue('');
  httpMock.expectNone(/\/api\/summary/);
});
```

## Bug List

*Bugs will be documented here as they are discovered*

<!--
Example:
### Bug #1: Loading spinner doesn't clear on error

**Severity:** Major

**Steps to Reproduce:**
1. Stop backend server
2. Navigate to /global/summary
3. Observe loading spinner

**Expected Behavior:**
Loading spinner should clear and error message should display

**Actual Behavior:**
Loading spinner continues indefinitely

**Fix:**
Added `this.isLoading.set(false)` to error handler

**Regression Test:**
Added test "should set loading to false on error" in global-summary.spec.ts
-->

## Definition of Done

- [ ] Feature tested with real backend
- [ ] All edge cases tested
- [ ] All error conditions tested
- [ ] All bugs documented
- [ ] All critical and major bugs fixed
- [ ] Regression tests added for each bug
- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Manual verification complete
- [ ] Changes reviewed and approved

## Notes

- This story is about verification and bug fixing, not new features
- Focus on making the feature production-ready
- Document all bugs even if they're minor (can be fixed later)
- Prioritize bugs that would impact E2E testing
- Keep fixes minimal and targeted
- Some bugs may require updating tests to match correct behavior

## Related Stories

- **Previous:** Story AS.7 (Add Unit Tests)
- **Next:** Story AS.9 (Add E2E Tests)
- **Epic:** Epic AS - Wire Up Global/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-02-27 | 1.0     | Initial creation | QA     |

---

## QA Results

*QA assessment will be recorded here after story review*

---

## Dev Agent Record

*This section will be populated during story implementation*
