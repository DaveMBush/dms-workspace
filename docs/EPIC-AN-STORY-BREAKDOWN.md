# Epic AN Story Breakdown Summary

## Overview

Epic AN has been restructured to follow the TDD RED/GREEN pattern established in Epic AM. The original 7 stories have been expanded into 12 stories that separate test writing (RED phase) from implementation (GREEN phase).

## Changes Made

### Epic File Updated

- **File**: `docs/backlog/epic-an-wire-universe-table-display.md`
- **Change**: Stories restructured from 7 to 12 following TDD pattern
- **Estimated Effort**: Updated from 3-4 days to 6-7 days

### Story Breakdown

#### Original Stories → New TDD Stories

1. **AN.1**: Wire universe table → Split into:

   - **AN.1** (TDD RED): Write Unit Tests for Universe Table SmartNgRX Integration
   - **AN.2** (TDD GREEN): Wire Universe Table to SmartNgRX Universe Entities

2. **AN.2**: Implement editable cells for distribution → Split into:

   - **AN.3** (TDD RED): Write Unit Tests for Distribution Fields Editing
   - **AN.4** (TDD GREEN): Implement Editable Cells for Distribution Fields

3. **AN.3**: Implement date editing for ex_date → Split into:

   - **AN.5** (TDD RED): Write Unit Tests for Ex-Date Editing
   - **AN.6** (TDD GREEN): Implement Date Editing for Ex_Date

4. **AN.4**: Wire up symbol and risk group filters → Split into:

   - **AN.7** (TDD RED): Write Unit Tests for Symbol and Risk Group Filters
   - **AN.8** (TDD GREEN): Wire Up Symbol and Risk Group Filters

5. **AN.5**: Wire up expired filter → Split into:

   - **AN.9** (TDD RED): Write Unit Tests for Expired Filter
   - **AN.10** (TDD GREEN): Wire Up Expired Filter

6. **AN.6**: Add unit tests → **Removed** (tests now integrated into each TDD RED story)

7. **AN.7**: Add e2e tests → Split into:
   - **AN.11** (E2E RED): Write E2E Tests for Universe Table Display
   - **AN.12** (E2E GREEN): Refine Implementation Based on E2E Test Results

## Story Files Created

All 12 story files have been created in `docs/stories/`:

1. ✅ `AN.1.tdd-universe-table-smartngrx.md`
2. ✅ `AN.2.implement-universe-table-smartngrx.md`
3. ✅ `AN.3.tdd-distribution-fields-editing.md`
4. ✅ `AN.4.implement-distribution-fields-editing.md`
5. ✅ `AN.5.tdd-exdate-editing.md`
6. ✅ `AN.6.implement-exdate-editing.md`
7. ✅ `AN.7.tdd-symbol-risk-group-filters.md`
8. ✅ `AN.8.implement-symbol-risk-group-filters.md`
9. ✅ `AN.9.tdd-expired-filter.md`
10. ✅ `AN.10.implement-expired-filter.md`
11. ✅ `AN.11.tdd-e2e-universe-table.md`
12. ✅ `AN.12.refine-e2e-implementation.md`

## TDD Pattern Applied

Each story pair follows the established TDD pattern:

### RED Phase (TDD Stories)

- Write comprehensive unit/E2E tests
- Tests initially fail (or would fail if enabled)
- Disable tests with `xit()` or `.skip` to allow CI to pass
- Provides clear specification of expected behavior

### GREEN Phase (Implementation Stories)

- Re-enable tests from previous RED story
- Implement functionality to make tests pass
- All tests must pass before story completion
- Ensures implementation matches specifications

## Definition of Done

All stories include the standard validation commands:

- ✅ Run `pnpm all`
- ✅ Run `pnpm e2e:dms-material`
- ✅ Run `pnpm dupcheck`
- ✅ Run `pnpm format`
- ✅ Repeat until all pass

## Next Steps

1. Stories are ready for development
2. Begin with Story AN.1 (TDD RED for SmartNgRX integration)
3. Follow sequential order through AN.12
4. Each story completion requires full validation suite to pass

## Pattern Reference

Epic AN follows the same TDD pattern as Epic AM:

- Epic AM: Add Symbol functionality (8 stories, completed)
- Epic AN: Universe Table Display (12 stories, ready to start)

---

**Created**: February 1, 2026
**Status**: Epic AN restructured, all stories created and ready
**Next Action**: Begin Story AN.1 development
