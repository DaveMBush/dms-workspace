# Story AW.11: Integration Testing, Verification, and Bug Fixes

## Story

**As a** developer
**I want** to perform comprehensive integration testing and fix any issues discovered
**So that** server-side sorting works flawlessly before creating e2e tests

## Context

**Current System:**

- All individual stories (AW.1-AW.10) completed
- Unit tests passing for each component
- Need to verify full integration works end-to-end
- Need to catch and fix any integration issues

**Implementation Approach:**

- Manual testing of all sorting scenarios
- Integration testing of full data flow
- Fix any bugs or edge cases discovered
- Verify performance improvements
- Ensure backward compatibility if needed

## Acceptance Criteria

### Functional Requirements

- [ ] Manual testing completed for all sorting scenarios
  - [ ] Universe table sorting (all fields, both directions)
  - [ ] Open trades table sorting (all fields, both directions)
  - [ ] Closed trades table sorting (all fields, both directions)
- [ ] Sort state persists across page refreshes
- [ ] HTTP interceptor correctly adds headers
- [ ] Backend correctly processes sort headers
- [ ] All bugs discovered and fixed
- [ ] Performance improvements verified

### Technical Requirements

- [ ] No console errors during sorting operations
- [ ] Network requests show correct headers
- [ ] Database queries use proper ORDER BY clauses
- [ ] No regression in existing functionality
- [ ] All edge cases handled

## Implementation Details

### Step 1: Manual Testing Checklist

Test each scenario manually:

```
✓ Universe Table:
  - Sort by symbol (asc/desc)
  - Sort by name (asc/desc)
  - Sort by sector (asc/desc)
  - Sort by market cap (asc/desc)
  - Refresh page - verify sort persists

✓ Open Trades Table:
  - Sort by symbol (asc/desc)
  - Sort by open date (asc/desc)
  - Sort by current value (asc/desc)
  - Sort by unrealized gain (asc/desc)
  - Refresh page - verify sort persists

✓ Closed Trades Table:
  - Sort by symbol (asc/desc)
  - Sort by close date (asc/desc)
  - Sort by profit (asc/desc)
  - Sort by percent gain (asc/desc)
  - Refresh page - verify sort persists
```

### Step 2: Verify Network Requests

Use browser DevTools to verify:

```
✓ Headers present in requests:
  - X-Sort-Field: <field>
  - X-Sort-Order: <asc|desc>

✓ Correct endpoints called:
  - /api/universe
  - /api/trades/open
  - /api/trades/closed
```

### Step 3: Verify Backend Processing

Check server logs/debug output to confirm:

```
✓ Headers correctly read from requests
✓ Database queries include ORDER BY
✓ Correct sort order applied
✓ Case-insensitive sorting for text fields
```

### Step 4: Bug Fixing

Document and fix any issues found:

This should be filled in with specific scenarios as we discover the bugs using PHASE 3 of the debug.prompt.md file which you should have loaded prior to staring this story.

```
Issues Found:
1. [Issue description] → [Fix applied]
2. [Issue description] → [Fix applied]
...
```

### Step 5: Performance Verification

Measure and compare performance:

```
Before (client-side sorting):
- Universe load time: [X]ms
- Open trades load time: [X]ms
- Closed trades load time: [X]ms

After (server-side sorting):
- Universe load time: [Y]ms
- Open trades load time: [Y]ms
- Closed trades load time: [Y]ms

Improvement: [%] faster
```

## Definition of Done

- [ ] All manual testing scenarios passed
- [ ] All bugs discovered and fixed
- [ ] Network requests verified in browser DevTools
- [ ] Backend processing verified
- [ ] Performance improvements documented
- [ ] No regression in existing functionality
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is a verification and bug fix story
- No new features added, only fixes
- Document all issues found and resolved
- Ready for e2e test creation after this story

## Related Stories

- **Previous**: Story AW.10 (Remove client-side sorting)
- **Next**: Story AW.12 (E2E Tests)
- **Epic**: Epic AW

---

## Dev Agent Record

### Agent Model Used

### Status

Approved

### Tasks / Subtasks

### File List

### Change Log

### Debug Log References
